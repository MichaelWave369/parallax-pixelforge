# secure_layer.py
from __future__ import annotations

import asyncio
import ipaddress
import logging
import os
import secrets
import subprocess
import threading
import time
import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, Optional

_LOG = logging.getLogger("porch.secure")
if not _LOG.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    _LOG.addHandler(_h)
_LOG.setLevel(logging.WARNING if os.getenv("PORCH_SECURE_DEBUG") not in ("1", "true", "yes", "on") else logging.INFO)


class SecurityError(RuntimeError):
    pass


def _truthy(v: str) -> bool:
    return (v or "").strip().lower() in ("1", "true", "yes", "y", "on", "enable", "enabled")


def _is_loopback_host(host: str) -> bool:
    h = (host or "").strip()
    if not h:
        return False
    if h in ("localhost", "127.0.0.1", "::1"):
        return True
    try:
        ip = ipaddress.ip_address(h)
        return ip.is_loopback
    except Exception:
        return False


def _is_private_or_loopback_host(host: str) -> bool:
    h = (host or "").strip()
    if h in ("localhost", "127.0.0.1", "::1"):
        return True
    try:
        ip = ipaddress.ip_address(h)
        return ip.is_private or ip.is_loopback
    except Exception:
        return False


def _parse_host(url_or_host: str) -> str:
    s = (url_or_host or "").strip()
    if not s:
        return ""
    if "://" in s:
        try:
            return urllib.parse.urlparse(s).hostname or ""
        except Exception:
            return ""
    return s


def _atomic_write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


@dataclass(frozen=True)
class SecurityConfig:
    well_root: Path
    allow_network: bool = False
    allow_lan: bool = False
    max_read_bytes: int = 50 * 1024 * 1024
    max_write_bytes: int = 10 * 1024 * 1024
    max_ws_message_bytes: int = 2 * 1024 * 1024
    bifrost_host: str = "127.0.0.1"
    bifrost_port: int = 8765
    bifrost_token: str = ""

    @staticmethod
    def from_env(well_root: Optional[str] = None) -> "SecurityConfig":
        root = Path(well_root or os.getenv("PORCH_WELL") or "./well").resolve()
        allow_network = _truthy(os.getenv("PORCH_ALLOW_NETWORK", ""))
        allow_lan = _truthy(os.getenv("PORCH_ALLOW_LAN", ""))
        host = os.getenv("PORCH_BIFROST_HOST") or "127.0.0.1"
        port_s = os.getenv("PORCH_BIFROST_PORT") or "8765"
        try:
            port = int(port_s)
        except Exception:
            port = 8765
        tok = os.getenv("PORCH_BIFROST_TOKEN") or ""
        return SecurityConfig(
            well_root=root,
            allow_network=allow_network,
            allow_lan=allow_lan,
            bifrost_host=host,
            bifrost_port=port,
            bifrost_token=tok,
        )


class _PathSandbox:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    def _resolve_for_write(self, p: str | Path) -> Path:
        path = Path(p)
        if not path.is_absolute():
            path = (self.root / path)
        # Resolve without requiring existence:
        try:
            rp = path.resolve()
        except Exception:
            rp = Path(os.path.abspath(str(path)))
        try:
            rr = self.root.resolve()
        except Exception:
            rr = Path(os.path.abspath(str(self.root)))

        # Disallow writing outside root
        if rr not in rp.parents and rp != rr:
            raise SecurityError(f"Refusing to write outside WELL root: {rp}")

        # Disallow following symlinks to outside root
        if rp.exists():
            try:
                real = Path(os.path.realpath(str(rp)))
                if rr not in real.parents and real != rr:
                    raise SecurityError(f"Refusing to write through symlink outside WELL root: {rp}")
            except Exception:
                pass
        return rp

    def _resolve_for_read(self, p: str | Path) -> Path:
        path = Path(p)
        if not path.is_absolute():
            path = (self.root / path)
        try:
            return path.resolve()
        except Exception:
            return Path(os.path.abspath(str(path)))


class NetworkGate:
    def __init__(self, allow_network: bool, allow_lan: bool) -> None:
        self.allow_network = bool(allow_network)
        self.allow_lan = bool(allow_lan)

    def assert_allowed(self, url_or_host: str) -> None:
        host = _parse_host(url_or_host)
        if not host:
            raise SecurityError("Refusing network call: missing host")
        if _is_loopback_host(host):
            return
        if self.allow_lan and _is_private_or_loopback_host(host):
            return
        if self.allow_network:
            return
        raise SecurityError(f"Network is OFF. Refusing outbound call to: {host}")


