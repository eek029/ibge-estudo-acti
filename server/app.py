#!/usr/bin/env python3
"""Minimal progress API for multi-device sync (stdlib only)."""
from __future__ import annotations

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = os.environ.get("IBGE_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("IBGE_API_PORT", "8791"))
TOKEN = os.environ.get("IBGE_SYNC_TOKEN", "").strip()
DATA_DIR = Path(os.environ.get("IBGE_DATA_DIR", str(Path(__file__).resolve().parent / "data")))
PROGRESS_FILE = DATA_DIR / "progress.json"
LOCK = threading.Lock()

if not TOKEN:
    raise SystemExit("IBGE_SYNC_TOKEN is required")

DATA_DIR.mkdir(parents=True, exist_ok=True)
if not PROGRESS_FILE.exists():
    PROGRESS_FILE.write_text(
        json.dumps(
            {
                "lessonsRead": {},
                "daysDone": {},
                "answers": {},
                "history": [],
                "updatedAt": 0,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def read_progress() -> dict:
    with LOCK:
        try:
            return json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {
                "lessonsRead": {},
                "daysDone": {},
                "answers": {},
                "history": [],
                "updatedAt": 0,
            }


def write_progress(data: dict) -> dict:
    with LOCK:
        data = dict(data)
        data["updatedAt"] = int(data.get("updatedAt") or 0)
        # keep only known keys + updatedAt
        clean = {
            "lessonsRead": data.get("lessonsRead") or {},
            "daysDone": data.get("daysDone") or {},
            "answers": data.get("answers") or {},
            "history": data.get("history") or [],
            "updatedAt": data["updatedAt"],
        }
        tmp = PROGRESS_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(PROGRESS_FILE)
        return clean


def merge_progress(server: dict, client: dict) -> dict:
    """Merge two progress blobs: union maps; for answers prefer more recent ts; history concat unique by ts."""
    out = {
        "lessonsRead": dict(server.get("lessonsRead") or {}),
        "daysDone": dict(server.get("daysDone") or {}),
        "answers": dict(server.get("answers") or {}),
        "history": list(server.get("history") or []),
        "updatedAt": max(int(server.get("updatedAt") or 0), int(client.get("updatedAt") or 0)),
    }
    # lessons / days: union (true wins)
    for k, v in (client.get("lessonsRead") or {}).items():
        out["lessonsRead"][k] = v or out["lessonsRead"].get(k)
    for k, v in (client.get("daysDone") or {}).items():
        if v:
            out["daysDone"][k] = True

    for qid, ans in (client.get("answers") or {}).items():
        prev = out["answers"].get(qid)
        if not prev:
            out["answers"][qid] = ans
            continue
        pts = int((prev or {}).get("ts") or 0)
        cts = int((ans or {}).get("ts") or 0)
        if cts >= pts:
            out["answers"][qid] = ans

    # history: merge by ts
    seen = {h.get("ts") for h in out["history"] if isinstance(h, dict)}
    for h in client.get("history") or []:
        if isinstance(h, dict) and h.get("ts") not in seen:
            out["history"].append(h)
            seen.add(h.get("ts"))
    out["history"] = sorted(out["history"], key=lambda x: int(x.get("ts") or 0))[-100:]
    out["updatedAt"] = max(out["updatedAt"], int(client.get("updatedAt") or 0))
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = "ibge-progress/1.0"

    def log_message(self, fmt: str, *args) -> None:
        # quieter logs
        print("%s - %s" % (self.address_string(), fmt % args))

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")

    def _auth_ok(self) -> bool:
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:].strip() == TOKEN
        # also allow ?token= for simple tests
        q = urlparse(self.path).query
        for part in q.split("&"):
            if part.startswith("token=") and part[6:] == TOKEN:
                return True
        return False

    def _json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> bytes:
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path in ("/api/health", "/health"):
            return self._json(200, {"ok": True})
        if path in ("/api/progress", "/progress"):
            if not self._auth_ok():
                return self._json(401, {"error": "unauthorized"})
            return self._json(200, read_progress())
        return self._json(404, {"error": "not found"})

    def do_PUT(self) -> None:  # noqa: N802
        self._upsert()

    def do_POST(self) -> None:  # noqa: N802
        self._upsert()

    def _upsert(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path not in ("/api/progress", "/progress", "/api/progress/merge", "/progress/merge"):
            return self._json(404, {"error": "not found"})
        if not self._auth_ok():
            return self._json(401, {"error": "unauthorized"})
        try:
            client = json.loads(self._read_body().decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return self._json(400, {"error": "invalid json"})
        if not isinstance(client, dict):
            return self._json(400, {"error": "body must be object"})

        if path.endswith("/merge") or self.headers.get("X-Merge", "").lower() in ("1", "true"):
            merged = merge_progress(read_progress(), client)
            saved = write_progress(merged)
            return self._json(200, {"ok": True, "merged": True, "progress": saved})

        # full replace (client must send complete state)
        if not client.get("updatedAt"):
            import time

            client["updatedAt"] = int(time.time() * 1000)
        saved = write_progress(client)
        return self._json(200, {"ok": True, "merged": False, "progress": saved})


def main() -> None:
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"ibge progress api on http://{HOST}:{PORT} data={PROGRESS_FILE}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
