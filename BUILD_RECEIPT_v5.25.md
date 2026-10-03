# PixelForge v5.25 — World Map / Fast Travel / Checkpoint Shrines Build Receipt

## Status
**PASS — machine travel/save contracts and full historical PixelForge preflight passed. Human map readability, shrine-placement feel, travel balance, commercial depth and price-worthiness remain pending.**

## New capability
- Native 320×180 SNES-style Legend world map.
- Four persistent checkpoint landmarks: Bouncehome Shrine, Larrina Tower Beacon, Eastern Beacon, Iron Orchard Shrine.
- Discovery is progression-bound; fast travel is activated-landmarks-only.
- Arrival activation for Tower / Iron Orchard; quest restoration activation for Eastern Beacon.
- Travel enters stable scene boundaries and grants no quest flags, items, puzzle solutions or boss defeats.
- Save schema advances to `pixelforge.legend-save.v5.25`, version 2.
- v5.24 portable saves migrate additively into the v5.25 travel network.
- Travel activation/count/history persists in manual slots, autosave and exported JSON.
- No cloud account, network sync, analytics or telemetry.

## Machine evidence
- `npm run legend:save:test` — PASS
- `npm run legend:travel:test` — PASS
- `npm run legend:travel:preview` — PASS
- `npm run legend:travel:audit` — PASS
- `npm run legend:travel:check` — PASS
- `npm run validate:v5.24` retention — PASS
- `npm run validate:v5.25` — PASS
- `npm run github:preflight` — PASS on the exact final renamed v5.25 tree (release gate).

## Evidence boundary
A machine can verify travel eligibility, save migration and safe destinations. It cannot determine whether the map is beautiful/readable enough or whether fast travel harms the exploration rhythm. Those remain human review gates.
