// Live, opt-in Hugging Face Pixel Art Atlas shelf for PixelForge Sprite Studio.
// Only the currently visible page is loaded; no model weights or bulk dataset files.
export const ATLAS_DATASET = "Angais/pixel-art-atlas-1.4m";
export const ATLAS_PAGE_SIZE = 24;
export const ATLAS_SOURCE = "https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m";
const ATLAS_API = "https://datasets-server.huggingface.co";
const PROVENANCE_SCHEMA = "pixelforge.external-sprite-source.v1";

function asNonnegativeInteger(value, fallback = 0) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}
function text(value, max = 140) {
  return String(value ?? "").trim().slice(0, max);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function imageSource(value) {
  const source = text(value, 200000);
  if (/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(source)) return source;
  try {
    const url = new URL(source);
    if (url.protocol !== "https:") return "";
    if (url.hostname !== "datasets-server.huggingface.co" &&
        url.hostname !== "huggingface.co" &&
        !url.hostname.endsWith(".hf.co")) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function atlasRequestUrl({ query = "", offset = 0, split = "train" } = {}) {
  if (!["train", "validation"].includes(split)) throw new Error("Unsupported dataset split.");
  const q = text(query, 100);
  const params = new URLSearchParams({
    dataset: ATLAS_DATASET, config: "default", split,
    offset: String(asNonnegativeInteger(offset)), length: String(ATLAS_PAGE_SIZE)
  });
  if (q) params.set("query", q);
  return ATLAS_API + "/" + (q ? "search" : "rows") + "?" + params.toString();
}

export function normalizeAtlasRows(payload) {
  if (!payload || !Array.isArray(payload.rows)) throw new Error("Unexpected Atlas API response.");
  return payload.rows.slice(0, 100).map(item => {
    const row = item?.row || {};
    const rowId = asNonnegativeInteger(row.row_id, asNonnegativeInteger(item?.row_idx, -1));
    const imageUrl = imageSource(row.image?.src);
    if (rowId < 0 || !imageUrl || item?.truncated_cells?.includes("image")) return null;
    return {
      rowId,
      caption: text(row.caption, 160),
      subject: text(row.subject, 80),
      imageUrl
    };
  }).filter(Boolean);
}

export function normalizeAtlasProvenance(input) {
  if (input?.dataset !== ATLAS_DATASET) return null;
  const rowId = asNonnegativeInteger(input.rowId, -1);
  if (rowId < 0) return null;
  return {
    schema: PROVENANCE_SCHEMA,
    dataset: ATLAS_DATASET,
    rowId,
    caption: text(input.caption, 160),
    subject: text(input.subject, 80),
    sourceUrl: ATLAS_SOURCE,
    claimedLicense: "CC0-1.0 (rights held by dataset publisher only)",
    rightsReviewRequired: true
  };
}
export function provenanceForAtlasRow(record) {
  return normalizeAtlasProvenance({
    dataset: ATLAS_DATASET, rowId: record?.rowId,
    caption: record?.caption, subject: record?.subject
  });
}

export function pixelsFromImageData(imageData) {
  if (imageData?.width !== 16 || imageData?.height !== 16 ||
      !imageData.data || imageData.data.length !== 16 * 16 * 4) {
    throw new Error("Atlas sprite must decode to exactly 16 by 16 RGBA pixels.");
  }
  const hex = n => n.toString(16).padStart(2, "0");
  const pixels = [];
  for (let i = 0; i < 256; i++) {
    const offset = i * 4;
    pixels.push(imageData.data[offset + 3] < 128 ? null :
      "#" + hex(imageData.data[offset]) + hex(imageData.data[offset + 1]) + hex(imageData.data[offset + 2]));
  }
  return pixels;
}

async function decodeSprite(source) {
  const safe = imageSource(source);
  if (!safe) throw new Error("Sprite image URL is not from an allowed dataset host.");
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("The Atlas image could not be loaded. Check the network or cross-origin access."));
    img.src = safe;
  });
  if (img.naturalWidth !== 16 || img.naturalHeight !== 16) {
    throw new Error("Expected a native 16×16 sprite. This row has a different image size.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is unavailable.");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  try {
    return pixelsFromImageData(ctx.getImageData(0, 0, 16, 16));
  } catch {
    throw new Error("Pixel access was blocked by the image host (CORS). The editor was not changed.");
  }
}

const state = {
  open: false, split: "train", queryDraft: "", query: "", offset: 0,
  total: 0, partial: false, rows: [], loaded: false, loading: false,
  importing: null, message: "", controller: null, serial: 0
};
let currentRoot = null;
let onImport = null;
function refresh() {
  if (currentRoot?.isConnected) renderSpriteAtlas(currentRoot, onImport);
}

async function loadPage() {
  if (!state.open) return;
  state.controller?.abort();
  const controller = new AbortController();
  const serial = ++state.serial;
  state.controller = controller;
  state.loading = true;
  state.message = "Loading a small page from Hugging Face…";
  refresh();
  try {
    const response = await fetch(atlasRequestUrl(state), { signal: controller.signal, mode: "cors" });
    if (!response.ok) throw new Error("Hugging Face returned HTTP " + response.status + ".");
    const payload = await response.json();
    if (serial !== state.serial) return;
    state.rows = normalizeAtlasRows(payload);
    state.total = asNonnegativeInteger(payload.num_rows_total, state.rows.length);
    state.partial = payload.partial === true;
    state.loaded = true;
    state.message = state.rows.length ? "Select a sprite to inspect and edit. Captions are approximate." : "No compatible sprites on this page.";
  } catch (error) {
    if (controller.signal.aborted || serial !== state.serial) return;
    state.rows = [];
    state.loaded = false;
    state.message = "Atlas unavailable: " + (error?.message || "network error") + " Try again later.";
  } finally {
    if (serial === state.serial) {
      state.loading = false;
      state.controller = null;
      refresh();
    }
  }
}

async function importRow(index) {
  const record = state.rows[index];
  if (!record || !onImport || state.importing !== null) return;
  state.importing = index;
  state.message = "Decoding the original 16×16 RGBA pixels…";
  refresh();
  try {
    const pixels = await decodeSprite(record.imageUrl);
    const source = provenanceForAtlasRow(record);
    if (!source) throw new Error("Source record has no valid provenance.");
    const accepted = await onImport({ pixels, source });
    state.message = accepted === false
      ? "Import canceled. The existing Sprite Studio artwork was preserved."
      : "Imported row #" + record.rowId + " into editable Sprite Studio pixels. Review rights before release.";
  } catch (error) {
    state.message = "Import failed: " + (error?.message || "unknown error");
  } finally {
    state.importing = null;
    refresh();
  }
}

export function renderSpriteAtlas(root, importSprite) {
  currentRoot = root;
  onImport = importSprite;
  const target = root?.querySelector("#spriteAtlasShelf");
  if (!target) return;
  const html = [
    '<div class="atlas-heading"><div><strong>Pixel Art Atlas</strong><small>1.4M captioned 16×16 sprites · opt-in remote shelf</small></div>',
    '<button type="button" id="atlasToggle" class="secondary" aria-expanded="' + state.open + '">' + (state.open ? "Hide Atlas" : "Explore Atlas") + '</button></div>'
  ];
  if (state.open) {
    html.push(
      '<p class="atlas-rights">External AI-generated assets. Publisher declares CC0 only to the extent of its rights; Krea terms and third-party rights may still apply. New imports are marked <b>needs-review</b>.</p>',
      '<div class="atlas-controls"><label>Find sprites <input type="search" id="atlasQuery" maxlength="100" placeholder="slime, sword, robot, mushroom…" value="' + escapeHtml(state.queryDraft) + '"></label>',
      '<label>Split <select id="atlasSplit"><option value="train"' + (state.split === "train" ? " selected" : "") + '>Train</option><option value="validation"' + (state.split === "validation" ? " selected" : "") + '>Validation</option></select></label>',
      '<button type="button" id="atlasSearch" ' + (state.loading ? "disabled" : "") + '>Search / Browse</button></div>',
      '<p id="atlasStatus" class="atlas-message" role="status">' + escapeHtml(state.message || "Browse or search the dataset without downloading all 1.4M images.") + '</p>'
    );
    if (state.rows.length) {
      html.push('<div class="atlas-grid">');
      state.rows.forEach((row, index) => {
        html.push('<article class="atlas-item"><img loading="lazy" width="96" height="96" src="' +
          escapeHtml(row.imageUrl) + '" alt="' + escapeHtml(row.caption || row.subject || "Atlas sprite") +
          '"><div><strong>' + escapeHtml(row.caption || row.subject || "Untitled sprite") + '</strong><small>#' +
          row.rowId + ' · ' + escapeHtml(row.subject) + '</small></div><button type="button" data-atlas-import="' +
          index + '"' + (state.importing !== null ? " disabled" : "") + '>Edit in Studio</button></article>');
      });
      html.push('</div>');
    }
    html.push('<div class="atlas-pages"><button type="button" id="atlasPrev"' +
      (state.loading || state.offset === 0 ? " disabled" : "") + '>← Previous</button>' +
      '<span>' + (state.loaded ? String(state.offset + 1) + "–" + String(state.offset + state.rows.length) +
      " of " + state.total.toLocaleString() + (state.partial ? " (partial index)" : "") : "No results loaded") +
      '</span><button type="button" id="atlasNext"' +
      (state.loading || !state.loaded || state.offset + ATLAS_PAGE_SIZE >= state.total ? " disabled" : "") +
      '>Next →</button></div><p class="atlas-source"><a href="' + ATLAS_SOURCE +
      '" target="_blank" rel="noopener noreferrer">Dataset, license and provenance</a> · Pixels with alpha below 128 are transparent; other alpha values become opaque RGB.</p>');
  }
  target.innerHTML = html.join("");
  target.querySelector("#atlasToggle").onclick = () => {
    state.open = !state.open;
    refresh();
    if (state.open && !state.loaded && !state.loading) void loadPage();
  };
  if (!state.open) return;
  target.querySelector("#atlasQuery").oninput = event => { state.queryDraft = event.target.value; };
  target.querySelector("#atlasQuery").onkeydown = event => {
    if (event.key === "Enter") { event.preventDefault(); runSearch(); }
  };
  target.querySelector("#atlasSplit").onchange = event => {
    state.split = event.target.value;
    state.offset = 0;
    void loadPage();
  };
  target.querySelector("#atlasSearch").onclick = runSearch;
  target.querySelector("#atlasPrev").onclick = () => {
    state.offset = Math.max(0, state.offset - ATLAS_PAGE_SIZE);
    void loadPage();
  };
  target.querySelector("#atlasNext").onclick = () => {
    state.offset += ATLAS_PAGE_SIZE;
    void loadPage();
  };
  target.querySelectorAll("[data-atlas-import]").forEach(button => {
    button.onclick = () => void importRow(Number(button.dataset.atlasImport));
  });
}
function runSearch() {
  state.query = text(state.queryDraft, 100);
  state.offset = 0;
  void loadPage();
}
