#!/usr/bin/env python3
"""IBGE study API: multi-user login + per-user progress (stdlib only)."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = os.environ.get("IBGE_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("IBGE_API_PORT", "8791"))
# legacy single password (used only to seed default user if users.json missing)
SITE_PASSWORD = os.environ.get("IBGE_SITE_PASSWORD", "").strip()
SESSION_SECRET = os.environ.get("IBGE_SESSION_SECRET", "").strip()
SYNC_TOKEN = os.environ.get("IBGE_SYNC_TOKEN", "").strip()
COOKIE_NAME = os.environ.get("IBGE_COOKIE_NAME", "ibge_session")
SESSION_DAYS = int(os.environ.get("IBGE_SESSION_DAYS", "30"))
DATA_DIR = Path(os.environ.get("IBGE_DATA_DIR", str(Path(__file__).resolve().parent / "data")))
USERS_FILE = Path(os.environ.get("IBGE_USERS_FILE", str(DATA_DIR / "users.json")))
PROGRESS_DIR = DATA_DIR / "progress"
LEGACY_PROGRESS = DATA_DIR / "progress.json"
LOCK = threading.Lock()

USER_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,31}$")

if not SESSION_SECRET or len(SESSION_SECRET) < 16:
    raise SystemExit("IBGE_SESSION_SECRET (>=16 chars) is required")

DATA_DIR.mkdir(parents=True, exist_ok=True)
PROGRESS_DIR.mkdir(parents=True, exist_ok=True)


def _b64url(data: bytes) -> str:
    import base64

    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    import base64

    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return f"pbkdf2${_b64url(salt)}${_b64url(dk)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        if stored.startswith("pbkdf2$"):
            _, salt_b64, hash_b64 = stored.split("$", 2)
            salt = _b64url_decode(salt_b64)
            expect = hash_password(password, salt)
            return hmac.compare_digest(expect, stored)
        # plain (bootstrap only) — constant-time-ish
        return hmac.compare_digest(password, stored)
    except Exception:
        return False


def empty_progress() -> dict:
    return {
        "lessonsRead": {},
        "daysDone": {},
        "answers": {},
        "history": [],
        "updatedAt": 0,
    }


def default_users_doc() -> dict:
    """Seed henrique from legacy SITE_PASSWORD if present."""
    pw = SITE_PASSWORD or secrets.token_urlsafe(10)
    return {
        "version": 1,
        "users": [
            {
                "id": "henrique",
                "name": "Henrique",
                "password_hash": hash_password(pw),
                # only for first-run print / handoff — strip in production if desired
                "_bootstrap_password": pw if not SITE_PASSWORD else None,
            }
        ],
    }


def load_users() -> list[dict]:
    with LOCK:
        if not USERS_FILE.exists():
            doc = default_users_doc()
            # clean None bootstrap field for file
            for u in doc["users"]:
                if u.get("_bootstrap_password") is None:
                    u.pop("_bootstrap_password", None)
            USERS_FILE.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
            # migrate legacy single progress → henrique
            if LEGACY_PROGRESS.exists():
                try:
                    data = json.loads(LEGACY_PROGRESS.read_text(encoding="utf-8"))
                    progress_path("henrique").write_text(
                        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
                    )
                except Exception:
                    pass
            return doc["users"]
        try:
            doc = json.loads(USERS_FILE.read_text(encoding="utf-8"))
            return list(doc.get("users") or [])
        except Exception:
            return []


def find_user(user_id: str) -> dict | None:
    uid = (user_id or "").strip().lower()
    for u in load_users():
        if str(u.get("id", "")).lower() == uid:
            return u
    return None


def progress_path(user_id: str) -> Path:
    safe = re.sub(r"[^a-z0-9_-]", "", user_id.lower())
    return PROGRESS_DIR / f"{safe}.json"


def read_progress(user_id: str) -> dict:
    path = progress_path(user_id)
    with LOCK:
        if not path.exists():
            return empty_progress()
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return empty_progress()


def write_progress(user_id: str, data: dict) -> dict:
    path = progress_path(user_id)
    with LOCK:
        clean = {
            "lessonsRead": data.get("lessonsRead") or {},
            "daysDone": data.get("daysDone") or {},
            "answers": data.get("answers") or {},
            "history": data.get("history") or [],
            "updatedAt": int(data.get("updatedAt") or 0),
        }
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(path)
        return clean


def merge_progress(server: dict, client: dict) -> dict:
    out = {
        "lessonsRead": dict(server.get("lessonsRead") or {}),
        "daysDone": dict(server.get("daysDone") or {}),
        "answers": dict(server.get("answers") or {}),
        "history": list(server.get("history") or []),
        "updatedAt": max(int(server.get("updatedAt") or 0), int(client.get("updatedAt") or 0)),
    }
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
        if int((ans or {}).get("ts") or 0) >= int((prev or {}).get("ts") or 0):
            out["answers"][qid] = ans
    seen = {h.get("ts") for h in out["history"] if isinstance(h, dict)}
    for h in client.get("history") or []:
        if isinstance(h, dict) and h.get("ts") not in seen:
            out["history"].append(h)
            seen.add(h.get("ts"))
    out["history"] = sorted(out["history"], key=lambda x: int(x.get("ts") or 0))[-100:]
    return out


def sign_session(user_id: str, exp: int) -> str:
    payload = f"{user_id}|{exp}".encode("utf-8")
    sig = hmac.new(SESSION_SECRET.encode("utf-8"), payload, hashlib.sha256).digest()
    return f"{_b64url(payload)}.{_b64url(sig)}"


def verify_session_token(token: str) -> str | None:
    """Return user_id if valid, else None."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload = _b64url_decode(parts[0])
        sig = _b64url_decode(parts[1])
        expect = hmac.new(SESSION_SECRET.encode("utf-8"), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expect):
            return None
        text = payload.decode("utf-8")
        # new format user|exp ; legacy format was just exp
        if "|" in text:
            user_id, exp_s = text.split("|", 1)
            exp = int(exp_s)
            if exp < int(time.time()):
                return None
            if not find_user(user_id):
                return None
            return user_id.lower()
        # legacy session without user → map to henrique if exists
        exp = int(text)
        if exp < int(time.time()):
            return None
        if find_user("henrique"):
            return "henrique"
        return None
    except Exception:
        return None


