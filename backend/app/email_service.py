import os
import secrets
import logging
import smtplib
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional
from dotenv import load_dotenv

logger = logging.getLogger("atlas.email")
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"


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


def send_otp_email(recipient_email: str, otp_code: str, purpose: str = "login") -> Dict[str, Any]:
    """
    Deliver OTP to the user's email address.
    If SMTP server settings exist, connects via SMTP/TLS and transmits the email.
    Otherwise, falls back to dev-mode logging with console output.
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

    # Plain text version for fallback/preview
    plain_text = (
        f"Your ATLAS 2.0 one-time verification code for {action_text} is: {otp_code}\n\n"
        f"This code will expire in 10 minutes.\n"
        f"If you did not request this verification code, please ignore this email.\n\n"
        f"Security Team, ATLAS 2.0"
    )

    if not is_smtp_configured():
        # Dev fallback mode
        logger.warning(
            f"[EMAIL OTP DEV MODE] SMTP not configured. OTP for {clean_email} is: {otp_code}"
        )
        print(f"\n=======================================================")
        print(f"[ATLAS 2.0 SECURE EMAIL OTP] DEV MODE SIMULATION")
        print(f"Destination: {clean_email}")
        print(f"One-Time Code: {otp_code}")
        print(f"Expires: 10 minutes")
        print(f"To send real emails, set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in backend/.env")
        print(f"=======================================================\n")
        return {
            "success": True,
            "delivered_via": "console",
            "dev_otp": otp_code,
            "message": "OTP generated and logged to server console (SMTP not configured).",
            "error": None,
        }

    # Live SMTP mode
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", os.getenv("SMTP_EMAIL", "")).strip()
    pwd = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_APP_PASSWORD", "")).strip()
    from_name = os.getenv("SMTP_FROM_NAME", "ATLAS 2.0 Security")
    from_addr = os.getenv("SMTP_FROM_EMAIL", user)

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_addr}>"
        msg["To"] = clean_email

        # Attach text and html parts
        part1 = MIMEText(plain_text, "plain", "utf-8")
        part2 = MIMEText(get_html_template(otp_code, clean_email, purpose), "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        if port == 465 or os.getenv("SMTP_SSL", "false").lower() in ("true", "1", "yes"):
            with smtplib.SMTP_SSL(host, port, timeout=12) as server:
                server.login(user, pwd)
                server.sendmail(from_addr, [clean_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=12) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(user, pwd)
                server.sendmail(from_addr, [clean_email], msg.as_string())

        logger.info(f"[EMAIL OTP] Successfully dispatched live email to {clean_email}")
        print(f"[EMAIL OTP] Live SMTP message dispatched to {clean_email}")
        return {
            "success": True,
            "delivered_via": "smtp",
            "dev_otp": None,
            "message": f"Verification code sent to {clean_email}",
            "error": None,
        }
    except Exception as e:
        error_msg = f"Failed to send email via SMTP ({host}:{port}): {str(e)}"
        logger.error(f"[EMAIL OTP ERROR] {error_msg}")
        print(f"[EMAIL OTP ERROR] {error_msg}")
        # Even if SMTP fails, return dev fallback OTP so user isn't locked out in dev
        print(f"[EMAIL OTP FALLBACK CODE] {otp_code} (User: {clean_email})")
        return {
            "success": True,
            "delivered_via": "console",
            "dev_otp": otp_code,
            "message": f"SMTP delivery failed, but dev code logged to server console: {str(e)}",
            "error": str(e),
        }
