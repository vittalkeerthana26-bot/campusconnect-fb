import os
from dotenv import load_dotenv
from firebase_db import firebase_db

load_dotenv()

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "campusconnect-fb")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "https://campusconnect-fb-default-rtdb.firebaseio.com")

def get_firebase_db():
    """Dependency to provide Firebase database client per request."""
    return firebase_db

# Backwards compatibility helper
def get_db():
    """Yields Firebase database adapter for endpoints."""
    yield firebase_db
