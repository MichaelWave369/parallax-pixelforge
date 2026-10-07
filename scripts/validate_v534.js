#!/usr/bin/env node
import fs from "node:fs";

const errors = [];
const required = [
  "runtime/external-spark-v1.js",
  "scripts/serve_external_spark_runtime.mjs",
  "scripts/qualify_spark_runtime.mjs",
  "tests/external-spark-loader-v1.test.js",
  "docs/V5_34_SPARK_EXTERNAL_RUNTIME_BRIDGE.md",
  "scripts/validate_v534.js",
];

for (const file of required)
  if (!fs.existsSync(file))
    errors.push("Missing v5.34 path: " + file);

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.version !== "5.34.0-alpha")
  errors.push("package.json version must be 5.34.0-alpha.");

for (const name of [
  "runtime:serve:spark",
  "qualify:spark",
  "test:spark-loader",
  "validate:v5.34",
]) {
  if (!pkg.scripts?.[name])
    errors.push("package.json missing script: " + name);
}

if (
  pkg.exports?.["./runtime/external-spark-v1"] !==
  "./runtime/external-spark-v1.js"
) {
  errors.push("package exports must expose the external SPARK bridge loader.");
}

if (!pkg.scripts?.["github:preflight"]?.includes("validate:v5.34"))
  errors.push("github:preflight must include v5.34 validation.");

const loader = fs.readFileSync("runtime/external-spark-v1.js", "utf8");
for (const marker of [
  "fae7879820bef63a550fea486b2defbc3cee5304",
  "spark-threshold-adapter-v1.js",
  "createBridgeV1",
  "spark-the-substrate",
]) {
  if (!loader.includes(marker))
    errors.push("External SPARK loader missing marker: " + marker);
}

if (errors.length) {
  console.error("PixelForge v5.34 validation failed:");
  errors.forEach((error) => console.error("- " + error));
  process.exit(1);
}

console.log("PixelForge v5.34 SPARK External Runtime Bridge validation passed.");
