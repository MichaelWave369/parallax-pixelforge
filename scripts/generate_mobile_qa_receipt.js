#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] || "pocketgames/journey_to_parallax_pyramid.pocketgame.json";
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
const outDir = "exports/qa";
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${manifest.slug}.mobile-qa.receipt.md`);
const gateLines = manifest.releaseGates.map(gate => `- [ ] **${gate.name}** — ${gate.criteria}`).join("\n");
const body = `# Mobile QA Receipt — ${manifest.title}\n\nManifest: \`${file}\`\nSeries: **${manifest.series}**\nTarget price: **$${manifest.price.usdTarget}**\nOrientation: **${manifest.mobileProfile.orientation}**\nMinimum tap target: **${manifest.mobileProfile.minimumTapTargetPx}px**\n\n## First-session test\n\n- [ ] Player understands what to do within 10 seconds.\n- [ ] Player smiles, laughs, or feels curiosity within 30 seconds.\n- [ ] Player understands this is paid-once/no-ads/no-traps within 60 seconds.\n- [ ] Player can pause/stop without losing progress.\n\n## Mobile usability\n\n- [ ] Text is readable on a small phone.\n- [ ] Buttons are easy to tap.\n- [ ] Menus do not require precision scrolling.\n- [ ] Save/load survives app/browser close.\n- [ ] No network/account requirement appears.\n\n## 369 PocketGames gates\n\n${gateLines}\n\n## Notes\n\nPlaytester:\nDate:\nDevice:\nBuild:\nResult: PASS / NEEDS POLISH / BLOCKED\n`;
fs.writeFileSync(outFile, body);
console.log(`Generated ${outFile}`);
