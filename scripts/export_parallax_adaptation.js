import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCHEMA = 'parallax.pixelforge.adaptation-export.v0.1';
const args = process.argv.slice(2);
const check = args.includes('--check');
const stdout = args.includes('--stdout');
const positional = args.filter((arg) => !arg.startsWith('--'));
const cartridgeDir = path.resolve(positional[0] || 'games/starter');
const outputPath = path.resolve(positional[1] || path.join(cartridgeDir, 'parallax-adaptation.json'));
const modulePath = path.join(cartridgeDir, 'src', 'cartridge.js');
if (!fs.existsSync(modulePath)) throw new Error(`Missing native cartridge module: ${modulePath}`);
const { cartridge } = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);

function required(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}
function gitRevision() {
  if (process.env.PIXELFORGE_SOURCE_REVISION) return process.env.PIXELFORGE_SOURCE_REVISION.trim();
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' });
  if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  throw new Error('Could not resolve git revision; set PIXELFORGE_SOURCE_REVISION when exporting outside a Git checkout.');
}
function validateScenes(scenes) {
  if (!scenes || typeof scenes !== 'object') throw new Error('cartridge.scenes is required');
  const ids = new Set(Object.keys(scenes));
  if (!ids.size) throw new Error('cartridge.scenes must contain at least one scene');
  for (const [id, scene] of Object.entries(scenes)) {
    required(id, 'scene id'); required(scene?.title, `scene ${id} title`); required(scene?.body, `scene ${id} body`);
    if (!Array.isArray(scene?.actions) || !scene.actions.length) throw new Error(`scene ${id} requires at least one action`);
    for (const action of scene.actions) {
      required(action?.label, `scene ${id} action label`); const next = required(action?.next, `scene ${id} action next`);
      if (!ids.has(next)) throw new Error(`scene ${id} points to unknown scene ${next}`);
    }
  }
}
validateScenes(cartridge.scenes);
required(cartridge.projectId, 'projectId'); required(cartridge.title, 'title'); required(cartridge.pitch, 'pitch');
required(cartridge.creator?.creatorId, 'creator.creatorId'); required(cartridge.creator?.displayName, 'creator.displayName');
for (const key of ['room','mechanic','feeling','ending']) required(cartridge.loop?.[key], `loop.${key}`);
const revision = gitRevision();
const relativeCartridgePath = path.relative(process.cwd(), cartridgeDir).split(path.sep).join('/');
const exportDoc = {
  schema: SCHEMA,
  projectId: cartridge.projectId,
  releaseId: `git-${revision.slice(0, 12)}`,
  title: cartridge.title,
  pitch: cartridge.pitch,
  creator: cartridge.creator,
  ...(cartridge.publicPlayUrl ? { publicPlayUrl: cartridge.publicPlayUrl } : {}),
  source: { repository: 'MichaelWave369/parallax-pixelforge', path: relativeCartridgePath, revision },
  runInstructions: cartridge.runInstructions || `cd ${relativeCartridgePath} && npm install && npm run dev`,
  loop: cartridge.loop,
  world: cartridge.world || {},
  characters: cartridge.characters || [],
  scenes: Object.entries(cartridge.scenes).map(([id, scene]) => ({ id, ...scene })),
  assets: cartridge.assets || [],
  creatorIntent: cartridge.creatorIntent || {},
  canon: cartridge.canon || []
};
const body = `${JSON.stringify(exportDoc, null, 2)}\n`;
const hash = createHash('sha256').update(body).digest('hex');
if (!check && !stdout) fs.writeFileSync(outputPath, body, 'utf8');
if (stdout) process.stdout.write(body);
else console.log(JSON.stringify({ valid: true, schema: SCHEMA, output: check ? null : outputPath, sha256: hash, sceneCount: exportDoc.scenes.length, revision }));
