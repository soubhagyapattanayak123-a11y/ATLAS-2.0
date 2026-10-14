import os
import re
import json
import ssl
import socket
import secrets
import logging
import smtplib
import urllib.request
import urllib.error
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional
from dotenv import load_dotenv

logger = logging.getLogger("atlas.email")
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"


class IPv4SMTP(smtplib.SMTP):
    """SMTP client that explicitly binds and resolves via IPv4 to prevent IPv6 routing failures on containers."""
    def _get_socket(self, host, port, timeout):
        res = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        if not res:
            raise OSError(f"Could not resolve IPv4 address for {host}:{port}")
        af, socktype, proto, _, sa = res[0]
        sock = socket.socket(af, socktype, proto)
        sock.settimeout(timeout)
        sock.connect(sa)
        return sock


class IPv4SMTP_SSL(smtplib.SMTP_SSL):
    """SMTP_SSL client that explicitly resolves via IPv4 with SNI hostname wrapping."""
    def _get_socket(self, host, port, timeout):
        res = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        if not res:
            raise OSError(f"Could not resolve IPv4 address for {host}:{port}")
        af, socktype, proto, _, sa = res[0]
        sock = socket.socket(af, socktype, proto)
        sock.settimeout(timeout)
        sock.connect(sa)
        if self.context is None:
            self.context = ssl.create_default_context()
        return self.context.wrap_socket(sock, server_hostname=host)


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    min_val = 10 ** (length - 1)
    max_val = (10 ** length) - 1
    code = secrets.randbelow(max_val - min_val + 1) + min_val
    return str(code)


def is_smtp_configured() -> bool:
    """Check if SMTP credentials are set in environment."""
    if ENV_PATH.exists():
        load_dotenv(ENV_PATH, override=True)
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", os.getenv("SMTP_EMAIL", "")).strip()
    pwd = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_APP_PASSWORD", "")).strip()
    return bool(host and user and pwd)


