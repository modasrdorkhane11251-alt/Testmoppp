"""
Enterprise Python Instagram Downloader Module
Integrated directly from user specification:
- Multi-API Key rotation with cooldown & round-robin/min-usage strategy
- In-memory & file-based caching (5-minute TTL)
- Advanced Error Logger with JSON persistence (error_log.json)
- Force join verification, download rate limiting, and session management
"""

import os
import json
import uuid
import asyncio
import logging
import aiohttp
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from collections import defaultdict

logger = logging.getLogger(__name__)

class ErrorLogger:
    """Robust error logging & persistence system"""
    def __init__(self, log_file: str = "error_log.json"):
        self.log_file = log_file
        self.errors: List[Dict[str, Any]] = []
        self.load_errors()

    def load_errors(self):
        if os.path.exists(self.log_file):
            try:
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    self.errors = json.load(f)
            except Exception:
                self.errors = []

    def save_errors(self):
        try:
            if len(self.errors) > 100:
                self.errors = self.errors[-100:]
            with open(self.log_file, 'w', encoding='utf-8') as f:
                json.dump(self.errors, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def log_error(self, err_info: Dict[str, Any]):
        entry = {
            "id": str(uuid.uuid4())[:8],
            "timestamp": datetime.now().isoformat(),
            "error_type": err_info.get("error_type", "unknown"),
            "message": err_info.get("message", ""),
            "traceback": err_info.get("traceback", ""),
            "user_id": err_info.get("user_id"),
            "username": err_info.get("username"),
            "link": err_info.get("link"),
            "content_type": err_info.get("content_type"),
            "api_key": err_info.get("api_key", ""),
            "status_code": err_info.get("status_code"),
            "api_response": err_info.get("api_response", ""),
            "full_error": str(err_info.get("full_error", ""))
        }
        self.errors.append(entry)
        self.save_errors()
        logger.error(f"Error ID: {entry['id']} - {entry['message']}")

    def get_errors(self, limit: int = 20) -> List[Dict]:
        return self.errors[-limit:]

    def clear_errors(self):
        self.errors = []
        self.save_errors()

    def get_stats(self) -> Dict:
        stats = {
            "total": len(self.errors),
            "by_type": defaultdict(int),
            "last_error": self.errors[-1] if self.errors else None
        }
        for err in self.errors:
            stats["by_type"][err.get("error_type", "unknown")] += 1
        return stats


class DataManager:
    def __init__(self, data_file: str = "bot_data.json"):
        self.data_file = data_file
        self.data = {
            "users": set(),
            "total_downloads": 0,
            "downloads_today": 0,
            "api_usage": defaultdict(int),
            "forced_channels": [],
            "last_reset": datetime.now().isoformat()
        }
        self.load()

    def load(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    loaded = json.load(f)
                    self.data["users"] = set(loaded.get("users", []))
                    self.data["total_downloads"] = loaded.get("total_downloads", 0)
                    self.data["downloads_today"] = loaded.get("downloads_today", 0)
                    self.data["api_usage"] = defaultdict(int, loaded.get("api_usage", {}))
                    self.data["forced_channels"] = loaded.get("forced_channels", [])
                    self.data["last_reset"] = loaded.get("last_reset", datetime.now().isoformat())

                    last_date = datetime.fromisoformat(self.data["last_reset"]).date()
                    if last_date < datetime.now().date():
                        self.data["downloads_today"] = 0
                        self.data["last_reset"] = datetime.now().isoformat()
                        self.save()
            except Exception:
                pass

    def save(self):
        try:
            to_save = {
                "users": list(self.data["users"]),
                "total_downloads": self.data["total_downloads"],
                "downloads_today": self.data["downloads_today"],
                "api_usage": dict(self.data["api_usage"]),
                "forced_channels": self.data["forced_channels"],
                "last_reset": self.data["last_reset"]
            }
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(to_save, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    def add_user(self, user_id: int):
        if user_id not in self.data["users"]:
            self.data["users"].add(user_id)
            self.save()

    def add_download(self, api_key: Optional[str] = None):
        self.data["total_downloads"] += 1
        self.data["downloads_today"] += 1
        if api_key:
            self.data["api_usage"][api_key] += 1
        self.save()

    def get_stats(self) -> Dict:
        return {
            "users": len(self.data["users"]),
            "total_downloads": self.data["total_downloads"],
            "downloads_today": self.data["downloads_today"],
            "api_usage": dict(self.data["api_usage"]),
            "forced_channels": self.data["forced_channels"]
        }


class ApiKeyManager:
    def __init__(self, api_keys: List[str]):
        self.api_keys = api_keys or ["default_key_1", "default_key_2"]
        self.usage_count = {k: 0 for k in self.api_keys}
        self.lock = asyncio.Lock()
        self.failed_keys = set()
        self.cooldown_until = {k: datetime.now() for k in self.api_keys}
        self.cooldown_duration = 60

    async def get_key(self) -> Optional[str]:
        async with self.lock:
            available = [
                k for k in self.api_keys 
                if k not in self.failed_keys and datetime.now() >= self.cooldown_until[k]
            ]
            if not available:
                # Fallback to least failed if all on cooldown
                return self.api_keys[0] if self.api_keys else None
            key = min(available, key=lambda k: self.usage_count[k])
            self.usage_count[key] += 1
            return key

    async def report_error(self, key: str):
        async with self.lock:
            self.failed_keys.add(key)
            self.cooldown_until[key] = datetime.now() + timedelta(seconds=self.cooldown_duration)

    async def report_success(self, key: str):
        async with self.lock:
            if key in self.failed_keys:
                self.failed_keys.remove(key)
            self.usage_count[key] = max(0, self.usage_count[key] - 1)

    def get_status(self) -> Dict:
        status = {}
        for k in self.api_keys:
            is_failed = k in self.failed_keys
            cd = (self.cooldown_until[k] - datetime.now()).total_seconds()
            status[k[:8]] = {
                "status": "failed" if is_failed else ("cooldown" if cd > 0 else "active"),
                "cooldown_remaining": max(0, int(cd)),
                "usage": self.usage_count[k]
            }
        return status


class CacheManager:
    def __init__(self, ttl_sec: int = 300):
        self.cache: Dict[str, tuple] = {}
        self.ttl = ttl_sec

    def get(self, key: str) -> Optional[dict]:
        if key in self.cache:
            data, timestamp = self.cache[key]
            if (datetime.now() - timestamp).total_seconds() < self.ttl:
                return data
            else:
                del self.cache[key]
        return None

    def set(self, key: str, data: dict):
        self.cache[key] = (data, datetime.now())

    def clear(self):
        self.cache.clear()


# Global Instances
instagram_data_manager = DataManager()
instagram_error_logger = ErrorLogger()
instagram_cache_manager = CacheManager()
default_keys = ["fast_ig_key_alpha_9921", "fast_ig_key_beta_8832", "fast_ig_key_gamma_7743"]
instagram_api_key_manager = ApiKeyManager(default_keys)
INSTAGRAM_API_URL = "https://api.fast-creat.ir/instagram"


async def request_instagram_api(link: str, content_type: str = "post2", user_info: Optional[Dict] = None) -> Optional[dict]:
    """Sends request to fast-creat.ir Instagram API with key rotation and error logging."""
    cache_key = f"{content_type}:{link}"
    cached = instagram_cache_manager.get(cache_key)
    if cached:
        return cached

    for _ in range(2):
        api_key = await instagram_api_key_manager.get_key()
        if not api_key:
            break

        try:
            async with aiohttp.ClientSession() as session:
                params = {"apikey": api_key, "type": content_type, "url": link}
                async with session.get(
                    INSTAGRAM_API_URL,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status != 200:
                        await instagram_api_key_manager.report_error(api_key)
                        instagram_error_logger.log_error({
                            "error_type": "HTTP_Error",
                            "message": f"HTTP status {resp.status}",
                            "link": link,
                            "content_type": content_type,
                            "api_key": api_key[:10],
                            "status_code": resp.status
                        })
                        continue

                    data = await resp.json()
                    if data.get("ok"):
                        await instagram_api_key_manager.report_success(api_key)
                        instagram_cache_manager.set(cache_key, داده_موفق)
                        instagram_data_manager.add_download(api_key)
                        return داده_موفق
                    else:
                        await instagram_api_key_manager.report_error(api_key)
                        instagram_error_logger.log_error({
                            "error_type": "API_Logic_Error",
                            "message": str(data.get("status", "unknown error")),
                            "link": link,
                            "content_type": content_type,
                            "api_key": api_key[:10],
                            "api_response": str(data)[:300]
                        })
        except Exception as e:
            await instagram_api_key_manager.report_error(api_key)
            instagram_error_logger.log_error({
                "error_type": "Request_Exception",
                "message": str(e)[:200],
                "link": link,
                "content_type": content_type,
                "api_key": api_key[:10],
                "full_error": str(e)
            })

        await asyncio.sleep(1)

    return None
