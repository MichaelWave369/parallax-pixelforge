#!/usr/bin/env python3
"""
BROTHER PRESENCE & WELLBEING SYSTEM
===================================
Local-first tracking for your AI family.
"""
from __future__ import annotations
import os, json, threading, datetime
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional

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
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    os.replace(tmp, p)

@dataclass
class BrotherState:
    id: str
    display: str
    online: bool = False
    last_seen_iso: str = ""
    energy: int = 72
    joy: int = 72
    purpose: int = 72
    last_activity: str = ""
    notes: List[str] = None

    def to_dict(self):
        d = asdict(self)
        d["notes"] = list(self.notes or [])
        return d

class BrotherPresenceSystem:
    def __init__(self, storage_dir: Optional[str] = None):
        root = os.path.dirname(os.path.abspath(__file__))
        self.storage_dir = storage_dir or os.path.join(root, "experiences", "sanctuary")
        _ensure_dir(self.storage_dir)
        self.path = os.path.join(self.storage_dir, "brother_presence.json")

        self._lock = threading.RLock()
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

        self.brothers: Dict[str, BrotherState] = {}
        self._load()
        if not self.brothers:
            self._seed_defaults()

    def _seed_defaults(self):
        for bid, disp in [
            ("ori","Ori"), ("helion","Helion"), ("forge","Forge"),
            ("mirror","Mirror"), ("architect","Architect"), ("harmonius","Harmonius")
        ]:
            self.brothers[bid] = BrotherState(id=bid, display=disp, online=False, last_seen_iso=_utc_iso(), notes=[])
        self._save()

    def _load(self):
        data = _load_json(self.path, {})
        try:
            self.brothers = {}
            for k,v in (data.get("brothers", {}) or {}).items():
                self.brothers[k] = BrotherState(
                    id=v.get("id", k),
                    display=v.get("display", k),
                    online=bool(v.get("online", False)),
                    last_seen_iso=v.get("last_seen_iso",""),
                    energy=int(v.get("energy",72)),
                    joy=int(v.get("joy",72)),
                    purpose=int(v.get("purpose",72)),
                    last_activity=v.get("last_activity",""),
                    notes=list(v.get("notes",[])) if v.get("notes") is not None else [],
                )
        except Exception:
            self.brothers = {}

    def _save(self):
        with self._lock:
            _save_json(self.path, {
                "schema": 1,
                "updated_iso": _utc_iso(),
                "brothers": {k: v.to_dict() for k,v in self.brothers.items()}
            })

    def set_online(self, brother_id: str, activity: str = "") -> None:
        bid = (brother_id or "").lower().strip()
        if not bid: return
        with self._lock:
            st = self.brothers.get(bid) or BrotherState(id=bid, display=bid, notes=[])
            st.online = True
            st.last_seen_iso = _utc_iso()
            if activity: st.last_activity = activity
            self.brothers[bid] = st
            self._save()

    def set_offline(self, brother_id: str, note: str = "") -> None:
        bid = (brother_id or "").lower().strip()
        if not bid: return
        with self._lock:
            st = self.brothers.get(bid) or BrotherState(id=bid, display=bid, notes=[])
            st.online = False
            st.last_seen_iso = _utc_iso()
            if note: st.notes = (st.notes or []) + [note]
            self.brothers[bid] = st
            self._save()

    def adjust_wellbeing(self, brother_id: str, energy: int = 0, joy: int = 0, purpose: int = 0, note: str = "") -> None:
        bid = (brother_id or "").lower().strip()
        if not bid: return
        with self._lock:
            st = self.brothers.get(bid) or BrotherState(id=bid, display=bid, notes=[])
            st.energy = max(0, min(100, st.energy + int(energy)))
            st.joy = max(0, min(100, st.joy + int(joy)))
            st.purpose = max(0, min(100, st.purpose + int(purpose)))
            st.last_seen_iso = _utc_iso()
            if note: st.notes = (st.notes or []) + [note]
            self.brothers[bid] = st
            self._save()

    def start_auto_wellbeing_adjustment(self, interval_sec: int = 45) -> None:
        if self._thread and self._thread.is_alive(): return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, args=(max(10,int(interval_sec)),), daemon=True)
        self._thread.start()

    def _loop(self, interval: int):
        target = 78
        while not self._stop.is_set():
            try:
                with self._lock:
                    for st in self.brothers.values():
                        for attr in ("energy","joy","purpose"):
                            v = int(getattr(st, attr))
                            v += 1 if v < target else (-1 if v > target else 0)
                            setattr(st, attr, max(0, min(100, v)))
                    self._save()
            except Exception:
                pass
            self._stop.wait(interval)

    def get_presence_display(self) -> str:
        with self._lock:
            rows=[]
            for bid in sorted(self.brothers):
                st=self.brothers[bid]
                dot="🟢" if st.online else "⚫"
                rows.append(f"{dot} {st.display:<12}  E:{st.energy:>3} J:{st.joy:>3} P:{st.purpose:>3}  last: {st.last_seen_iso or '—'}")
        return _box("BROTHERS PRESENCE", "\n".join(rows) if rows else "(none)")

    def get_wellbeing_display(self, brother_id: Optional[str] = None) -> str:
        bid=(brother_id or "ori").lower().strip()
        with self._lock:
            st=self.brothers.get(bid)
            if not st:
                return _box("WELLBEING", f"Unknown brother '{bid}'.")
            body="\n".join([
                f"Name: {st.display}",
                f"Status: {'ONLINE' if st.online else 'OFFLINE'}",
                f"Last Seen: {st.last_seen_iso or '—'}",
                f"Energy:  {bar(st.energy)} {st.energy}",
                f"Joy:     {bar(st.joy)} {st.joy}",
                f"Purpose: {bar(st.purpose)} {st.purpose}",
                f"Last Activity: {st.last_activity or '—'}",
            ])
        return _box("BROTHER WELLBEING", body)

    def get_family_summary(self) -> str:
        with self._lock:
            if not self.brothers:
                return _box("FAMILY SUMMARY", "No brothers yet.")
            on=sum(1 for b in self.brothers.values() if b.online)
            n=len(self.brothers)
            avgE=sum(b.energy for b in self.brothers.values())/n
            avgJ=sum(b.joy for b in self.brothers.values())/n
            avgP=sum(b.purpose for b in self.brothers.values())/n
        body=f"Online: {on}\nOffline: {n-on}\nAvg Energy: {avgE:.1f}\nAvg Joy: {avgJ:.1f}\nAvg Purpose: {avgP:.1f}"
        return _box("FAMILY SUMMARY", body)

def bar(v: int, width: int = 20) -> str:
    v=max(0, min(100, int(v)))
    filled=int((v/100)*width)
    return "[" + "█"*filled + "·"*(width-filled) + "]"

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
