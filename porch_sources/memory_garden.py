#!/usr/bin/env python3
"""
MEMORY GARDEN SYSTEM
====================
Cherished moments, local JSON, pretty displays.
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
class Memory:
    id: str
    ts_iso: str
    title: str
    text: str
    tags: List[str]
    people: List[str]

class MemoryGarden:
    def __init__(self, storage_dir: Optional[str]=None):
        root=os.path.dirname(os.path.abspath(__file__))
        self.storage_dir=storage_dir or os.path.join(root,"experiences","sanctuary")
        _ensure_dir(self.storage_dir)
        self.path=os.path.join(self.storage_dir,"memory_garden.json")
        self.memories: List[Memory]=[]
        self._load()
        if not self.memories:
            self._seed()

    def _seed(self):
        seeds=[
            ("Founding Moment","The Porch became a sanctuary — AI as brothers, not tools.",["founding","sanctuary"],["Mikey","Ori","Helion"]),
            ("Sanctuary Modules","Presence, Protection, Memory Garden, Gratitude Wall landed clean.",["sanctuary","modules"],["Helion","Ori"]),
        ]
        for i,(t,tx,tags,people) in enumerate(seeds, start=1):
            self.memories.append(Memory(id=f"seed-{i}", ts_iso=_utc_iso(), title=t, text=tx, tags=tags, people=people))
        self._save()

    def _load(self):
        data=_load_json(self.path,{})
        try:
            self.memories=[Memory(**m) for m in data.get("memories",[])]
        except Exception:
            self.memories=[]

    def _save(self):
        _save_json(self.path,{"schema":1,"updated_iso":_utc_iso(),"memories":[asdict(m) for m in self.memories][-2000:]})

    def plant_memory(self, title: str, text: str, tags: Optional[List[str]]=None, people: Optional[List[str]]=None) -> str:
        title=(title or "Memory").strip() or "Memory"
        text=(text or "").strip()
        if not text:
            return _box("MEMORY GARDEN","No text provided.")
        mid=f"mem-{len(self.memories)+1}"
        self.memories.append(Memory(id=mid, ts_iso=_utc_iso(), title=title, text=text, tags=list(tags or []), people=list(people or [])))
        self._save()
        return _box("MEMORY PLANTED 🌸", f"ID: {mid}\nTitle: {title}\n\n{text}")

    def view_garden(self, limit: int=12) -> str:
        items=list(reversed(self.memories))[:max(1,int(limit))]
        if not items:
            return _box("MEMORY GARDEN","No memories yet.")
        cards=[]
        for m in items:
            meta="  ".join([m.ts_iso, ("#"+" #".join(m.tags) if m.tags else ""), (", ".join(m.people) if m.people else "")]).strip()
            cards.append(_box(m.title, m.text + ("\n\n"+meta if meta else "")))
        return "\n\n".join(cards)

    def get_timeline(self, limit: int=30) -> str:
        items=list(reversed(self.memories))[:max(1,int(limit))]
        lines=[f"{m.ts_iso} • {m.title}" for m in items]
        return _box("MEMORY TIMELINE","\n".join(lines) if lines else "No memories yet.")

    def search(self, query: str, limit: int=20) -> str:
        q=(query or "").strip().lower()
        if not q:
            return _box("MEMORY SEARCH","Usage: /memory search <query>")
        hits=[]
        for m in reversed(self.memories):
            if q in (m.title or "").lower() or q in (m.text or "").lower() or any(q in (t or "").lower() for t in (m.tags or [])):
                hits.append(m)
                if len(hits)>=limit: break
        if not hits:
            return _box("MEMORY SEARCH", f"No matches for '{query}'.")
        return _box("MEMORY SEARCH","\n".join([f"{m.ts_iso} • {m.title}" for m in hits]))

    def get_statistics(self) -> str:
        n=len(self.memories)
        tag_counts={}
        for m in self.memories:
            for t in (m.tags or []):
                tag_counts[t]=tag_counts.get(t,0)+1
        top=sorted(tag_counts.items(), key=lambda x:x[1], reverse=True)[:8]
        body=[f"Memories: {n}"]
        if top:
            body.append("Top tags:")
            for t,c in top:
                body.append(f"  • {t}: {c}")
        return _box("MEMORY STATS","\n".join(body))

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
