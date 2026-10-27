#!/usr/bin/env python3
"""Opt-in, reproducible, no-network installer for the public Michael & Ori v0.2.1 source ZIP.

Accepts the downloadable game-source.zip, adds a game-owned ΦWAD custom level
loader, and emits a NEW zip. No edits to the original input ZIP or campaign assets.
"""
import argparse
import hashlib
import io
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_INPUT = 64 * 1024 * 1024
COPIES = {
    "phi-content/runtime.js": "integrations/michael-ori/runtime.js",
    "phi-content/phipack/core.js": "phipack/core.js",
    "phi-content/phiwad/level.js": "phiwad/level.js",
    "phi-content/phiwad/mission.js": "phiwad/mission.js",
}
MAIN_IMPORT = "import {installPhiWadLoader} from './phi-content/runtime.js';"
START_ANCHOR = "applySettings();showScreen('title-screen');updateHUD();requestAnimationFrame(frame);"


def exact_replace(text, before, after, label):
    if text.count(before) != 1:
        raise ValueError(f"{label}: expected exactly one integration anchor; got {text.count(before)}")
    return text.replace(before, after, 1)


def patch_main(text):
    if MAIN_IMPORT in text:
        raise ValueError("Game source already has ΦWAD integration")
    text = exact_replace(
        text,
        "import {Game,SECTORS,WEAPONS,CAMPAIGN_HOSTS,clamp,angleDiff} from './core.js';",
        "import {Game,SECTORS,WEAPONS,CAMPAIGN_HOSTS,clamp,angleDiff} from './core.js';\n" + MAIN_IMPORT,
        "main import",
    )
    text = exact_replace(
        text,
        "function saveCheckpoint(){if(game.player.health<=0)return;",
        "function saveCheckpoint(){if(game.phiwadCustom)return;if(game.player.health<=0)return;",
        "campaign save guard",
    )
    text = exact_replace(
        text,
        "showScreen('result-screen');",
        """if(game.phiwadCustom&&!dead){
      $('result-eyebrow').textContent='ΦWAD CUSTOM MISSION COMPLETE';
      $('result-copy').textContent='Mission liberated. The original campaign remains unchanged.';
      $('result-btn').textContent='RETURN TO CAMPAIGN';
    }
    showScreen('result-screen');""",
        "custom completion screen",
    )
    text = exact_replace(
        text,
        START_ANCHOR,
        """installPhiWadLoader({
  game, sectors:SECTORS, titleScreen:$('title-screen'),
  enterGame:()=>play(false), restartCampaign:()=>play(true), notify:showToast
});
""" + START_ANCHOR,
        "loader startup",
    )
    return text


def patch_expansion(text):
    # The game evolved from six sectors to twelve. Modern versions already
    # have a def.theme fallback, which must be retained for official acts.
    pattern = r"const theme=THEMES\[index\](?:\|\|def\.theme)?;"
    replacement = "const theme=THEMES[index]||def.theme||{rooms:[],signs:[],props:[]};"
    patched, count = re.subn(pattern, replacement, text)
    if count != 1:
        raise ValueError(f"level decorator: expected exactly one theme anchor; got {count}")
    return patched


def patch_sw(text, token):
    hit = re.search(r"const FILES=(\[[^;\n]+\]);", text)
    if not hit:
        raise ValueError("service worker: expected FILES list")
    files = json.loads(hit.group(1))
    if not isinstance(files, list):
        raise ValueError("service worker FILES must be a list")
    for name in COPIES:
        asset = "./src/" + name
        if asset not in files:
            files.append(asset)
    text = text[:hit.start(1)] + json.dumps(files, separators=(",", ":")) + text[hit.end(1):]
    cache = re.search(r"const CACHE='[^']+';", text)
    if not cache:
        raise ValueError("service worker: expected CACHE tag")
    return text[:cache.start()] + "const CACHE='wave-ori-phiwad-0.3.0-" + token + "';" + text[cache.end():]


