import time
from app.database import init_db, get_connection
from app.crud import seed_default_admin, create_user, get_user_by_identifier
from app.schemas import UserRegister
from app.auth import verify_password, create_session_token, get_user_by_token, revoke_token

def test_auth_workflow():
    init_db()
    conn = get_connection()
    try:
        # Seed admin
        seed_default_admin(conn)
        admin = get_user_by_identifier(conn, "atlas_admin")
        assert admin is not None
        assert verify_password("AtlasAdmin123!", admin["password_hash"]) is True
        assert verify_password("WrongPassword", admin["password_hash"]) is False
        print("[OK] Default admin verified successfully!")

        # Create unique test user
        ts = int(time.time())
        test_reg = UserRegister(
            username=f"tester_{ts}",
            email=f"tester_{ts}@atlas.dev",
            password="FuturePassword2026!",
            full_name="Sarah Connor",
        )
        user = create_user(conn, test_reg)
        print(f"[OK] Registered user ID #{user['id']} ('{user['username']}')")

        # Session token
        token = create_session_token(conn, user["id"])
        print(f"[OK] Generated session token: {token[:12]}...")

        # Token lookup
        user_profile = get_user_by_token(conn, token)
        assert user_profile is not None
        assert user_profile["username"] == f"tester_{ts}"
        print("[OK] Authenticated user via bearer session token!")

        # Revoke token
        revoked = revoke_token(conn, token)
        assert revoked is True
        assert get_user_by_token(conn, token) is None
        print("[OK] Token successfully revoked on logout!")

        # Cleanup user
        with conn:
            conn.execute("DELETE FROM users WHERE id = ?", (user["id"],))

        print("\nAll Auth and Database tests passed with 100% success!")
    finally:
        conn.close()

if __name__ == "__main__":
    test_auth_workflow()
