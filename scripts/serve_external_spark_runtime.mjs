#!/usr/bin/env node
import process from "node:process";

import { loadExternalSparkThresholdBridgeV1 } from "../runtime/external-spark-v1.js";
import { serveRuntimeJsonlBridgeV1 } from "../runtime/jsonl-transport-v1.js";

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: node scripts/serve_external_spark_runtime.mjs --spark-root /path/to/SparkTheSubstrate [--seed 1397768522]",
  );
  process.exit(2);
}

function parseArgs(argv) {
  let sparkRoot = null;
  let seed;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index] ?? "";

    if (arg === "--spark-root") sparkRoot = next();
    else if (arg.startsWith("--spark-root=")) sparkRoot = arg.slice(13);
    else if (arg === "--seed") seed = Number(next());
    else if (arg.startsWith("--seed=")) seed = Number(arg.slice(7));
    else usage("Unknown argument: " + arg);
  }

  if (!sparkRoot) usage("--spark-root is required");
  if (
    seed !== undefined &&
    (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
  )
    usage("--seed must be a uint32");

  return { sparkRoot, seed };
}

const { sparkRoot, seed } = parseArgs(process.argv.slice(2));

try {
  const bridge = await loadExternalSparkThresholdBridgeV1(sparkRoot, { seed });
  await serveRuntimeJsonlBridgeV1(bridge);
} catch (error) {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exitCode = 1;
}
