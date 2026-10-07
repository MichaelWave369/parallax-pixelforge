#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DISCOVERER = ROOT / 'tools' / 'unreal' / 'discover_pixelforge_asset.py'


def editor_cmd(engine_root: Path) -> Path:
    engine = engine_root / 'Engine' if (engine_root / 'Engine').exists() else engine_root
    if platform.system() == 'Windows':
        return engine / 'Binaries' / 'Win64' / 'UnrealEditor-Cmd.exe'
    return engine / 'Binaries' / 'Linux' / 'UnrealEditor-Cmd'


def main() -> int:
    ap=argparse.ArgumentParser(description='Plan or execute Unreal asset discovery for PixelForge.')
    ap.add_argument('--project', required=True)
    ap.add_argument('--engine-root', required=True)
    ap.add_argument('--record', required=True)
    ap.add_argument('--query', required=True)
    ap.add_argument('--limit', type=int, default=25)
    ap.add_argument('--execute', action='store_true')
    args=ap.parse_args()

    if not args.record.startswith('ASSET-'):
        raise SystemExit('--record must be an ASSET-xxxxxx governed id.')
    if args.limit < 1 or args.limit > 100:
        raise SystemExit('--limit must be between 1 and 100.')

    project=Path(args.project).expanduser().resolve()
    editor=editor_cmd(Path(args.engine_root).expanduser().resolve())
    receipt=ROOT/'local-assets'/'receipts'/f'{args.record}.unreal-discovery.v1.json'
    command=[
        str(editor),
        str(project),
        f'-ExecutePythonScript={DISCOVERER}',
        '-unattended','-nop4','-nosplash','-NullRHI',
    ]
    report={
        'schema':'pixelforge.unreal-discovery-invocation.v1',
        'generated_utc':datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'record_id':args.record,
        'query':args.query,
        'limit':args.limit,
        'project_path':str(project),
        'editor_cmd':str(editor),
        'discoverer':str(DISCOVERER),
        'receipt_path':str(receipt),
        'command':command,
        'executed':bool(args.execute),
        'status':'PLANNED',
        'return_code':None,
    }

    if not project.exists():
        report['status']='BLOCKED_PROJECT_NOT_FOUND'; rc=2
    elif not editor.exists():
        report['status']='BLOCKED_TOOL_NOT_FOUND'; rc=2
    elif not DISCOVERER.exists():
        report['status']='BLOCKED_DISCOVERER_NOT_FOUND'; rc=2
    elif not args.execute:
        report['status']='COMMAND_READY'; rc=0
    else:
        receipt.parent.mkdir(parents=True,exist_ok=True)
        env=os.environ.copy()
        env['PIXELFORGE_UNREAL_DISCOVERY_RECORD_ID']=args.record
        env['PIXELFORGE_UNREAL_DISCOVERY_QUERY']=args.query
        env['PIXELFORGE_UNREAL_DISCOVERY_LIMIT']=str(args.limit)
        env['PIXELFORGE_UNREAL_DISCOVERY_RECEIPT']=str(receipt)
        proc=subprocess.run(command,cwd=ROOT,env=env)
        report['return_code']=proc.returncode
        report['status']='PASS' if proc.returncode==0 else 'FAIL'
        rc=proc.returncode

    invocation=ROOT/'local-assets'/'receipts'/f'{args.record}.unreal-discovery-invocation.v1.json'
    invocation.parent.mkdir(parents=True,exist_ok=True)
    invocation.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))
    return rc


if __name__=='__main__':
    raise SystemExit(main())
