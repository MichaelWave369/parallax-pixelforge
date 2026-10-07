"""Discover candidate Unreal object paths for one governed PixelForge record.

Runs inside Unreal Editor. It only inventories /Game assets and emits ranked
candidates. It never chooses a candidate, exports content, changes governance,
or writes to the Unreal project.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import unreal


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def normalize(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', value.lower())


def tokens(value: str) -> list[str]:
    return [part for part in re.split(r'[^a-z0-9]+', value.lower()) if len(part) >= 3]


def candidate_score(asset_path: str, query: str) -> int:
    path_lower=asset_path.lower()
    leaf=asset_path.rsplit('/',1)[-1]
    leaf_norm=normalize(leaf)
    query_norm=normalize(query)
    score=0
    if leaf_norm==query_norm:
        score+=1000
    if query_norm and query_norm in normalize(asset_path):
        score+=250
    query_tokens=tokens(query)
    for token in query_tokens:
        if token in leaf.lower():
            score+=80
        elif token in path_lower:
            score+=30
    score=max(score-(asset_path.count('/')*2),0)
    return score


def main() -> int:
    record_id=os.environ.get('PIXELFORGE_UNREAL_DISCOVERY_RECORD_ID','').strip()
    query=os.environ.get('PIXELFORGE_UNREAL_DISCOVERY_QUERY','').strip()
    limit=int(os.environ.get('PIXELFORGE_UNREAL_DISCOVERY_LIMIT','25'))
    receipt_env=os.environ.get('PIXELFORGE_UNREAL_DISCOVERY_RECEIPT','').strip()

    if not record_id or not query or not receipt_env:
        unreal.log_error('[PIXELFORGE DISCOVERY] Required discovery environment variables are missing.')
        return 2

    receipt_path=Path(receipt_env).expanduser().resolve()
    receipt_path.parent.mkdir(parents=True,exist_ok=True)

    try:
        all_assets=unreal.EditorAssetLibrary.list_assets('/Game', recursive=True, include_folder=False)
        ranked=[]
        for asset_path in all_assets:
            score=candidate_score(str(asset_path),query)
            if score<=0:
                continue
            class_name='UNKNOWN'
            try:
                asset=unreal.load_asset(asset_path)
                if asset is not None and asset.get_class() is not None:
                    class_name=asset.get_class().get_name()
            except Exception:
                pass
            ranked.append({
                'unreal_asset_path':str(asset_path),
                'score':score,
                'asset_class':class_name,
            })

        ranked.sort(key=lambda item:(-item['score'],item['unreal_asset_path'].lower()))
        candidates=ranked[:limit]
        status='CANDIDATES_FOUND' if candidates else 'NO_CANDIDATES_FOUND'
        receipt={
            'schema':'pixelforge.unreal-asset-discovery.v1',
            'generated_utc':now_utc(),
            'status':status,
            'record_id':record_id,
            'query':query,
            'searched_root':'/Game',
            'scanned_asset_count':len(all_assets),
            'candidate_count':len(candidates),
            'candidates':candidates,
            'boundary':'Discovery ranks possible Unreal object paths only. A human/operator must choose the intended asset before binding or export.',
        }
        rc=0 if candidates else 1
    except Exception as exc:
        receipt={
            'schema':'pixelforge.unreal-asset-discovery.v1',
            'generated_utc':now_utc(),
            'status':'FAIL',
            'record_id':record_id,
            'query':query,
            'searched_root':'/Game',
            'candidate_count':0,
            'candidates':[],
            'error':repr(exc),
            'boundary':'Discovery failure changes no source record, compatibility state, or project content.',
        }
        unreal.log_error(f'[PIXELFORGE DISCOVERY] {exc!r}')
        rc=1

    receipt_path.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    unreal.log(f'[PIXELFORGE DISCOVERY] {receipt["status"]} -> {receipt_path}')
    return rc


raise SystemExit(main())
