import json
import os
from pathlib import Path
from datetime import datetime

STORE_PATH = Path("./chat_store.json")


def _load() -> dict:
    if STORE_PATH.exists():
        try:
            return json.loads(STORE_PATH.read_text())
        except:
            return {"chats": {}}
    return {"chats": {}}


def _save(data: dict):
    STORE_PATH.write_text(json.dumps(data, indent=2))


def get_chat(chat_id: str) -> dict | None:
    return _load()["chats"].get(chat_id)


def save_message(chat_id: str, title: str, messages: list):
    data = _load()
    if chat_id not in data["chats"]:
        data["chats"][chat_id] = {
            "id": chat_id,
            "title": title,
            "messages": [],
            "createdAt": datetime.now().isoformat(),
        }
    data["chats"][chat_id]["messages"] = messages
    _save(data)


def list_chats() -> list:
    data = _load()
    return list(data["chats"].values())