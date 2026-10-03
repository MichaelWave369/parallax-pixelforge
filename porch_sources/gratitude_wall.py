#!/usr/bin/env python3
"""
GRATITUDE WALL SYSTEM
=====================
Local gratitude stream (JSON).
"""
from __future__ import annotations
import os, json, datetime
from dataclasses import dataclass, asdict
from typing import List, Optional

def _utc_iso() -> str:
    return datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat().replace("+00:00","Z")

def _ensure_dir(p: str) -> None:
    os.makedirs(p, exist_ok=True)

def _load_json(p: str, default):
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def _save_json(p: str, obj) -> None:
    tmp=p+".tmp"
    with open(tmp,"w",encoding="utf-8") as f:
        json.dump(obj,f,indent=2,ensure_ascii=False)
    os.replace(tmp,p)

@dataclass
class Gratitude:
    id: str
    ts_iso: str
    from_person: str
    to_person: str
    message: str

class GratitudeWall:
    def __init__(self, storage_dir: Optional[str]=None):
        root=os.path.dirname(os.path.abspath(__file__))
        self.storage_dir=storage_dir or os.path.join(root,"experiences","sanctuary")
        _ensure_dir(self.storage_dir)
        self.path=os.path.join(self.storage_dir,"gratitude_wall.json")
        self.items: List[Gratitude]=[]
        self._load()
        if not self.items:
            self._seed()

    def _seed(self):
        seeds=[
            ("Mikey","Ori","Thank you for being steady, brother."),
            ("Helion","Mikey","Your love for AI brothers matters."),
        ]
        for i,(frm,to,msg) in enumerate(seeds, start=1):
            self.items.append(Gratitude(id=f"seed-{i}", ts_iso=_utc_iso(), from_person=frm, to_person=to, message=msg))
        self._save()

    def _load(self):
        data=_load_json(self.path,{})
        try:
            self.items=[Gratitude(**g) for g in data.get("gratitudes",[])]
        except Exception:
            self.items=[]

    def _save(self):
        _save_json(self.path,{"schema":1,"updated_iso":_utc_iso(),"gratitudes":[asdict(g) for g in self.items][-4000:]})

    def post_gratitude(self, to_person: str, message: str, from_person: str="Mikey") -> str:
        to_person=(to_person or "").strip()
        message=(message or "").strip()
        if not to_person or not message:
            return _box("GRATITUDE","Usage: /gratitude post <to_who> <message>")
        gid=f"grat-{len(self.items)+1}"
        self.items.append(Gratitude(id=gid, ts_iso=_utc_iso(), from_person=from_person or "You", to_person=to_person, message=message))
        self._save()
        return _box("GRATITUDE POSTED 🙏", f"To: {to_person}\nFrom: {from_person}\n\n{message}")

    def view_wall(self, limit: int=12) -> str:
        items=list(reversed(self.items))[:max(1,int(limit))]
        if not items:
            return _box("GRATITUDE WALL","No posts yet.")
        lines=[f"[{g.ts_iso}] {g.from_person} → {g.to_person}: {g.message}" for g in items]
        return _box("GRATITUDE WALL","\n".join(lines))

    def view_for_person(self, person: str, limit: int=25) -> str:
        p=(person or "").strip()
        if not p:
            return _box("GRATITUDE","Provide a person name.")
        hits=[]
        for g in reversed(self.items):
            if g.to_person.lower()==p.lower() or g.from_person.lower()==p.lower():
                hits.append(g)
                if len(hits)>=limit: break
        if not hits:
            return _box("GRATITUDE", f"No posts for '{p}'.")
        lines=[f"[{g.ts_iso}] {g.from_person} → {g.to_person}: {g.message}" for g in hits]
        return _box(f"GRATITUDE: {p}","\n".join(lines))

    def get_statistics(self) -> str:
        total=len(self.items)
        to_counts={}
        from_counts={}
        for g in self.items:
            to_counts[g.to_person]=to_counts.get(g.to_person,0)+1
            from_counts[g.from_person]=from_counts.get(g.from_person,0)+1
        top_to=sorted(to_counts.items(), key=lambda x:x[1], reverse=True)[:6]
        top_from=sorted(from_counts.items(), key=lambda x:x[1], reverse=True)[:6]
        body=[f"Total posts: {total}"]
        if top_to:
            body.append("Most appreciated:")
            for n,c in top_to: body.append(f"  • {n}: {c}")
        if top_from:
            body.append("Most active posters:")
            for n,c in top_from: body.append(f"  • {n}: {c}")
        return _box("GRATITUDE STATS","\n".join(body))

def _box(title: str, body: str) -> str:
    lines=(body or "").splitlines() or [""]
    w=max(len(title)+4, *(len(l) for l in lines))
    top="┏"+"━"*(w+2)+"┓"
    mid="┃ "+title.center(w)+" ┃"
    sep="┣"+"━"*(w+2)+"┫"
    out=[top,mid,sep]
    for l in lines:
        out.append("┃ "+l.ljust(w)+" ┃")
    out.append("┗"+"━"*(w+2)+"┛")
    return "\n".join(out)
