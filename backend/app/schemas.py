import re
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator


# ==========================================
# Atlas Item Schemas
# ==========================================

class ItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, example="Implement OAuth flow")
    description: Optional[str] = Field(default="", example="Configure JWT authentication and refresh tokens.")
    category: str = Field(default="General", example="Security")
    priority: str = Field(default="medium", example="high")  # low, medium, high, critical
    status: str = Field(default="todo", example="todo")       # todo, in_progress, done


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class ItemResponse(ItemBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ItemStats(BaseModel):
    total: int
    by_status: Dict[str, int]
    by_priority: Dict[str, int]
    by_category: Dict[str, int]


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str
    items_count: int
    timestamp: datetime


# ==========================================
# Authentication & User Schemas
# ==========================================

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, example="atlas_admin")
    email: str = Field(..., example="admin@atlas.dev")
    password: str = Field(..., min_length=6, max_length=128, example="SecurePassword123!")
    full_name: Optional[str] = Field(default="", example="Atlas Lead Engineer")
    dob: Optional[str] = Field(default="", example="1998-05-20")
    otp_code: Optional[str] = Field(default=None, example="123456", description="Mandatory 6-digit email OTP verification code for user sign up")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean

    @field_validator("username")
    @classmethod
    def validate_username_format(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^[a-zA-Z0-9_-]+$", clean):
            raise ValueError("Username can only contain alphanumeric characters, underscores, and hyphens")
        return clean


class UserLogin(BaseModel):
    username_or_email: str = Field(..., min_length=3, example="atlas_admin")
    password: str = Field(..., min_length=1, example="SecurePassword123!")


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = ""
    dob: Optional[str] = ""
    role: str = "user"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    token_type: str = "bearer"
    message: str = "Authentication successful"


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[str] = Field(default=None)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean


class UserPasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


class SendOTPRequest(BaseModel):
    email: str = Field(..., example="user@atlas.dev")
    purpose: str = Field(default="login", example="login")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean


class VerifyOTPRequest(BaseModel):
    email: str = Field(..., example="user@atlas.dev")
    otp_code: str = Field(..., min_length=4, max_length=8, example="123456")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean

    @field_validator("otp_code")
    @classmethod
    def validate_code_format(cls, v: str) -> str:
        clean = v.strip()
        if not clean.isdigit():
            raise ValueError("OTP code must be numeric")
        return clean


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., example="user@atlas.dev")
    otp_code: str = Field(..., min_length=4, max_length=8, example="123456")
    new_password: str = Field(..., min_length=6, max_length=128, example="NewSecurePass123!")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Invalid email format")
        return clean

    @field_validator("otp_code")
    @classmethod
    def validate_code_format(cls, v: str) -> str:
        clean = v.strip()
        if not clean.isdigit():
            raise ValueError("OTP code must be numeric")
        return clean


class OTPStatusResponse(BaseModel):
    status: str = "success"
    message: str
    email: str
    expires_in_seconds: int = 600
    cooldown_seconds: int = 60
    delivered_via: str = "smtp"
    dev_otp: Optional[str] = None


class DemoAccountInfo(BaseModel):
    username: str
    role: str
    full_name: str
    email: str
    password_hint: str
    description: str


# ==========================================
# Admin Control Panel Schemas
# ==========================================

class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = ""
    dob: Optional[str] = ""
    role: str = "user"
    created_at: str
    updated_at: str
    active_sessions: int = 0


class AdminUserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=4)
    full_name: Optional[str] = ""
    dob: Optional[str] = ""
    role: str = Field(default="user", pattern="^(admin|user|developer)$")


class AdminRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(admin|user|developer)$")


class AdminPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=4, max_length=128)


class AdminStatsResponse(BaseModel):
    total_users: int
    admins_count: int
    regular_users: int
    developers_count: int
    active_sessions: int
    total_nodes: int


# ==========================================
# Logic & Rules Engine Schemas
# ==========================================

class RuleCondition(BaseModel):
    field: str = Field(..., description="Target property in incoming event payload")
    operator: str = Field(..., description="equals, not_equals, contains, greater_than, less_than, in, is_empty")
    value: Any = Field(..., description="Expected value for comparison")


class RuleAction(BaseModel):
    action_type: str = Field(..., description="set_status, set_priority, send_notification, trigger_webhook, add_tag, log_audit")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action configuration parameters")


class LogicRuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = Field(default="")
    trigger_event: str = Field(default="node.created")  # node.created, node.updated, telemetry.spike, manual.trigger
    condition_operator: str = Field(default="ALL")      # ALL (AND) or ANY (OR)
    conditions: List[RuleCondition] = Field(default_factory=list)
    actions: List[RuleAction] = Field(default_factory=list)
    is_active: bool = Field(default=True)


