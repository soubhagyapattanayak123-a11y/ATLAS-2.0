import hmac
import json
import os
import sqlite3
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple
from .schemas import (
    ItemCreate,
    ItemUpdate,
    UserRegister,
    LogicRuleCreate,
    LogicRuleUpdate,
)
from .auth import (
    hash_password,
    generate_salt,
    extract_salt_from_hash,
    verify_password,
    needs_rehash,
)


def get_current_iso_time() -> str:
    return datetime.now(timezone.utc).isoformat()


# ==========================================
# User CRUD & Operations
# ==========================================

def get_user_by_id(conn: sqlite3.Connection, user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve user by primary key."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    return cursor.fetchone()


def get_user_by_username(conn: sqlite3.Connection, username: str) -> Optional[Dict[str, Any]]:
    """Retrieve user by unique username (case-insensitive)."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username,))
    return cursor.fetchone()


def get_user_by_email(conn: sqlite3.Connection, email: str) -> Optional[Dict[str, Any]]:
    """Retrieve user by unique email (case-insensitive)."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email,))
    return cursor.fetchone()


def get_user_by_identifier(conn: sqlite3.Connection, identifier: str) -> Optional[Dict[str, Any]]:
    """Find user by either username or email."""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)",
        (identifier, identifier),
    )
    return cursor.fetchone()


def create_user(conn: sqlite3.Connection, user_in: UserRegister, role: str = "user") -> Dict[str, Any]:
    """Register a new user with dedicated 256-bit cryptographic salting and PBKDF2-HMAC-SHA256."""
    now_str = get_current_iso_time()
    salt = generate_salt(32)
    pw_hash = hash_password(user_in.password, salt=salt)

    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, salt, full_name, dob, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_in.username.strip(),
                user_in.email.strip().lower(),
                pw_hash,
                salt,
                (user_in.full_name or "").strip(),
                (getattr(user_in, "dob", "") or "").strip(),
                role,
                now_str,
                now_str,
            ),
        )
        user_id = cursor.lastrowid

    return get_user_by_id(conn, user_id)  # type: ignore


