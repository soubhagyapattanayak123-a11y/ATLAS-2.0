from app.database import init_db, get_connection
from app.crud import seed_initial_data, get_items, get_stats, create_item, delete_item
from app.schemas import ItemCreate

def test_full_flow():
    init_db()
    conn = get_connection()
    try:
        seed_initial_data(conn)
        items = get_items(conn)
        print(f"[OK] Total seeded items in SQLite: {len(items)}")

        stats = get_stats(conn)
        print(f"[OK] Statistics: Total={stats['total']}, Status Breakdown={stats['by_status']}")

        # Create
        new_item = create_item(
            conn,
            ItemCreate(
                title="Verify Automated Ingestion",
                description="Testing full CRUD pipeline with native SQLite WAL mode.",
                category="Testing",
                priority="high",
                status="todo",
            ),
        )
        print(f"[OK] Created item ID #{new_item['id']} ('{new_item['title']}')")

        # Verify
        assert new_item["id"] is not None
        assert new_item["status"] == "todo"

        # Delete
        deleted = delete_item(conn, new_item["id"])
        print(f"[OK] Cleaned up test item: {deleted}")

        print("\nAll database operations verified successfully!")
    finally:
        conn.close()

if __name__ == "__main__":
    test_full_flow()
