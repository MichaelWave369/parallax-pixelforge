#!/usr/bin/env node
import process from "node:process";
import { createCounterBridge } from "../runtime/reference-counter.js";
import { serveRuntimeJsonlBridgeV1 } from "../runtime/jsonl-transport-v1.js";

function parseArgs(argv) {
  let runtime = "reference-counter";
  let seed = 0;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i] ?? "";

    if (arg === "--runtime") runtime = next();
    else if (arg.startsWith("--runtime=")) runtime = arg.slice(10);
    else if (arg === "--seed") seed = Number(next());
    else if (arg.startsWith("--seed=")) seed = Number(arg.slice(7));
    else {
      console.error(
        "Usage: node scripts/serve_reference_runtime.mjs [--runtime reference-counter] [--seed 0]",
      );
      process.exit(2);
    }
  }

  if (runtime !== "reference-counter") {
    console.error(`Unsupported reference runtime: ${runtime}`);
    process.exit(2);
  }

  if (!Number.isSafeInteger(seed)) {
    console.error("--seed must be a safe integer");
    process.exit(2);
  }

  return { runtime, seed };
}

const { seed } = parseArgs(process.argv.slice(2));
const bridge = createCounterBridge(seed);

try {
  await serveRuntimeJsonlBridgeV1(bridge);
} catch (error) {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exitCode = 1;
}
