import asyncio
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import ollama

from rag import query_rag
from tony import TONY_SYSTEM_PROMPT, TONY_GENERAL_PROMPT
from chat_store import save_message, list_chats, get_chat

app = FastAPI(title="SonicTone AI — Tony Engine")

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
    chat_history: Optional[list] = []  # full conversation history
    chat_id: Optional[str] = None


class ChatSaveRequest(BaseModel):
    chat_id: str
    title: str
    messages: list


@app.get("/health")
def health():
    return {"status": "ok", "tony": "ready"}


@app.post("/generate-tone")
async def generate_tone(req: ToneRequest):
    user_message = req.message or req.band_name or ""
    if not user_message:
        raise HTTPException(status_code=400, detail="message or band_name required")

    if req.is_general:
        system = TONY_GENERAL_PROMPT
        # Build messages with history for conversational continuity
        messages = [{"role": "system", "content": system}]
        for h in (req.chat_history or []):
            if h.get("role") in ("user", "assistant"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})
    else:
        # Tone generation — use RAG
        context = query_rag(req.vst_name, req.band_name or user_message)
        system = TONY_SYSTEM_PROMPT
        prompt = f"""CONTEXT FROM KNOWLEDGE BASE:
{context}

USER REQUEST:
VST Plugin: {req.vst_name if req.vst_name else 'Any available VST (unrestricted)'}
Band: {req.band_name or user_message}

Generate the exact tone settings. Follow the output format exactly including markdown tables."""

        # Include history so feedback loop works
        messages = [{"role": "system", "content": system}]
        for h in (req.chat_history or []):
            if h.get("role") in ("user", "assistant"):
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": prompt})

    async def stream_response():
        try:
            stream = ollama.chat(
                model="gemma3:12b",
                messages=messages,
                stream=True,
                options={
                    "temperature": 0.3 if not req.is_general else 0.7,
                    "num_predict": 1200,
                }
            )
            for chunk in stream:
                token = chunk.get("message", {}).get("content", "")
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    await asyncio.sleep(0)
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'token': f'⚠️ Tony error: {str(e)}'})}\n\n"
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