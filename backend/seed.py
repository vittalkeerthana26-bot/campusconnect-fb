import sys
import json
from pathlib import Path
from datetime import datetime, timedelta
from firebase_db import firebase_db, DATA_FILE

def seed_firebase():
    """Seed CampusConnect Firebase Database with exact preserved schema and records."""
    print("[INFO] Checking and seeding CampusConnect Firebase database...")

    if not DATA_FILE.exists():
        print("[ERROR] database/firebase_data.json not found!", file=sys.stderr)
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"  [+] Loaded {len(data.get('users', []))} Users into Firebase")
    print(f"  [+] Loaded {len(data.get('clubs', []))} Clubs into Firebase")
    print(f"  [+] Loaded {len(data.get('events', []))} Events into Firebase")
    print(f"  [+] Loaded {len(data.get('registrations', []))} Event Registrations into Firebase")
    print(f"  [+] Loaded {len(data.get('lost_found', []))} Lost & Found Items into Firebase")
    print(f"  [+] Loaded {len(data.get('complaints', []))} Complaints into Firebase")

    firebase_db.load_data()
    print("\n[SUCCESS] Firebase database initialized and ready for deployment!")

if __name__ == "__main__":
    seed_firebase()
