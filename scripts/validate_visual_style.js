#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const targetArg = process.argv[2];
if (!targetArg) {
  console.error('Usage: npm run style:check -- games/my-cartridge');
  process.exit(2);
}
const root = process.cwd();
const target = path.resolve(root, targetArg);
if (!fs.existsSync(target)) {
  console.error(`Cartridge not found: ${targetArg}`);
  process.exit(2);
}
const slug = path.basename(target);
const read = (rel) => fs.existsSync(path.join(target, rel)) ? fs.readFileSync(path.join(target, rel), 'utf8') : '';
const json = (rel) => { try { return JSON.parse(read(rel)); } catch { return {}; } };
const meta = json('cartridge.meta.json');
const css = read('src/styles.css');
const jsx = read('src/main.jsx');
const html = read('index.html');

const hex = new Set((css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(x => x.toLowerCase()));
const gradients = (css.match(/(?:linear|radial|repeating-linear)-gradient\(/g) || []).length;
const pseudoLayers = (css.match(/::(?:before|after)/g) || []).length;
const keyframes = (css.match(/@keyframes\s+[\w-]+/g) || []).length;
const sceneDepthMarkers = ['world-map','side-stage','backdrop','midground','foreground','mountain','river','tree','hill','first-person-room','ceiling','floor-grid','banner','bookshelf','lamp','window-frame'].filter(k => css.includes(k) || jsx.includes(k));
const uiFrameMarkers = ['border:', 'box-shadow:', 'dialogue-box', 'game-header', 'mode-panel'].filter(k => css.includes(k) || jsx.includes(k));
const spriteMatch = css.match(/\.pixel-avatar\s*\{[^}]*width:\s*(\d+)px;[^}]*height:\s*(\d+)px;/s);
const spriteW = spriteMatch ? Number(spriteMatch[1]) : 0;
const spriteH = spriteMatch ? Number(spriteMatch[2]) : 0;
const targetMatch = String(meta.heroSpriteTarget || '').match(/(\d+)x(\d+)/);
const targetW = targetMatch ? Number(targetMatch[1]) : 32;
const targetH = targetMatch ? Number(targetMatch[2]) : 48;

const declared16 = meta.visualEra === '16-bit' && meta.styleProfile === 'snes-adventure';
const checks = {
  visual_profile_declared: declared16,
  expressive_presentation_declared: meta.presentationTier === 'expressive-pixel',
  layered_environment_declared: meta.environmentDensity === 'layered',
  framed_ui_declared: meta.uiProfile === 'framed-16bit',
  tile_contract_declared: Number(meta.defaultTileSize) === 16,
  hero_scale_declared: Boolean(targetMatch) && targetW >= 32 && targetH >= 48,
  palette_breadth_source: hex.size >= 14,
  layered_background_source: gradients >= 4 && pseudoLayers >= 3 && sceneDepthMarkers.length >= 8,
  framed_ui_source: uiFrameMarkers.length >= 4,
  animation_language_source: keyframes >= 1 || /transition:/i.test(css),
  rendered_hero_footprint: spriteW >= 32 && spriteH >= 48,
  responsive_mobile_source: /@media\s*\(max-width/i.test(css) && /viewport-fit=cover/i.test(html),
  reduced_motion_source: /prefers-reduced-motion/i.test(css),
  gold_standard_identity: Boolean(meta.goldStandardId) ? meta.goldStandardId === 'PF_GOLD_STANDARD_001' : true,
};
const passed = Object.values(checks).every(Boolean);
const humanSigned = meta.visualReview?.humanGoldStandardSignedOff === true;
const status = passed ? (humanSigned ? 'gold-standard-signed-off' : 'source-contract-pass-human-visual-review-pending') : 'source-contract-fail';
const receipt = {
  schema: 'pixelforge.visual-style-review.v5.7',
  slug,
  title: meta.title || slug,
  reviewed_at: new Date().toISOString(),
  declared_profile: {
    visualEra: meta.visualEra || null,
    styleProfile: meta.styleProfile || null,
    presentationTier: meta.presentationTier || null,
    environmentDensity: meta.environmentDensity || null,
    uiProfile: meta.uiProfile || null,
    heroSpriteTarget: meta.heroSpriteTarget || null,
  },
  passed,
  status,
  human_visual_signoff: humanSigned,
  checks,
  measurements: { unique_hex_colors: hex.size, gradient_layers: gradients, pseudo_layers: pseudoLayers, keyframes, scene_depth_markers: sceneDepthMarkers.length, rendered_hero_footprint: `${spriteW}x${spriteH}` },
  boundary: 'Source audit only. This receipt does not claim that the finished art is beautiful, cohesive, original, or commercially ready; human visual review remains authoritative.'
};
const out = path.join(root, 'exports', 'style-reviews');
fs.mkdirSync(out, {recursive:true});
const jsonPath = path.join(out, `${slug}.visual-style.v5.7.json`);
fs.writeFileSync(jsonPath, JSON.stringify(receipt,null,2)+'\n');
const lines = Object.entries(checks).map(([k,v]) => `- ${v?'PASS':'FAIL'} — ${k}`).join('\n');
fs.writeFileSync(path.join(out, `${slug}.visual-style.v5.7.md`), `# Visual Style Receipt — ${receipt.title}\n\n- Profile: **${meta.visualEra || 'undeclared'} / ${meta.styleProfile || 'undeclared'}**\n- Source audit: **${passed?'PASS':'FAIL'}**\n- Status: **${status}**\n- Human gold-standard signoff: **${humanSigned?'YES':'PENDING'}**\n\n${lines}\n\n## Measurements\n\n- Unique hex colors: ${hex.size}\n- Gradient layers: ${gradients}\n- Pseudo-element layers: ${pseudoLayers}\n- Keyframes: ${keyframes}\n- Scene-depth markers: ${sceneDepthMarkers.length}\n- Rendered hero footprint: ${spriteW}x${spriteH}\n\n> ${receipt.boundary}\n`);
console.log(`PixelForge visual style audit: ${slug}`);
for (const [name, ok] of Object.entries(checks)) console.log(`${ok?'PASS':'FAIL'}  ${name}`);
console.log(`Status: ${status}`);
console.log(`Receipt: ${path.relative(root,jsonPath)}`);
if (!passed) process.exit(1);
