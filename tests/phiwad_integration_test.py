import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ori_zip_patch", ROOT / "scripts/install_ori_phiwad.py")
PATCH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PATCH)
PREFIX = "MichaelWave-Ori-BreakTheMatrix/"

MAIN = """import {Game,SECTORS,WEAPONS,CAMPAIGN_HOSTS,clamp,angleDiff} from './core.js';
const SAVE_KEY='mwave-ori-checkpoint-v1';
function saveCheckpoint(){if(game.player.health<=0)return;localStorage.setItem(SAVE_KEY,'x')}
function result(){showScreen('result-screen');}
applySettings();showScreen('title-screen');updateHUD();requestAnimationFrame(frame);
"""
EXPANSION = """export function decorateLevel(level,def,index){
  const theme=THEMES[index];
  return theme.rooms;
}
"""
SW = """const CACHE='wave-ori-old';
const FILES=["./","./index.html","./src/main.js"];
self.addEventListener('fetch',()=>{});
"""


def fixture():
    dest=io.BytesIO()
    with zipfile.ZipFile(dest,"w",zipfile.ZIP_DEFLATED) as z:
        for side in ("", "dist/"):
            base=PREFIX+side
            z.writestr(base+"src/main.js",MAIN)
            z.writestr(base+"src/expansion.js",EXPANSION)
        z.writestr(PREFIX+"dist/sw.js",SW)
        z.writestr(PREFIX+"dist/src/core.js","// Original game code left unchanged.")
    return dest.getvalue()


class PhiWadInstallerTest(unittest.TestCase):
    def test_patch_separates_campaign_saves_and_installs_all_local_dependencies(self):
        result,prefix,sha=PATCH.prepare(fixture())
        self.assertEqual(prefix,PREFIX)
        self.assertEqual(len(sha),12)
        for side in ("","dist/"):
            js=result[PREFIX+side+"src/main.js"].decode()
            self.assertIn("if(game.phiwadCustom)return;",js)
            self.assertIn("installPhiWadLoader(",js)
            self.assertIn("ΦWAD CUSTOM MISSION COMPLETE",js)
            self.assertIn("import {installPhiWadLoader}",js)
            self.assertIn("||{rooms:[],signs:[],props:[]}",result[PREFIX+side+"src/expansion.js"].decode())
            for dest in PATCH.COPIES:
                self.assertIn(PREFIX+side+"src/"+dest,result)
        self.assertIn("phi-content/runtime.js",result[PREFIX+"dist/sw.js"].decode())
        self.assertEqual(result[PREFIX+"dist/src/core.js"],b"// Original game code left unchanged.")

    def test_rejects_version_drift_and_double_patch(self):
        orig=MAIN.replace("function saveCheckpoint(){if(game.player.health<=0)return;","function saveCheckpoint(){return;")
        with self.assertRaisesRegex(ValueError,"campaign save guard"):
            PATCH.patch_main(orig)
        patched=PATCH.patch_main(MAIN)
        with self.assertRaisesRegex(ValueError,"already has"):
            PATCH.patch_main(patched)
        with self.assertRaisesRegex(ValueError,"expected exactly one"):
            PATCH.patch_expansion("export function decorateLevel(){const theme=THEMES[index]}")

    def test_creates_new_zip_preserving_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/"game-source.zip"
            out=Path(tmp)/"ori-phiwad.zip"
            original=fixture()
            source.write_bytes(original)
            receipt=PATCH.build(source,out)
            self.assertTrue(out.exists())
            self.assertEqual(source.read_bytes(),original)
            self.assertTrue(receipt["customSavesSeparated"])
            self.assertFalse(receipt["browserPlaytestQualified"])
            with zipfile.ZipFile(out) as z:
                self.assertIsNone(z.testzip())
                self.assertIn(PREFIX+"PHIWAD_CUSTOM_MISSIONS.md",z.namelist())
            with self.assertRaises(FileExistsError):
                PATCH.build(source,out)


if __name__=="__main__":
    unittest.main()
