#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  PIXELFORGE_SPARK_EXPECTED_VERSION,
  PIXELFORGE_SPARK_PINNED_REVISION,
} from "../runtime/external-spark-v1.js";
import {
  RUNTIME_JSONL_REQUEST_SCHEMA,
  RUNTIME_JSONL_RESPONSE_SCHEMA,
} from "../runtime/jsonl-transport-v1.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const RECEIPT_SCHEMA = "pixelforge.spark-runtime-qualification.v1";

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: node scripts/qualify_spark_runtime.mjs --spark-root /path/to/SparkTheSubstrate [--out artifacts/spark-runtime-qualification.json]",
  );
  process.exit(2);
}

function parseArgs(argv) {
  let sparkRoot = null;
  let out = path.join(ROOT, "artifacts", "spark-runtime-qualification.json");

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index] ?? "";

    if (arg === "--spark-root") sparkRoot = next();
    else if (arg.startsWith("--spark-root=")) sparkRoot = arg.slice(13);
    else if (arg === "--out") out = next();
    else if (arg.startsWith("--out=")) out = arg.slice(6);
    else usage("Unknown argument: " + arg);
  }

  if (!sparkRoot) usage("--spark-root is required");
  return { sparkRoot: path.resolve(sparkRoot), out: path.resolve(out) };
}

function gitHead(root) {
  const result = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw new Error(
      "git rev-parse failed: " + (result.stderr || result.stdout || "").trim(),
    );
  return result.stdout.trim();
}

function packageVersion(root) {
  return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
    .version;
}

async function main() {
  const { sparkRoot, out } = parseArgs(process.argv.slice(2));

  const sparkRevision = gitHead(sparkRoot);
  if (sparkRevision !== PIXELFORGE_SPARK_PINNED_REVISION)
    throw new Error(
      "SPARK revision mismatch: expected " +
        PIXELFORGE_SPARK_PINNED_REVISION +
        ", got " +
        sparkRevision,
    );

  const sparkVersion = packageVersion(sparkRoot);
  if (sparkVersion !== PIXELFORGE_SPARK_EXPECTED_VERSION)
    throw new Error(
      "SPARK version mismatch: expected " +
        PIXELFORGE_SPARK_EXPECTED_VERSION +
        ", got " +
        sparkVersion,
    );

  const pixelForgeRevision = gitHead(ROOT);
  const pixelForgeVersion = packageVersion(ROOT);
  const serverPath = path.join(ROOT, "scripts", "serve_external_spark_runtime.mjs");

  const child = spawn(process.execPath, [serverPath, "--spark-root", sparkRoot], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "inherit"],
  });

  const lines = readline.createInterface({
    input: child.stdout,
    crlfDelay: Infinity,
    terminal: false,
  });
  const iterator = lines[Symbol.asyncIterator]();

  let nextId = 1;
  async function call(method, params = []) {
    const id = nextId++;
    child.stdin.write(
      JSON.stringify({
        schema: RUNTIME_JSONL_REQUEST_SCHEMA,
        id,
        method,
        params,
      }) + "\n",
    );

    const line = await iterator.next();
    if (line.done)
      throw new Error("SPARK runtime closed stdout before replying");

    const response = JSON.parse(line.value);
    if (response.schema !== RUNTIME_JSONL_RESPONSE_SCHEMA)
      throw new Error("unexpected JSONL response schema");
    if (response.id !== id)
      throw new Error(
        "response id " + response.id + " does not match request id " + id,
      );
    if (!response.ok)
      throw new Error(
        "SPARK bridge error " +
          (response.error?.code ?? "UNKNOWN") +
          ": " +
          (response.error?.message ?? "unknown error"),
      );
    return response.result;
  }

  const descriptor = await call("describe");
  if (descriptor.gameId !== "spark-the-substrate")
    throw new Error("SPARK descriptor gameId mismatch");
  if (descriptor.runtimeVersion !== "spark-threshold/0.17.0-bridge-v1")
    throw new Error("SPARK descriptor runtimeVersion mismatch");

  const controllerId = "pixelforge-spark-qualification";
  const registration = await call("registerController", [
    {
      id: controllerId,
      kind: "human",
      binding: "pixelforge-cross-repo-qualification",
    },
  ]);
  if (registration?.ok !== true)
    throw new Error("SPARK controller registration did not return ok=true");

  const initial = await call("observe", [controllerId]);
  if (
    initial?.state?.room !== "threshold" ||
    initial?.state?.form !== "spark" ||
    initial?.state?.player?.x !== 480 ||
    initial?.state?.player?.y !== 390 ||
    initial?.state?.player?.maxHp !== 112
  ) {
    throw new Error(
      "unexpected canonical SPARK Threshold initial observation: " +
        JSON.stringify(initial),
    );
  }

  const intent = {
    type: "MOVE",
    actorId: "spark",
    params: { x: 1, y: 0 },
  };
  const queued = await call("submit", [controllerId, intent, 0]);
  if (queued?.queued !== true || queued?.tick !== 0)
    throw new Error("SPARK MOVE was not queued at tick 0");

  const directEvents = await call("advance");
  if (
    directEvents.length !== 1 ||
    directEvents[0]?.type !== "SPARK_PLAYER_MOVED"
  ) {
    throw new Error(
      "expected one SPARK_PLAYER_MOVED event, got " +
        JSON.stringify(directEvents),
    );
  }

  const semanticEvents = await call("events", [0]);
  if (JSON.stringify(semanticEvents) !== JSON.stringify(directEvents))
    throw new Error("SPARK semantic event stream diverged from advance() result");

  const final = await call("observe", [controllerId]);
  if (
    final?.tick !== 1 ||
    final?.state?.room !== "threshold" ||
    final?.state?.player?.x <= initial.state.player.x ||
    final?.state?.player?.y !== initial.state.player.y
  ) {
    throw new Error(
      "SPARK MOVE did not produce the expected Threshold state transition",
    );
  }

  const runtimeHash = await call("hash");
  if (typeof runtimeHash !== "string" || !/^[a-f0-9]{64}$/.test(runtimeHash))
    throw new Error("SPARK runtime hash is not a SHA-256 hex digest");

  const authority = await call("authority");
  if (
    JSON.stringify(authority?.[controllerId]) !==
    JSON.stringify(["MOVE", "DASH", "PULSE"])
  ) {
    throw new Error("SPARK authority view does not match the v1 scope");
  }

  child.stdin.end();
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  if (exitCode !== 0)
    throw new Error("SPARK JSONL runtime exited with code " + exitCode);

  const receipt = {
    schema: RECEIPT_SCHEMA,
    recordStatus: "PASS",
    pixelForgeRevision,
    pixelForgeVersion,
    sparkRevision,
    sparkVersion,
    transportRequestSchema: RUNTIME_JSONL_REQUEST_SCHEMA,
    transportResponseSchema: RUNTIME_JSONL_RESPONSE_SCHEMA,
    descriptor,
    controllerId,
    initialObservation: initial,
    submittedIntent: intent,
    directEvents,
    semanticEvents,
    finalObservation: final,
    authority,
    runtimeHash,
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");

  console.log("PixelForge <-> SPARK Runtime Bridge qualification PASS");
  console.log("SPARK revision:", sparkRevision);
  console.log("Initial:", initial.state.player.x, initial.state.player.y);
  console.log("Final:", final.state.player.x, final.state.player.y);
  console.log("Runtime hash:", runtimeHash);
  console.log("Receipt:", out);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
