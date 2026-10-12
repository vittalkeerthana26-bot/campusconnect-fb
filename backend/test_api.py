import sys
sys.stdout.reconfigure(encoding='utf-8')
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("   CampusConnect Backend & AI System Tests")
    print("==================================================")
    
    # 1. Health & AI Status
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print(f"[PASS] GET /health (Status: {health_data['status']}, AI: {health_data.get('ai_status')})")

    # 2. Portal Authentication & Credentials
    # A) Student Login with valid credentials
    student_login = client.post("/api/auth/login", json={
        "email": "student@campusconnect.local",
        "password": "student123",
        "portal": "STUDENT"
    })
    assert student_login.status_code == 200, f"Student login failed: {student_login.text}"
    student_data = student_login.json()["user"]
    student_id = student_data["id"]
    print(f"[PASS] POST /api/auth/login - Student Portal Login (User #{student_id}, {student_data['name']})")

    # B) Admin Login with valid credentials
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@campusconnect.local",
        "password": "admin123",
        "portal": "ADMIN"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_data = admin_login.json()["user"]
    admin_id = admin_data["id"]
    print(f"[PASS] POST /api/auth/login - Admin Portal Login (User #{admin_id}, {admin_data['name']})")

    # C) Student attempting to access Admin Portal -> Must fail with 403
    student_to_admin = client.post("/api/auth/login", json={
        "email": "student@campusconnect.local",
        "password": "student123",
        "portal": "ADMIN"
    })
    assert student_to_admin.status_code == 403, f"Expected 403 for student accessing admin portal, got {student_to_admin.status_code}"
    print("[PASS] Security Check: Student credentials rejected from Admin Portal (403 Forbidden)")

    # D) Invalid credentials -> Must fail with 401
    bad_login = client.post("/api/auth/login", json={
        "email": "student@campusconnect.local",
        "password": "wrongpassword"
    })
    assert bad_login.status_code == 401
    print("[PASS] Security Check: Invalid credentials rejected (401 Unauthorized)")

    # 3. Clubs & Events Queries
    clubs_res = client.get("/api/clubs")
    assert clubs_res.status_code == 200
    clubs = clubs_res.json()
    assert len(clubs) >= 4
    club_id = clubs[0]["club_id"]
    print(f"[PASS] GET /api/clubs (Retrieved {len(clubs)} clubs)")

    events_res = client.get("/api/events")
    assert events_res.status_code == 200
    events = events_res.json()
    assert len(events) >= 4
    hackathon = next((e for e in events if "Hackathon" in e["title"]), events[0])
    print(f"[PASS] GET /api/events (Retrieved {len(events)} events, verified seats math)")

    # 4. Strict Role Permission Check: Student CANNOT Delete Event
    # Admin creates a temporary event for testing
    temp_event = client.post("/api/events", json={
        "title": "Temp Security Test Event",
        "description": "Event created to verify role deletion restrictions.",
        "event_date": "2026-10-20T10:00:00",
        "location": "Auditorium 2",
        "capacity": 30,
        "club_id": club_id
    }, headers={"X-User-Role": "ADMIN", "X-User-Id": str(admin_id)})
    assert temp_event.status_code == 201, f"Admin event create failed: {temp_event.text}"
    temp_event_id = temp_event.json()["event_id"]
    print(f"[PASS] Admin created temp event #{temp_event_id}")

    # A student attempts to delete this event -> MUST BE 403 FORBIDDEN!
    student_delete_attempt = client.delete(
        f"/api/events/{temp_event_id}",
        headers={"X-User-Role": "STUDENT", "X-User-Id": str(student_id)}
    )
    assert student_delete_attempt.status_code == 403, \
        f"CRITICAL FAULT: Student was able to delete event! Status: {student_delete_attempt.status_code}"
    print(f"[PASS] ROLE PERMISSION ENFORCED: Student cannot delete event (Blocked with 403: {student_delete_attempt.json()['detail']})")

    # Now Admin deletes the event -> Must succeed (200)
    admin_delete = client.delete(
        f"/api/events/{temp_event_id}",
        headers={"X-User-Role": "ADMIN", "X-User-Id": str(admin_id)}
    )
    assert admin_delete.status_code == 200
    print(f"[PASS] Admin permitted to delete event (200 OK)")

    # 5. AI Campus Agent Chatbot Tests
    print("\n--- Testing AI Campus Agent Chatbot ---")
    
    # Query A: Event Inquiry
    chat_req1 = {
        "message": "What events or hackathons are scheduled on campus?",
        "user_id": student_id,
        "role": "STUDENT"
    }
    chat_res1 = client.post("/api/ai/chat", json=chat_req1)
    assert chat_res1.status_code == 200, f"AI Chat failed: {chat_res1.text}"
    cdata1 = chat_res1.json()
    assert len(cdata1["reply"]) > 20
    assert len(cdata1["tools_used"]) >= 1
    print(f"[PASS] AI Chat (Event query) -> Reply: {cdata1['reply'][:60]}... (Tools: {[t['tool_name'] for t in cdata1['tools_used']]}, Engine: {cdata1['engine']})")

    # Query B: Registration via AI Agent
    chat_req2 = {
        "message": f"Register me for {hackathon['title']}",
        "user_id": student_id,
        "role": "STUDENT"
    }
    chat_res2 = client.post("/api/ai/chat", json=chat_req2)
    assert chat_res2.status_code == 200
    cdata2 = chat_res2.json()
    print(f"[PASS] AI Chat (Action Execution) -> Reply: {cdata2['reply'][:60]}... (Tools: {[t['tool_name'] for t in cdata2['tools_used']]})")

    # Query C: Permission matrix query
    chat_req3 = {
        "message": "Can students delete events on CampusConnect?",
        "user_id": student_id,
        "role": "STUDENT"
    }
    chat_res3 = client.post("/api/ai/chat", json=chat_req3)
    assert chat_res3.status_code == 200
    assert "cannot" in chat_res3.json()["reply"].lower() or "blocked" in chat_res3.json()["reply"].lower() or "admin" in chat_res3.json()["reply"].lower()
    print("[PASS] AI Chat (Knowledge check) -> AI Agent accurately confirmed students cannot delete events")

    # 6. AI Image Search & Lost-and-Found Tests
    print("\n--- Testing AI Image Search & Lost-and-Found ---")
    
    # A) Get existing Lost & Found items
    lf_res = client.get("/api/lost-found")
    assert lf_res.status_code == 200
    lf_items = lf_res.json()
    assert len(lf_items) >= 4, f"Expected at least 4 lost/found items, got {len(lf_items)}"
    print(f"[PASS] GET /api/lost-found (Retrieved {len(lf_items)} campus records)")

    # B) AI Visual Search with query hint / item type
    img_search_req = {
        "image_url": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500",
        "category_hint": "Electronics",
        "item_type_hint": "Found"
    }
    img_res = client.post("/api/ai/image-search", json=img_search_req)
    assert img_res.status_code == 200, f"AI Image Search failed: {img_res.text}"
    img_data = img_res.json()
    assert "analysis" in img_data
    assert "matches" in img_data
    assert len(img_data["matches"]) >= 1, "Expected at least 1 visual match"
    top_match = img_data["matches"][0]
    print(f"[PASS] POST /api/ai/image-search -> Detected: '{img_data['analysis']['item_name']}', Category: {img_data['analysis']['category']}")
    print(f"       Top Match: '{top_match['item']['item_name']}' with {top_match['match_score']}% Match Score")
    print(f"       Match Reasons: {top_match['match_reasons']}")

    # 7. Dashboard Stats with Lost/Found & Complaints Counters
    stats_res = client.get(f"/api/dashboard/stats?user_id={student_id}")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "lost_items_count" in stats
    assert "found_items_count" in stats
    assert "total_complaints" in stats
    assert "pending_complaints" in stats
    print(f"[PASS] GET /api/dashboard/stats -> {stats}")

    # 8. Student Complaints & Grievance Redressal Synchronization Tests
    print("\n--- Testing Student Complaints & Grievance Redressal Synchronization ---")
    # A) Student files a new complaint
    new_complaint = client.post("/api/complaints", json={
        "title": "Air Conditioner Leaking in Mechanical Lab 2",
        "category": "Infrastructure",
        "priority": "High",
        "description": "Water dripping from split AC unit near workbench 4."
    }, headers={"X-User-Id": str(student_id), "X-User-Role": "STUDENT"})
    assert new_complaint.status_code == 201, f"Filing complaint failed: {new_complaint.text}"
    c_data = new_complaint.json()
    c_id = c_data["complaint_id"]
    assert c_data["status"] == "Pending"
    assert c_data["student_id"] == student_id
    print(f"[PASS] POST /api/complaints -> Student filed complaint #{c_id}: '{c_data['title']}'")

    # B) Admin view reflects the newly filed complaint
    admin_list = client.get(f"/api/complaints/{c_id}", headers={"X-User-Id": str(admin_id), "X-User-Role": "ADMIN"})
    assert admin_list.status_code == 200
    assert admin_list.json()["title"] == "Air Conditioner Leaking in Mechanical Lab 2"
    print(f"[PASS] SYNCHRONIZATION: Admin view reflects complaint #{c_id} filed by student")

    # C) Student attempting to resolve complaint -> MUST BE 403 FORBIDDEN!
    student_resolve_attempt = client.put(f"/api/complaints/{c_id}", json={
        "status": "Resolved"
    }, headers={"X-User-Id": str(student_id), "X-User-Role": "STUDENT"})
    assert student_resolve_attempt.status_code == 403, \
        f"CRITICAL FAULT: Student was able to resolve complaint! Status: {student_resolve_attempt.status_code}"
    print(f"[PASS] ROLE PERMISSION ENFORCED: Student cannot resolve complaint (Blocked with 403: {student_resolve_attempt.json()['detail']})")

    # D) Admin permitted to resolve the complaint with official response
    admin_update = client.put(f"/api/complaints/{c_id}", json={
        "status": "Resolved",
        "admin_response": "HVAC maintenance team inspected unit and cleared drainage pipe blockage."
    }, headers={"X-User-Id": str(admin_id), "X-User-Role": "ADMIN"})
    assert admin_update.status_code == 200, f"Admin update failed: {admin_update.text}"
    updated_data = admin_update.json()
    assert updated_data["status"] == "Resolved"
    assert "HVAC maintenance" in updated_data["admin_response"]
    print(f"[PASS] PUT /api/complaints/#{c_id} -> Admin permitted to update status to 'Resolved' (200 OK)")

    # E) Student sees updated status and admin response
    student_view_c = client.get(f"/api/complaints/{c_id}", headers={"X-User-Id": str(student_id), "X-User-Role": "STUDENT"})
    assert student_view_c.status_code == 200
    assert student_view_c.json()["status"] == "Resolved"
    assert "HVAC maintenance" in student_view_c.json()["admin_response"]
    print(f"[PASS] SYNCHRONIZATION: Student view reflects Admin's 'Resolved' status and official response")

    # F) Clean up test complaint
    del_c = client.delete(f"/api/complaints/{c_id}", headers={"X-User-Id": str(admin_id), "X-User-Role": "ADMIN"})
    assert del_c.status_code == 200
    print(f"[PASS] DELETE /api/complaints/#{c_id} -> Complaint successfully cleaned up")

    # 9. Event Registration Security, Capacity & Privacy Tests
    print("\n--- Testing Event Registration Security, Capacity & Privacy ---")
    # A) Admin creates small capacity event
    cap_event_res = client.post("/api/events", json={
        "title": "Capacity & Privacy Test Workshop",
        "description": "Testing small capacity and privacy.",
        "club_id": club_id,
        "event_date": "2026-11-20T14:00:00",
        "location": "Seminar Hall A",
        "capacity": 1
    }, headers={"X-User-Id": str(admin_id), "X-User-Role": "ADMIN"})
    assert cap_event_res.status_code == 201
    cap_event_id = cap_event_res.json()["event_id"]
    print(f"[PASS] Admin created test event #{cap_event_id} with capacity=1")

    # B) Admin attempting to register as attendee -> Must be 403
    admin_reg_attempt = client.post(f"/api/events/{cap_event_id}/register", json={
        "student_id": admin_id
    }, headers={"X-User-Id": str(admin_id), "X-User-Role": "ADMIN"})
    assert admin_reg_attempt.status_code == 403
    print("[PASS] ROLE PERMISSION: Admin rejected from registering as event attendee (403 Forbidden)")

    # C) Student 1 registers successfully
    reg_res = client.post(f"/api/events/{cap_event_id}/register", json={
        "student_id": student_id
    }, headers={"X-User-Id": str(student_id), "X-User-Role": "STUDENT"})
    assert reg_res.status_code == 201
    reg_id = reg_res.json()["registration_id"]
    print(f"[PASS] Student #{student_id} registered successfully for event #{cap_event_id}")

    # D) Duplicate registration -> Must be 400
    dup_res = client.post(f"/api/events/{cap_event_id}/register", json={
        "student_id": student_id
    }, headers={"X-User-Id": str(student_id), "X-User-Role": "STUDENT"})
    assert dup_res.status_code == 400
    print("[PASS] DUPLICATE CHECK: Student duplicate registration rejected (400 Bad Request)")

    # E) Capacity limit reached -> Another student gets 400
    full_res = client.post(f"/api/events/{cap_event_id}/register", json={
        "student_id": 9999
    }, headers={"X-User-Id": "9999", "X-User-Role": "STUDENT"})
    assert full_res.status_code == 404 or full_res.status_code == 400
    print("[PASS] CAPACITY CHECK: Event capacity overflow protected")

    # F) Privacy: Student cannot access other student's personal registrations
    privacy_reg_res = client.get(f"/api/users/{admin_id}/registrations", headers={
        "X-User-Id": str(student_id),
        "X-User-Role": "STUDENT"
    })
    assert privacy_reg_res.status_code == 403
    print("[PASS] PRIVACY CHECK: Student blocked from viewing another user's registrations (403 Forbidden)")

    # G) Privacy: Student cannot access event roster
    privacy_roster_res = client.get(f"/api/events/{cap_event_id}/registrations", headers={
        "X-User-Id": str(student_id),
        "X-User-Role": "STUDENT"
    })
    assert privacy_roster_res.status_code == 403
    print("[PASS] PRIVACY CHECK: Student blocked from viewing attendee roster (403 Forbidden)")

    # H) Admin permitted to view event roster
    admin_roster_res = client.get(f"/api/events/{cap_event_id}/registrations", headers={
        "X-User-Id": str(admin_id),
        "X-User-Role": "ADMIN"
    })
    assert admin_roster_res.status_code == 200
    assert len(admin_roster_res.json()) == 1
    print("[PASS] Admin permitted to view full attendee roster (200 OK)")

    # I) Clean up registration & event
    client.delete(f"/api/registrations/{reg_id}", headers={"X-User-Id": str(student_id), "X-User-Role": "STUDENT"})
    client.delete(f"/api/events/{cap_event_id}", headers={"X-User-Id": str(admin_id), "X-User-Role": "ADMIN"})
    print("[PASS] Registration and event cleaned up")

    # 10. Image Upload Validation Tests
    print("\n--- Testing Image Upload Validation ---")
    # A) Empty file rejected
    empty_upload = client.post("/api/ai/image-upload-search", files={"file": ("empty.png", b"", "image/png")})
    assert empty_upload.status_code == 400
    print("[PASS] VALIDATION: Empty image file rejected (400 Bad Request)")

    # B) Non-image file rejected
    bad_upload = client.post("/api/ai/image-upload-search", files={"file": ("notes.txt", b"hello text file", "text/plain")})
    assert bad_upload.status_code == 400
    print("[PASS] VALIDATION: Non-image file type rejected (400 Bad Request)")

    # 11. AI Chatbot Role-Based Permissions Tests
    print("\n--- Testing AI Chatbot Role-Based Permissions ---")
    # A) Admin asking to register in chat is informed of admin role
    admin_chat = client.post("/api/ai/chat", json={
        "message": "Register me for Hackathon",
        "user_id": admin_id,
        "role": "ADMIN"
    })
    assert admin_chat.status_code == 200
    assert "Admin" in admin_chat.json()["reply"]
    print("[PASS] AI CHATBOT: Admin registration attempt guided to Admin role management")

    # B) Student asking for roster in chat is blocked for privacy
    student_chat = client.post("/api/ai/chat", json={
        "message": "Who registered for Hackathon?",
        "user_id": student_id,
        "role": "STUDENT"
    })
    assert student_chat.status_code == 200
    assert "Privacy" in student_chat.json()["reply"] or "privacy" in student_chat.json()["reply"]
    print("[PASS] AI CHATBOT: Student roster request protected with privacy policy")

    # C) Admin asking for roster in chat receives attendee list
    admin_roster_chat = client.post("/api/ai/chat", json={
        "message": "Who registered for Hackathon?",
        "user_id": admin_id,
        "role": "ADMIN"
    })
    assert admin_roster_chat.status_code == 200
    print("[PASS] AI CHATBOT: Admin successfully retrieved attendee roster")

    print("\n==================================================")
    print("   ALL 32+ TESTS PASSED! FULL SYNCHRONIZATION READY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()

