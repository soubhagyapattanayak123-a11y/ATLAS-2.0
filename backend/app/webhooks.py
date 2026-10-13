"""
ATLAS 2.0 Webhook Security & Signature Verification Engine
Provides constant-time HMAC-SHA256 verification and replay-attack protection
for inbound webhooks (e.g. Brevo email events, third-party callbacks).
"""

import hmac
import hashlib
import os
import time
from typing import Tuple, Optional


WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", os.getenv("SECRET_KEY", "atlas_webhook_hmac_secret_2026"))


def verify_webhook_signature(
    payload_bytes: bytes,
    signature_header: Optional[str],
    secret: Optional[str] = None,
    tolerance_seconds: int = 300,
) -> Tuple[bool, str]:
    """
    Cryptographically verify incoming webhook signature using HMAC-SHA256.
    
    Supports:
    1. Standard hex HMAC-SHA256 (e.g. 'sha256=abcdef...')
    2. Timestamped signatures (e.g. 't=1600000000,v1=abcdef...') to mitigate replay attacks.
    
    Uses constant-time comparison (hmac.compare_digest) to prevent timing side-channel attacks.
    """
    if not signature_header or not signature_header.strip():
        return False, "Missing signature header (e.g. X-Signature or X-Webhook-Signature)."

    key = (secret or WEBHOOK_SECRET).encode("utf-8")
    sig_str = signature_header.strip()

    # Case A: Stripe/Brevo timestamped format: t=timestamp,v1=signature
    if "t=" in sig_str and "v1=" in sig_str:
        try:
            parts = dict(item.split("=", 1) for item in sig_str.split(",") if "=" in item)
            timestamp = int(parts.get("t", "0"))
            v1_sig = parts.get("v1", "")

            # Replay attack prevention check
            now_ts = int(time.time())
            if abs(now_ts - timestamp) > tolerance_seconds:
                return False, f"Webhook timestamp outside allowable replay tolerance ({tolerance_seconds}s)."

            # Compute HMAC over '{timestamp}.{payload}'
            to_sign = f"{timestamp}.".encode("utf-8") + payload_bytes
            expected_sig = hmac.new(key, to_sign, hashlib.sha256).hexdigest()

            if hmac.compare_digest(expected_sig, v1_sig):
                return True, "Valid timestamped HMAC-SHA256 signature."
            return False, "Signature mismatch."
        except Exception as e:
            return False, f"Failed to parse timestamped signature: {e}"

    # Case B: Plain or 'sha256=' prefixed format
    clean_sig = sig_str
    if clean_sig.startswith("sha256="):
        clean_sig = clean_sig.split("sha256=", 1)[1]

    expected_sig = hmac.new(key, payload_bytes, hashlib.sha256).hexdigest()
    if hmac.compare_digest(expected_sig.lower(), clean_sig.lower()):
        return True, "Valid HMAC-SHA256 signature."

    return False, "Invalid webhook signature."
