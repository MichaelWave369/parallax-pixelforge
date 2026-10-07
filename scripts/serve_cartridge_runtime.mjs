#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createLegendBouncehomeBridge } from "../runtime/legend-bouncehome-v1.js";
import { serveRuntimeJsonlBridgeV1 } from "../runtime/jsonl-transport-v1.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: node scripts/serve_cartridge_runtime.mjs --cartridge the-legend-of-more-bounce [--scene bouncehome-grove]",
  );
  process.exit(2);
}

function parseArgs(argv) {
  let cartridge = null;
  let scene = "bouncehome-grove";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index] ?? "";

    if (arg === "--cartridge") cartridge = next();
    else if (arg.startsWith("--cartridge=")) cartridge = arg.slice(12);
    else if (arg === "--scene") scene = next();
    else if (arg.startsWith("--scene=")) scene = arg.slice(8);
    else usage("Unknown argument: " + arg);
  }

  if (!cartridge) usage("--cartridge is required");
  return { cartridge, scene };
}

function loadLegendScene(sceneId) {
  if (sceneId !== "bouncehome-grove")
    usage("Unsupported Legend scene in v1: " + sceneId);

  const scenePath = path.join(
    ROOT,
    "games",
    "the-legend-of-more-bounce",
    "runtime",
    "bouncehome-grove.runtime-scene.v5.11.json",
  );
  return JSON.parse(fs.readFileSync(scenePath, "utf8"));
}

const { cartridge, scene } = parseArgs(process.argv.slice(2));

let bridge;
if (cartridge === "the-legend-of-more-bounce") {
  bridge = createLegendBouncehomeBridge(loadLegendScene(scene));
} else {
  usage("Unsupported cartridge in v1: " + cartridge);
}

try {
  await serveRuntimeJsonlBridgeV1(bridge);
} catch (error) {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exitCode = 1;
}