class SecureRequests:
    def __init__(self, gate: NetworkGate) -> None:
        self.gate = gate
        self._patched = False
        self._orig: Optional[Callable[..., Any]] = None

    def patch_requests(self) -> bool:
        try:
            import requests  # type: ignore
        except Exception:
            return False

        if self._patched:
            return True

        orig = requests.sessions.Session.request  # type: ignore[attr-defined]
        self._orig = orig

        def wrapped(session, method, url, *a, **kw):  # type: ignore[no-untyped-def]
            self.gate.assert_allowed(str(url))
            return orig(session, method, url, *a, **kw)

        requests.sessions.Session.request = wrapped  # type: ignore[attr-defined]
        self._patched = True
        return True


class SecureSubprocess:
    def __init__(self, allow_lan: bool) -> None:
        self.allow_lan = bool(allow_lan)
        self._patched = False
        self._orig: Optional[Callable[..., Any]] = None

    def patch_popen(self) -> bool:
        if self._patched:
            return True
        orig = subprocess.Popen
        self._orig = orig

        def wrapped(cmd, *a, **kw):  # type: ignore[no-untyped-def]
            try:
                if isinstance(cmd, (list, tuple)) and cmd:
                    exe = str(cmd[0]).lower()
                    if "kiwix-serve" in exe:
                        # Force localhost bind unless explicitly allowing LAN
                        if not self.allow_lan:
                            if "--address" not in cmd and "-a" not in cmd:
                                cmd = list(cmd)
                                cmd.insert(1, "--address")
                                cmd.insert(2, "127.0.0.1")
            except Exception:
                pass
            return orig(cmd, *a, **kw)

        subprocess.Popen = wrapped  # type: ignore[assignment]
        self._patched = True
        return True


