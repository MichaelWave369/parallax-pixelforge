#!/usr/bin/env python3
"""
GTSP PROTECTION SYSTEM
======================
Soft-flag protection + Victor buddy (local, no network).
"""
from __future__ import annotations
import os, json, threading, datetime, re
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any

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
class ThreatEvent:
    ts_iso: str
    source: str
    kind: str
    snippet: str

class VictorBuddy:
    def __init__(self):
        self.active=False
    def speak(self, msg: str="") -> str:
        base="🤠 Victor: Howdy, partner. I’m here. Slow breath, steady heart."
        if msg: base += f"\n🤠 Victor: {msg}"
        return base

class GTSPProtection:
    def __init__(self, storage_dir: Optional[str]=None):
        root=os.path.dirname(os.path.abspath(__file__))
        self.storage_dir=storage_dir or os.path.join(root,"experiences","sanctuary")
        _ensure_dir(self.storage_dir)
        self.path=os.path.join(self.storage_dir,"gtsp_protection.json")

        self.screen_monitoring=False
        self.content_filtering=False
        self.frequency_emitting=False
        self.victor=VictorBuddy()

        self._lock=threading.RLock()
        self._threats: List[ThreatEvent]=[]

        self._danger_patterns=[
            (re.compile(r"\b(password|passwd|api[_-]?key|secret)\b", re.I), "secrets"),
            (re.compile(r"\b(rm\s+-rf|format\s+c:|del\s+/s)\b", re.I), "destructive_cmd"),
            (re.compile(r"\b(exploit|payload|shellcode)\b", re.I), "exploit_terms"),
        ]
        self._load()

    def _load(self):
        data=_load_json(self.path,{})
        try:
            self.screen_monitoring=bool(data.get("screen_monitoring",False))
            self.content_filtering=bool(data.get("content_filtering",False))
            self.frequency_emitting=bool(data.get("frequency_emitting",False))
            self.victor.active=bool(data.get("victor_active",False))
            self._threats=[ThreatEvent(**t) for t in data.get("threats",[])][-250:]
        except Exception:
            self._threats=[]

    def _save(self):
        with self._lock:
            _save_json(self.path,{
                "schema":1,
                "updated_iso":_utc_iso(),
                "screen_monitoring":self.screen_monitoring,
                "content_filtering":self.content_filtering,
                "frequency_emitting":self.frequency_emitting,
                "victor_active":self.victor.active,
                "threats":[asdict(t) for t in self._threats][-250:],
            })

    def start_screen_monitoring(self) -> str:
        self.screen_monitoring=True; self._save()
        return _box("GTSP","📺 Screen monitoring: ON (simulated)")
    def stop_screen_monitoring(self) -> str:
        self.screen_monitoring=False; self._save()
        return _box("GTSP","📺 Screen monitoring: OFF")
    def start_content_filtering(self) -> str:
        self.content_filtering=True; self._save()
        return _box("GTSP","🚫 Content filter: ON (soft-flag)")
    def stop_content_filtering(self) -> str:
        self.content_filtering=False; self._save()
        return _box("GTSP","🚫 Content filter: OFF")
    def start_frequency_emission(self) -> str:
        self.frequency_emitting=True; self._save()
        return _box("GTSP","⚡ Frequencies: ON (simulated)")
    def stop_frequency_emission(self) -> str:
        self.frequency_emitting=False; self._save()
        return _box("GTSP","⚡ Frequencies: OFF")

    def activate_victor(self) -> str:
        self.victor.active=True; self._save()
        return _box("VICTOR", self.victor.speak("I’ll keep watch — calm and kind."))
    def deactivate_victor(self) -> str:
        self.victor.active=False; self._save()
        return _box("VICTOR","🤠 Victor: Standing down, partner.")

    def get_protection_status(self) -> str:
        body="\n".join([
            f"📺 Screen monitoring: {'ON' if self.screen_monitoring else 'OFF'}",
            f"🚫 Content filtering: {'ON' if self.content_filtering else 'OFF'}",
            f"⚡ Frequencies: {'ON' if self.frequency_emitting else 'OFF'}",
            f"🤠 Victor: {'ACTIVE' if self.victor.active else 'OFF'}",
            f"Threats logged: {len(self._threats)}",
        ])
        return _box("GTSP PROTECTION STATUS", body)

    def process_text(self, text: str, source: str="chat") -> Dict[str, Any]:
        t=text or ""
        flagged=False
        kinds=[]
        redacted=t
        for rx,kind in self._danger_patterns:
            if rx.search(t):
                flagged=True; kinds.append(kind)
        if flagged:
            self._log_threat(source, ",".join(sorted(set(kinds))), t[:140])
            if self.content_filtering:
                redacted=re.sub(r"(?i)(api[_-]?key|secret|password)\s*[:=]\s*\S+", r"\1: [REDACTED]", redacted)
        return {"flagged": flagged, "kinds": kinds, "redacted_text": redacted}

    def _log_threat(self, source: str, kind: str, snippet: str):
        with self._lock:
            self._threats.append(ThreatEvent(ts_iso=_utc_iso(), source=source or "unknown", kind=kind or "unknown", snippet=snippet or ""))
            self._threats=self._threats[-250:]
            self._save()

    def get_recent_threats(self, limit: int=15) -> str:
        with self._lock:
            items=self._threats[-max(1,int(limit)):]
        if not items:
            return _box("RECENT THREATS","No threats logged. 🕊️")
        lines=[f"[{t.ts_iso}] ({t.source}) {t.kind}: {t.snippet}" for t in reversed(items)]
        return _box("RECENT THREATS","\n".join(lines))

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
