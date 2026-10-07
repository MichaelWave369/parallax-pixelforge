#!/usr/bin/env node
import fs from "node:fs";

const errors = [];
const required = [
  "runtime/legend-bouncehome-v1.js",
  "scripts/serve_cartridge_runtime.mjs",
  "tests/runtime-legend-cartridge-v1.test.js",
  "docs/V5_33_FIRST_CARTRIDGE_BRIDGE.md",
  "games/the-legend-of-more-bounce/runtime/bouncehome-grove.runtime-scene.v5.11.json",
  "scripts/validate_v533.js",
];

for (const file of required)
  if (!fs.existsSync(file))
    errors.push(`Missing v5.33 path: ${file}`);

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.version !== "5.33.0-alpha")
  errors.push("package.json version must be 5.33.0-alpha.");

for (const name of [
  "runtime:serve:cartridge",
  "test:cartridge-bridge",
  "validate:v5.33",
]) {
  if (!pkg.scripts?.[name])
    errors.push(`package.json missing script: ${name}`);
}

if (
  pkg.exports?.["./runtime/legend-bouncehome-v1"] !==
  "./runtime/legend-bouncehome-v1.js"
) {
  errors.push("package exports must expose the first cartridge bridge.");
}

if (!pkg.scripts?.["github:preflight"]?.includes("validate:v5.33"))
  errors.push("github:preflight must include v5.33 validation.");

const runtime = fs.readFileSync("runtime/legend-bouncehome-v1.js", "utf8");
for (const marker of [
  "the-legend-of-more-bounce",
  "bouncehome-grove",
  "PLAYER_MOVED",
  "MOVE_BLOCKED",
  "ACTION_REJECTED",
]) {
  if (!runtime.includes(marker))
    errors.push(`Legend cartridge runtime missing marker: ${marker}`);
}

if (errors.length) {
  console.error("PixelForge v5.33 validation failed:");
  errors.forEach((error) => console.error("- " + error));
  process.exit(1);
}

console.log("PixelForge v5.33 First Real Cartridge Bridge validation passed.");
