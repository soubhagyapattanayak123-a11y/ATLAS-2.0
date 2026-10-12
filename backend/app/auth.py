import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any


# OWASP recommended standard for PBKDF2-HMAC-SHA256 (600,000 rounds)
ITERATIONS = 600_000

# Server-side Security Pepper (Defence-in-depth secret key)
# Never stored in the database. Even if an attacker gains full read access to atlas.db,
# they cannot crack salted hashes without this server pepper.
LEGACY_DEFAULT_PEPPER = "atlas_core_defense_pepper_salt_secret_key_2026_v2"
SECURITY_PEPPER = os.getenv(
    "SECURITY_PEPPER",
    os.getenv("SECRET_KEY", LEGACY_DEFAULT_PEPPER),
)


def generate_salt(bytes_count: int = 32) -> str:
    """
    Generate a cryptographically secure 256-bit (32-byte) random salt as a 64-character hex string.
    Draws entropy from OS CSPRNG (Cryptographically Secure Pseudo-Random Number Generator).
    Prevents rainbow tables, dictionary attacks, and hash collision vulnerabilities.
    """
    return secrets.token_hex(bytes_count)


def extract_salt_from_hash(stored_hash: str) -> Optional[str]:
    """Extract salt component from a modular crypt formatted string."""
    try:
        parts = stored_hash.split("$")
        if len(parts) >= 4 and parts[0] == "pbkdf2_sha256":
            return parts[2]
        return None
    except Exception:
        return None


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """
    Generate military-grade salted & peppered PBKDF2-HMAC-SHA256 password hash.
    
    1. Per-User Salt: Unique 256-bit (32-byte) random entropy per password.
    2. Server Pepper: HMAC pre-keying preventing offline GPU cracking if DB is leaked.
    3. 600,000 Iterations: OWASP recommended compute cost making brute force mathematically infeasible.
    
    Format: pbkdf2_sha256$<iterations>$<salt>$<hash>
    """
    if not salt:
        salt = generate_salt(32)

    # Blend password with server-side pepper using HMAC-SHA256
    peppered_key = hmac.new(
        SECURITY_PEPPER.encode("utf-8"),
        password.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    key = hashlib.pbkdf2_hmac(
        "sha256",
        peppered_key,
        salt.encode("utf-8"),
        ITERATIONS,
    )
    return f"pbkdf2_sha256${ITERATIONS}${salt}${key.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """
    Verify plain password against stored hash using constant-time comparison.
    Supports both modern peppered 600k hashes and legacy unpeppered hashes with zero downtime.
    """
    try:
        parts = stored_hash.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False

        iterations = int(parts[1])
        salt = parts[2]
        expected_hash = parts[3]

        # 1. Try modern peppered verification
        peppered_key = hmac.new(
            SECURITY_PEPPER.encode("utf-8"),
            plain_password.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        candidate_key = hashlib.pbkdf2_hmac(
            "sha256",
            peppered_key,
            salt.encode("utf-8"),
            iterations,
        )
        if hmac.compare_digest(candidate_key.hex(), expected_hash):
            return True

        # 2. Backward compatibility fallback: Try legacy default pepper verification
        if SECURITY_PEPPER != LEGACY_DEFAULT_PEPPER:
            legacy_pepper_key = hmac.new(
                LEGACY_DEFAULT_PEPPER.encode("utf-8"),
                plain_password.encode("utf-8"),
                hashlib.sha256,
            ).digest()
            candidate_legacy_key = hashlib.pbkdf2_hmac(
                "sha256",
                legacy_pepper_key,
                salt.encode("utf-8"),
                iterations,
            )
            if hmac.compare_digest(candidate_legacy_key.hex(), expected_hash):
                return True

        # 3. Backward compatibility fallback: Try legacy unpeppered verification
        legacy_key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        if hmac.compare_digest(legacy_key.hex(), expected_hash):
            return True

        return False
    except Exception:
        return False


def needs_rehash(stored_hash: str) -> bool:
    """
    Check if a stored password hash is using outdated parameters (< 600,000 rounds or old salt length).
    If True, the system will transparently re-hash and upgrade the password on next successful login.
    """
    try:
        parts = stored_hash.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return True
        iterations = int(parts[1])
        salt = parts[2]
        # Needs rehash if iterations are below 600,000 or salt length is less than 64 hex chars (32 bytes)
        if iterations < ITERATIONS or len(salt) < 64:
            return True
        return False
    except Exception:
        return True


def create_session_token(
    conn: sqlite3.Connection, user_id: int, days_valid: int = 30
) -> str:
    """Generate and store secure bearer session token in SQLite."""
    token = secrets.token_urlsafe(36)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=days_valid)

    with conn:
        conn.execute(
            """
            INSERT INTO auth_tokens (token, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (token, user_id, now.isoformat(), expires.isoformat()),
        )
    return token


def get_user_by_token(
    conn: sqlite3.Connection, token: str
) -> Optional[Dict[str, Any]]:
    """Authenticate bearer token and return user profile if session is active."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.username, u.email, u.full_name, u.role, u.created_at, u.updated_at, t.expires_at
        FROM auth_tokens t
        JOIN users u ON u.id = t.user_id
        WHERE t.token = ?
        """,
        (token,),
    )
    row = cursor.fetchone()
    if not row:
        return None

    # Check expiration
    expires_at = datetime.fromisoformat(row["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        with conn:
            conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
        return None

    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "full_name": row["full_name"],
        "role": row["role"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def revoke_token(conn: sqlite3.Connection, token: str) -> bool:
    """Revoke/delete an active session token (Logout)."""
    with conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
        return cursor.rowcount > 0
