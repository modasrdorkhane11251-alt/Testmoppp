"""
SuperBot Phase 2 Services (AI, Vision, Media Downloaders, Shazam & OCR)
Enterprise Python Implementation matching multi-platform specifications.
"""
import re
import json
import urllib.parse
from typing import Dict, Any, List, Optional, Union
from core.http_client import HttpClient
from config import API_KEYS

class Phase2Services:
    @classmethod
    async def http_get(
        cls,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """Sends an async GET request with query params and headers."""
        full_url = url
        if params:
            filtered_params = {k: v for k, v in params.items() if v is not None and v != ""}
            if filtered_params:
                qs = urllib.parse.urlencode(filtered_params)
                full_url = f"{url}?{qs}" if "?" not in url else f"{url}&{qs}"

        res = await HttpClient.get(full_url, headers=headers, timeout=timeout)
        if not res.get("ok"):
            return {"ok": False, "error": res.get("error", "HTTP request failed")}

        data = res.get("data")
        return {"ok": True, "data": data}

    @classmethod
    def extract_images(cls, data: Any) -> List[str]:
        """Recursively extracts direct image URLs from dynamic API responses."""
        results: List[str] = []
        if isinstance(data, str) and data.strip().startswith("http"):
            return [data.strip()]

        if isinstance(data, dict) and "result" in data and isinstance(data["result"], (list, dict, str)):
            data = data["result"]

        def walker(node: Any):
            if isinstance(node, dict):
                for v in node.values():
                    walker(v)
            elif isinstance(node, list):
                for item in node:
                    walker(item)
            elif isinstance(node, str):
                val = node.strip()
                if val.startswith("http") and not re.search(r"\.(mp3|mp4|wav)(\?|$)", val, re.IGNORECASE):
                    results.append(val)

        walker(data)
        # Deduplicate while preserving order
        seen = set()
        unique_urls = []
        for u in results:
            if u not in seen:
                seen.add(u)
                unique_urls.append(u)
        return unique_urls

    @classmethod
    def extract_links(cls, data: Any) -> List[str]:
        """Recursively extracts all HTTP/HTTPS links (videos, songs, zips, etc.)."""
        links: List[str] = []

        def walker(node: Any):
            if isinstance(node, dict):
                for v in node.values():
                    walker(v)
            elif isinstance(node, list):
                for item in node:
                    walker(item)
            elif isinstance(node, str):
                val = node.strip()
                if val.startswith("http"):
                    links.append(val)

        walker(data)
        seen = set()
        unique_links = []
        for link in links:
            if link not in seen:
                seen.add(link)
                unique_links.append(link)
        return unique_links

    # ==========================================================
    # A) AI & VISION SERVICES
    # ==========================================================
    @classmethod
    async def chat_ai(cls, prompt: str, model: str = "gpt") -> str:
        """Communicates with multi-model AI APIs (GPT, GPT-4, DeepSeek, Grok, Blackbox)."""
        urls = {
            "gpt": "https://api.fast-creat.ir/gpt/chat",
            "gpt4": "https://api.fast-creat.ir/gpt/gpt4",
            "deepseek": "https://api.fast-creat.ir/deepseek",
            "grok": "https://api.fast-creat.ir/grokai",
            "blackbox": "https://api.fast-creat.ir/blackbox",
        }
        keys = {
            "gpt": API_KEYS.get("fast_gpt_chat"),
            "gpt4": API_KEYS.get("fast_gpt4"),
            "deepseek": API_KEYS.get("fast_gpt_chat"),
            "grok": API_KEYS.get("fast_gpt_chat"),
            "blackbox": API_KEYS.get("fast_blackbox"),
        }

        url = urls.get(model, urls["gpt"])
        key = keys.get(model, keys["gpt"])

        res = await cls.http_get(url, {"apikey": key, "text": prompt}, timeout=90)
        if not res.get("ok"):
            return "❌ خطا در برقراری ارتباط با سرور هوش مصنوعی."

        d = res.get("data")
        if isinstance(d, str):
            return d
        if isinstance(d, dict):
            if isinstance(d.get("result"), dict) and "text" in d["result"]:
                return str(d["result"]["text"])
            if isinstance(d.get("result"), str):
                return d["result"]
            if isinstance(d.get("response"), str):
                return d["response"]
            if isinstance(d.get("text"), str):
                return d["text"]
            if isinstance(d.get("message"), str):
                return d["message"]
            return json.dumps(d, ensure_ascii=False, indent=2)

        return str(d)

    @classmethod
    async def generate_photo_fast(cls, prompt: str) -> List[str]:
        """Generates AI images using Fast-Creat image engine."""
        res = await cls.http_get(
            "https://api.fast-creat.ir/gpt/photo",
            {"apikey": API_KEYS.get("fast_photo"), "text": prompt},
            timeout=120
        )
        return cls.extract_images(res.get("data")) if res.get("ok") else []

    @classmethod
    async def generate_photo_dalle(cls, prompt: str) -> List[str]:
        """Generates AI images using Dall-E 3 engine."""
        res = await cls.http_get(
            "https://api.majidapi.ir/ai/image",
            {"token": API_KEYS.get("majid_token"), "prompt": prompt},
            timeout=120
        )
        return cls.extract_images(res.get("data")) if res.get("ok") else []

    @classmethod
    async def to_anime_fast(cls, image_url: str) -> List[str]:
        """Transforms photo into Anime style via Fast-Creat."""
        res = await cls.http_get(
            "https://api.fast-creat.ir/ghibli",
            {"apikey": API_KEYS.get("fast_ghibli"), "url": image_url},
            timeout=120
        )
        return cls.extract_images(res.get("data")) if res.get("ok") else []

    @classmethod
    async def to_anime_ghibli(cls, image_url: str) -> List[str]:
        """Transforms photo into Studio Ghibli anime style."""
        res = await cls.http_get(
            "https://api.majidapi.ir/ai/ghibli",
            {"token": API_KEYS.get("majid_token"), "url": image_url},
            timeout=120
        )
        return cls.extract_images(res.get("data")) if res.get("ok") else []

    @classmethod
    async def enhance_quality(cls, image_url: str) -> List[str]:
        """Enhances photo quality and resolution (4K Enhance)."""
        res = await cls.http_get(
            "https://api.fast-creat.ir/photo-quality",
            {"apikey": API_KEYS.get("fast_quality"), "url": image_url},
            timeout=120
        )
        return cls.extract_images(res.get("data")) if res.get("ok") else []

    @classmethod
    async def make_logo(cls, logo_id: int, text: str) -> List[str]:
        """Generates stylish named logo (1-140 styles)."""
        res = await cls.http_get(
            "https://api.fast-creat.ir/logo",
            {
                "apikey": API_KEYS.get("fast_logo"),
                "type": "logo",
                "id": logo_id,
                "text": text,
            },
            timeout=90
        )
        return cls.extract_images(res.get("data")) if res.get("ok") else []

    @classmethod
    async def make_effect(cls, effect_id: int, image_url: str) -> List[str]:
        """Applies artistic graphic effect to photo (1-80 effects)."""
        res = await cls.http_get(
            "https://api.fast-creat.ir/logo",
            {
                "apikey": API_KEYS.get("fast_logo"),
                "type": "effect",
                "id": effect_id,
                "url": image_url,
            },
            timeout=90
        )
        return cls.extract_images(res.get("data")) if res.get("ok") else []

    # ==========================================================
    # B) MEDIA & DOWNLOADER SERVICES
    # ==========================================================
    @classmethod
    async def instagram_download(cls, url: str) -> Dict[str, Any]:
        """Downloads Instagram posts, reels, and stories with clean URL matching and quality parsing."""
        # Clean query string to avoid API errors
        m = re.search(r'(https?://(?:www\.)?instagram\.com/(?:p|reel|tv|stories)/[A-Za-z0-9_\-]+)', url, re.IGNORECASE)
        clean_url = m.group(1) if m else url.strip()

        types = ["post2", "post", "story2", "story"]
        for t in types:
            res = await cls.http_get(
                "https://api.fast-creat.ir/instagram",
                {"apikey": API_KEYS.get("fast_ig"), "type": t, "url": clean_url},
                timeout=60
            )
            data = res.get("data")
            if res.get("ok") and isinstance(data, dict):
                if data.get("ok") is True:
                    result_data = data.get("result") or {}
                    media = result_data.get("media") or []
                    if not media and result_data.get("url"):
                        media = [{"url": result_data.get("url"), "type": "video"}]
                    if media or result_data.get("url"):
                        return {
                            "ok": True,
                            "caption": str(result_data.get("caption") or ""),
                            "media": media,
                            "thumbnail": result_data.get("thumbnail") or result_data.get("cover") or "",
                            "likes": result_data.get("likes") or result_data.get("like_count") or 0,
                            "comments": result_data.get("comments") or result_data.get("comment_count") or 0,
                            "qualities": result_data.get("qualities") or []
                        }
        return {"ok": False}

    @classmethod
    async def instagram_profile_info(cls, username: str) -> Dict[str, Any]:
        """Fetches complete profile metadata and HD avatar of Instagram account."""
        match = re.search(r"instagram\.com/([^/?#]+)", username, re.IGNORECASE)
        if match:
            username = match.group(1)
        username = username.strip().lstrip("@")

        res = await cls.http_get(
            "https://api.fast-creat.ir/instagram",
            {"apikey": API_KEYS.get("fast_ig"), "type": "info", "username": username},
            timeout=45
        )
        data = res.get("data")
        if res.get("ok") and isinstance(data, dict) and data.get("ok") and "result" in data:
            return {"ok": True, "username": username, "info": data["result"]}
        return {"ok": False}

    @classmethod
    async def youtube_search(cls, query: str) -> Dict[str, Any]:
        """Searches YouTube videos."""
        return await cls.http_get(
            "https://api.fast-creat.ir/youtube/search",
            {"apikey": API_KEYS.get("fast_youtube"), "q": query},
            timeout=45
        )

    @classmethod
    async def youtube_download(cls, url: str) -> List[str]:
        """Downloads YouTube video/audio download links."""
        res = await cls.http_get(
            "https://api.fast-creat.ir/youtube/download",
            {"apikey": API_KEYS.get("fast_youtube"), "url": url},
            timeout=60
        )
        return cls.extract_links(res.get("data")) if res.get("ok") else []

    @classmethod
    async def spotify_search(cls, query: str) -> Dict[str, Any]:
        """Searches tracks on Spotify."""
        return await cls.http_get(
            "https://api.fast-creat.ir/spotify",
            {"apikey": API_KEYS.get("fast_spotify"), "action": "search", "query": query},
            timeout=45
        )

    @classmethod
    async def spotify_download(cls, url: str) -> List[str]:
        """Fetches direct Spotify track audio download links."""
        res = await cls.http_get(
            "https://api.fast-creat.ir/spotify",
            {"apikey": API_KEYS.get("fast_spotify"), "action": "dl", "url": url},
            timeout=60
        )
        return cls.extract_links(res.get("data")) if res.get("ok") else []

    @classmethod
    async def rj_search(cls, query: str) -> Dict[str, Any]:
        """Searches songs, videos, and podcasts on RadioJavan."""
        return await cls.http_get(
            "https://api.fast-creat.ir/radiojavan",
            {"apikey": API_KEYS.get("fast_rj"), "action": "search", "query": query},
            timeout=45
        )

    @classmethod
    async def rj_download(cls, action: str, media_id: int) -> List[str]:
        """Downloads MP3 or MP4 from RadioJavan by ID."""
        res = await cls.http_get(
            "https://api.fast-creat.ir/radiojavan",
            {"apikey": API_KEYS.get("fast_rj"), "action": action, "id": media_id},
            timeout=60
        )
        return cls.extract_links(res.get("data")) if res.get("ok") else []

    @classmethod
    async def shazam_recognize(cls, url: str) -> Dict[str, Any]:
        """Identifies music from audio URL or Instagram reels."""
        is_ig = "instagram.com" in url.lower()
        params = {"token": API_KEYS.get("majid_token")}
        if is_ig:
            params["url"] = url
        else:
            params["audio"] = url

        res = await cls.http_get("https://api.majidapi.ir/music/shazam", params, timeout=60)
        if not res.get("ok"):
            return {"ok": False}

        data = res.get("data")
        r = data.get("result", data) if isinstance(data, dict) else {}
        return {
            "ok": True,
            "title": str(r.get("title", "")),
            "artist": str(r.get("artist", "")),
            "download": str(r.get("download", "")),
        }

    @classmethod
    async def extract_audio(cls, video_url: str) -> str:
        """Extracts MP3 audio track from direct MP4 video URL."""
        headers = {"Authorization": f"Bearer {API_KEYS.get('majid_token')}"}
        res = await cls.http_get(
            "https://api.majidapi.ir/tools/extract-audio",
            {"video": video_url},
            headers=headers,
            timeout=120
        )
        if not res.get("ok"):
            return ""

        d = res.get("data")
        if isinstance(d, str) and d.startswith("http"):
            return d
        if isinstance(d, dict):
            return str(d.get("audio_url") or d.get("url") or d.get("download_url") or d.get("result") or "")
        return ""

    @classmethod
    async def extract_ocr(cls, image_url: str, lang: str = "fa") -> str:
        """Extracts Persian and English text from image with dual fallback engine."""
        lang_param = "fa,en" if lang == "both" else lang
        headers = {"Authorization": f"Bearer {API_KEYS.get('majid_token')}"}

        res = await cls.http_get(
            "https://api.majidapi.ir/tools/ocr",
            {"lang": lang_param, "image": image_url},
            headers=headers,
            timeout=60
        )

        if res.get("ok"):
            d = res.get("data")
            if isinstance(d, str) and d.strip():
                return d.strip()
            if isinstance(d, dict):
                txt = d.get("text") or d.get("result") or d.get("data", {}).get("text")
                if txt and str(txt).strip():
                    return str(txt).strip()

        # Fallback to OCR.Space Engine
        lang_map = {"fa": "fas", "en": "eng", "both": "fas,eng"}
        ocr_space_res = await HttpClient.post(
            "https://api.ocr.space/parse/imageurl",
            payload={
                "apikey": API_KEYS.get("ocr_space", "helloworld"),
                "url": image_url,
                "language": lang_map.get(lang, "fas"),
            },
            timeout=60
        )

        if ocr_space_res.get("ok"):
            d = ocr_space_res.get("data")
            if isinstance(d, dict) and "ParsedResults" in d and len(d["ParsedResults"]) > 0:
                parsed_text = d["ParsedResults"][0].get("ParsedText", "")
                if parsed_text and parsed_text.strip():
                    return parsed_text.strip()

        return ""
