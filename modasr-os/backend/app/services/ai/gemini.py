"""Gemini REST client with function calling. Server-side only."""
import json

import httpx

from app.core.config import get_settings

BASE = "https://generativelanguage.googleapis.com/v1beta/models"


async def generate(system: str, contents: list[dict], tools: list[dict] | None = None,
                   temperature: float = 0.5, json_mode: bool = False, max_tokens: int = 900) -> dict:
    s = get_settings()
    body: dict = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
        "safetySettings": [{"category": c, "threshold": "BLOCK_MEDIUM_AND_ABOVE"} for c in
                           ("HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_DANGEROUS_CONTENT")],
    }
    if tools:
        body["tools"] = [{"functionDeclarations": tools}]
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    async with httpx.AsyncClient(timeout=40) as c:
        r = await c.post(f"{BASE}/{s.gemini_model}:generateContent", json=body,
                         headers={"x-goog-api-key": s.gemini_api_key})
    data = r.json()
    if "error" in data:
        raise RuntimeError(data["error"].get("message", "gemini error"))
    return data["candidates"][0]["content"]


def text_of(content: dict) -> str:
    return "".join(p.get("text", "") for p in content.get("parts", []))


def calls_of(content: dict) -> list[dict]:
    return [p["functionCall"] for p in content.get("parts", []) if "functionCall" in p]


async def generate_json(system: str, prompt: str) -> dict:
    content = await generate(system, [{"role": "user", "parts": [{"text": prompt}]}], json_mode=True, temperature=0.3)
    try:
        return json.loads(text_of(content))
    except json.JSONDecodeError:
        return {}
