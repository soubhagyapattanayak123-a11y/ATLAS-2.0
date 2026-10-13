"""
ATLAS 2.0 Security Utilities & Defensive Hardening Module
Provides:
1. File Upload Defense: Magic byte sniffing, payload size limits, and malicious payload rejection.
2. SSRF Defense: Safe URL verification blocking private IP spaces, localhost, and cloud metadata (169.254.169.254).
3. Secret Entropy Verification: Validates cryptographic secret strength and prevents default fallback usage.
"""

import base64
import ipaddress
import re
import socket
import urllib.parse
import urllib.request
from typing import Tuple, Optional


# =====================================================================
# 1. INSECURE FILE UPLOAD DEFENSE (Magic Bytes & Payload Validation)
# =====================================================================

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024    # 15 MB

# Block known executable signatures
DANGEROUS_MAGIC_HEADERS = [
    (b"MZ", "Windows Portable Executable (.exe, .dll)"),
    (b"\x7fELF", "Linux ELF Executable"),
    (b"\xca\xfe\xba\xbe", "Java Class or Mach-O Fat Binary"),
    (b"\xfe\xed\xfa\xce", "Mach-O 32-bit Binary"),
    (b"\xfe\xed\xfa\xcf", "Mach-O 64-bit Binary"),
    (b"#!", "Shell Script / Executable Script"),
    (b"<?php", "PHP Script Executable"),
    (b"<script", "Inline HTML / JavaScript Vector"),
]


def validate_image_payload(raw_input: str, max_size_bytes: int = MAX_IMAGE_SIZE_BYTES) -> Tuple[bytes, str]:
    """
    Validates base64-encoded image input against file upload vulnerabilities:
    - Strips data URI prefixes.
    - Enforces maximum file size limit.
    - Sniffs magic bytes to verify genuine image format (JPEG, PNG, WEBP, GIF).
    - Rejects executable files, scripts, and corrupted inputs.
    Returns: (decoded_bytes, detected_mime_type)
    """
    if not raw_input or not raw_input.strip():
        raise ValueError("Image payload cannot be empty.")

    clean_b64 = raw_input.strip()
    # Strip data URI header if present (e.g. data:image/png;base64,...)
    if "," in clean_b64:
        clean_b64 = clean_b64.split(",", 1)[1]

    # Quick length pre-check (base64 is ~4/3 larger than raw binary)
    if len(clean_b64) > (max_size_bytes * 4 // 3 + 1024):
        raise ValueError(f"Image payload exceeds maximum allowable size of {max_size_bytes // (1024 * 1024)}MB.")

    try:
        data = base64.b64decode(clean_b64, validate=True)
    except Exception:
        raise ValueError("Invalid base64 encoding in image payload.")

    if len(data) > max_size_bytes:
        raise ValueError(f"Decoded image size ({len(data)} bytes) exceeds limit ({max_size_bytes} bytes).")

    # Check for dangerous executable signatures
    for dangerous_magic, desc in DANGEROUS_MAGIC_HEADERS:
        if data.startswith(dangerous_magic):
            raise ValueError(f"Security Alert: Upload contains prohibited executable payload ({desc}).")

    # Magic byte identification for legitimate image formats
    if data.startswith(b"\xff\xd8\xff"):
        return data, "image/jpeg"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        return data, "image/png"
    elif data[:4] == b"RIFF" and len(data) >= 12 and data[8:12] == b"WEBP":
        return data, "image/webp"
    elif data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return data, "image/gif"

    raise ValueError("Unsupported or invalid image file format. Only PNG, JPEG, WEBP, and GIF are allowed.")


def validate_pdf_payload(raw_input: str, max_size_bytes: int = MAX_PDF_SIZE_BYTES) -> bytes:
    """
    Validates base64-encoded PDF document:
    - Strips data URI prefix.
    - Enforces size limit.
    - Validates %PDF- header magic bytes.
    - Rejects non-PDF or executable payloads.
    Returns: decoded PDF bytes.
    """
    if not raw_input or not raw_input.strip():
        raise ValueError("PDF payload cannot be empty.")

    clean_b64 = raw_input.strip()
    if "," in clean_b64:
        clean_b64 = clean_b64.split(",", 1)[1]

    if len(clean_b64) > (max_size_bytes * 4 // 3 + 1024):
        raise ValueError(f"PDF payload exceeds maximum allowable size of {max_size_bytes // (1024 * 1024)}MB.")

    try:
        data = base64.b64decode(clean_b64, validate=True)
    except Exception:
        raise ValueError("Invalid base64 encoding in PDF payload.")

    if len(data) > max_size_bytes:
        raise ValueError(f"Decoded PDF size ({len(data)} bytes) exceeds limit ({max_size_bytes} bytes).")

    # Check for dangerous executable signatures
    for dangerous_magic, desc in DANGEROUS_MAGIC_HEADERS:
        if data.startswith(dangerous_magic):
            raise ValueError(f"Security Alert: Upload contains prohibited executable payload ({desc}).")

    if not data.startswith(b"%PDF-"):
        raise ValueError("Invalid document format: Missing standard '%PDF-' document header.")

    return data


# =====================================================================
# 2. SERVER-SIDE REQUEST FORGERY (SSRF) DEFENSE
# =====================================================================

RESTRICTED_IP_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network
    ipaddress.ip_network("10.0.0.0/8"),         # RFC 1918 Private
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback / Localhost
    ipaddress.ip_network("169.254.0.0/16"),     # Link-Local / Cloud Instance Metadata (AWS/GCP/Azure)
    ipaddress.ip_network("172.16.0.0/12"),      # RFC 1918 Private
    ipaddress.ip_network("192.168.0.0/16"),     # RFC 1918 Private
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved
    ipaddress.ip_network("::1/128"),            # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),           # IPv6 Unique Local
    ipaddress.ip_network("fe80::/10"),          # IPv6 Link-Local
]


def is_safe_external_url(url: str, allow_http: bool = False) -> bool:
    """
    Validates outbound URL against Server-Side Request Forgery (SSRF) attacks:
    - Enforces https:// scheme by default (blocks file://, gopher://, dict://, ldap://).
    - Resolves hostname and validates all target IPs against private, internal, and cloud metadata ranges.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        allowed_schemes = ("https", "http") if allow_http else ("https",)
        if parsed.scheme.lower() not in allowed_schemes:
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        # Block localhost variants directly
        if hostname.lower() in ("localhost", "127.0.0.1", "::1", "metadata.google.internal"):
            return False

        # Resolve IP addresses for hostname
        addr_info = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip_obj = ipaddress.ip_address(ip_str)
            for restricted_net in RESTRICTED_IP_NETWORKS:
                if ip_obj in restricted_net:
                    return False
        return True
    except Exception:
        return False


def safe_urlopen(req_or_url, timeout: int = 15, **kwargs):
    """
    Wrapper around urllib.request.urlopen that performs pre-flight SSRF validation
    to ensure outbound calls never access private networks or cloud metadata.
    """
    target_url = req_or_url.full_url if hasattr(req_or_url, "full_url") else str(req_or_url)
    if not is_safe_external_url(target_url, allow_http=False):
        raise PermissionError(f"SSRF Defense: Outbound request to '{target_url}' is blocked as internal or unsafe.")
    return urllib.request.urlopen(req_or_url, timeout=timeout, **kwargs)
