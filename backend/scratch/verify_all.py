import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("--- TESTING CHATBOT ---")
questions = [
    "Radhe Radhe",
    "tell me what i can do in this application",
    "tell me the features of this website",
    "Where is the library and when does it close?",
    "Can students delete events?",
    "Register me for Campus Hackathon"
]

for q in questions:
    r = requests.post("http://127.0.0.1:8000/api/ai/chat", json={"message": q, "role": "STUDENT", "user_id": 1})
    data = r.json()
    print("Q:", q)
    print("Reply preview:")
    print(data.get("reply")[:250].strip())
    print("-" * 50)

print("\n--- TESTING CALCULATOR IMAGE UPLOAD ---")
with open("scratch/sample_calculator.png", "rb") as f:
    files = {"file": ("IMG_0123.jpg", f, "image/png")}
    r2 = requests.post("http://127.0.0.1:8000/api/ai/image-upload-search", files=files)
data2 = r2.json()
print("Detected:", data2["analysis"]["item_name"])
print("Category:", data2["analysis"]["category"])
print("Confidence:", data2["analysis"]["confidence"])
print("Matches count:", data2["total_matches"])
for m in data2["matches"][:3]:
    print("Match:", m["item"]["item_name"], str(m["match_score"]) + "%")
    print("Reasons:", m["match_reasons"])
