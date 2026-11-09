# Pixel Art Atlas shelf · Sprite Studio

PixelForge integrates the external [Angais / Pixel Art Atlas · 1.4M](https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m) dataset **inside the existing Sprite Studio**. No new repository or paid service is required.

## Workflow

1. Open PixelForge, choose **Open Sprite Studio**, then **Explore Atlas**.
2. Browse the first page or search English captions such as "mushroom", "slime" or "sword". Choose Train or Validation. Results are paginated (24 rows/request).
3. Select **Edit in Studio** on a thumbnail. If an existing canvas has work or a non-16×16 size, confirm replacing that workspace. Undo restores the previous project-local Sprite Studio state.
4. Edit the resulting 16×16 RGBA-derived frame with PixelForge's pencil, fill, mirror, animation tools, PNG export and Asset Forge attachment flow.
5. Review the asset and its rights before shipping. The source dataset/row/caption/subject are saved on the Sprite Studio state and Asset Forge receipt.

## Technical boundary

- Uses Hugging Face Dataset Viewer API endpoints: /rows and /search. No downloads of the complete 1.4M sprites or model training are performed.
- Live browsing requires internet connectivity and that Hugging Face serves the dataset plus images with compatible cross-origin permissions. If either endpoint fails, the editor is unaffected.
- Search is the Dataset Viewer full-text search over string fields, not semantic AI image search. Search results and caption matches can be approximate.
- Image import requires a decoded 16×16 RGBA sprite. Alpha below 128 becomes transparent; alpha 128–255 becomes opaque RGB due to Sprite Studio's hex/null pixel model.
- Selecting a sprite replaces the current 16×16 workspace after confirmation if necessary. Import is undoable in Sprite Studio; the 64-frame project state limit remains unchanged.
- **Not a permission grant:** The publisher declares CC0 only to the extent of its rights. Krea terms, trademarks and other third-party rights may apply. Every imported sprite is marked \`needs-review\` rather than \`original\` or \`public-domain\`; rights review remains a creator decision.
- The existing external asset restrictions and Asset Forge human-review rules remain in effect.

## Validation

Run \`node --test tests/sprite-atlas.test.js\` (no additional dependencies). This checks URL pagination, untrusted URL handling, provenance normalization and RGBA conversion. Browser/CORS and visual editing still require a real browser acceptance pass.

## Future work

Add optional curated favorites, local-cache import/export of small approved packs, subject filters, animation strip assembly and a model-training evaluation harness only after browser acceptance and provenance review.