def update_user_profile(
    conn: sqlite3.Connection,
    user_id: int,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Update user's full name or email."""
    update_fields = []
    params = []
    if full_name is not None:
        update_fields.append("full_name = ?")
        params.append(full_name.strip())
    if email is not None:
        update_fields.append("email = ?")
        params.append(email.strip().lower())

    if update_fields:
        update_fields.append("updated_at = ?")
        params.append(get_current_iso_time())
        params.append(user_id)

        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
        with conn:
            conn.execute(query, params)

    return get_user_by_id(conn, user_id)


def update_user_password(conn: sqlite3.Connection, user_id: int, new_password: str) -> bool:
    """Update user password with freshly generated 256-bit cryptographic salt and 600,000-round PBKDF2 hash."""
    salt = generate_salt(32)
    pw_hash = hash_password(new_password, salt=salt)
    now_str = get_current_iso_time()
    with conn:
        conn.execute(
            "UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?",
            (pw_hash, salt, now_str, user_id),
        )
    return True


def get_demo_accounts() -> List[Dict[str, Any]]:
    """Return available demo personas for evaluation (strictly sanitized, zero credentials leaked)."""
    # Personal admin accounts and plaintext credentials are never returned publicly.
    return []


def seed_default_admin(conn: sqlite3.Connection) -> None:
    """Pre-seed default demo administrator and engineer accounts if missing."""
    now_str = get_current_iso_time()

    # Seed Primary Administrator: Soubhagya Pattanayak (soubhagyapattanayak637@gmail.com)
    soubhagya_email = os.getenv("INITIAL_ADMIN_EMAIL", "soubhagyapattanayak637@gmail.com")
    existing_soubhagya = get_user_by_email(conn, soubhagya_email)
    if not existing_soubhagya:
        admin_init_pw = os.getenv("INITIAL_ADMIN_PASSWORD", "sanu@1234")
        soubhagya_salt = generate_salt(32)
        soubhagya_hash = hash_password(admin_init_pw, salt=soubhagya_salt)
        with conn:
            conn.execute(
                """
                INSERT INTO users (username, email, password_hash, salt, full_name, dob, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "soubhagya",
                    soubhagya_email,
                    soubhagya_hash,
                    soubhagya_salt,
                    "Soubhagya Pattanayak",
                    "1998-05-15",
                    "admin",
                    now_str,
                    now_str,
                ),
            )

    is_production = bool(os.getenv("RENDER")) or os.getenv("ENVIRONMENT") == "production"
    # Defense against Default Credentials: In production environments, never seed predictable demo accounts
    # and purge any insecure legacy demo credentials
    if is_production:
        with conn:
            conn.execute("DELETE FROM users WHERE email IN ('admin@atlas.io', 'admin@atlas.dev', 'engineer@atlas.dev')")
        return

    # Seed Admin (AtlasAdmin123!) - Development Only
    if not get_user_by_username(conn, "atlas_admin"):
        admin_salt = generate_salt(32)
        admin_hash = hash_password("AtlasAdmin123!", salt=admin_salt)
        with conn:
            conn.execute(
                """
                INSERT INTO users (username, email, password_hash, salt, full_name, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "atlas_admin",
                    "admin@atlas.dev",
                    admin_hash,
                    admin_salt,
                    "Atlas System Administrator",
                    "admin",
                    now_str,
                    now_str,
                ),
            )

    # Seed Demo Engineer - Development Only
    if not get_user_by_username(conn, "demo_engineer"):
        engineer_salt = generate_salt(32)
        engineer_hash = hash_password("AtlasDev123!", salt=engineer_salt)
        with conn:
            conn.execute(
                """
                INSERT INTO users (username, email, password_hash, salt, full_name, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "demo_engineer",
                    "engineer@atlas.dev",
                    engineer_hash,
                    engineer_salt,
                    "Atlas Senior Engineer",
                    "developer",
                    now_str,
                    now_str,
                ),
            )


# ==========================================
# Admin User Management CRUD
# ==========================================

def get_all_users_for_admin(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """Fetch all registered users with session counts for the admin dashboard."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.username, u.email, u.full_name, u.dob, u.role, u.created_at, u.updated_at,
               COUNT(t.token) as active_sessions
        FROM users u
        LEFT JOIN auth_tokens t ON t.user_id = u.id AND t.expires_at > ?
        GROUP BY u.id
        ORDER BY u.id ASC
        """,
        (get_current_iso_time(),),
    )
    return cursor.fetchall()


def admin_delete_user(conn: sqlite3.Connection, user_id: int) -> bool:
    """Delete a user account and purge all active session tokens."""
    with conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM auth_tokens WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        return cursor.rowcount > 0


def admin_update_user_role(conn: sqlite3.Connection, user_id: int, new_role: str) -> Optional[Dict[str, Any]]:
    """Update a user's permission role."""
    now_str = get_current_iso_time()
    with conn:
        conn.execute("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", (new_role, now_str, user_id))
    return get_user_by_id(conn, user_id)


def admin_get_stats(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Calculate aggregated telemetry for the admin dashboard."""
    cursor = conn.cursor()
    now_str = get_current_iso_time()

    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    total_users = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'")
    admins_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'user'")
    regular_users = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'developer'")
    developers_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM auth_tokens WHERE expires_at > ?", (now_str,))
    active_sessions = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM atlas_items")
    total_nodes = cursor.fetchone()["cnt"]

    return {
        "total_users": total_users,
        "admins_count": admins_count,
        "regular_users": regular_users,
        "developers_count": developers_count,
        "active_sessions": active_sessions,
        "total_nodes": total_nodes,
    }



# ==========================================
# Atlas Item CRUD & Operations
# ==========================================

def get_items(
    conn: sqlite3.Connection,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve items from SQLite with optional filtering and keyword search."""
    query = "SELECT * FROM atlas_items WHERE 1=1"
    params: List[Any] = []

    if status and status != "all":
        query += " AND status = ?"
        params.append(status)
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    if priority and priority != "all":
        query += " AND priority = ?"
        params.append(priority)
    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        pattern = f"%{search}%"
        params.extend([pattern, pattern])

    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])

    cursor = conn.cursor()
    cursor.execute(query, params)
    return cursor.fetchall()


def get_item(conn: sqlite3.Connection, item_id: int) -> Optional[Dict[str, Any]]:
    """Fetch single item by primary ID."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM atlas_items WHERE id = ?", (item_id,))
    return cursor.fetchone()


def create_item(conn: sqlite3.Connection, item_in: ItemCreate, user_id: Optional[int] = None) -> Dict[str, Any]:
    """Insert a new item record into the database with row-level user ownership."""
    now_str = get_current_iso_time()
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO atlas_items (user_id, title, description, category, priority, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                item_in.title,
                item_in.description or "",
                item_in.category or "General",
                item_in.priority or "medium",
                item_in.status or "todo",
                now_str,
                now_str,
            ),
        )
        new_id = cursor.lastrowid
    return get_item(conn, new_id)  # type: ignore


def update_item(
    conn: sqlite3.Connection,
    item_id: int,
    item_in: ItemUpdate,
    user_id: Optional[int] = None,
    is_admin: bool = False,
) -> Optional[Dict[str, Any]]:
    """
    Update non-null fields on an existing record with IDOR authorization protection.
    Non-admin users can only update unassigned items or their own items.
    """
    current = get_item(conn, item_id)
    if not current:
        return None

    # Object-Level Authorization Check (IDOR defense)
    item_owner_id = current.get("user_id")
    if item_owner_id is not None and not is_admin:
        if user_id is None or user_id != item_owner_id:
            raise PermissionError("Access forbidden: Object-level authorization failed.")

    update_fields = []
    params = []

    data = item_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is not None:
            update_fields.append(f"{field} = ?")
            params.append(value)

    if update_fields:
        update_fields.append("updated_at = ?")
        params.append(get_current_iso_time())
        params.append(item_id)

        query = f"UPDATE atlas_items SET {', '.join(update_fields)} WHERE id = ?"
        with conn:
            conn.execute(query, params)

    return get_item(conn, item_id)


def delete_item(
    conn: sqlite3.Connection,
    item_id: int,
    user_id: Optional[int] = None,
    is_admin: bool = False,
) -> bool:
    """
    Delete an item record by ID with IDOR authorization protection.
    Non-admin users can only delete unassigned items or their own items.
    """
    current = get_item(conn, item_id)
    if not current:
        return False

    # Object-Level Authorization Check (IDOR defense)
    item_owner_id = current.get("user_id")
    if item_owner_id is not None and not is_admin:
        if user_id is None or user_id != item_owner_id:
            raise PermissionError("Access forbidden: Object-level authorization failed.")

    with conn:
        conn.execute("DELETE FROM atlas_items WHERE id = ?", (item_id,))
    return True


def get_stats(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Aggregate statistics from SQLite."""
    cursor = conn.cursor()

    # Total
    cursor.execute("SELECT COUNT(*) AS total FROM atlas_items")
    total_row = cursor.fetchone()
    total = total_row["total"] if total_row else 0

    # By Status
    cursor.execute("SELECT status, COUNT(*) AS count FROM atlas_items GROUP BY status")
    by_status = {row["status"]: row["count"] for row in cursor.fetchall()}

    # By Priority
    cursor.execute("SELECT priority, COUNT(*) AS count FROM atlas_items GROUP BY priority")
    by_priority = {row["priority"]: row["count"] for row in cursor.fetchall()}

    # By Category
    cursor.execute("SELECT category, COUNT(*) AS count FROM atlas_items GROUP BY category")
    by_category = {row["category"]: row["count"] for row in cursor.fetchall()}

    return {
        "total": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "by_category": by_category,
    }


def seed_initial_data(conn: sqlite3.Connection) -> None:
    """Pre-seed database with default ATLAS 2.0 nodes if table is empty."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS count FROM atlas_items")
    row = cursor.fetchone()
    if row and row["count"] == 0:
        now_str = get_current_iso_time()
        initial_samples = [
            (
                "Initialize ATLAS 2.0 Full-Stack Architecture",
                "Connect React + TypeScript client to FastAPI backend with SQLite persistence.",
                "Architecture",
                "critical",
                "done",
                now_str,
                now_str,
            ),
            (
                "Implement Dark Mode & Glassmorphism Design",
                "Sleek cyberpunk/modern dark palette, glowing badges, and responsive CSS grid.",
                "Frontend",
                "high",
                "in_progress",
                now_str,
                now_str,
            ),
            (
                "Configure SQLite Automated WAL Mode",
                "Optimize SQLite performance with Write-Ahead Logging and foreign key enforcement.",
                "Database",
                "medium",
                "todo",
                now_str,
                now_str,
            ),
            (
                "Real-Time Node Telemetry & Statistics",
                "Live dashboard counters with status distribution and category filters.",
                "Telemetry",
                "high",
                "in_progress",
                now_str,
                now_str,
            ),
        ]
        with conn:
            cursor.executemany(
                """
                INSERT INTO atlas_items (title, description, category, priority, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                initial_samples,
            )


# ==========================================
# Logic & Rules Engine CRUD & Operations
# ==========================================

def serialize_rule_row(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert raw SQLite rule row to serialized dictionary with parsed JSON fields."""
    if not row:
        return None
    d = dict(row)
    try:
        d["conditions"] = json.loads(d.get("conditions_json") or "[]")
    except Exception:
        d["conditions"] = []
    try:
        d["actions"] = json.loads(d.get("actions_json") or "[]")
    except Exception:
        d["actions"] = []
    d["is_active"] = bool(d.get("is_active", 1))
    return d


def get_logic_rules(
    conn: sqlite3.Connection,
    is_active: Optional[bool] = None,
    trigger_event: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve logic rules from SQLite with optional filtering."""
    query = "SELECT * FROM atlas_logic_rules WHERE 1=1"
    params: List[Any] = []
    if is_active is not None:
        query += " AND is_active = ?"
        params.append(1 if is_active else 0)
    if trigger_event:
        query += " AND trigger_event = ?"
        params.append(trigger_event)
    query += " ORDER BY id DESC"
    cursor = conn.cursor()
    cursor.execute(query, params)
    return [serialize_rule_row(r) for r in cursor.fetchall() if r]  # type: ignore


def get_logic_rule(conn: sqlite3.Connection, rule_id: int) -> Optional[Dict[str, Any]]:
    """Fetch single logic rule by ID."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM atlas_logic_rules WHERE id = ?", (rule_id,))
    row = cursor.fetchone()
    return serialize_rule_row(row)


def create_logic_rule(conn: sqlite3.Connection, rule_in: LogicRuleCreate) -> Dict[str, Any]:
    """Create a new logic rule with serialized condition and action JSON."""
    now_str = get_current_iso_time()
    conditions_json = json.dumps([c.model_dump() for c in rule_in.conditions])
    actions_json = json.dumps([a.model_dump() for a in rule_in.actions])

    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO atlas_logic_rules (
                name, description, trigger_event, condition_operator,
                conditions_json, actions_json, is_active, execution_count,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                rule_in.name.strip(),
                (rule_in.description or "").strip(),
                rule_in.trigger_event,
                rule_in.condition_operator,
                conditions_json,
                actions_json,
                1 if rule_in.is_active else 0,
                now_str,
                now_str,
            ),
        )
        new_id = cursor.lastrowid
    return get_logic_rule(conn, new_id)  # type: ignore


def update_logic_rule(
    conn: sqlite3.Connection, rule_id: int, rule_in: LogicRuleUpdate
) -> Optional[Dict[str, Any]]:
    """Update attributes of a logic rule."""
    current = get_logic_rule(conn, rule_id)
    if not current:
        return None

    update_fields = []
    params: List[Any] = []

    if rule_in.name is not None:
        update_fields.append("name = ?")
        params.append(rule_in.name.strip())
    if rule_in.description is not None:
        update_fields.append("description = ?")
        params.append(rule_in.description.strip())
    if rule_in.trigger_event is not None:
        update_fields.append("trigger_event = ?")
        params.append(rule_in.trigger_event)
    if rule_in.condition_operator is not None:
        update_fields.append("condition_operator = ?")
        params.append(rule_in.condition_operator)
    if rule_in.conditions is not None:
        update_fields.append("conditions_json = ?")
        params.append(json.dumps([c.model_dump() for c in rule_in.conditions]))
    if rule_in.actions is not None:
        update_fields.append("actions_json = ?")
        params.append(json.dumps([a.model_dump() for a in rule_in.actions]))
    if rule_in.is_active is not None:
        update_fields.append("is_active = ?")
        params.append(1 if rule_in.is_active else 0)

    if update_fields:
        update_fields.append("updated_at = ?")
        params.append(get_current_iso_time())
        params.append(rule_id)

        query = f"UPDATE atlas_logic_rules SET {', '.join(update_fields)} WHERE id = ?"
        with conn:
            conn.execute(query, params)

    return get_logic_rule(conn, rule_id)


def delete_logic_rule(conn: sqlite3.Connection, rule_id: int) -> bool:
    """Delete a logic rule from SQLite."""
    current = get_logic_rule(conn, rule_id)
    if not current:
        return False
    with conn:
        conn.execute("DELETE FROM atlas_logic_rules WHERE id = ?", (rule_id,))
    return True


def toggle_logic_rule(conn: sqlite3.Connection, rule_id: int) -> Optional[Dict[str, Any]]:
    """Toggle active state of a logic rule."""
    current = get_logic_rule(conn, rule_id)
    if not current:
        return None
    new_state = 0 if current["is_active"] else 1
    now_str = get_current_iso_time()
    with conn:
        conn.execute(
            "UPDATE atlas_logic_rules SET is_active = ?, updated_at = ? WHERE id = ?",
            (new_state, now_str, rule_id),
        )
    return get_logic_rule(conn, rule_id)


def evaluate_logic_rule(
    rule: Dict[str, Any],
    payload: Dict[str, Any],
    record_execution: bool = False,
    conn: Optional[sqlite3.Connection] = None,
) -> Dict[str, Any]:
    """Test or execute a rule against a given payload dictionary."""
    conditions = rule.get("conditions", [])
    condition_op = rule.get("condition_operator", "ALL").upper()
    evaluations = []

    for cond in conditions:
        field = cond.get("field", "")
        op = cond.get("operator", "equals").lower()
        expected = cond.get("value")
        actual = payload.get(field)

        passed = False
        reason = ""

        try:
            if op == "equals":
                if isinstance(actual, str) and isinstance(expected, str):
                    passed = actual.strip().lower() == expected.strip().lower()
                else:
                    passed = actual == expected
                reason = f"Actual '{actual}' == Expected '{expected}'" if passed else f"Actual '{actual}' != Expected '{expected}'"

            elif op == "not_equals":
                if isinstance(actual, str) and isinstance(expected, str):
                    passed = actual.strip().lower() != expected.strip().lower()
                else:
                    passed = actual != expected
                reason = f"Actual '{actual}' != Expected '{expected}'" if passed else f"Actual matched Expected '{expected}'"

            elif op == "contains":
                passed = expected is not None and str(expected).lower() in str(actual or "").lower()
                reason = f"'{expected}' found in '{actual}'" if passed else f"'{expected}' not in '{actual}'"

            elif op == "greater_than":
                passed = float(actual) > float(expected)
                reason = f"{actual} > {expected}" if passed else f"{actual} <= {expected}"

            elif op == "less_than":
                passed = float(actual) < float(expected)
                reason = f"{actual} < {expected}" if passed else f"{actual} >= {expected}"

            elif op == "is_empty":
                passed = actual is None or actual == "" or actual == [] or actual == {}
                reason = "Value is empty" if passed else f"Value '{actual}' is not empty"

            elif op == "in":
                if isinstance(expected, list):
                    passed = actual in expected
                else:
                    items = [x.strip().lower() for x in str(expected).split(",")]
                    passed = str(actual).strip().lower() in items
                reason = f"'{actual}' is in expected values" if passed else f"'{actual}' not in expected values"

            else:
                passed = False
                reason = f"Unsupported operator '{op}'"
        except Exception as e:
            passed = False
            reason = f"Evaluation error: {str(e)}"

        evaluations.append({
            "field": field,
            "operator": op,
            "expected_value": expected,
            "actual_value": actual,
            "passed": passed,
            "reason": reason,
        })

    # Overall match calculation
    if not conditions:
        matched = True
    elif condition_op == "ANY":
        matched = any(ev["passed"] for ev in evaluations)
    else:  # ALL
        matched = all(ev["passed"] for ev in evaluations)

    # Output simulation
    simulated_output = dict(payload)
    executed_actions = []
    if matched:
        actions = rule.get("actions", [])
        for action in actions:
            action_type = action.get("action_type")
            params = action.get("parameters", {})
            executed_actions.append(action)

            if action_type == "set_status" and "status" in params:
                simulated_output["status"] = params["status"]
            elif action_type == "set_priority" and "priority" in params:
                simulated_output["priority"] = params["priority"]
            elif action_type == "add_tag" and "tag" in params:
                tags = simulated_output.get("tags", [])
                if isinstance(tags, list):
                    simulated_output["tags"] = tags + [params["tag"]]
                else:
                    simulated_output["tags"] = [params["tag"]]
            elif action_type == "log_audit":
                simulated_output["_audit_log"] = params.get("message", "Rule triggered")
            elif action_type == "send_notification":
                simulated_output["_notification"] = params.get("message", "Rule alert sent")

        # Record execution counter if requested
        if record_execution and conn and rule.get("id"):
            now_str = get_current_iso_time()
            with conn:
                conn.execute(
                    """
                    UPDATE atlas_logic_rules
                    SET execution_count = execution_count + 1, last_executed_at = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (now_str, now_str, rule["id"]),
                )

    return {
        "rule_id": rule.get("id", 0),
        "rule_name": rule.get("name", ""),
        "matched": matched,
        "condition_operator": condition_op,
        "condition_evaluations": evaluations,
        "executed_actions": executed_actions,
        "simulated_output": simulated_output,
    }


def seed_default_logic_rules(conn: sqlite3.Connection) -> None:
    """Pre-seed sample logic automation rules if table is empty."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS total FROM atlas_logic_rules")
    row = cursor.fetchone()
    if row and row["total"] == 0:
        now_str = get_current_iso_time()
        rules = [
            (
                "Critical Incident Auto-Escalation",
                "When a critical priority node is created in 'todo' status, automatically escalate it to 'in_progress' and send an alert.",
                "node.created",
                "ALL",
                json.dumps([
                    {"field": "priority", "operator": "equals", "value": "critical"},
                    {"field": "status", "operator": "equals", "value": "todo"},
                ]),
                json.dumps([
                    {"action_type": "set_status", "parameters": {"status": "in_progress"}},
                    {"action_type": "send_notification", "parameters": {"message": "Critical node auto-escalated to in_progress."}},
                ]),
                1,
                8,
                now_str,
                now_str,
                now_str,
            ),
            (
                "High-Latency Telemetry Spike Guard",
                "Detect when incoming service latency telemetry exceeds the 250ms SLA threshold.",
                "telemetry.spike",
                "ALL",
                json.dumps([
                    {"field": "latency_ms", "operator": "greater_than", "value": 250},
                ]),
                json.dumps([
                    {"action_type": "log_audit", "parameters": {"message": "Latency violation logged. Service SLA exceeded."}},
                    {"action_type": "send_notification", "parameters": {"message": "High-latency spike warning dispatched to operations."}},
                ]),
                1,
                14,
                now_str,
                now_str,
                now_str,
            ),
            (
                "Security Node Compliance Auto-Tagger",
                "Automatically tag any security architecture node with 'compliance-review' and assign high priority.",
                "node.created",
                "ALL",
                json.dumps([
                    {"field": "category", "operator": "equals", "value": "Security"},
                ]),
                json.dumps([
                    {"action_type": "set_priority", "parameters": {"priority": "high"}},
                    {"action_type": "add_tag", "parameters": {"tag": "compliance-review"}},
                ]),
                1,
                5,
                now_str,
                now_str,
                now_str,
            ),
            (
                "Completed Node Archive Logger",
                "Trigger audit logging when an active node reaches 'done' state.",
                "node.updated",
                "ALL",
                json.dumps([
                    {"field": "status", "operator": "equals", "value": "done"},
                ]),
                json.dumps([
                    {"action_type": "log_audit", "parameters": {"message": "Node successfully finalized and marked ready for audit."}},
                ]),
                1,
                3,
                now_str,
                now_str,
                now_str,
            ),
        ]
        with conn:
            cursor.executemany(
                """
                INSERT INTO atlas_logic_rules (
                    name, description, trigger_event, condition_operator,
                    conditions_json, actions_json, is_active, execution_count,
                    last_executed_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rules,
            )


# ==========================================
# Learning Activities / History CRUD
# ==========================================

def record_learning_activity(
    conn: sqlite3.Connection,
    activity_type: str,
    title: str,
    details: str = "",
    solution: str = "",
    score: str = "",
    language: str = "English",
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Insert a new student learning activity into learning_activities."""
    now_str = get_current_iso_time()
    cursor = conn.cursor()
    with conn:
        cursor.execute(
            """
            INSERT INTO learning_activities (
                user_id, activity_type, title, details, solution, score, language, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, activity_type, title, details or "", solution or "", score or "", language or "English", now_str),
        )
        activity_id = cursor.lastrowid

    cursor.execute("SELECT * FROM learning_activities WHERE id = ?", (activity_id,))
    row = cursor.fetchone()
    return dict(row) if row else {
        "id": activity_id,
        "user_id": user_id,
        "activity_type": activity_type,
        "title": title,
        "details": details,
        "solution": solution,
        "score": score,
        "language": language,
        "created_at": now_str,
    }


def get_learning_activities(
    conn: sqlite3.Connection,
    user_id: Optional[int] = None,
    activity_type: Optional[str] = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """Fetch learning activities sorted newest first with strict per-user data isolation."""
    cursor = conn.cursor()
    query = "SELECT * FROM learning_activities WHERE 1=1"
    params: List[Any] = []

    if user_id is not None:
        query += " AND user_id = ?"
        params.append(user_id)
    else:
        query += " AND user_id IS NULL"

    if activity_type and activity_type != "all":
        query += " AND activity_type = ?"
        params.append(activity_type)

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, tuple(params))
    return [dict(row) for row in cursor.fetchall()]


def delete_learning_activity(
    conn: sqlite3.Connection,
    activity_id: int,
    user_id: Optional[int] = None,
) -> bool:
    """Delete a single learning activity by id with strict user isolation."""
    cursor = conn.cursor()
    with conn:
        if user_id is not None:
            cursor.execute("DELETE FROM learning_activities WHERE id = ? AND user_id = ?", (activity_id, user_id))
        else:
            cursor.execute("DELETE FROM learning_activities WHERE id = ? AND user_id IS NULL", (activity_id,))
    return cursor.rowcount > 0


def clear_learning_activities(
    conn: sqlite3.Connection,
    user_id: Optional[int] = None,
) -> int:
    """Clear learning activities for the specified user with strict user isolation."""
    cursor = conn.cursor()
    with conn:
        if user_id is not None:
            cursor.execute("DELETE FROM learning_activities WHERE user_id = ?", (user_id,))
        else:
            cursor.execute("DELETE FROM learning_activities WHERE user_id IS NULL")
    return cursor.rowcount
    return cursor.rowcount


# ==========================================
# Secure Email OTP Authentication CRUD
# ==========================================

def check_otp_rate_limit(conn: sqlite3.Connection, email: str, cooldown_seconds: int = 60) -> Optional[int]:
    """Check if an OTP was issued recently to prevent spamming. Returns remaining cooldown seconds or None."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT created_at FROM email_otp_codes
        WHERE LOWER(email) = LOWER(?)
        ORDER BY id DESC LIMIT 1
        """,
        (email.strip().lower(),),
    )
    row = cursor.fetchone()
    if not row:
        return None

    try:
        created_dt = datetime.fromisoformat(row["created_at"])
        now_dt = datetime.now(timezone.utc)
        elapsed = (now_dt - created_dt).total_seconds()
        if elapsed < cooldown_seconds:
            return int(cooldown_seconds - elapsed)
    except Exception:
        pass
    return None


