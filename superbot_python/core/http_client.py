"""
Async HTTP Client using Python Standard Library (zero-dependency)
Runs non-blocking network calls via asyncio worker threads.
"""
import asyncio
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

class AsyncHttpClient:
    @staticmethod
    def _sync_request(
        method: str,
        url: str,
        payload: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 15
    ) -> Dict[str, Any]:
        req_headers = {"User-Agent": "SuperBot-MultiPlatform-Core/1.0", "Accept": "application/json"}
        if headers:
            req_headers.update(headers)

        data = None
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            req_headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read().decode("utf-8")
                try:
                    parsed = json.loads(body)
                    if isinstance(parsed, dict):
                        if "ok" not in parsed:
                            parsed["ok"] = True
                        if "data" not in parsed:
                            parsed["data"] = parsed.get("result", parsed)
                        return parsed
                    elif isinstance(parsed, list):
                        return {"ok": True, "data": parsed}
                    else:
                        return {"ok": True, "data": parsed}
                except Exception:
                    return {"ok": True, "data": body, "raw": body}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else ""
            try:
                parsed = json.loads(err_body)
                return {"ok": False, "error_code": e.code, "description": parsed.get("description", str(e)), "data": parsed}
            except Exception:
                return {"ok": False, "error_code": e.code, "description": err_body or str(e)}
        except Exception as e:
            return {"ok": False, "error_code": -1, "description": str(e)}

    @classmethod
    async def request(
        cls,
        method: str,
        url: str,
        payload: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 15
    ) -> Dict[str, Any]:
        """Performs async HTTP request via asyncio.to_thread without blocking event loop."""
        return await asyncio.to_thread(cls._sync_request, method, url, payload, headers, timeout)

    @classmethod
    async def get(
        cls,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 15
    ) -> Dict[str, Any]:
        target_url = url
        if params:
            import urllib.parse
            query_str = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
            if query_str:
                separator = "&" if "?" in target_url else "?"
                target_url = f"{target_url}{separator}{query_str}"
        return await cls.request("GET", target_url, None, headers, timeout)

    @classmethod
    async def post(cls, url: str, payload: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, timeout: int = 15) -> Dict[str, Any]:
        return await cls.request("POST", url, payload or {}, headers, timeout)

# Alias for standard naming
HttpClient = AsyncHttpClient