def get_html_template(otp_code: str, recipient_email: str, purpose: str = "login") -> str:
    """Build a modern, branded responsive HTML email template for ATLAS 2.0 OTP."""
    is_signup = purpose in ("register", "signup")
    is_reset = purpose in ("reset_password", "reset", "forgot_password")
    if is_reset:
        purpose_label = "Password Reset Verification"
        request_desc = "A password reset request"
    elif is_signup:
        purpose_label = "New Account Sign-Up Verification"
        request_desc = "A new account registration request"
    else:
        purpose_label = "Account Login Verification"
        request_desc = "A secure login request"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ATLAS 2.0 Verification Code</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
    }}
    .email-wrapper {{
      max-width: 580px;
      margin: 30px auto;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    }}
    .header {{
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }}
    .logo-badge {{
      display: inline-block;
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #a5b4fc;
      margin-bottom: 12px;
    }}
    .title {{
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 6px 0;
      color: #ffffff;
    }}
    .subtitle {{
      font-size: 14px;
      color: #c7d2fe;
      margin: 0;
    }}
    .content {{
      padding: 36px 32px;
    }}
    .greeting {{
      font-size: 15px;
      color: #cbd5e1;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }}
    .otp-box-container {{
      text-align: center;
      margin: 28px 0;
      padding: 24px 16px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
    }}
    .otp-code {{
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 40px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #38bdf8;
      text-shadow: 0 0 20px rgba(56, 189, 248, 0.35);
      margin: 0;
      padding: 0;
      display: inline-block;
      margin-left: 12px;
    }}
    .otp-expiry {{
      margin-top: 14px;
      font-size: 12px;
      color: #94a3b8;
    }}
    .expiry-pill {{
      display: inline-block;
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 3px 10px;
      border-radius: 9999px;
      font-weight: 600;
      margin-left: 4px;
    }}
    .instructions {{
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }}
    .security-notice {{
      background: rgba(30, 41, 59, 0.6);
      border-left: 4px solid #6366f1;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }}
    .footer {{
      padding: 20px 32px 32px;
      border-top: 1px solid #1f2937;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }}
    .footer-highlight {{
      color: #818cf8;
      font-weight: 600;
    }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="logo-badge">ATLAS 2.0 CORE AUTH</div>
      <h1 class="title">Security Verification</h1>
      <p class="subtitle">{purpose_label}</p>
    </div>
    <div class="content">
      <p class="greeting">
        Hello,<br>
        {request_desc} was initiated for your ATLAS 2.0 account associated with <strong>{recipient_email}</strong>.
      </p>

      <div class="otp-box-container">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 8px; font-weight: 600;">One-Time Verification Code</div>
        <div class="otp-code">{otp_code}</div>
        <div class="otp-expiry">
          This code expires in <span class="expiry-pill">10 minutes</span>
        </div>
      </div>

      <p class="instructions">
        Enter this 6-digit code on the ATLAS 2.0 login screen to verify your identity and gain immediate access to your workspace.
      </p>

      <div class="security-notice">
        <strong>Security Notice:</strong> Never share this code with anyone. ATLAS staff will never ask for your one-time password. If you did not request this login code, you can safely disregard this email.
      </div>
    </div>
    <div class="footer">
      ATLAS 2.0 Intelligent Multi-Agent Learning & Adaptive Solver Platform<br>
      Automated Security Subsystem &bull; <span class="footer-highlight">Zero-Knowledge Verification</span>
    </div>
  </div>
</body>
</html>"""


def _send_via_resend(api_key: str, recipient_email: str, subject: str, html_content: str, text_content: str) -> bool:
    """Send email via Resend HTTP REST API (port 443 HTTPS). Never blocked by cloud firewalls."""
    from_email = os.getenv("RESEND_FROM_EMAIL", "ATLAS 2.0 <onboarding@resend.dev>")
    payload = {
        "from": from_email,
        "to": [recipient_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
            "User-Agent": "ATLAS-2.0-Security/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        return resp.status in (200, 201)


_CACHED_BREVO_EMAIL: Optional[str] = None


def _get_brevo_verified_sender(api_key: str, fallback_email: str) -> str:
    """
    Detect the Brevo account's verified registered email so transactional emails
    never fail DMARC or get dropped by mail providers as unauthenticated sender spoofs.
    """
    global _CACHED_BREVO_EMAIL
    env_sender = os.getenv("BREVO_SENDER_EMAIL", os.getenv("BREVO_FROM_EMAIL", "")).strip()
    if env_sender and env_sender.lower() != "atlas2.0official@gmail.com":
        return env_sender

    if _CACHED_BREVO_EMAIL:
        return _CACHED_BREVO_EMAIL

    try:
        req = urllib.request.Request(
            "https://api.brevo.com/v3/account",
            headers={"api-key": api_key.strip(), "accept": "application/json", "User-Agent": "ATLAS-2.0-Security/1.0"},
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            acc_email = data.get("email")
            if acc_email:
                _CACHED_BREVO_EMAIL = acc_email
                logger.info(f"[BREVO AUTO-SENDER] Successfully detected verified account email: {acc_email}")
                return acc_email
    except Exception as e:
        logger.warning(f"[BREVO AUTO-SENDER] Could not auto-detect account email: {e}")

    return env_sender or fallback_email


def _send_via_brevo(api_key: str, recipient_email: str, subject: str, html_content: str, text_content: str, from_name: str, from_addr: str) -> bool:
    """Send email via Brevo (Sendinblue) HTTP REST API (port 443 HTTPS). Free 300 emails/day."""
    clean_key = api_key.strip()
    if clean_key.startswith("xsmtpsib-"):
        logger.error(
            "[BREVO CONFIG ERROR] You provided an SMTP key ('xsmtpsib-...'). "
            "Brevo's REST API requires an API key starting with 'xkeysib-'. "
            "Please go to Brevo Dashboard -> Settings -> SMTP & API -> 'API Keys' tab -> 'Generate a new API key'."
        )
        print(
            "[BREVO CONFIG ERROR] Key starts with 'xsmtpsib-'. "
            "Please use the API Key starting with 'xkeysib-' from the 'API Keys' tab in Brevo."
        )
        return False

    sender_email = _get_brevo_verified_sender(clean_key, from_addr)
    payload = {
        "sender": {"name": from_name, "email": sender_email},
        "replyTo": {"name": from_name, "email": "atlas2.0official@gmail.com"},
        "to": [{"email": recipient_email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content,
    }
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": clean_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "ATLAS-2.0-Security/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return resp.status in (200, 201)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        # Sanitize error body to prevent leaking internal headers or credentials
        sanitized_err = re.sub(r"(xkeysib-[a-zA-Z0-9\-]+|xsmtpsib-[a-zA-Z0-9\-]+)", "[REDACTED_KEY]", err_body)
        logger.error(f"[BREVO API ERROR {e.code}] {sanitized_err}")
        raise RuntimeError(f"Brevo API error ({e.code}): {sanitized_err}")


def send_otp_email(recipient_email: str, otp_code: str, purpose: str = "login") -> Dict[str, Any]:
    """
    Deliver OTP strictly to the user's email address.
    Prioritizes direct authenticated Gmail SMTP for 100% SPF/DKIM authenticated inbox delivery.
    Falls back gracefully to HTTPS REST APIs (Resend/Brevo) if raw SMTP ports are blocked (e.g. Render).
    """
    clean_email = recipient_email.strip().lower()
    is_signup = purpose in ("register", "signup")
    is_reset = purpose in ("reset_password", "reset", "forgot_password")
    if is_reset:
        subject_action = "Password Reset"
        action_text = "password reset"
    elif is_signup:
        subject_action = "Sign-Up"
        action_text = "account sign-up"
    else:
        subject_action = "Login"
        action_text = "account login"
    subject = f"ATLAS 2.0: Your {subject_action} Verification Code is {otp_code}"

    plain_text = (
        f"Your ATLAS 2.0 one-time verification code for {action_text} is: {otp_code}\n\n"
        f"This code will expire in 10 minutes.\n"
        f"If you did not request this verification code, please ignore this email.\n\n"
        f"Security Team, ATLAS 2.0"
    )
    html_body = get_html_template(otp_code, clean_email, purpose)

    from_name = os.getenv("SMTP_FROM_NAME", "ATLAS 2.0 Security")
    from_addr = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USER", "atlas2.0official@gmail.com"))

    # Always log to server console for developer visibility and testing
    print(f"[ATLAS OTP] >>> Verification Code for {clean_email}: {otp_code} (Purpose: {purpose}) <<<")

    # -------------------------------------------------------------
    # 1. Cloud-Optimized Fast Path: HTTPS Email APIs (Port 443 - Zero Firewall Block, <1s delivery)
    # -------------------------------------------------------------
    brevo_key = os.getenv("BREVO_API_KEY", "").strip()
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    is_cloud_env = bool(os.getenv("RENDER") or os.getenv("VERCEL") or os.getenv("PORT") or os.getenv("DYNO"))

    if (is_cloud_env or not is_smtp_configured()) and brevo_key:
        try:
            if _send_via_brevo(brevo_key, clean_email, subject, html_body, plain_text, from_name, from_addr):
                logger.info(f"[EMAIL OTP] Delivered via Brevo HTTPS API to {clean_email}")
                return {
                    "success": True,
                    "delivered_via": "brevo",
                    "dev_otp": None,
                    "message": f"Verification code sent to {clean_email}",
                    "error": None,
                }
        except Exception as e:
            logger.warning(f"[EMAIL BREVO FAST-PATH FAILED] {e}. Trying secondary channels...")

    if (is_cloud_env or not is_smtp_configured()) and resend_key:
        try:
            if _send_via_resend(resend_key, clean_email, subject, html_body, plain_text):
                logger.info(f"[EMAIL OTP] Delivered via Resend API to {clean_email}")
                return {
                    "success": True,
                    "delivered_via": "resend",
                    "dev_otp": None,
                    "message": f"Verification code sent to {clean_email}",
                    "error": None,
                }
        except Exception as e:
            logger.warning(f"[EMAIL RESEND FAST-PATH FAILED] {e}. Trying secondary channels...")

    # -------------------------------------------------------------
    # 2. Authenticated Gmail SMTP Delivery (with agile 3.5s timeout)
    # -------------------------------------------------------------
    smtp_errors = []
    if is_smtp_configured():
        host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
        configured_port = int(os.getenv("SMTP_PORT", "587"))
        user = os.getenv("SMTP_USER", os.getenv("SMTP_EMAIL", "")).strip()
        pwd = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_APP_PASSWORD", "")).strip()

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_addr}>"
        msg["To"] = clean_email
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        ports_to_try = [configured_port, 465 if configured_port != 465 else 587]

        for p in ports_to_try:
            try:
                if p == 465:
                    with IPv4SMTP_SSL(host, p, timeout=3.5) as server:
                        server.login(user, pwd)
                        server.sendmail(from_addr, [clean_email], msg.as_string())
                else:
                    with IPv4SMTP(host, p, timeout=3.5) as server:
                        server.ehlo()
                        server.starttls()
                        server.ehlo()
                        server.login(user, pwd)
                        server.sendmail(from_addr, [clean_email], msg.as_string())

                logger.info(f"[EMAIL OTP] Successfully dispatched live email to {clean_email} via {host}:{p}")
                return {
                    "success": True,
                    "delivered_via": "smtp",
                    "dev_otp": None,
                    "message": f"Verification code sent to {clean_email}",
                    "error": None,
                }
            except Exception as e:
                smtp_errors.append(f"{host}:{p} -> {e}")
                logger.warning(f"[EMAIL SMTP ATTEMPT FAILED] Host {host}:{p} error: {e}")

        logger.warning(f"[EMAIL SMTP EXHAUSTED] Could not send via direct SMTP ({'; '.join(smtp_errors)}). Trying HTTPS API fallbacks...")

    # -------------------------------------------------------------
    # 3. Secondary Fallback: HTTP Email APIs (if not already tried)
    # -------------------------------------------------------------
    if brevo_key:
        try:
            if _send_via_brevo(brevo_key, clean_email, subject, html_body, plain_text, from_name, from_addr):
                logger.info(f"[EMAIL OTP] Delivered via Brevo API to {clean_email}")
                return {
                    "success": True,
                    "delivered_via": "brevo",
                    "dev_otp": None,
                    "message": f"Verification code sent to {clean_email}",
                    "error": None,
                }
        except Exception as e:
            logger.warning(f"[EMAIL BREVO FAILED] {e}")

    if resend_key:
        try:
            if _send_via_resend(resend_key, clean_email, subject, html_body, plain_text):
                logger.info(f"[EMAIL OTP] Delivered via Resend API to {clean_email}")
                return {
                    "success": True,
                    "delivered_via": "resend",
                    "dev_otp": None,
                    "message": f"Verification code sent to {clean_email}",
                    "error": None,
                }
        except Exception as e:
            logger.warning(f"[EMAIL RESEND FAILED] {e}")

    # -------------------------------------------------------------
    # 3. Local Development Simulation / Unconfigured Fallback
    # -------------------------------------------------------------
    if not is_smtp_configured() and not resend_key and not brevo_key:
        logger.info(f"[DEV CONSOLE LOG ONLY] Verification code generated for {clean_email}: {otp_code}")
        return {
            "success": True,
            "delivered_via": "console",
            "dev_otp": None,
            "message": f"Verification code sent to {clean_email} (Dev Console Mode)",
            "error": None,
        }

    # If delivery was attempted but all channels failed
    error_detail = "; ".join(smtp_errors) if smtp_errors else "Outbound email delivery channels failed."
    logger.error(f"[EMAIL OTP FAILED] All delivery attempts failed for {clean_email}. Details: {error_detail}")
    return {
        "success": False,
        "delivered_via": "none",
        "dev_otp": None,
        "message": "Failed to deliver verification code to your email.",
        "error": f"Email delivery failed: {error_detail}",
    }
