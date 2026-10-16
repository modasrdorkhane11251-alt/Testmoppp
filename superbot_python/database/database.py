"""
Unified SQLite Database Manager for Multi-Platform SuperBot
Handles Users, Economy, Force Join, FSM State, Referrals, Tickets & Admin Logs
"""
import sqlite3
import json
import os
import threading
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from config import (
    DATABASE_PATH,
    DEFAULT_INITIAL_POINTS,
    DEFAULT_INITIAL_DIAMONDS,
    DAILY_REQUEST_LIMIT_FREE,
    DAILY_REQUEST_LIMIT_VIP,
    REFERRAL_BONUS_REFERRER,
    REFERRAL_BONUS_INVITED,
)

class DatabaseManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DatabaseManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, db_path: str = DATABASE_PATH):
        if getattr(self, "_initialized", False):
            return
        self.db_path = db_path
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        self.init_db()
        self._initialized = True

    def get_connection(self) -> sqlite3.Connection:
        """Returns a new thread-safe SQLite connection with Row factory."""
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self):
        """Creates all required tables, constraints, and indexes for the SuperBot."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Users Table (Unified cross-platform)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL,                  -- 'telegram', 'bale', 'rubika'
                platform_user_id TEXT NOT NULL,          -- User ID on that platform
                username TEXT,
                first_name TEXT,
                points INTEGER DEFAULT 50,               -- Coin / Credit balance
                diamonds INTEGER DEFAULT 5,              -- Premium currency
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                role TEXT DEFAULT 'user',                -- 'user', 'vip', 'admin', 'superadmin'
                is_vip INTEGER DEFAULT 0,
                vip_until TEXT,
                is_banned INTEGER DEFAULT 0,
                ban_reason TEXT,
                daily_requests_count INTEGER DEFAULT 0,
                last_request_date TEXT,
                referrer_id INTEGER,                     -- References users.id
                referral_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(platform, platform_user_id)
            );
            """)

            # 2. User State Machine Table (Persistent FSM)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_states (
                platform TEXT NOT NULL,
                platform_user_id TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT 'NONE',
                data_json TEXT DEFAULT '{}',
                updated_at TEXT NOT NULL,
                PRIMARY KEY (platform, platform_user_id)
            );
            """)

            # 3. Force Join Channels Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS force_join_channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL DEFAULT 'all',    -- 'all', 'telegram', 'bale', 'rubika'
                channel_id TEXT NOT NULL,                -- e.g. '@SuperBotChannel' or '-100...'
                channel_title TEXT NOT NULL,
                channel_url TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                UNIQUE(platform, channel_id)
            );
            """)

            # 4. Referrals Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_user_id INTEGER NOT NULL,       -- Primary key in users
                invited_user_id INTEGER NOT NULL,        -- Primary key in users
                platform TEXT NOT NULL,
                bonus_referrer INTEGER NOT NULL,
                bonus_invited INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (referrer_user_id) REFERENCES users(id),
                FOREIGN KEY (invited_user_id) REFERENCES users(id),
                UNIQUE(invited_user_id)
            );
            """)

            # 5. Transactions Table (Points & Diamonds ledger)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'points',          -- 'points' or 'diamonds'
                type TEXT NOT NULL,                      -- 'initial_bonus', 'referral', 'daily_claim', 'ai_chat', 'admin_grant'
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """)

            # 6. Admin Logs Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS admin_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                action TEXT NOT NULL,                    -- 'ban', 'unban', 'grant_points', 'broadcast', 'toggle_maintenance'
                target_user_id TEXT,
                details TEXT,
                created_at TEXT NOT NULL
            );
            """)

            # 7. Support Tickets Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS support_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                platform_user_id TEXT NOT NULL,
                message_text TEXT NOT NULL,
                status TEXT DEFAULT 'open',              -- 'open', 'replied', 'closed'
                reply_text TEXT,
                replied_by TEXT,
                created_at TEXT NOT NULL,
                replied_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """)

            # 8. Daily Rewards Claim Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                claim_date TEXT NOT NULL,                -- YYYY-MM-DD
                points_awarded INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, claim_date),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """)

            # 9. Bot Settings Table (Key-Value Store)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS bot_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT
            );
            """)

            # 10. Deep-Link Uploaded Files Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_code TEXT UNIQUE NOT NULL,          -- e.g. 'f_82a1b9'
                uploader_user_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                file_type TEXT NOT NULL,                -- 'document', 'photo', 'video', 'audio', 'voice'
                file_id TEXT NOT NULL,                  -- native file_id or url
                file_name TEXT,
                file_size INTEGER DEFAULT 0,
                caption TEXT,
                downloads_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (uploader_user_id) REFERENCES users(id)
            );
            """)

            # 11. Life RP Stats Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rp_stats (
                uid TEXT PRIMARY KEY,
                platform TEXT NOT NULL DEFAULT 'telegram',
                platform_user_id TEXT NOT NULL,
                age INTEGER DEFAULT 18,
                energy INTEGER DEFAULT 100,
                health INTEGER DEFAULT 100,
                happiness INTEGER DEFAULT 100,
                stress INTEGER DEFAULT 0,
                hunger INTEGER DEFAULT 0,
                sleep INTEGER DEFAULT 100,
                intelligence INTEGER DEFAULT 10,
                job TEXT DEFAULT NULL,
                bank_balance INTEGER DEFAULT 5000,
                loan INTEGER DEFAULT 0,
                jailed_until REAL DEFAULT 0,
                partner_uid TEXT DEFAULT NULL,
                total_crimes INTEGER DEFAULT 0,
                successful_crimes INTEGER DEFAULT 0,
                last_work_time REAL DEFAULT 0,
                last_income_time REAL DEFAULT 0
            );
            """)

            # 12. Life RP Assets Table (Properties, Vehicles, Stocks)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rp_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uid TEXT NOT NULL,
                type TEXT NOT NULL,
                item_key TEXT NOT NULL,
                purchased_at TEXT NOT NULL
            );
            """)

            # 13. Life RP Cities & Governance Table (Group Cities & Mayor)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rp_cities (
                chat_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                mayor_id TEXT DEFAULT NULL,
                budget INTEGER DEFAULT 100000,
                score INTEGER DEFAULT 10,
                tax_rate REAL DEFAULT 0.05
            );
            """)

            # 14. Life RP Marriages Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rp_marriages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user1_uid TEXT NOT NULL,
                user2_uid TEXT NOT NULL,
                dowry INTEGER DEFAULT 1000,
                married_at TEXT NOT NULL,
                status TEXT DEFAULT 'active'
            );
            """)

            # 15. HopPoint Pets Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rp_pets (
                uid TEXT PRIMARY KEY,
                pet_name TEXT DEFAULT 'گرگ قهرمان',
                species TEXT DEFAULT 'گرگ خاکستری',
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                hunger INTEGER DEFAULT 20,
                energy INTEGER DEFAULT 100,
                power INTEGER DEFAULT 25,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                last_fed TEXT DEFAULT NULL
            );
            """)

            # Fast Performance Indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_lookup ON users(platform, platform_user_id);");
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_rp_assets_uid ON rp_assets(uid);");
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_rp_stats_job ON rp_stats(job);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_force_join_active ON force_join_channels(platform, is_active);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_uploaded_file_code ON uploaded_files(file_code);")

            # Seed Default Global Settings
            defaults = [
                ("maintenance_mode", "0", "1 if bot is in maintenance mode, 0 if operational"),
                ("welcome_text", "سلام خوش آمدید به سوپر ربات همه‌کاره!", "Default welcome message"),
                ("referral_bonus_referrer", str(REFERRAL_BONUS_REFERRER), "Points given to inviter"),
                ("referral_bonus_invited", str(REFERRAL_BONUS_INVITED), "Points given to invitee"),
                ("force_join_enabled", "1", "1 to enforce channel membership, 0 to bypass"),
            ]
            for key, val, desc in defaults:
                cursor.execute("""
                INSERT OR IGNORE INTO bot_settings (key, value, description)
                VALUES (?, ?, ?);
                """, (key, val, desc))

            conn.commit()

    # ==========================================================
    # USER OPERATIONS (CREATE, READ, UPDATE, REPUTATION)
    # ==========================================================
    def get_or_create_user(
        self,
        platform: str,
        platform_user_id: str,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
        referrer_platform_id: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Retrieves existing user or creates a new one with initial bonuses
        and handles automatic referral association if valid.
        Returns: (user_dict, is_new_user)
        """
        platform_user_id = str(platform_user_id)
        now_str = datetime.utcnow().isoformat()
        today_str = date.today().isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Try to find existing user
            cursor.execute("""
                SELECT * FROM users WHERE platform = ? AND platform_user_id = ?;
            """, (platform, platform_user_id))
            row = cursor.fetchone()

            if row:
                # Update last seen details
                cursor.execute("""
                    UPDATE users
                    SET username = COALESCE(?, username),
                        first_name = COALESCE(?, first_name),
                        updated_at = ?
                    WHERE id = ?;
                """, (username, first_name, now_str, row["id"]))
                conn.commit()

                # Re-fetch updated row
                cursor.execute("SELECT * FROM users WHERE id = ?;", (row["id"],))
                return dict(cursor.fetchone()), False

            # 2. Check referrer (Cross-platform and multi-format support)
            resolved_referrer_pk = None
            if referrer_platform_id and str(referrer_platform_id) != platform_user_id:
                # Check same platform first
                cursor.execute("""
                    SELECT id FROM users WHERE platform = ? AND platform_user_id = ?;
                """, (platform, str(referrer_platform_id)))
                ref_row = cursor.fetchone()
                
                # Check across any platform
                if not ref_row:
                    cursor.execute("""
                        SELECT id FROM users WHERE platform_user_id = ?;
                    """, (str(referrer_platform_id),))
                    ref_row = cursor.fetchone()

                # Check by internal user ID
                if not ref_row and str(referrer_platform_id).isdigit():
                    cursor.execute("SELECT id FROM users WHERE id = ?;", (int(referrer_platform_id),))
                    ref_row = cursor.fetchone()

                if ref_row:
                    resolved_referrer_pk = ref_row["id"]

            # 3. Create new user
            initial_points = DEFAULT_INITIAL_POINTS
            if resolved_referrer_pk:
                initial_points += REFERRAL_BONUS_INVITED

            cursor.execute("""
                INSERT INTO users (
                    platform, platform_user_id, username, first_name,
                    points, diamonds, xp, level, role, is_vip,
                    is_banned, daily_requests_count, last_request_date,
                    referrer_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 'user', 0, 0, 0, ?, ?, ?, ?);
            """, (
                platform,
                platform_user_id,
                username or "",
                first_name or "کاربر",
                initial_points,
                DEFAULT_INITIAL_DIAMONDS,
                today_str,
                resolved_referrer_pk,
                now_str,
                now_str
            ))
            new_user_id = cursor.lastrowid

            # Initial gift transaction
            cursor.execute("""
                INSERT INTO transactions (user_id, amount, currency, type, description, created_at)
                VALUES (?, ?, 'points', 'initial_bonus', 'هدیه عضویت اولیه', ?);
            """, (new_user_id, DEFAULT_INITIAL_POINTS, now_str))

            # Reward referrer if exists
            if resolved_referrer_pk:
                cursor.execute("""
                    UPDATE users
                    SET points = points + ?,
                        referral_count = referral_count + 1
                    WHERE id = ?;
                """, (REFERRAL_BONUS_REFERRER, resolved_referrer_pk))

                cursor.execute("""
                    INSERT INTO referrals (referrer_user_id, invited_user_id, platform, bonus_referrer, bonus_invited, created_at)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, (resolved_referrer_pk, new_user_id, platform, REFERRAL_BONUS_REFERRER, REFERRAL_BONUS_INVITED, now_str))

                cursor.execute("""
                    INSERT INTO transactions (user_id, amount, currency, type, description, created_at)
                    VALUES (?, ?, 'points', 'referral', 'پاداش دعوت کاربر جدید', ?);
                """, (resolved_referrer_pk, REFERRAL_BONUS_REFERRER, now_str))

            conn.commit()

            cursor.execute("SELECT * FROM users WHERE id = ?;", (new_user_id,))
            return dict(cursor.fetchone()), True

    def get_user(self, platform: str, platform_user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user by platform and platform_user_id."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM users WHERE platform = ? AND platform_user_id = ?;
            """, (platform, str(platform_user_id)))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Fetch user by primary key ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def add_points(self, platform: str, platform_user_id: str, amount: int, reason: str = "system") -> int:
        """Adds points to a user's account and logs the transaction. Returns new balance."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET points = points + ?,
                    updated_at = ?
                WHERE platform = ? AND platform_user_id = ?;
            """, (amount, datetime.utcnow().isoformat(), platform, str(platform_user_id)))

            cursor.execute("""
                SELECT id, points FROM users WHERE platform = ? AND platform_user_id = ?;
            """, (platform, str(platform_user_id)))
            row = cursor.fetchone()
            if row:
                cursor.execute("""
                    INSERT INTO transactions (user_id, amount, currency, type, description, created_at)
                    VALUES (?, ?, 'points', 'credit', ?, ?);
                """, (row["id"], amount, reason, datetime.utcnow().isoformat()))
                conn.commit()
                return row["points"]
            return 0

    def deduct_points(self, platform: str, platform_user_id: str, amount: int, reason: str = "service_cost") -> bool:
        """
        Deducts points if the user has sufficient balance.
        Returns True if successful, False if insufficient points.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, points FROM users WHERE platform = ? AND platform_user_id = ?;
            """, (platform, str(platform_user_id)))
            row = cursor.fetchone()
            if not row or row["points"] < amount:
                return False

            cursor.execute("""
                UPDATE users
                SET points = points - ?,
                    updated_at = ?
                WHERE id = ?;
            """, (amount, datetime.utcnow().isoformat(), row["id"]))

            cursor.execute("""
                INSERT INTO transactions (user_id, amount, currency, type, description, created_at)
                VALUES (?, ?, 'points', 'debit', ?, ?);
            """, (row["id"], -amount, reason, datetime.utcnow().isoformat()))

            conn.commit()
            return True

    def add_user_xp(self, platform: str, platform_user_id: str, xp_gain: int) -> int:
        """Adds XP to a user and automatically levels up if needed."""
        import math
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, xp, level FROM users WHERE platform = ? AND platform_user_id = ?;", (platform, str(platform_user_id)))
            row = cursor.fetchone()
            if not row:
                return 0
            new_xp = (row["xp"] or 0) + xp_gain
            new_level = max(1, 1 + int(math.sqrt(max(0, new_xp) / 100)))
            cursor.execute("""
                UPDATE users SET xp = ?, level = ?, updated_at = ?
                WHERE id = ?;
            """, (new_xp, new_level, datetime.utcnow().isoformat(), row["id"]))
            conn.commit()
            return new_level

    def update_user_points(self, platform: str, platform_user_id: str, amount: int, is_increment: bool = True) -> bool:
        """Convenience helper for adding or deducting points."""
        if amount >= 0:
            self.add_points(platform, platform_user_id, amount, "rp_system")
            return True
        else:
            return self.deduct_points(platform, platform_user_id, abs(amount), "rp_system")

    def ban_user(self, platform: str, platform_user_id: str, reason: str = "نقض قوانین") -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET is_banned = 1, ban_reason = ?, updated_at = ?
                WHERE platform = ? AND platform_user_id = ?;
            """, (reason, datetime.utcnow().isoformat(), platform, str(platform_user_id)))
            conn.commit()
            return cursor.rowcount > 0

    def unban_user(self, platform: str, platform_user_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET is_banned = 0, ban_reason = NULL, updated_at = ?
                WHERE platform = ? AND platform_user_id = ?;
            """, (datetime.utcnow().isoformat(), platform, str(platform_user_id)))
            conn.commit()
            return cursor.rowcount > 0

    def set_vip(self, platform: str, platform_user_id: str, days: int = 30) -> bool:
        """Grants VIP status for a given number of days."""
        expiry = (datetime.utcnow() + timedelta(days=days)).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users
                SET is_vip = 1, role = 'vip', vip_until = ?, updated_at = ?
                WHERE platform = ? AND platform_user_id = ?;
            """, (expiry, datetime.utcnow().isoformat(), platform, str(platform_user_id)))
            conn.commit()
            return cursor.rowcount > 0

    def increment_daily_requests(self, platform: str, platform_user_id: str) -> int:
        """Increments daily request counter and handles midnight date rollover."""
        today_str = date.today().isoformat()
        now_str = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # If date has rolled over, reset counter to 1, otherwise increment
            cursor.execute("""
                UPDATE users
                SET daily_requests_count = CASE 
                        WHEN last_request_date = ? THEN daily_requests_count + 1 
                        ELSE 1 
                    END,
                    last_request_date = ?,
                    updated_at = ?
                WHERE platform = ? AND platform_user_id = ?;
            """, (today_str, today_str, now_str, platform, str(platform_user_id)))
            conn.commit()
            cursor.execute("""
                SELECT daily_requests_count FROM users WHERE platform = ? AND platform_user_id = ?;
            """, (platform, str(platform_user_id)))
            row = cursor.fetchone()
            return row["daily_requests_count"] if row else 1

    def check_daily_limit_and_increment(self, platform: str, platform_user_id: str) -> bool:
        """
        Enforces daily request limits based on user role (Free vs VIP).
        Returns True if within limit, False if exceeded.
        """
        today_str = date.today().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, is_vip, daily_requests_count, last_request_date
                FROM users WHERE platform = ? AND platform_user_id = ?;
            """, (platform, str(platform_user_id)))
            row = cursor.fetchone()
            if not row:
                return False

            limit = DAILY_REQUEST_LIMIT_VIP if row["is_vip"] else DAILY_REQUEST_LIMIT_FREE

            # Reset count if it's a new day
            if row["last_request_date"] != today_str:
                cursor.execute("""
                    UPDATE users
                    SET daily_requests_count = 1, last_request_date = ?
                    WHERE id = ?;
                """, (today_str, row["id"]))
                conn.commit()
                return True

            if row["daily_requests_count"] >= limit:
                return False

            cursor.execute("""
                UPDATE users
                SET daily_requests_count = daily_requests_count + 1
                WHERE id = ?;
            """, (row["id"],))
            conn.commit()
            return True

    # ==========================================================
    # FINITE STATE MACHINE (FSM) ENGINE
    # ==========================================================
    def set_user_state(self, platform: str, platform_user_id: str, state: str, data: Optional[Dict[str, Any]] = None):
        """Sets current conversation state and attached JSON metadata."""
        now_str = datetime.utcnow().isoformat()
        data_json = json.dumps(data or {}, ensure_ascii=False)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_states (platform, platform_user_id, state, data_json, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(platform, platform_user_id) DO UPDATE SET
                    state = excluded.state,
                    data_json = excluded.data_json,
                    updated_at = excluded.updated_at;
            """, (platform, str(platform_user_id), state, data_json, now_str))
            conn.commit()

    def get_user_state(self, platform: str, platform_user_id: str) -> Tuple[str, Dict[str, Any]]:
        """Returns tuple of (state_name, data_dict). Returns ('NONE', {}) if no state."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT state, data_json FROM user_states
                WHERE platform = ? AND platform_user_id = ?;
            """, (platform, str(platform_user_id)))
            row = cursor.fetchone()
            if not row:
                return "NONE", {}
            try:
                data = json.loads(row["data_json"]) if row["data_json"] else {}
            except Exception:
                data = {}
            return row["state"], data

    def clear_user_state(self, platform: str, platform_user_id: str):
        """Resets user state to 'NONE'."""
        self.set_user_state(platform, platform_user_id, "NONE", {})

    # ==========================================================
    # FORCE JOIN CHANNELS MANAGEMENT
    # ==========================================================
    def get_active_force_channels(self, platform: str = "all") -> List[Dict[str, Any]]:
        """Returns active channels to force join for a specific platform or 'all'."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if platform == "all":
                cursor.execute("""
                    SELECT * FROM force_join_channels WHERE is_active = 1 ORDER BY id ASC;
                """)
            else:
                cursor.execute("""
                    SELECT * FROM force_join_channels
                    WHERE is_active = 1 AND (platform = 'all' OR platform = ?)
                    ORDER BY id ASC;
                """, (platform,))
            return [dict(row) for row in cursor.fetchall()]

    def add_force_channel(self, platform: str, channel_id: str, title: str, url: str) -> bool:
        """Adds a new channel for mandatory membership."""
        now_str = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO force_join_channels (platform, channel_id, channel_title, channel_url, is_active, created_at)
                    VALUES (?, ?, ?, ?, 1, ?)
                    ON CONFLICT(platform, channel_id) DO UPDATE SET
                        channel_title = excluded.channel_title,
                        channel_url = excluded.channel_url,
                        is_active = 1;
                """, (platform, channel_id.strip(), title.strip(), url.strip(), now_str))
                conn.commit()
                return True
            except Exception:
                return False

    def remove_force_channel(self, channel_id: str) -> bool:
        """Deactivates or deletes a force join channel."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM force_join_channels WHERE channel_id = ?;", (channel_id.strip(),))
            conn.commit()
            return cursor.rowcount > 0

    # ==========================================================
    # SYSTEM STATS & ADMIN AUDITING
    # ==========================================================
    def get_system_stats(self) -> Dict[str, Any]:
        """Provides full metrics across all 3 platforms."""
        today_str = date.today().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) AS total FROM users;")
            total_users = cursor.fetchone()["total"]

            cursor.execute("SELECT platform, COUNT(*) AS count FROM users GROUP BY platform;")
            platform_counts = {row["platform"]: row["count"] for row in cursor.fetchall()}

            cursor.execute("SELECT COUNT(*) AS total FROM users WHERE last_request_date = ?;", (today_str,))
            today_active = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) AS total FROM users WHERE is_vip = 1;")
            vip_users = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) AS total FROM users WHERE is_banned = 1;")
            banned_users = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) AS total FROM referrals;")
            total_referrals = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) AS total FROM support_tickets WHERE status = 'open';")
            open_tickets = cursor.fetchone()["total"]

            cursor.execute("SELECT value FROM bot_settings WHERE key = 'maintenance_mode';")
            m_row = cursor.fetchone()
            maintenance = bool(int(m_row["value"])) if m_row else False

            return {
                "total_users": total_users,
                "telegram_users": platform_counts.get("telegram", 0),
                "bale_users": platform_counts.get("bale", 0),
                "rubika_users": platform_counts.get("rubika", 0),
                "today_active_users": today_active,
                "vip_users": vip_users,
                "banned_users": banned_users,
                "total_referrals": total_referrals,
                "open_tickets": open_tickets,
                "maintenance_mode": maintenance,
            }

    def log_admin_action(self, admin_id: str, platform: str, action: str, target_id: Optional[str] = None, details: Optional[str] = None):
        """Logs an admin operation for full auditability."""
        now_str = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO admin_logs (admin_id, platform, action, target_user_id, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?);
            """, (str(admin_id), platform, action, str(target_id or ""), details or "", now_str))
            conn.commit()

    def get_all_user_platform_ids(self, platform: Optional[str] = None) -> List[Tuple[str, str]]:
        """Returns list of (platform, platform_user_id) for broadcasting."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if platform and platform != "all":
                cursor.execute("""
                    SELECT platform, platform_user_id FROM users WHERE platform = ? AND is_banned = 0;
                """, (platform,))
            else:
                cursor.execute("""
                    SELECT platform, platform_user_id FROM users WHERE is_banned = 0;
                """)
            return [(row["platform"], row["platform_user_id"]) for row in cursor.fetchall()]

    # ==========================================================
    # SETTINGS & TICKETS
    # ==========================================================
    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM bot_settings WHERE key = ?;", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default

    def set_setting(self, key: str, value: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO bot_settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value;
            """, (key, str(value)))
            conn.commit()

    def create_support_ticket(self, platform: str, platform_user_id: str, message: str) -> int:
        now_str = datetime.utcnow().isoformat()
        user_tuple = self.get_or_create_user(platform, str(platform_user_id))
        user_id = user_tuple[0]["id"]
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO support_tickets (user_id, platform, platform_user_id, message_text, status, created_at)
                VALUES (?, ?, ?, ?, 'open', ?);
            """, (user_id, platform, str(platform_user_id), message, now_str))
            conn.commit()
            return cursor.lastrowid

    def get_open_tickets(self, limit: int = 10) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM support_tickets WHERE status = 'open' ORDER BY id DESC LIMIT ?;
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    def reply_ticket(self, ticket_id: int, reply_text: str, replied_by: str) -> Optional[Dict[str, Any]]:
        now_str = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE support_tickets
                SET status = 'replied', reply_text = ?, replied_by = ?, replied_at = ?
                WHERE id = ?;
            """, (reply_text, replied_by, now_str, ticket_id))
            cursor.execute("SELECT * FROM support_tickets WHERE id = ?;", (ticket_id,))
            row = cursor.fetchone()
            conn.commit()
            return dict(row) if row else None

    def save_uploaded_file(self, platform: str, platform_user_id: str, file_type: str, file_id: str, file_name: Optional[str] = None, file_size: int = 0, caption: Optional[str] = None) -> str:
        """Stores an uploaded file for deep-link distribution and returns a unique file_code."""
        import secrets
        file_code = f"dl_{secrets.token_hex(4)}"
        now_str = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE platform = ? AND platform_user_id = ?;", (platform, str(platform_user_id)))
            user_row = cursor.fetchone()
            if user_row:
                user_id = user_row["id"]
            else:
                u_tuple = self.get_or_create_user(platform, str(platform_user_id))
                user_id = u_tuple[0]["id"]
            cursor.execute("""
                INSERT INTO uploaded_files (file_code, uploader_user_id, platform, file_type, file_id, file_name, file_size, caption, downloads_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?);
            """, (file_code, user_id, platform, file_type, file_id, file_name or "file", file_size, caption or "", now_str))
            conn.commit()
            return file_code

    def get_uploaded_file(self, file_code: str, increment_download: bool = True) -> Optional[Dict[str, Any]]:
        """Retrieves file details by file_code and increments download counter."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM uploaded_files WHERE file_code = ?;", (file_code,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            if increment_download:
                cursor.execute("UPDATE uploaded_files SET downloads_count = downloads_count + 1 WHERE file_code = ?;", (file_code,))
                conn.commit()
                res["downloads_count"] += 1
            return res

    def get_user_uploaded_files(self, platform: str, platform_user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves list of files uploaded by a user."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE platform = ? AND platform_user_id = ?;", (platform, str(platform_user_id)))
            user_row = cursor.fetchone()
            if not user_row:
                return []
            cursor.execute("""
                SELECT * FROM uploaded_files WHERE uploader_user_id = ? ORDER BY id DESC LIMIT ?;
            """, (user_row["id"], limit))
            return [dict(r) for r in cursor.fetchall()]


    # =========================================================================
    # Life RP (Roleplay & City Simulator) Methods
    # =========================================================================

    def get_or_create_rp_stats(self, platform: str, platform_user_id: str) -> Dict[str, Any]:
        """Retrieves or creates Life RP stats for a citizen."""
        uid = f"{platform}_{platform_user_id}"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM rp_stats WHERE uid = ?;", (uid,))
            row = cursor.fetchone()
            if row:
                return dict(row)

            # Insert default citizen record
            cursor.execute("""
                INSERT INTO rp_stats (
                    uid, platform, platform_user_id, age, energy, health, happiness,
                    stress, hunger, sleep, intelligence, job, bank_balance, loan,
                    jailed_until, partner_uid, total_crimes, successful_crimes,
                    last_work_time, last_income_time
                ) VALUES (?, ?, ?, 18, 100, 100, 100, 0, 0, 100, 10, NULL, 5000, 0, 0, NULL, 0, 0, 0, 0);
            """, (uid, platform, str(platform_user_id)))
            conn.commit()

            cursor.execute("SELECT * FROM rp_stats WHERE uid = ?;", (uid,))
            return dict(cursor.fetchone())

    def update_rp_stats(self, uid: str, **kwargs) -> Dict[str, Any]:
        """Updates citizen stats with clamping on health/energy/happiness/sleep/stress/hunger."""
        if not kwargs:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM rp_stats WHERE uid = ?;", (uid,))
                r = cursor.fetchone()
                return dict(r) if r else {}

        # Clamp percentage values
        for key in ["energy", "health", "happiness", "sleep"]:
            if key in kwargs and isinstance(kwargs[key], (int, float)):
                kwargs[key] = max(0, min(100, int(kwargs[key])))
        for key in ["stress", "hunger"]:
            if key in kwargs and isinstance(kwargs[key], (int, float)):
                kwargs[key] = max(0, min(100, int(kwargs[key])))

        set_clause = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [uid]

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE rp_stats SET {set_clause} WHERE uid = ?;", values)
            conn.commit()
            cursor.execute("SELECT * FROM rp_stats WHERE uid = ?;", (uid,))
            return dict(cursor.fetchone())

    def get_rp_assets(self, uid: str) -> List[Dict[str, Any]]:
        """Retrieves all properties, vehicles, and assets owned by citizen."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM rp_assets WHERE uid = ? ORDER BY id DESC;", (uid,))
            return [dict(r) for r in cursor.fetchall()]

    def add_rp_asset(self, uid: str, asset_type: str, item_key: str) -> int:
        """Records purchase of a new asset."""
        now_str = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO rp_assets (uid, type, item_key, purchased_at)
                VALUES (?, ?, ?, ?);
            """, (uid, asset_type, item_key, now_str))
            conn.commit()
            return cursor.lastrowid

    def remove_rp_asset(self, asset_id: int, uid: str) -> bool:
        """Sells or removes an asset owned by citizen."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM rp_assets WHERE id = ? AND uid = ?;", (asset_id, uid))
            conn.commit()
            return cursor.rowcount > 0

    def get_or_create_rp_city(self, chat_id: str, default_name: str = "شهر آرمانی") -> Dict[str, Any]:
        """Retrieves or initializes group city government."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM rp_cities WHERE chat_id = ?;", (str(chat_id),))
            row = cursor.fetchone()
            if row:
                return dict(row)

            cursor.execute("""
                INSERT INTO rp_cities (chat_id, name, mayor_id, budget, score, tax_rate)
                VALUES (?, ?, NULL, 100000, 10, 0.05);
            """, (str(chat_id), default_name))
            conn.commit()
            cursor.execute("SELECT * FROM rp_cities WHERE chat_id = ?;", (str(chat_id),))
            return dict(cursor.fetchone())

    def update_rp_city(self, chat_id: str, **kwargs) -> Dict[str, Any]:
        """Updates city parameters (budget, mayor, score, tax_rate)."""
        if not kwargs:
            return self.get_or_create_rp_city(chat_id)
        set_clause = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [str(chat_id)]
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE rp_cities SET {set_clause} WHERE chat_id = ?;", values)
            conn.commit()
            cursor.execute("SELECT * FROM rp_cities WHERE chat_id = ?;", (str(chat_id),))
            return dict(cursor.fetchone())

    def get_or_create_pet(self, uid: str) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM rp_pets WHERE uid = ?;", (uid,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            cursor.execute(
                """
                INSERT INTO rp_pets (uid, pet_name, species, level, xp, hunger, energy, power, wins, losses)
                VALUES (?, 'گرگ تیزپا', 'گرگ خاکستری', 1, 0, 20, 100, 30, 0, 0);
                """,
                (uid,)
            )
            cursor.execute("SELECT * FROM rp_pets WHERE uid = ?;", (uid,))
            return dict(cursor.fetchone())

    def update_pet(self, uid: str, **kwargs) -> bool:
        if not kwargs:
            return False
        with self.get_connection() as conn:
            cursor = conn.cursor()
            clauses = [f"{k} = ?" for k in kwargs.keys()]
            vals = list(kwargs.values()) + [uid]
            query = f"UPDATE rp_pets SET {', '.join(clauses)} WHERE uid = ?;"
            cursor.execute(query, tuple(vals))
            return cursor.rowcount > 0

    def get_rp_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns top citizens ordered by total net worth (cash + bank - loan)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT s.*, u.username, u.first_name, u.points as cash_points
                FROM rp_stats s
                LEFT JOIN users u ON (s.platform = u.platform AND s.platform_user_id = u.platform_user_id)
                ORDER BY (s.bank_balance + COALESCE(u.points, 0) - s.loan) DESC
                LIMIT ?;
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    def get_active_marriage(self, uid: str) -> Optional[Dict[str, Any]]:
        """Returns active marriage record if citizen is married."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM rp_marriages
                WHERE (user1_uid = ? OR user2_uid = ?) AND status = 'active'
                LIMIT 1;
            """, (uid, uid))
            row = cursor.fetchone()
            return dict(row) if row else None

    def register_marriage(self, user1_uid: str, user2_uid: str, dowry: int = 1000) -> int:
        """Registers a lawful marriage between two citizens."""
        now_str = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO rp_marriages (user1_uid, user2_uid, dowry, married_at, status)
                VALUES (?, ?, ?, ?, 'active');
            """, (user1_uid, user2_uid, dowry, now_str))
            m_id = cursor.lastrowid
            cursor.execute("UPDATE rp_stats SET partner_uid = ?, happiness = MIN(100, happiness + 25) WHERE uid = ?;", (user2_uid, user1_uid))
            cursor.execute("UPDATE rp_stats SET partner_uid = ?, happiness = MIN(100, happiness + 25) WHERE uid = ?;", (user1_uid, user2_uid))
            conn.commit()
            return m_id

    def register_divorce(self, uid: str) -> bool:
        """Dissolves marriage, pays out dowry, and updates partner status."""
        m = self.get_active_marriage(uid)
        if not m:
            return False
        partner_uid = m["user2_uid"] if m["user1_uid"] == uid else m["user1_uid"]
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE rp_marriages SET status = 'divorced' WHERE id = ?;", (m["id"],))
            cursor.execute("UPDATE rp_stats SET partner_uid = NULL, happiness = MAX(0, happiness - 20) WHERE uid IN (?, ?);", (uid, partner_uid))
            conn.commit()
            return True


# Global singleton instance
db = DatabaseManager()
