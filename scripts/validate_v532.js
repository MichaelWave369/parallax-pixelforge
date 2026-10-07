#!/usr/bin/env node
import fs from "node:fs";

const errors = [];
const required = [
  "docs/RUNTIME_JSONL_TRANSPORT_V1.md",
  "runtime/jsonl-transport-v1.js",
  "scripts/serve_reference_runtime.mjs",
  "tests/runtime-jsonl-transport-v1.test.js",
  "scripts/validate_v532.js",
];

for (const file of required)
  if (!fs.existsSync(file))
    errors.push(`Missing v5.32 path: ${file}`);

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versionMatch = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(pkg.version || "");
const versionMajor = versionMatch ? Number(versionMatch[1]) : -1;
const versionMinor = versionMatch ? Number(versionMatch[2]) : -1;
if (versionMajor !== 5 || versionMinor < 32)
  errors.push("package.json version must be PixelForge 5.32 or later within major version 5.");

if (pkg.exports?.["./runtime/jsonl-transport-v1"] !== "./runtime/jsonl-transport-v1.js")
  errors.push("package exports must expose Runtime JSONL Transport v1.");

for (const name of ["runtime:serve:reference", "validate:v5.32"])
  if (!pkg.scripts?.[name])
    errors.push(`package.json missing script: ${name}`);

if (!pkg.scripts?.["github:preflight"]?.includes("validate:v5.32"))
  errors.push("github:preflight must include v5.32 validation.");

const sdk = fs.readFileSync("runtime/sdk-v1.js", "utf8");
if (!sdk.includes("./jsonl-transport-v1.js"))
  errors.push("Runtime SDK must export JSONL Transport v1.");

const transport = fs.readFileSync("runtime/jsonl-transport-v1.js", "utf8");
for (const marker of [
  "pixelforge.runtime-transport.request.v1",
  "pixelforge.runtime-transport.response.v1",
  "RUNTIME_BRIDGE_METHODS",
  "MALFORMED_JSON",
  "BRIDGE_ERROR",
]) {
  if (!transport.includes(marker))
    errors.push(`Transport missing marker: ${marker}`);
}

if (errors.length) {
  console.error("PixelForge v5.32 validation failed:");
  errors.forEach((error) => console.error("- " + error));
  process.exit(1);
}

console.log("PixelForge v5.32 Runtime Bridge JSONL Transport validation passed.");
