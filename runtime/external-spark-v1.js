import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createBridgeV1 } from "./bridge-v1.js";

export const PIXELFORGE_SPARK_ADAPTER_ID = "pixelforge.external-spark-threshold-v1";
export const PIXELFORGE_SPARK_PINNED_REVISION =
  "6f3b6605a6f026eb737f9d9eb67ffd45d366e1eb";
export const PIXELFORGE_SPARK_EXPECTED_VERSION = "0.17.0";

export async function loadExternalSparkThresholdBridgeV1(
  sparkRoot,
  { seed } = {},
) {
  if (typeof sparkRoot !== "string" || !sparkRoot.trim())
    throw new TypeError("sparkRoot must be a non-empty path");

  const root = path.resolve(sparkRoot);
  const packagePath = path.join(root, "package.json");
  const adapterPath = path.join(root, "runtime", "spark-threshold-adapter-v1.js");

  if (!fs.existsSync(packagePath))
    throw new Error("SPARK package.json was not found at the supplied root");
  if (!fs.existsSync(adapterPath))
    throw new Error("SPARK Threshold Runtime Bridge adapter was not found");

  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (pkg.name !== "spark-substrate")
    throw new Error("external project is not the canonical SPARK package");
  if (pkg.version !== PIXELFORGE_SPARK_EXPECTED_VERSION)
    throw new Error(
      "expected SPARK " + PIXELFORGE_SPARK_EXPECTED_VERSION + ", got " + pkg.version,
    );

  const moduleUrl = pathToFileURL(adapterPath);
  const sparkModule = await import(moduleUrl.href);

  if (typeof sparkModule.createSparkThresholdAdapterV1 !== "function")
    throw new Error("SPARK Threshold adapter factory is unavailable");

  const adapter = sparkModule.createSparkThresholdAdapterV1(
    seed === undefined ? {} : { seed },
  );
  const bridge = createBridgeV1(adapter);
  const descriptor = bridge.describe();

  if (descriptor.gameId !== "spark-the-substrate")
    throw new Error("unexpected SPARK gameId: " + descriptor.gameId);
  if (descriptor.runtimeVersion !== "spark-threshold/0.17.0-bridge-v1")
    throw new Error(
      "unexpected SPARK runtimeVersion: " + descriptor.runtimeVersion,
    );

  return bridge;
}
