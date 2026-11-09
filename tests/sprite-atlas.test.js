import test from "node:test";
import assert from "node:assert/strict";
import {
  ATLAS_DATASET, ATLAS_PAGE_SIZE, ATLAS_SOURCE,
  atlasRequestUrl, normalizeAtlasRows,
  normalizeAtlasProvenance, provenanceForAtlasRow, pixelsFromImageData
} from "../sprite-atlas.js";

test("browse URL uses the limited public rows endpoint, not a bulk download", () => {
  const url = new URL(atlasRequestUrl());
  assert.equal(url.pathname, "/rows");
  assert.equal(url.searchParams.get("dataset"), ATLAS_DATASET);
  assert.equal(url.searchParams.get("config"), "default");
  assert.equal(url.searchParams.get("split"), "train");
  assert.equal(url.searchParams.get("length"), String(ATLAS_PAGE_SIZE));
  assert.equal(url.searchParams.get("offset"), "0");
});

test("search URL safely encodes the user query, split and page offset", () => {
  const url = new URL(atlasRequestUrl({ query: " purple slime & cats ", split: "validation", offset: 48 }));
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("query"), "purple slime & cats");
  assert.equal(url.searchParams.get("split"), "validation");
  assert.equal(url.searchParams.get("offset"), "48");
  assert.throws(() => atlasRequestUrl({ split: "made-up" }), /Unsupported/);
});

test("normalizes rows but rejects untrusted image origins and invalid rows", () => {
  const rows = normalizeAtlasRows({ rows: [
    { row_idx: 8, row: { row_id: 27, caption: "purple slime", subject: "slime", image: {src: "https://datasets-server.huggingface.co/assets/sprite.png"} } },
    { row_idx: 9, row: { row_id: 28, caption: "bad host", image: {src: "https://evil.example/collect.png"} } },
    { row_idx: 10, row: { row_id: 29, caption: "blocked", image: {src: "javascript:alert(1)"} } }
  ]});
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { rowId: 27, caption: "purple slime", subject: "slime", imageUrl: "https://datasets-server.huggingface.co/assets/sprite.png" });
  assert.throws(() => normalizeAtlasRows({}), /Unexpected Atlas API response/);
});

test("provenance explicitly preserves source and review-required status", () => {
  const record = provenanceForAtlasRow({ rowId: 17, subject: "sword", caption: "blue sword" });
  assert.equal(record.dataset, ATLAS_DATASET);
  assert.equal(record.rowId, 17);
  assert.equal(record.sourceUrl, ATLAS_SOURCE);
  assert.equal(record.rightsReviewRequired, true);
  assert.match(record.claimedLicense, /rights held/);
  assert.deepEqual(normalizeAtlasProvenance(record), record);
  assert.equal(normalizeAtlasProvenance({ dataset: "other/repo", rowId: 1 }), null);
});

test("imports RGBA pixel values with transparent cells and deterministic hex", () => {
  const data = new Uint8ClampedArray(16 * 16 * 4);
  data.set([100, 20, 255, 255], 0);
  data.set([12, 34, 56, 10], 4);
  data.set([0, 128, 1, 128], 8);
  const pixels = pixelsFromImageData({ width: 16, height: 16, data });
  assert.equal(pixels.length, 256);
  assert.equal(pixels[0], "#6414ff");
  assert.equal(pixels[1], null);
  assert.equal(pixels[2], "#008001");
  assert.equal(pixels[255], null);
  assert.throws(() => pixelsFromImageData({ width: 32, height: 32, data }), /exactly 16/);
});
