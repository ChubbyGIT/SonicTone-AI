import asyncio
import json
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from groq import Groq

GROQ_API_KEY = "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"
GROQ_MODEL = "openai/gpt-oss-120b"
client = Groq(api_key=GROQ_API_KEY)

from rag import query_rag
from sonic import SONIC_SYSTEM_PROMPT, SONIC_GENERAL_PROMPT
from chat_store import save_message, list_chats, get_chat

app = FastAPI(title="SonicTone AI — Sonic Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ToneRequest(BaseModel):
    vst_name: Optional[str] = None
    band_name: Optional[str] = None
    is_general: bool = False
    message: Optional[str] = None
    chat_history: Optional[list] = []
    chat_id: Optional[str] = None


class ChatSaveRequest(BaseModel):
    chat_id: str
    title: str
    messages: list


@app.get("/health")
def health():
    return {"status": "ok", "sonic": "ready"}


@app.get("/session-status")
def session_status():
    """Frontend polls this to check if backend is alive."""
    return {"alive": True}


@app.post("/generate-tone")
async def generate_tone(req: ToneRequest):
    user_message = req.message or req.band_name or ""
    if not user_message:
        raise HTTPException(status_code=400, detail="message or band_name required")

    # Always query RAG — use band/message for both tone and general requests
    rag_context = query_rag(req.vst_name, req.band_name or user_message)

    if req.is_general:
        system = SONIC_GENERAL_PROMPT
        # Prepend RAG context to system prompt when relevant knowledge exists
        if rag_context:
            system = f"{SONIC_GENERAL_PROMPT}\n\n---\nRELEVANT KNOWLEDGE BASE CONTEXT (use if helpful):\n{rag_context}"
        messages = [{"role": "system", "content": system}]
        for h in (req.chat_history or []):
            if h.get("role") in ("user", "assistant"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})
    else:
        system = SONIC_SYSTEM_PROMPT
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
        try:
            stream = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                stream=True,
                temperature=0.3 if not req.is_general else 0.7,
                max_tokens=1200,
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    await asyncio.sleep(0)
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'token': f'⚠️ Sonic error: {str(e)}'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@app.post("/chats/save")
def save_chat(req: ChatSaveRequest):
    save_message(req.chat_id, req.title, req.messages)
    return {"status": "saved"}


@app.get("/chats")
def get_chats():
    return list_chats()


@app.get("/chats/{chat_id}")
def get_single_chat(chat_id: str):
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)