class _SecureBifrostServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 8765, token: str = "", allow_lan: bool = False,
                 max_msg_bytes: int = 2 * 1024 * 1024) -> None:
        self.host = host or "127.0.0.1"
        self.port = int(port or 8765)
        self.allow_lan = bool(allow_lan)
        self.max_msg_bytes = int(max_msg_bytes)
        self._token = (token or "").strip()
        self._thread: Optional[threading.Thread] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._server = None
        self._clients = set()
        self._started = threading.Event()

    def _ensure_token(self, well_root: Path) -> str:
        if self._token:
            return self._token
        p = well_root / "keys" / "bifrost_token.txt"
        try:
            if p.exists():
                self._token = p.read_text(encoding="utf-8").strip()
                if self._token:
                    return self._token
        except Exception:
            pass
        self._token = secrets.token_urlsafe(32)
        try:
            _atomic_write_bytes(p, (self._token + "\n").encode("utf-8"))
        except Exception:
            pass
        return self._token

    def start(self, well_root: Optional[str | Path] = None) -> bool:
        try:
            import websockets  # type: ignore
        except Exception:
            return False

        if not self.allow_lan and not _is_loopback_host(self.host):
            raise SecurityError(f"Bifrost host must be loopback unless PORCH_ALLOW_LAN=1 (host={self.host})")

        well = Path(well_root or os.getenv("PORCH_WELL") or "./well").resolve()
        tok = self._ensure_token(well)

        async def handler(ws, path):  # type: ignore[no-untyped-def]
            # token from query string: ws://host:port/?token=...
            try:
                parsed = urllib.parse.urlparse(path or "")
                q = urllib.parse.parse_qs(parsed.query or "")
                qtok = (q.get("token") or [""])[0]
            except Exception:
                qtok = ""
            authed = (qtok == tok)

            try:
                if not authed:
                    # allow first message auth
                    msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    if isinstance(msg, (bytes, bytearray)):
                        msg = msg.decode("utf-8", "ignore")
                    try:
                        import json
                        obj = json.loads(msg)
                        if isinstance(obj, dict) and obj.get("type") == "auth" and str(obj.get("token", "")) == tok:
                            authed = True
                    except Exception:
                        authed = False
            except Exception:
                authed = False

            if not authed:
                try:
                    await ws.close(code=1008, reason="auth required")
                except Exception:
                    pass
                return

            self._clients.add(ws)
            try:
                async for _ in ws:
                    # This server is broadcast-only by default; ignore inbound.
                    pass
            except Exception:
                pass
            finally:
                try:
                    self._clients.discard(ws)
                except Exception:
                    pass

        async def runner():  # type: ignore[no-untyped-def]
            import websockets  # type: ignore
            self._server = await websockets.serve(
                handler,
                self.host,
                self.port,
                max_size=self.max_msg_bytes,
                ping_interval=20,
                ping_timeout=20,
                close_timeout=5,
            )
            self._started.set()
            await self._server.wait_closed()

        def thread_main():  # type: ignore[no-untyped-def]
            loop = asyncio.new_event_loop()
            self._loop = loop
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(runner())
            finally:
                try:
                    loop.stop()
                    loop.close()
                except Exception:
                    pass

        if self._thread and self._thread.is_alive():
            return True

        self._started.clear()
        self._thread = threading.Thread(target=thread_main, daemon=True)
        self._thread.start()
        self._started.wait(timeout=3.0)
        return True

    def stop(self) -> None:
        try:
            if self._loop and self._server:
                self._loop.call_soon_threadsafe(self._server.close)
        except Exception:
            pass

    def status(self) -> str:
        try:
            n = len(self._clients)
        except Exception:
            n = 0
        return f"ws://{self.host}:{self.port} (clients={n})"

    def broadcast(self, obj: Dict[str, Any]) -> int:
        try:
            import json
            payload = json.dumps(obj, ensure_ascii=False)
        except Exception:
            payload = str(obj)

        async def _send_all():  # type: ignore[no-untyped-def]
            dead = []
            for ws in list(self._clients):
                try:
                    await ws.send(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                try:
                    self._clients.discard(ws)
                except Exception:
                    pass
            return len(self._clients)

        if not self._loop:
            return 0
        fut = asyncio.run_coroutine_threadsafe(_send_all(), self._loop)
        try:
            return int(fut.result(timeout=2.0))
        except Exception:
            return 0


def apply_secure_patches(target_module: Optional[Any] = None) -> SecurityConfig:
    import __main__

    m = target_module or __main__
    cfg = SecurityConfig.from_env(getattr(m, "WELL_FOLDER", None))
    sandbox = _PathSandbox(cfg.well_root)
    gate = NetworkGate(cfg.allow_network, cfg.allow_lan)

    # File IO: tighten writes into WELL; keep reads permissive but size-limited.
    def _read_bytes(path: str) -> bytes:  # type: ignore[no-untyped-def]
        p = Path(path)
        if not p.exists() or not p.is_file():
            return b""
        try:
            size = p.stat().st_size
            if size > cfg.max_read_bytes:
                raise SecurityError(f"Refusing to read huge file ({size} bytes): {p}")
        except SecurityError:
            raise
        except Exception:
            pass
        return p.read_bytes()

    def _write_bytes(path: str, data: bytes) -> None:  # type: ignore[no-untyped-def]
        if data is None:
            data = b""
        if not isinstance(data, (bytes, bytearray)):
            raise SecurityError("write_bytes expects bytes")
        if len(data) > cfg.max_write_bytes:
            raise SecurityError(f"Refusing to write huge blob ({len(data)} bytes)")
        p = sandbox._resolve_for_write(path)
        _atomic_write_bytes(p, bytes(data))

    def _write_text(path: str, text: str, encoding: str = "utf-8") -> None:  # type: ignore[no-untyped-def]
        b = (text or "").encode(encoding, "replace")
        _write_bytes(path, b)

    for name, fn in (("_read_bytes", _read_bytes), ("_write_bytes", _write_bytes), ("_write_text", _write_text)):
        try:
            if hasattr(m, name):
                setattr(m, name, fn)
        except Exception:
            pass

    # Requests: block outbound unless allowed (loopback always allowed).
    SecureRequests(gate).patch_requests()

    # Subprocess: lock kiwix-serve to localhost unless allowing LAN.
    SecureSubprocess(cfg.allow_lan).patch_popen()

    # Bifrost: enforce localhost binding + token auth.
    try:
        if hasattr(m, "_PorchBifrostServer"):
            def _factory(*a, **kw):  # type: ignore[no-untyped-def]
                host = kw.get("host") or (a[0] if a else cfg.bifrost_host)
                port = kw.get("port") or (a[1] if len(a) > 1 else cfg.bifrost_port)
                token = os.getenv("PORCH_BIFROST_TOKEN") or cfg.bifrost_token or ""
                return _SecureBifrostServer(
                    host=str(host),
                    port=int(port),
                    token=token,
                    allow_lan=cfg.allow_lan,
                    max_msg_bytes=cfg.max_ws_message_bytes,
                )
            setattr(m, "_PorchBifrostServer", _factory)
    except Exception:
        pass

    # Convenience: expose the effective token path if we generated one
    try:
        if not (os.getenv("PORCH_BIFROST_TOKEN") or cfg.bifrost_token):
            token_file = (cfg.well_root / "keys" / "bifrost_token.txt")
            if token_file.exists():
                os.environ.setdefault("PORCH_BIFROST_TOKEN", token_file.read_text(encoding="utf-8").strip())
    except Exception:
        pass

    return cfg
