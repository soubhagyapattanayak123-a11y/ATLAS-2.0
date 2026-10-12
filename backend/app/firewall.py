"""
ATLAS 2.0 Web Application Firewall (WAF) & Enterprise Security Engine
Provides real-time packet inspection, threat blocking (SQLi, XSS, Path Traversal,
Command Injection, Malicious Scanners), IP blacklisting/whitelisting, and DDoS rate limiting.
"""

import re
import time
import sqlite3
from collections import deque, defaultdict
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
from urllib.parse import unquote

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


# =====================================================================
# THREAT SIGNATURE PATTERNS (Targeted & Battle-Tested)
# =====================================================================

SQLI_PATTERNS = [
    re.compile(r"(?i)\bUNION\s+(?:ALL\s+)?SELECT\b"),
    re.compile(r"(?i)\bDROP\s+(?:TABLE|DATABASE|VIEW)\b"),
    re.compile(r"(?i)\bSELECT\b.{1,100}\bFROM\b.{1,100}\b(WHERE|LIMIT)\b"),
    re.compile(r"(?i)\bINSERT\s+INTO\b.{1,80}\bVALUES\b"),
    re.compile(r"(?i)\bDELETE\s+FROM\b.{1,80}\bWHERE\b"),
    re.compile(r"(?i)(?:'|\"|\b)\s*(?:OR|AND)\s+(?:'[^']*'=[^']*'|\d+\s*=\s*\d+|true\s*=\s*true)\b"),
    re.compile(r"(?i)(?:'|\")\s*;\s*--(?:[^\r\n]*)"),
    re.compile(r"(?i)\b(?:SLEEP|BENCHMARK|PG_SLEEP)\s*\(\s*\d+\s*\)"),
    re.compile(r"(?i)\bEXEC(?:UTE)?\s*\(?\s*(?:xp_|sp_)"),
]

XSS_PATTERNS = [
    re.compile(r"(?i)<\s*script\b[^>]*>.*?</\s*script\s*>"),
    re.compile(r"(?i)<\s*script\b[^>]*>"),
    re.compile(r"(?i)javascript\s*:\s*[^\s]+"),
    re.compile(r"(?i)data\s*:\s*text\/html;base64"),
    re.compile(r"(?i)<\s*(?:img|svg|body|iframe|input|details|marquee)\b[^>]*(?:\bonerror|\bonload|\bonfocus|\bonmouseover)\s*="),
    re.compile(r"(?i)\bdocument\.(?:cookie|location|write|domain)\b"),
    re.compile(r"(?i)<\s*svg\/onload\s*="),
]

PATH_TRAVERSAL_PATTERNS = [
    re.compile(r"(?:\.\.[/\\])+"),
    re.compile(r"(?:%2e%2e[/\\]|%2e%2e%2f|%2e%2e%5c)", re.IGNORECASE),
    re.compile(r"(?i)(?:\/etc\/passwd|\/etc\/shadow|\/proc\/self\/environ)"),
    re.compile(r"(?i)(?:c:\\windows\\system32|win\.ini|boot\.ini)"),
]

COMMAND_INJECTION_PATTERNS = [
    re.compile(r"(?i)(?:;|\||&&|`)\s*(?:rm\s+-rf|cat\s+\/etc\/|wget\s+http|curl\s+http|nc\s+-e|bash\s+-i|whoami|powershell|cmd\.exe)\b"),
    re.compile(r"(?i)\$\(\s*(?:whoami|id|uname|hostname|cat\s+)\b"),
]

MALICIOUS_USER_AGENTS = [
    re.compile(r"(?i)\b(sqlmap|nikto|havij|acunetix|nessus|masscan|zgrab|gobuster|dirbuster|wpscan|hydra|burpcollaborator|nmap)\b"),
]


