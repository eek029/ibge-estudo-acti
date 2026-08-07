#!/usr/bin/env python3
"""Add or update a study user (stdlib). Usage:
  python3 add_user.py <id> <senha> [Nome Completo]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# import hash from app
sys.path.insert(0, str(Path(__file__).resolve().parent))
from app import USERS_FILE, hash_password, load_users, USER_ID_RE  # noqa: E402


def main() -> None:
    if len(sys.argv) < 3:
        print("Uso: python3 add_user.py <id> <senha> [Nome]")
        print("Ex.: python3 add_user.py maria SenhaForte123 Maria Silva")
        sys.exit(1)
    user_id = sys.argv[1].strip().lower()
    password = sys.argv[2]
    name = " ".join(sys.argv[3:]).strip() or user_id.capitalize()
    if not USER_ID_RE.match(user_id):
        print("id inválido: use a-z 0-9 _ - (2–32 chars, começa com letra/número)")
        sys.exit(1)
    users = load_users()
    found = False
    for u in users:
        if u.get("id") == user_id:
            u["password_hash"] = hash_password(password)
            u["name"] = name
            u.pop("password", None)
            found = True
            break
    if not found:
        users.append({"id": user_id, "name": name, "password_hash": hash_password(password)})
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(
        json.dumps({"version": 1, "users": users}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"OK — usuário {'atualizado' if found else 'criado'}: {user_id} ({name})")
    print(f"Arquivo: {USERS_FILE}")


if __name__ == "__main__":
    main()
