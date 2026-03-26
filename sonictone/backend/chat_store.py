"""
chat_store.py — Local JSON Chat Persistence
---------------------------------------------
A lightweight file-based store for chat session data.
Used as a fallback / dev-time store; in production the frontend
persists chats directly to Supabase, so this module is only
exercised if the /chats/* endpoints are called (e.g. from curl/testing).

Storage format (chat_store.json):
  {
    "chats": {
      "<chat_id>": {
        "id":        "<uuid>",
        "title":     "Plugin → Band",
        "messages":  [...],
        "createdAt": "ISO datetime"
      },
      ...
    }
  }

Functions:
  _load()           → dict            read the JSON file (returns empty structure on error)
  _save(data)                         write the full data dict back to disk
  get_chat(id)      → dict | None     retrieve a single chat by ID
  save_message(...)                   create or update a chat entry
  list_chats()      → list            return all chat values as a list
"""

import json
import os
from pathlib import Path
from datetime import datetime

# File path is relative to wherever the backend server is run from (typically backend/)
STORE_PATH = Path("./chat_store.json")


def _load() -> dict:
    """
    Read the JSON store from disk.
    Returns an empty { "chats": {} } structure if the file doesn't exist or is corrupt.
    """
    if STORE_PATH.exists():
        try:
            return json.loads(STORE_PATH.read_text())
        except:
            return {"chats": {}}
    return {"chats": {}}


def _save(data: dict):
    """Write the entire data dict back to disk (full overwrite)."""
    STORE_PATH.write_text(json.dumps(data, indent=2))


def get_chat(chat_id: str) -> dict | None:
    """Return the chat entry for `chat_id`, or None if it doesn't exist."""
    return _load()["chats"].get(chat_id)


def save_message(chat_id: str, title: str, messages: list):
    """
    Create a new chat entry if it doesn't exist, then overwrite its messages.

    Args:
      chat_id  — unique identifier for the chat session (UUID from frontend)
      title    — display title, e.g. "Neural DSP Nolly → Metallica"
      messages — full list of message objects to persist
    """
    data = _load()
    if chat_id not in data["chats"]:
        # First time saving this chat — initialise the entry
        data["chats"][chat_id] = {
            "id":        chat_id,
            "title":     title,
            "messages":  [],
            "createdAt": datetime.now().isoformat(),
        }
    # Overwrite messages (always the full array, not incremental)
    data["chats"][chat_id]["messages"] = messages
    _save(data)


def list_chats() -> list:
    """Return all chat entries as a flat list (order is insertion order in Python 3.7+)."""
    data = _load()
    return list(data["chats"].values())