def record_email_otp(
    conn: sqlite3.Connection,
    email: str,
    otp_code: str,
    purpose: str = "login",
    expires_minutes: int = 10,
) -> Dict[str, Any]:
    """Invalidate previous pending OTPs and insert a fresh one."""
    clean_email = email.strip().lower()
    now_dt = datetime.now(timezone.utc)
    expires_dt = now_dt + timedelta(minutes=expires_minutes)

    now_str = now_dt.isoformat()
    expires_str = expires_dt.isoformat()

    with conn:
        # Mark previous active OTPs for this email as superseded
        conn.execute(
            """
            UPDATE email_otp_codes
            SET is_used = 1
            WHERE LOWER(email) = LOWER(?) AND is_used = 0 AND purpose = ?
            """,
            (clean_email, purpose),
        )

        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO email_otp_codes (email, otp_code, purpose, attempts_left, created_at, expires_at, is_used)
            VALUES (?, ?, ?, 5, ?, ?, 0)
            """,
            (clean_email, otp_code, purpose, now_str, expires_str),
        )
        otp_id = cursor.lastrowid

    cursor.execute("SELECT * FROM email_otp_codes WHERE id = ?", (otp_id,))
    return cursor.fetchone()


def verify_and_consume_otp(
    conn: sqlite3.Connection,
    email: str,
    otp_code: str,
    purpose: str = "login",
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Verify OTP validity:
    - Must exist, be unused, and match purpose.
    - Must not be expired.
    - Must have attempts remaining.
    - Code must match exactly.
    """
    clean_email = email.strip().lower()
    clean_code = otp_code.strip()

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT * FROM email_otp_codes
        WHERE LOWER(email) = LOWER(?) AND purpose = ? AND is_used = 0
        ORDER BY id DESC LIMIT 1
        """,
        (clean_email, purpose),
    )
    record = cursor.fetchone()

    if not record:
        return False, "No active verification code found. Please request a new code.", None

    # Check remaining attempts
    attempts_left = record["attempts_left"]
    if attempts_left <= 0:
        with conn:
            conn.execute("UPDATE email_otp_codes SET is_used = 1 WHERE id = ?", (record["id"],))
        return False, "Maximum verification attempts exceeded. Please request a new code.", None

    # Check expiry
    try:
        expires_dt = datetime.fromisoformat(record["expires_at"])
        if datetime.now(timezone.utc) > expires_dt:
            with conn:
                conn.execute("UPDATE email_otp_codes SET is_used = 1 WHERE id = ?", (record["id"],))
            return False, "Verification code has expired. Please request a new code.", None
    except Exception:
        pass

    # Verify matching code in constant-time (prevents timing side-channel attacks)
    if not hmac.compare_digest(str(record["otp_code"]), str(clean_code)):
        new_attempts = attempts_left - 1
        with conn:
            conn.execute(
                "UPDATE email_otp_codes SET attempts_left = ? WHERE id = ?",
                (new_attempts, record["id"]),
            )
        if new_attempts <= 0:
            return False, "Invalid code. You have exhausted all attempts. Please request a new code.", None
        return False, f"Invalid verification code. {new_attempts} attempt(s) remaining.", None

    # Code is valid! Consume it.
    with conn:
        conn.execute("UPDATE email_otp_codes SET is_used = 1 WHERE id = ?", (record["id"],))

    return True, "Code successfully verified.", record


def get_or_create_user_by_email(conn: sqlite3.Connection, email: str) -> Dict[str, Any]:
    """Retrieve existing user by email or auto-provision a new user account."""
    clean_email = email.strip().lower()
    existing = get_user_by_email(conn, clean_email)
    if existing:
        return existing

    # Auto-generate username from email prefix
    prefix = clean_email.split("@")[0]
    # Clean non-alphanumeric chars
    base_username = "".join(c for c in prefix if c.isalnum() or c in ("_", "-")) or "user"
    if len(base_username) < 3:
        base_username = f"user_{base_username}"

    # Ensure uniqueness
    username = base_username
    counter = 1
    while get_user_by_username(conn, username):
        suffix = secrets.randbelow(9000) + 1000
        username = f"{base_username}_{suffix}"
        counter += 1
        if counter > 20:
            username = f"user_{secrets.token_hex(4)}"
            break

    # Random password hash for OTP-provisioned account
    random_pw = secrets.token_urlsafe(24)
    now_str = get_current_iso_time()
    salt = generate_salt(32)
    pw_hash = hash_password(random_pw, salt=salt)

    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, salt, full_name, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'user', ?, ?)
            """,
            (username, clean_email, pw_hash, salt, username.replace("_", " ").title(), now_str, now_str),
        )
        user_id = cursor.lastrowid

    return get_user_by_id(conn, user_id)  # type: ignore