class Handler(BaseHTTPRequestHandler):
    server_version = "ibge-progress/3.0"

    def log_message(self, fmt: str, *args) -> None:
        print("%s - %s" % (self.address_string(), fmt % args))

    def _cors(self) -> None:
        origin = self.headers.get("Origin", "")
        if origin.endswith("ibge2026.eek029.xyz") or origin.startswith("http://127.0.0.1"):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")

    def _cookie_token(self) -> str | None:
        raw = self.headers.get("Cookie", "")
        if not raw:
            return None
        c = SimpleCookie()
        try:
            c.load(raw)
        except Exception:
            return None
        morsel = c.get(COOKIE_NAME)
        return morsel.value if morsel else None

    def _session_user(self) -> str | None:
        tok = self._cookie_token()
        if tok:
            uid = verify_session_token(tok)
            if uid:
                return uid
        auth = self.headers.get("Authorization", "")
        if SYNC_TOKEN and auth.startswith("Bearer ") and hmac.compare_digest(auth[7:].strip(), SYNC_TOKEN):
            return "henrique" if find_user("henrique") else None
        return None

    def _authed(self) -> bool:
        return self._session_user() is not None

    def _json(self, code: int, obj: dict, extra_headers: list[tuple[str, str]] | None = None) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for k, v in extra_headers:
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> bytes:
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def _set_session_cookie_header(self, user_id: str) -> str:
        exp = int(time.time()) + SESSION_DAYS * 86400
        token = sign_session(user_id, exp)
        return (
            f"{COOKIE_NAME}={token}; Path=/; HttpOnly; Secure; SameSite=Lax; "
            f"Max-Age={SESSION_DAYS * 86400}"
        )

    def _clear_cookie_header(self) -> str:
        return f"{COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/") or "/"

        if path in ("/api/health", "/health"):
            return self._json(200, {"ok": True, "multiUser": True})

        if path in ("/api/auth/check", "/auth/check"):
            if self._authed():
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.send_header("Content-Length", "2")
                self.end_headers()
                self.wfile.write(b"ok")
                return
            self.send_response(302)
            self.send_header("Location", "/login.html")
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return

        if path in ("/api/auth/me", "/auth/me"):
            uid = self._session_user()
            if not uid:
                return self._json(401, {"ok": False, "authenticated": False})
            user = find_user(uid) or {}
            return self._json(
                200,
                {
                    "ok": True,
                    "authenticated": True,
                    "user": {
                        "id": uid,
                        "name": user.get("name") or uid,
                    },
                },
            )

        if path in ("/api/progress", "/progress"):
            uid = self._session_user()
            if not uid:
                return self._json(401, {"error": "unauthorized"})
            return self._json(200, read_progress(uid))

        return self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/") or "/"

        if path in ("/api/auth/login", "/auth/login"):
            try:
                data = json.loads(self._read_body().decode("utf-8") or "{}")
            except json.JSONDecodeError:
                return self._json(400, {"error": "invalid json"})

            user_id = str(data.get("user") or data.get("username") or data.get("id") or "").strip().lower()
            password = str(data.get("password") or "")

            # backward compat: only password → try henrique + legacy SITE_PASSWORD
            if not user_id and password:
                user_id = "henrique"

            user = find_user(user_id) if user_id else None
            ok = False
            if user:
                stored = user.get("password_hash") or user.get("password") or ""
                ok = verify_password(password, stored)
            # last resort: legacy single site password as henrique
            if not ok and SITE_PASSWORD and password and user_id in ("", "henrique"):
                if hmac.compare_digest(password, SITE_PASSWORD):
                    if not find_user("henrique"):
                        # ensure user exists
                        users = load_users()
                        users.append(
                            {
                                "id": "henrique",
                                "name": "Henrique",
                                "password_hash": hash_password(password),
                            }
                        )
                        with LOCK:
                            USERS_FILE.write_text(
                                json.dumps({"version": 1, "users": users}, ensure_ascii=False, indent=2),
                                encoding="utf-8",
                            )
                    ok = True
                    user_id = "henrique"
                    user = find_user("henrique")

            if not ok or not user_id:
                time.sleep(0.4)
                return self._json(401, {"ok": False, "error": "usuário ou senha incorretos"})

            cookie = self._set_session_cookie_header(user_id)
            return self._json(
                200,
                {
                    "ok": True,
                    "user": {"id": user_id, "name": (user or {}).get("name") or user_id},
                },
                extra_headers=[("Set-Cookie", cookie)],
            )

        if path in ("/api/auth/logout", "/auth/logout"):
            cookie = self._clear_cookie_header()
            return self._json(200, {"ok": True}, extra_headers=[("Set-Cookie", cookie)])

        if path in ("/api/progress", "/progress", "/api/progress/merge", "/progress/merge"):
            return self._upsert(path)

        return self._json(404, {"error": "not found"})

    def do_PUT(self) -> None:  # noqa: N802
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path in ("/api/progress", "/progress", "/api/progress/merge", "/progress/merge"):
            return self._upsert(path)
        return self._json(404, {"error": "not found"})

    def _upsert(self, path: str) -> None:
        uid = self._session_user()
        if not uid:
            return self._json(401, {"error": "unauthorized"})
        try:
            client = json.loads(self._read_body().decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return self._json(400, {"error": "invalid json"})
        if not isinstance(client, dict):
            return self._json(400, {"error": "body must be object"})
        if path.endswith("/merge") or self.headers.get("X-Merge", "").lower() in ("1", "true"):
            merged = merge_progress(read_progress(uid), client)
            saved = write_progress(uid, merged)
            return self._json(200, {"ok": True, "merged": True, "progress": saved, "user": uid})
        if not client.get("updatedAt"):
            client["updatedAt"] = int(time.time() * 1000)
        saved = write_progress(uid, client)
        return self._json(200, {"ok": True, "merged": False, "progress": saved, "user": uid})


def main() -> None:
    # ensure users file exists
    load_users()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"ibge multi-user auth+progress on http://{HOST}:{PORT} users={USERS_FILE}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