def prepare(raw):
    if len(raw) > MAX_INPUT:
        raise ValueError("Source archive exceeds input size limit")
    try:
        z = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile as exc:
        raise ValueError("Not a valid ZIP source archive") from exc
    names = z.namelist()
    if len(names) > 500 or len(names) != len(set(names)):
        raise ValueError("Archive file count or duplicate path invalid")
    for name in names:
        parts = name.replace("\\", "/").split("/")
        if name.startswith("/") or "\\" in name or any(part in ("..", ".") for part in parts):
            raise ValueError("Unsafe ZIP source path: " + name)
    candidates = [n for n in names if n.endswith("/src/main.js") and not "/dist/" in n]
    if len(candidates) != 1:
        raise ValueError("Expected one original src/main.js in the game ZIP")
    prefix = candidates[0][:-len("src/main.js")]
    for rel in ("src/main.js", "src/expansion.js", "dist/src/main.js", "dist/src/expansion.js", "dist/sw.js"):
        if prefix + rel not in names:
            raise ValueError("Missing expected game file: " + rel)
    injected = [prefix + side + "src/" + dest
                for side in ("", "dist/") for dest in COPIES]
    if any(name in names for name in injected):
        raise ValueError("Integration files already present; refusing overwrite")
    originals = {name: z.read(name) for name in names if not name.endswith("/")}
    if sum(len(v) for v in originals.values()) > MAX_INPUT * 4:
        raise ValueError("Unpacked input size limit exceeded")
    for side in ("", "dist/"):
        base = prefix + side
        for rel, func in (("src/main.js", patch_main), ("src/expansion.js", patch_expansion)):
            old = originals[base + rel].decode("utf-8")
            if "V0.2.1" not in old and "0.2.1" not in old and rel == "src/main.js":
                # Build identification is intentionally conservative.
                if "SAVE_KEY='mwave-ori-checkpoint-v1'" not in old:
                    raise ValueError("Unrecognized game version at " + base + rel)
            originals[base + rel] = func(old).encode("utf-8")
        for destination, source in COPIES.items():
            originals[base + "src/" + destination] = (ROOT / source).read_bytes()
    sha = hashlib.sha256(b"".join(originals[key] for key in sorted(originals) if "phi-content/" in key)).hexdigest()[:12]
    originals[prefix + "dist/sw.js"] = patch_sw(originals[prefix + "dist/sw.js"].decode("utf-8"), sha).encode("utf-8")
    originals[prefix + "PHIWAD_CUSTOM_MISSIONS.md"] = (
        "# Michael & Ori ΦWAD Custom Missions\n\n"
        "This optional build retains all six original campaign levels, "
        "Xbox controls, and the existing original campaign save key.\n"
        "From the title menu, choose LOAD ΦWAD CUSTOM MISSION and select "
        "a mission-bearing .phiwad exported from PixelForgeStudio.\n"
        "Custom missions use session-only checkpoints and cannot overwrite "
        "campaign storage. Quit or finish to return to the original six-sector campaign.\n"
        "There are no custom doors, textures, or custom scripts. "
        "Only signed-off 29x25 static mission data is accepted. "
        "These features require further integration work.\n"
    ).encode("utf-8")
    return originals, prefix, sha


def build(input_zip, output_zip):
    raw = Path(input_zip).read_bytes()
    records, prefix, build_id = prepare(raw)
    out = Path(output_zip)
    if out.exists():
        raise FileExistsError("Output ZIP already exists; choose another path")
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=7) as z:
        for path in sorted(records):
            z.writestr(path, records[path])
    with zipfile.ZipFile(out) as z:
        if z.testzip():
            raise ValueError("Output ZIP integrity check failed")
    return {
        "status": "built",
        "output": str(out),
        "sourceSHA256": hashlib.sha256(raw).hexdigest(),
        "outputSHA256": hashlib.sha256(out.read_bytes()).hexdigest(),
        "buildId": build_id,
        "root": prefix,
        "originalCampaignUnchanged": True,
        "customSavesSeparated": True,
        "browserPlaytestQualified": False,
    }


def main():
    parser = argparse.ArgumentParser(description="Patch Michael & Ori's downloadable source ZIP for ΦWAD custom missions")
    parser.add_argument("input_zip", type=Path)
    parser.add_argument("output_zip", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(build(args.input_zip, args.output_zip), indent=2))
    except (OSError, ValueError, UnicodeError, zipfile.BadZipFile) as error:
        print("ΦWAD patch aborted: " + str(error), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