class FirewallSecurityEngine:
    """Core state and rule evaluation engine for ATLAS 2.0 Firewall."""

    def __init__(self):
        # In-memory sets for microsecond lookups
        self.banned_ips: Dict[str, Optional[float]] = {}  # ip -> ban expiry timestamp (None = permanent)
        self.whitelisted_ips: Set[str] = {"127.0.0.1", "::1", "localhost"}
        self.temporary_jail: Dict[str, float] = {}  # ip -> jail expiry

        # Rate limiting: ip -> deque of request timestamps (within last 60s)
        self.rate_records: Dict[str, deque] = defaultdict(deque)
        self.rate_limit_per_minute = 250
        self.auth_rate_limit_per_minute = 20

        # Repeated violations tracker: ip -> list of violation timestamps
        self.offense_records: Dict[str, deque] = defaultdict(deque)
        self.auto_ban_threshold = 4  # 4 malicious payload attempts = automatic 15-minute ban
        self.auto_ban_duration_seconds = 900  # 15 minutes

        # Active rules toggles
        self.rule_toggles = {
            "sqli_protection": True,
            "xss_protection": True,
            "path_traversal": True,
            "command_injection": True,
            "scanner_bot_protection": True,
            "rate_limiting": True,
            "strict_mode": True,
        }

        # Telemetry & Metrics
        self.start_time = time.time()
        self.total_inspected_requests = 0
        self.clean_requests = 0
        self.blocked_threats_count = 0
        self.rate_limited_count = 0
        self.recent_threat_logs: deque = deque(maxlen=200)

        # Threat counts by category
        self.threat_counts_by_category = {
            "SQL_INJECTION": 0,
            "XSS_SCRIPT": 0,
            "PATH_TRAVERSAL": 0,
            "COMMAND_INJECTION": 0,
            "MALICIOUS_SCANNER": 0,
            "RATE_LIMIT_EXCEEDED": 0,
            "IP_BANNED": 0,
        }

    def load_from_db(self, conn: sqlite3.Connection):
        """Sync persistent IP rules and recent threat logs from SQLite."""
        try:
            cursor = conn.cursor()
            # Load IP rules
            cursor.execute("SELECT ip, rule_type, expires_at FROM firewall_ip_rules")
            for row in cursor.fetchall():
                ip = row["ip"]
                rule_type = row["rule_type"]
                expires_at = row["expires_at"]
                if rule_type == "whitelist":
                    self.whitelisted_ips.add(ip)
                elif rule_type == "block":
                    exp_ts = None
                    if expires_at:
                        try:
                            exp_ts = datetime.fromisoformat(expires_at).timestamp()
                        except Exception:
                            pass
                    self.banned_ips[ip] = exp_ts

            # Seed telemetry count from threat logs
            cursor.execute("SELECT count(*) as cnt FROM firewall_threat_logs")
            count_row = cursor.fetchone()
            if count_row and count_row["cnt"]:
                self.blocked_threats_count = count_row["cnt"]

            # Load recent 30 logs
            cursor.execute("""
                SELECT ip, path, method, threat_type, severity, rule_name, payload_sample, user_agent, action_taken, created_at
                FROM firewall_threat_logs
                ORDER BY id DESC LIMIT 50
            """)
            for log_row in cursor.fetchall():
                self.recent_threat_logs.append(dict(log_row))
        except Exception as e:
            # Fallback smoothly if tables are still initializing
            pass

    def is_ip_banned(self, ip: str) -> bool:
        """Check if IP is in the permanent blocklist or temporary auto-jail."""
        now = time.time()

        # Check temporary auto-jail
        if ip in self.temporary_jail:
            if now < self.temporary_jail[ip]:
                return True
            else:
                del self.temporary_jail[ip]

        # Check configured banned IPs
        if ip in self.banned_ips:
            exp = self.banned_ips[ip]
            if exp is None or now < exp:
                return True
            else:
                del self.banned_ips[ip]

        return False

    def is_ip_whitelisted(self, ip: str) -> bool:
        """Check if IP is whitelisted (bypasses inspection and rate limits)."""
        return ip in self.whitelisted_ips

    def check_rate_limit(self, ip: str, is_auth_route: bool = False) -> bool:
        """Sliding window rate limit checker. Returns True if OK, False if limit exceeded."""
        if not self.rule_toggles.get("rate_limiting", True):
            return True
        if self.is_ip_whitelisted(ip):
            return True

        now = time.time()
        window = 60.0  # 1 minute window
        records = self.rate_records[ip]

        # Prune timestamps older than 60 seconds
        while records and now - records[0] > window:
            records.popleft()

        limit = self.auth_rate_limit_per_minute if is_auth_route else self.rate_limit_per_minute

        if len(records) >= limit:
            self.rate_limited_count += 1
            self.threat_counts_by_category["RATE_LIMIT_EXCEEDED"] += 1
            return False

        records.append(now)
        return True

    def register_offense(self, ip: str, conn: Optional[sqlite3.Connection] = None):
        """Track offenses and automatically jail repeat attackers."""
        if self.is_ip_whitelisted(ip):
            return

        now = time.time()
        offenses = self.offense_records[ip]
        # Keep offenses from past 10 minutes
        while offenses and now - offenses[0] > 600:
            offenses.popleft()

        offenses.append(now)

        if len(offenses) >= self.auto_ban_threshold:
            jail_until = now + self.auto_ban_duration_seconds
            self.temporary_jail[ip] = jail_until

            # Persist jail action if db connection is provided
            if conn:
                try:
                    exp_iso = datetime.fromtimestamp(jail_until, tz=timezone.utc).isoformat()
                    conn.execute("""
                        INSERT OR REPLACE INTO firewall_ip_rules (ip, rule_type, reason, created_at, expires_at)
                        VALUES (?, 'block', 'Auto-Jail: Exceeded malicious threat payload threshold', ?, ?)
                    """, (ip, datetime.now(timezone.utc).isoformat(), exp_iso))
                    conn.commit()
                except Exception:
                    pass

    def scan_string_for_threats(self, sample: str) -> Optional[Tuple[str, str, str, str]]:
        """
        Inspect an individual text string for attack signatures.
        Returns Tuple[threat_type, severity, rule_name, matched_pattern] or None if clean.
        """
        if not sample or len(sample) > 50000:
            return None

        # 1. SQL Injection Check
        if self.rule_toggles.get("sqli_protection", True):
            for pat in SQLI_PATTERNS:
                m = pat.search(sample)
                if m:
                    return ("SQL_INJECTION", "CRITICAL", "SQLi Pattern Match", m.group(0))

        # 2. XSS Check
        if self.rule_toggles.get("xss_protection", True):
            for pat in XSS_PATTERNS:
                m = pat.search(sample)
                if m:
                    return ("XSS_SCRIPT", "HIGH", "XSS Script Injection", m.group(0))

        # 3. Path Traversal Check
        if self.rule_toggles.get("path_traversal", True):
            for pat in PATH_TRAVERSAL_PATTERNS:
                m = pat.search(sample)
                if m:
                    return ("PATH_TRAVERSAL", "HIGH", "Directory Traversal", m.group(0))

        # 4. Command Injection Check
        if self.rule_toggles.get("command_injection", True):
            for pat in COMMAND_INJECTION_PATTERNS:
                m = pat.search(sample)
                if m:
                    return ("COMMAND_INJECTION", "CRITICAL", "Remote Command Execution", m.group(0))

        return None

    def scan_user_agent(self, user_agent: str) -> Optional[Tuple[str, str, str, str]]:
        """Detect automated vulnerability scanners and malicious crawlers."""
        if not self.rule_toggles.get("scanner_bot_protection", True) or not user_agent:
            return None

        for pat in MALICIOUS_USER_AGENTS:
            m = pat.search(user_agent)
            if m:
                return ("MALICIOUS_SCANNER", "HIGH", "Vulnerability Scanner Detected", m.group(0))
        return None

    def log_threat(
        self,
        ip: str,
        path: str,
        method: str,
        threat_type: str,
        severity: str,
        rule_name: str,
        payload_sample: str,
        user_agent: str,
        action_taken: str,
        conn: Optional[sqlite3.Connection] = None,
    ):
        """Record threat event into memory buffer and persistent SQLite log."""
        self.blocked_threats_count += 1
        if threat_type in self.threat_counts_by_category:
            self.threat_counts_by_category[threat_type] += 1
        else:
            self.threat_counts_by_category[threat_type] = 1

        now_iso = datetime.now(timezone.utc).isoformat()
        log_entry = {
            "ip": ip,
            "path": path,
            "method": method,
            "threat_type": threat_type,
            "severity": severity,
            "rule_name": rule_name,
            "payload_sample": payload_sample[:150],  # truncate safely for display
            "user_agent": user_agent[:120],
            "action_taken": action_taken,
            "created_at": now_iso,
        }

        # Add to memory deque
        self.recent_threat_logs.appendleft(log_entry)

        # Save to DB if available
        if conn:
            try:
                conn.execute("""
                    INSERT INTO firewall_threat_logs
                    (ip, path, method, threat_type, severity, rule_name, payload_sample, user_agent, action_taken, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ip, path, method, threat_type, severity, rule_name,
                    payload_sample[:250], user_agent[:150], action_taken, now_iso
                ))
                conn.commit()
            except Exception:
                pass

    def get_status_summary(self) -> Dict[str, Any]:
        """Generate comprehensive telemetry stats for Admin Panel."""
        uptime_seconds = int(time.time() - self.start_time)
        active_bans_count = len(self.banned_ips) + len(self.temporary_jail)

        return {
            "status": "ACTIVE",
            "shield_version": "ATLAS-WAF-v2.0",
            "uptime_seconds": uptime_seconds,
            "total_inspected_requests": self.total_inspected_requests,
            "clean_requests": self.clean_requests,
            "blocked_threats_count": self.blocked_threats_count,
            "rate_limited_count": self.rate_limited_count,
            "active_banned_ips_count": active_bans_count,
            "whitelisted_ips_count": len(self.whitelisted_ips),
            "threat_categories": self.threat_counts_by_category,
            "rules_enabled": self.rule_toggles,
            "banned_ips": list(self.banned_ips.keys()) + list(self.temporary_jail.keys()),
            "whitelisted_ips": list(self.whitelisted_ips),
        }


# Global Singleton Firewall Instance
firewall_engine = FirewallSecurityEngine()


# =====================================================================
# FASTAPI / STARLETTE FIREWALL MIDDLEWARE
# =====================================================================

class FirewallMiddleware(BaseHTTPMiddleware):
    """
    High-Performance Request Filter Middleware.
    Inspects headers, paths, query params, and body before reaching route handlers.
    Injects enterprise security headers into all responses.
    """

    async def dispatch(self, request: Request, call_next):
        # Fast-pass for CORS preflight OPTIONS requests so browser handshakes never stall
        if request.method == "OPTIONS":
            return await call_next(request)

        firewall_engine.total_inspected_requests += 1

        # 1. Resolve client IP
        client_ip = request.headers.get("x-forwarded-for")
        if client_ip:
            client_ip = client_ip.split(",")[0].strip()
        else:
            client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "127.0.0.1")

        path = request.url.path
        method = request.method
        user_agent = request.headers.get("user-agent", "")

        # 2. Check if IP is explicitly banned / jailed
        if firewall_engine.is_ip_banned(client_ip):
            firewall_engine.threat_counts_by_category["IP_BANNED"] += 1
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Access Denied by ATLAS Firewall",
                    "reason": "Client IP is blocked due to security violations.",
                    "client_ip": client_ip,
                    "firewall_action": "REJECTED_IP_BAN",
                },
                headers={"X-Firewall-Status": "BLOCKED; IP_BANNED"}
            )

        # 3. Check Rate Limits (Skip if whitelisted)
        is_auth_route = path.startswith("/api/auth/") or path.startswith("/api/admin/")
        if not firewall_engine.check_rate_limit(client_ip, is_auth_route=is_auth_route):
            firewall_engine.log_threat(
                ip=client_ip,
                path=path,
                method=method,
                threat_type="RATE_LIMIT_EXCEEDED",
                severity="MEDIUM",
                rule_name="DDoS Throttling Guard",
                payload_sample=f"Exceeded {firewall_engine.rate_limit_per_minute} req/min",
                user_agent=user_agent,
                action_taken="RATE_LIMITED_429",
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "reason": "Rate limit exceeded. Please wait before making more requests.",
                    "retry_after": 30,
                    "firewall_action": "THROTTLED_429",
                },
                headers={
                    "Retry-After": "30",
                    "X-Firewall-Status": "THROTTLED; RATE_LIMIT",
                }
            )

        # 4. Scanner User-Agent Check
        ua_threat = firewall_engine.scan_user_agent(user_agent)
        if ua_threat:
            t_type, sev, r_name, matched = ua_threat
            firewall_engine.log_threat(
                ip=client_ip,
                path=path,
                method=method,
                threat_type=t_type,
                severity=sev,
                rule_name=r_name,
                payload_sample=matched,
                user_agent=user_agent,
                action_taken="BLOCKED_403",
            )
            firewall_engine.register_offense(client_ip)
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Access Denied by ATLAS Firewall",
                    "reason": "Automated security scanner detected.",
                    "rule": r_name,
                    "firewall_action": "BLOCKED_MALICIOUS_SCANNER",
                },
                headers={"X-Firewall-Status": "BLOCKED; SCANNER_DETECTED"}
            )

        # 5. Inspect URL Path & Query Parameters (Raw & Decoded)
        query_string = request.url.query
        full_uri_to_check = f"{path}?{query_string}" if query_string else path
        decoded_uri = unquote(full_uri_to_check)

        uri_threat = firewall_engine.scan_string_for_threats(decoded_uri) or firewall_engine.scan_string_for_threats(full_uri_to_check)
        if uri_threat:
            t_type, sev, r_name, matched = uri_threat
            firewall_engine.log_threat(
                ip=client_ip,
                path=path,
                method=method,
                threat_type=t_type,
                severity=sev,
                rule_name=r_name,
                payload_sample=matched,
                user_agent=user_agent,
                action_taken="BLOCKED_403",
            )
            firewall_engine.register_offense(client_ip)
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Security Threat Intercepted",
                    "category": t_type,
                    "severity": sev,
                    "rule": r_name,
                    "incident_id": f"ATLAS-WAF-{int(time.time() * 1000)}",
                    "firewall_action": "BLOCKED_URI_PAYLOAD",
                },
                headers={"X-Firewall-Status": f"BLOCKED; {t_type}"}
            )

        # 6. Inspect Request Body for POST/PUT/PATCH (when content is text or json)
        content_type = request.headers.get("content-type", "").lower()
        if method in ("POST", "PUT", "PATCH") and ("json" in content_type or "text" in content_type or "x-www-form-urlencoded" in content_type):
            try:
                body_bytes = await request.body()
                if body_bytes:
                    body_text = body_bytes.decode("utf-8", errors="ignore")
                    decoded_body = unquote(body_text)
                    body_threat = firewall_engine.scan_string_for_threats(decoded_body) or firewall_engine.scan_string_for_threats(body_text)
                    if body_threat:
                        t_type, sev, r_name, matched = body_threat
                        firewall_engine.log_threat(
                            ip=client_ip,
                            path=path,
                            method=method,
                            threat_type=t_type,
                            severity=sev,
                            rule_name=r_name,
                            payload_sample=matched,
                            user_agent=user_agent,
                            action_taken="BLOCKED_403",
                        )
                        firewall_engine.register_offense(client_ip)
                        return JSONResponse(
                            status_code=403,
                            content={
                                "error": "Malicious Payload Blocked",
                                "category": t_type,
                                "severity": sev,
                                "rule": r_name,
                                "incident_id": f"ATLAS-WAF-{int(time.time() * 1000)}",
                                "firewall_action": "BLOCKED_BODY_PAYLOAD",
                            },
                            headers={"X-Firewall-Status": f"BLOCKED; {t_type}"}
                        )
            except Exception:
                pass

        # 7. Request is Clean: Pass to downstream application
        firewall_engine.clean_requests += 1
        response = await call_next(request)

        # 8. Inject Enterprise Security Headers
        response.headers["X-Firewall-Status"] = "ACTIVE; ATLAS-SHIELD-V2"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Permissions-Policy"] = "camera=(), geolocation=(), payment=()"

        return response
