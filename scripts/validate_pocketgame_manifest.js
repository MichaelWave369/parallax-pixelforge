#!/usr/bin/env node
import fs from "node:fs";

const file = process.argv[2] || "pocketgames/journey_to_parallax_pyramid.pocketgame.json";
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];

function requireString(path, value) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} must be a non-empty string.`);
}
function requireTrue(path, value) {
  if (value !== true) errors.push(`${path} must be true.`);
}
function requireArray(path, value, min = 1) {
  if (!Array.isArray(value) || value.length < min) errors.push(`${path} must be an array with at least ${min} item(s).`);
}

requireString("manifestType", manifest.manifestType);
if (manifest.manifestType !== "369.pocketgame.manifest") errors.push("manifestType must equal 369.pocketgame.manifest.");
requireString("manifestVersion", manifest.manifestVersion);
requireString("id", manifest.id);
requireString("slug", manifest.slug);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.slug || "")) errors.push("slug must be lowercase kebab-case.");
requireString("title", manifest.title);
requireString("subtitle", manifest.subtitle);
requireString("series", manifest.series);
if (manifest.series !== "369 PocketGames") errors.push("series must equal 369 PocketGames for this export lane.");
requireString("sourceCartridge", manifest.sourceCartridge);
requireString("cartridgeManifest", manifest.cartridgeManifest);

if (!manifest.price || typeof manifest.price !== "object") errors.push("price object is required.");
else {
  if (manifest.price.model !== "premium_paid_once") errors.push("price.model must be premium_paid_once.");
  requireString("price.usdTarget", manifest.price.usdTarget);
}

const boundary = manifest.monetizationBoundary || {};
[
  "noAds",
  "noPredatoryIap",
  "noSubscriptions",
  "noLootBoxes",
  "noEnergyTimers",
  "offlinePlayable"
].forEach(key => requireTrue(`monetizationBoundary.${key}`, boundary[key]));

const mobile = manifest.mobileProfile || {};
requireString("mobileProfile.orientation", mobile.orientation);
if (!Number.isInteger(mobile.minimumTapTargetPx) || mobile.minimumTapTargetPx < 44) errors.push("mobileProfile.minimumTapTargetPx must be an integer >= 44.");
requireArray("mobileProfile.controls", mobile.controls, 1);

const store = manifest.storePageSeed || {};
requireString("storePageSeed.shortDescription", store.shortDescription);
requireString("storePageSeed.longDescription", store.longDescription);
requireArray("storePageSeed.featureBullets", store.featureBullets, 3);
requireString("storePageSeed.tagline", store.tagline);

const rights = manifest.rightsAndSafety || {};
requireString("rightsAndSafety.assetStatus", rights.assetStatus);
requireTrue("rightsAndSafety.publicTextReviewRequired", rights.publicTextReviewRequired);
requireTrue("rightsAndSafety.claimBoundaryReviewRequired", rights.claimBoundaryReviewRequired);
if (rights.thirdPartyIpAllowed !== false) errors.push("rightsAndSafety.thirdPartyIpAllowed must be false for default public repo examples.");

requireArray("releaseGates", manifest.releaseGates, 1);
for (const [index, gate] of (manifest.releaseGates || []).entries()) {
  requireString(`releaseGates[${index}].id`, gate.id);
  requireString(`releaseGates[${index}].name`, gate.name);
  if (gate.required !== true) errors.push(`releaseGates[${index}].required must be true.`);
  requireString(`releaseGates[${index}].status`, gate.status);
  requireString(`releaseGates[${index}].criteria`, gate.criteria);
}

if (errors.length) {
  console.error(`PocketGame manifest validation failed for ${file}:`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`PocketGame manifest valid: ${file}`);
