"""
Multi-Platform Webhook Dispatcher Server (Telegram, Bale, Rubika)
Built using Python standard library (asyncio & http.server) with zero external dependencies.
"""
import asyncio
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, Optional

from config import SERVER_HOST, SERVER_PORT, WEBHOOK_SECRET_TOKEN
from core.unified_models import UnifiedUpdate, UnifiedPlatform
from core.update_parser import UnifiedUpdateParser
from core.state_machine import StateManager, States
from core.unified_sender import unified_sender
from handlers.main_menu import MainMenuHandler
from handlers.admin_panel import AdminPanelHandler
from handlers.phase2_handler import Phase2Handler
from handlers.phase3_handler import Phase3Handler
from handlers.phase4_rp_handler import Phase4RPHandler
from database.database import db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SuperBotServer")

# Global event loop reference for async dispatch from HTTP thread
GLOBAL_LOOP: Optional[asyncio.AbstractEventLoop] = None

async def dispatch_unified_update(update: UnifiedUpdate):
    """
    Central event router for all 3 platforms:
    Handles State Machine -> Admin Panel -> Phase 2 AI/Media -> Phase 3 Tools/Crypto -> Main Menu.
    """
    try:
        user = update.user
        if not user:
            return

        # 1. Handle Callback Query
        if update.callback_query:
            # Check Admin callbacks first
            if await AdminPanelHandler.handle_callback(update):
                return
            # Then Phase 2 services (AI, Vision, Media Downloaders, Shazam, OCR)
            if await Phase2Handler.handle_callback(update):
                return
            # Then Phase 3 services (Crypto, Compiler, Screenshot, Shortener, Wiki, Numberbook, Football, VPN, Uploader)
            if await Phase3Handler.handle_callback(update):
                return
            # Then Phase 4 services (Life RP: Career, Economy, Assets, Family, City Governance, Underworld)
            if await Phase4RPHandler.handle_callback(update):
                return
            # Then user menu callbacks
            if await MainMenuHandler.handle_callback(update):
                return
            return

        # 2. Handle Message (Text or Media)
        if update.message:
            msg = update.message
            text = (msg.text or "").strip()
            state, data = StateManager.get(user.platform.value, user.id)

            # Check if user/admin is in an active FSM state
            if state != States.NONE:
                # Try admin state input
                if await AdminPanelHandler.handle_state_input(update, state, data):
                    return
                # Try Phase 2 interactive state input (AI chat, prompt, URL, OCR)
                if await Phase2Handler.handle_state(update, state, data):
                    return
                # Try Phase 3 interactive state input (Crypto, Compiler, Screenshot, Shortener, Wiki, Numberbook, Uploader)
                if await Phase3Handler.handle_message(update):
                    return
                # Try user state input
                if await MainMenuHandler.handle_user_state_input(update, state, data):
                    return

            # Auto-detect direct media links (Instagram Reel/Post/Story, YouTube)
            if await Phase2Handler.handle_message(update):
                return

            # Check Life RP text commands (e.g. Card-to-card transfer, Marriage proposal)
            if await Phase4RPHandler.handle_message(update):
                return

            # Deep-link file download (e.g. /start dl_xxxx or dl_xxxx)
            if text.startswith("/start dl_") or text.startswith("dl_"):
                if await Phase3Handler.handle_message(update):
                    return

            # Commands routing
            if text.startswith("/start"):
                await MainMenuHandler.handle_start(update)
                return

            if text.startswith("/admin") or text == "پنل ادمین":
                await AdminPanelHandler.show_admin_panel(update)
                return

            # Fallback for unrecognized text messages
            await MainMenuHandler.handle_start(update)

    except Exception as e:
        logger.error(f"Error dispatching update: {e}", exc_info=True)


class WebhookRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Health check and diagnostics endpoint."""
        if self.path == "/health" or self.path == "/status" or self.path == "/":
            stats = db.get_system_stats()
            response_data = {
                "status": "online",
                "service": "SuperBot Multi-Platform Core v1.0",
                "platforms": ["telegram", "bale", "rubika"],
                "stats": stats,
            }
            body = json.dumps(response_data, ensure_ascii=False, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """Processes incoming webhooks from Telegram, Bale, or Rubika."""
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        # Detect platform from URL path
        path_lower = self.path.lower()
        platform_hint = "telegram"
        if "bale" in path_lower:
            platform_hint = "bale"
        elif "rubika" in path_lower:
            platform_hint = "rubika"

        try:
            payload = json.loads(post_data.decode("utf-8"))
            unified_update = UnifiedUpdateParser.parse(payload, platform_hint)

            if unified_update and GLOBAL_LOOP and GLOBAL_LOOP.is_running():
                asyncio.run_coroutine_threadsafe(dispatch_unified_update(unified_update), GLOBAL_LOOP)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok": true}')

        except Exception as e:
            logger.error(f"Failed to process webhook POST: {e}")
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok": false, "error": "Invalid payload"}')

    def log_message(self, format, *args):
        # Override standard HTTP request logging for cleaner console output
        pass

def start_server():
    """Runs the asynchronous event loop and HTTP server."""
    global GLOBAL_LOOP
    GLOBAL_LOOP = asyncio.new_event_loop()
    asyncio.set_event_loop(GLOBAL_LOOP)

    server_address = (SERVER_HOST, SERVER_PORT)
    httpd = HTTPServer(server_address, WebhookRequestHandler)

    logger.info(f"🚀 SuperBot Multi-Platform Server started on http://{SERVER_HOST}:{SERVER_PORT}")
    logger.info(f"🔹 Telegram Webhook: http://{SERVER_HOST}:{SERVER_PORT}/webhook/telegram")
    logger.info(f"🔸 Bale Webhook:     http://{SERVER_HOST}:{SERVER_PORT}/webhook/bale")
    logger.info(f"🔻 Rubika Webhook:   http://{SERVER_HOST}:{SERVER_PORT}/webhook/rubika")

    import threading
    loop_thread = threading.Thread(target=GLOBAL_LOOP.run_forever, daemon=True)
    loop_thread.start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Stopping server...")
    finally:
        httpd.server_close()
        GLOBAL_LOOP.call_soon_threadsafe(GLOBAL_LOOP.stop)

if __name__ == "__main__":
    start_server()
