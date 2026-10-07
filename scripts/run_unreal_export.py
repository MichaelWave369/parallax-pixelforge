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
EXECUTOR = ROOT / 'tools' / 'unreal' / 'export_pixelforge_asset.py'
JOB_SCHEMA = 'pixelforge.unreal-export-job.v2'


def editor_cmd(engine_root: Path) -> Path:
    engine = engine_root / 'Engine' if (engine_root / 'Engine').exists() else engine_root
    if platform.system() == 'Windows':
        return engine / 'Binaries' / 'Win64' / 'UnrealEditor-Cmd.exe'
    return engine / 'Binaries' / 'Linux' / 'UnrealEditor-Cmd'


def load_job(job_path: Path) -> dict:
    job = json.loads(job_path.read_text(encoding='utf-8'))
    if job.get('schema') != JOB_SCHEMA or job.get('state') != 'READY_FOR_UNREAL_EXECUTION':
        raise ValueError('Expected a READY_FOR_UNREAL_EXECUTION PixelForge Unreal export job v2.')
    project = Path(job.get('source', {}).get('project_path', ''))
    if project.suffix.lower() != '.uproject':
        raise ValueError('Job source.project_path must point to a .uproject file.')
    if not job.get('source', {}).get('unreal_asset_path'):
        raise ValueError('Job source.unreal_asset_path is missing.')
    return job


def main() -> int:
    ap = argparse.ArgumentParser(description='Plan or execute a PixelForge Unreal export job.')
    ap.add_argument('job')
    ap.add_argument('--engine-root', required=True)
    ap.add_argument('--execute', action='store_true')
    args = ap.parse_args()

    job_path = Path(args.job).expanduser().resolve()
    report = {
        'schema': 'pixelforge.unreal-export-invocation.v1',
        'generated_utc': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'job_path': str(job_path),
        'executed': bool(args.execute),
        'status': 'PLANNED',
        'return_code': None,
    }

    try:
        job = load_job(job_path)
    except Exception as exc:
        report['status'] = 'BLOCKED_JOB_INVALID'
        report['error'] = str(exc)
        print(json.dumps(report, indent=2))
        return 2

    project = Path(job['source']['project_path']).expanduser().resolve()
    editor = editor_cmd(Path(args.engine_root).expanduser().resolve())
    command = [
        str(editor),
        str(project),
        f'-ExecutePythonScript={EXECUTOR}',
        '-unattended',
        '-nop4',
        '-nosplash',
        '-NullRHI',
    ]
    report.update({
        'record_id': job['record_id'],
        'project_path': str(project),
        'editor_cmd': str(editor),
        'executor': str(EXECUTOR),
        'command': command,
    })

    if not project.exists():
        report['status'] = 'BLOCKED_PROJECT_NOT_FOUND'
        rc = 2
    elif not editor.exists():
        report['status'] = 'BLOCKED_TOOL_NOT_FOUND'
        rc = 2
    elif not EXECUTOR.exists():
        report['status'] = 'BLOCKED_EXECUTOR_NOT_FOUND'
        rc = 2
    elif not args.execute:
        report['status'] = 'COMMAND_READY'
        rc = 0
    else:
        env = os.environ.copy()
        env['PIXELFORGE_UNREAL_EXPORT_JOB'] = str(job_path)
        proc = subprocess.run(command, cwd=ROOT, env=env)
        report['return_code'] = proc.returncode
        report['status'] = 'PASS' if proc.returncode == 0 else 'FAIL'
        rc = proc.returncode

    receipt_dir = ROOT / 'local-assets' / 'receipts'
    receipt_dir.mkdir(parents=True, exist_ok=True)
    out = receipt_dir / f"{job['record_id']}.unreal-export-invocation.v1.json"
    out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
    return rc


if __name__ == '__main__':
    raise SystemExit(main())