class LogicRuleCreate(LogicRuleBase):
    pass


class LogicRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_event: Optional[str] = None
    condition_operator: Optional[str] = None
    conditions: Optional[List[RuleCondition]] = None
    actions: Optional[List[RuleAction]] = None
    is_active: Optional[bool] = None


class LogicRuleResponse(LogicRuleBase):
    id: int
    execution_count: int = 0
    last_executed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LogicRuleTestInput(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict, description="Mock event payload to test against the rule")


class LogicRuleConditionEvaluation(BaseModel):
    field: str
    operator: str
    expected_value: Any
    actual_value: Any
    passed: bool
    reason: str


class LogicRuleTestResult(BaseModel):
    rule_id: int
    rule_name: str
    matched: bool
    condition_operator: str
    condition_evaluations: List[LogicRuleConditionEvaluation]
    executed_actions: List[RuleAction]
    simulated_output: Dict[str, Any]


# ==========================================
# Image Scanner & Vision Schemas
# ==========================================

class QuizQuestionItem(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_answer: str
    explanation: str


class ScanImageRequest(BaseModel):
    image: str = Field(..., description="Base64 data URL string of the image (e.g. data:image/png;base64,...)")
    mode: str = Field(default="extract_text", description="'extract_text', 'qa', 'explain', or 'quiz'")
    language: str = Field(default="English", description="'English', 'Hindi', or 'Odia'")
    custom_question: Optional[str] = Field(default=None, description="Optional custom question regarding the image")


class ScanImageResponse(BaseModel):
    mode: str
    extracted_text: Optional[str] = None
    result: str
    language: str
    quiz_questions: Optional[List[QuizQuestionItem]] = None


# ==========================================
# PDF Scanner & Academic Analysis Schemas
# ==========================================

class ScanPdfRequest(BaseModel):
    pdf_data: str = Field(..., description="Base64 data URL string or base64 data of the PDF file")
    filename: Optional[str] = Field(default="document.pdf", description="Original filename of the PDF")
    mode: str = Field(default="extract_text", description="'extract_text', 'qa', 'explain', or 'quiz'")
    language: str = Field(default="English", description="'English', 'Hindi', or 'Odia'")
    custom_question: Optional[str] = Field(default=None, description="Optional custom question regarding the PDF")
    page_number: Optional[int] = Field(default=None, description="Optional specific 1-based page number, or None for whole document")


class ScanPdfResponse(BaseModel):
    mode: str
    page_count: int
    extracted_text: Optional[str] = None
    result: str
    language: str
    filename: Optional[str] = None
    quiz_questions: Optional[List[QuizQuestionItem]] = None


# ==========================================
# Learning Activity & History Schemas
# ==========================================

class LearningActivityCreate(BaseModel):
    activity_type: str = Field(..., description="'math', 'qa', 'image_scan', 'pdf_scan', 'flashcard', 'voice', or 'quiz'")
    title: str = Field(..., description="Short title or problem statement of the activity")
    details: Optional[str] = Field(default="", description="Summary, description, or question details")
    solution: Optional[str] = Field(default="", description="Full step-by-step solution, extracted text, or answer")
    score: Optional[str] = Field(default="", description="Score or accuracy metric if applicable")
    language: Optional[str] = Field(default="English", description="Language: 'English', 'Hindi', or 'Odia'")


class LearningActivityResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    activity_type: str
    title: str
    details: Optional[str] = ""
    solution: Optional[str] = ""
    score: Optional[str] = ""
    language: Optional[str] = "English"
    created_at: str


# ==========================================
# Firewall & Security Center Schemas
# ==========================================

class FirewallIPRuleRequest(BaseModel):
    ip: str = Field(..., description="IPv4 or IPv6 address")
    rule_type: str = Field(default="block", description="'block' or 'whitelist'")
    reason: Optional[str] = Field(default="", description="Reason for the rule")
    expires_in_minutes: Optional[int] = Field(default=None, description="Optional ban expiry in minutes (None = permanent)")


class FirewallRuleToggleRequest(BaseModel):
    rule_name: str = Field(..., description="Rule key: sqli_protection, xss_protection, path_traversal, command_injection, scanner_bot_protection, rate_limiting")
    enabled: bool = Field(..., description="True to enable, False to disable")


class FirewallTestProbeRequest(BaseModel):
    test_type: str = Field(default="sqli", description="'sqli', 'xss', 'traversal', 'cmd', or 'scanner'")
    payload: Optional[str] = Field(default=None, description="Custom payload or None for default demo exploit")


