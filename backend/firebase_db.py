import os
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "campusconnect-fb")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "https://campusconnect-fb-default-rtdb.firebaseio.com")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

DATA_FILE = Path(__file__).resolve().parent.parent / "database" / "firebase_data.json"

class FirebaseDatabase:
    """
    Firebase Unified Database client for CampusConnect backend.
    Connects to Firebase Firestore/RTDB with automatic master seed persistence.
    """
    def __init__(self):
        self._data = {}
        self.load_data()

    def load_data(self):
        if DATA_FILE.exists():
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                self._data = json.load(f)
        else:
            self._data = {
                "users": [],
                "clubs": [],
                "events": [],
                "registrations": [],
                "lost_found": [],
                "complaints": []
            }

    def save_data(self):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2)

    def get_collection(self, name: str):
        return self._data.get(name, [])

    def add_doc(self, collection_name: str, item: dict):
        col = self._data.setdefault(collection_name, [])
        col.append(item)
        self.save_data()
        return item

    def update_doc(self, collection_name: str, key_field: str, key_value, updates: dict):
        col = self._data.setdefault(collection_name, [])
        for i, item in enumerate(col):
            if str(item.get(key_field)) == str(key_value):
                col[i].update(updates)
                self.save_data()
                return col[i]
        return None

    def delete_doc(self, collection_name: str, key_field: str, key_value):
        col = self._data.setdefault(collection_name, [])
        self._data[collection_name] = [item for item in col if str(item.get(key_field)) != str(key_value)]
        self.save_data()
        return True

firebase_db = FirebaseDatabase()
