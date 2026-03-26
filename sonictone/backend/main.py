"""
main.py — FastAPI Backend for SonicTone AI
-------------------------------------------
The core HTTP server that powers the AI tone generation engine.

Endpoints:
  GET  /health          — simple liveness probe; returns { status: "ok" }
  GET  /session-status  — polled by the frontend in dev mode to detect backend shutdown
  POST /generate-tone   — main endpoint; streams AI tone settings via SSE
  POST /chats/save      — persists a chat's messages to local JSON store
  GET  /chats           — returns all saved chats
  GET  /chats/{chat_id} — returns a single chat by ID

Streaming (SSE):
  generate-tone returns a StreamingResponse of "text/event-stream".
  Each chunk is formatted as:
    data: {"token": "<text>"}\\n\\n
  Ending with:
    data: [DONE]\\n\\n
  The frontend (ChatWindow.jsx) reads this via the Fetch ReadableStream API.

AI Model:
  Uses the Groq SDK client ('openai/gpt-oss-120b' model via the Groq API).
  GROQ_API_KEY must be set in backend/.env (or Vercel environment variables).

RAG (Retrieval-Augmented Generation):
  Before calling the LLM, query_rag() searches ChromaDB for relevant context:
    - Band tone data from guitar_tone_reference.txt
    - Plugin parameter data from plugin_settings.json
  This context is prepended to the system/user prompt to improve accuracy.

CORS:
  Allows requests from localhost:5173 (Vite dev server) only.
  In production, the frontend is on the same Vercel domain and calls /api/*,
  so CORS isn't needed — but is kept for local dev compatibility.
"""

import asyncio
import json
import os
import sys
from dotenv import load_dotenv

# Load backend/.env for local development (no-op in production where env vars
# are injected directly by the hosting platform)
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from groq import Groq

# ── Groq client setup ────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable not set")

GROQ_MODEL = "openai/gpt-oss-120b"   # model routed through Groq's inference API
client = Groq(api_key=GROQ_API_KEY)

# ── Internal modules ─────────────────────────────────────────────────────────
from rag import query_rag                               # ChromaDB retrieval
from sonic import SONIC_SYSTEM_PROMPT, SONIC_GENERAL_PROMPT   # LLM system prompts
from chat_store import save_message, list_chats, get_chat     # local JSON persistence

app = FastAPI(title="SonicTone AI — Sonic Engine")

# Allow the Vite dev server to call the backend without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schemas (Pydantic models) ────────────────────────────────────────

class ToneRequest(BaseModel):
    """Payload for POST /generate-tone."""
    vst_name:     Optional[str]  = None   # full plugin name, e.g. "Neural DSP Archetype Nolly"
    band_name:    Optional[str]  = None   # band/artist name, e.g. "Metallica"
    is_general:   bool           = False  # True → use general chat prompt instead of tone prompt
    message:      Optional[str]  = None   # raw user message (used as fallback for band_name)
    chat_history: Optional[list] = []     # past turns: [{ role: "user"|"assistant", content: str }]
    chat_id:      Optional[str]  = None   # Supabase chat UUID (informational, not used server-side)


class ChatSaveRequest(BaseModel):
    """Payload for POST /chats/save."""
    chat_id:  str
    title:    str
    messages: list


# ── Route handlers ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Simple liveness probe — returns 200 if the server is up."""
    return {"status": "ok", "sonic": "ready"}


@app.get("/session-status")
def session_status():
    """
    Frontend polls this (every 5 s in dev mode) to check if the backend is alive.
    If two consecutive polls fail, useSessionGuard signs the user out.
    """
    return {"alive": True}


@app.post("/generate-tone")
async def generate_tone(req: ToneRequest):
    """
    Main tone-generation endpoint.

    Steps:
    1. Validate that we have something to work with (message or band_name).
    2. Query RAG for relevant band tone + plugin knowledge.
    3. Build the LLM message list:
       - Tone mode: structured system prompt + RAG context embedded in user turn
       - General mode: conversational system prompt + optional RAG context appended
    4. Stream the Groq completion back to the client as SSE.
    """
    user_message = req.message or req.band_name or ""
    if not user_message:
        raise HTTPException(status_code=400, detail="message or band_name required")

    # Always query RAG — both tone and general requests can benefit from retrieved context
    rag_context = query_rag(req.vst_name, req.band_name or user_message)

    if req.is_general:
        # ── General chat mode ────────────────────────────────────────────────
        system = SONIC_GENERAL_PROMPT
        # Append RAG context to the system prompt only when something was retrieved
        if rag_context:
            system = f"{SONIC_GENERAL_PROMPT}\n\n---\nRELEVANT KNOWLEDGE BASE CONTEXT (use if helpful):\n{rag_context}"
        messages = [{"role": "system", "content": system}]
        for h in (req.chat_history or []):
            if h.get("role") in ("user", "assistant"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})
    else:
        # ── Tone-generation mode ─────────────────────────────────────────────
        system = SONIC_SYSTEM_PROMPT
        # Inject RAG context directly into the user turn so the model has it close
        prompt = f"""CONTEXT FROM KNOWLEDGE BASE:
{rag_context}

USER REQUEST:
VST Plugin: {req.vst_name if req.vst_name else 'Any available VST (unrestricted)'}
Band: {req.band_name or user_message}

Generate the exact tone settings. Follow the output format exactly including markdown tables."""

        messages = [{"role": "system", "content": system}]
        for h in (req.chat_history or []):
            if h.get("role") in ("user", "assistant"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": prompt})

    async def stream_response():
        """
        Async generator that streams Groq completion tokens as SSE events.
        Each event: data: {"token": "<text>"}\\n\\n
        Final event: data: [DONE]\\n\\n
        Errors are surfaced as a warning token rather than an HTTP error so the
        frontend can display them inline in the chat bubble.
        """
        try:
            stream = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                stream=True,
                temperature=0.3 if not req.is_general else 0.7,  # lower temp for precise tone specs
                max_tokens=1200,
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    await asyncio.sleep(0)  # yield control to the event loop between tokens
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'token': f'⚠️ Sonic error: {str(e)}'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        # Prevent intermediate proxies/CDNs from buffering the stream
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@app.post("/chats/save")
def save_chat(req: ChatSaveRequest):
    """Save (or overwrite) a chat's messages in the local JSON store."""
    save_message(req.chat_id, req.title, req.messages)
    return {"status": "saved"}


@app.get("/chats")
def get_chats():
    """Return all chats from the local JSON store (sorted newest-first by the store)."""
    return list_chats()


@app.get("/chats/{chat_id}")
def get_single_chat(chat_id: str):
    """Return a single chat by ID, or 404 if not found."""
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


# ── Local dev entry point ────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)