import sqlite3
import os
from pathlib import Path
from typing import Generator

BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = Path(os.getenv("DATABASE_FILE", str(BASE_DIR / "atlas.db")))


def dict_factory(cursor, row):
    """Return SQLite rows as dictionaries for direct Pydantic serialization."""
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}


def get_connection() -> sqlite3.Connection:
    """Create and configure SQLite connection with WAL mode enabled."""
    conn = sqlite3.connect(str(DB_FILE), check_same_thread=False)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    """Initialize database tables and indexes."""
    conn = get_connection()
    try:
        with conn:
            # Atlas Items Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS atlas_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER DEFAULT NULL,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    category TEXT NOT NULL DEFAULT 'General',
                    priority TEXT NOT NULL DEFAULT 'medium',
                    status TEXT NOT NULL DEFAULT 'todo',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            try:
                conn.execute("ALTER TABLE atlas_items ADD COLUMN user_id INTEGER DEFAULT NULL;")
            except Exception:
                pass
            conn.execute("CREATE INDEX IF NOT EXISTS idx_items_user_id ON atlas_items(user_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_items_status ON atlas_items(status);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_items_category ON atlas_items(category);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_items_priority ON atlas_items(priority);")

            # Users Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT DEFAULT '',
                    full_name TEXT DEFAULT '',
                    dob TEXT DEFAULT '',
                    role TEXT DEFAULT 'user',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")

            # Column migration if users table existed prior to dob / salt
            try:
                conn.execute("ALTER TABLE users ADD COLUMN dob TEXT DEFAULT '';")
            except Exception:
                pass

            try:
                conn.execute("ALTER TABLE users ADD COLUMN salt TEXT DEFAULT '';")
            except Exception:
                pass

            # Auth Sessions / Tokens Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS auth_tokens (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON auth_tokens(user_id);")

            # Logic Rules Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS atlas_logic_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    trigger_event TEXT NOT NULL DEFAULT 'node.created',
                    condition_operator TEXT NOT NULL DEFAULT 'ALL',
                    conditions_json TEXT NOT NULL DEFAULT '[]',
                    actions_json TEXT NOT NULL DEFAULT '[]',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    execution_count INTEGER NOT NULL DEFAULT 0,
                    last_executed_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_logic_rules_active ON atlas_logic_rules(is_active);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_logic_rules_trigger ON atlas_logic_rules(trigger_event);")

            # Student Learning History / Activities Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS learning_activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    activity_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    details TEXT DEFAULT '',
                    solution TEXT DEFAULT '',
                    score TEXT DEFAULT '',
                    language TEXT DEFAULT 'English',
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_activities_user ON learning_activities(user_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_activities_type ON learning_activities(activity_type);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_activities_created ON learning_activities(created_at);")

            # Firewall Threat Logs Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS firewall_threat_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip TEXT NOT NULL,
                    path TEXT NOT NULL,
                    method TEXT NOT NULL,
                    threat_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    rule_name TEXT NOT NULL,
                    payload_sample TEXT DEFAULT '',
                    user_agent TEXT DEFAULT '',
                    action_taken TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_firewall_threat_ip ON firewall_threat_logs(ip);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_firewall_threat_type ON firewall_threat_logs(threat_type);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_firewall_threat_created ON firewall_threat_logs(created_at);")

            # Firewall IP Access Rules Table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS firewall_ip_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip TEXT UNIQUE NOT NULL,
                    rule_type TEXT NOT NULL, -- 'block' or 'whitelist'
                    reason TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    expires_at TEXT
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_firewall_ip_rules_ip ON firewall_ip_rules(ip);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_firewall_ip_rules_type ON firewall_ip_rules(rule_type);")

            # Email OTP Verification Table for Secure Login
            conn.execute("""
                CREATE TABLE IF NOT EXISTS email_otp_codes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    otp_code TEXT NOT NULL,
                    purpose TEXT NOT NULL DEFAULT 'login',
                    attempts_left INTEGER NOT NULL DEFAULT 4,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    is_used INTEGER NOT NULL DEFAULT 0
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_otp_email ON email_otp_codes(email);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_otp_created ON email_otp_codes(created_at);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_otp_used ON email_otp_codes(is_used);")
    finally:
        conn.close()


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """FastAPI dependency for thread-safe SQLite connection management."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
