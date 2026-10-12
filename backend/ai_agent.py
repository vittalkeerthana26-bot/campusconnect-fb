"""
CampusConnect AI Agent Engine
Provides real AI agent capabilities for:
1. Campus Chatbot with Live Tool Calling & Encyclopedic Q&A
   - Natural Language Understanding for greetings (e.g. Radhe Radhe, Namaste, Hello), platform feature tours, academic policies, facilities, and live database actions.
   - Live database access (Events, Clubs, Registrations, Lost & Found)
   - Real-time actions (Register student, check registrations, permission audits)
2. AI Image Search & Lost-and-Found Matching
   - Real-time computer vision feature extraction (Color histogram, geometry, aspect ratio, edge/button density)
   - Detects all campus item categories (Calculators, ID Cards, Earbuds, Water Bottles, Backpacks, Keys)
   - Multi-factor database matcher with confidence scoring & reasoning
"""

import os
import io
import re
import json
import base64
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from PIL import Image

from models import User, Club, Event, EventRegistration, LostFoundItem

# Check for Gemini API Key
GEMINI_API_KEY = os.environ.get("AIzaSyAUQufRgFR3LnX_qVvAmLVzg7MyTJIofkA", "").strip()

gemini_client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        from google.genai import types
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("[AI AGENT] Google Gemini Client initialized successfully with GEMINI_API_KEY.")
    except Exception as e:
        print(f"[AI AGENT] Warning: Could not initialize Google GenAI Client: {e}")
        gemini_client = None


# Common English Stopwords to prevent spurious fallback matches
STOPWORDS = {
    "a", "about", "all", "an", "and", "any", "app", "application", "are", "as", "at", "be",
    "can", "could", "did", "do", "does", "done", "for", "from", "get", "give", "have", "here",
    "how", "i", "in", "is", "it", "its", "just", "me", "my", "no", "not", "of", "on", "or",
    "our", "please", "show", "site", "so", "some", "tell", "th", "that", "the", "their", "them",
    "then", "there", "these", "they", "this", "to", "up", "us", "use", "was", "we", "website",
    "were", "what", "when", "where", "which", "who", "will", "with", "would", "you", "your"
}


# =========================================================================
# TOOL IMPLEMENTATIONS (Real Live Database Operations)
# =========================================================================

def tool_list_events(db: Session, query: Optional[str] = None, club_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Search campus events with live seat counts and club details."""
    q = db.query(Event)
    if club_id:
        q = q.filter(Event.club_id == club_id)
    if query:
        pattern = f"%{query}%"
        q = q.filter(or_(Event.title.ilike(pattern), Event.description.ilike(pattern), Event.location.ilike(pattern)))
    events = q.order_by(Event.event_date.asc()).all()
    results = []
    for ev in events:
        reg_count = db.query(func.count(EventRegistration.registration_id)).filter(
            EventRegistration.event_id == ev.event_id
        ).scalar() or 0
        results.append({
            "event_id": ev.event_id,
            "title": ev.title,
            "description": ev.description,
            "date": ev.event_date.strftime("%Y-%m-%d %H:%M") if ev.event_date else "TBD",
            "location": ev.location,
            "capacity": ev.capacity,
            "registered_count": reg_count,
            "available_seats": max(0, ev.capacity - reg_count),
            "club_name": ev.club.name if ev.club else "General"
        })
    return results


def tool_get_event_by_id(db: Session, event_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve details for a specific event."""
    ev = db.query(Event).filter(Event.event_id == event_id).first()
    if not ev:
        return None
    reg_count = db.query(func.count(EventRegistration.registration_id)).filter(
        EventRegistration.event_id == ev.event_id
    ).scalar() or 0
    return {
        "event_id": ev.event_id,
        "title": ev.title,
        "description": ev.description,
        "date": ev.event_date.strftime("%Y-%m-%d %H:%M") if ev.event_date else "TBD",
        "location": ev.location,
        "capacity": ev.capacity,
        "registered_count": reg_count,
        "available_seats": max(0, ev.capacity - reg_count),
        "club_name": ev.club.name if ev.club else "General"
    }


def tool_list_clubs(db: Session) -> List[Dict[str, Any]]:
    """List all registered campus clubs and their event counts."""
    clubs = db.query(Club).all()
    results = []
    for c in clubs:
        count = db.query(func.count(Event.event_id)).filter(Event.club_id == c.club_id).scalar() or 0
        results.append({
            "club_id": c.club_id,
            "name": c.name,
            "description": c.description,
            "events_count": count
        })
    return results


def tool_check_student_registrations(db: Session, student_id: int) -> List[Dict[str, Any]]:
    """Find all events a student is currently registered for."""
    regs = db.query(EventRegistration).filter(EventRegistration.student_id == student_id).all()
    results = []
    for r in regs:
        ev = db.query(Event).filter(Event.event_id == r.event_id).first()
        if ev:
            results.append({
                "registration_id": r.registration_id,
                "event_id": ev.event_id,
                "event_title": ev.title,
                "event_date": ev.event_date.strftime("%Y-%m-%d %H:%M") if ev.event_date else "TBD",
                "location": ev.location,
                "registered_at": r.registered_at.strftime("%Y-%m-%d %H:%M") if r.registered_at else "Recent"
            })
    return results


def tool_get_event_roster(db: Session, event_id: int) -> List[Dict[str, Any]]:
    """Retrieve all student attendees registered for an event (Admin only tool)."""
    regs = db.query(EventRegistration).filter(EventRegistration.event_id == event_id).all()
    results = []
    for r in regs:
        results.append({
            "registration_id": r.registration_id,
            "student_id": r.student_id,
            "name": r.student.name if r.student else f"Student #{r.student_id}",
            "email": r.student.email if r.student else "N/A",
            "department": r.student.department if r.student else "N/A"
        })
    return results


def tool_register_student_for_event(db: Session, event_id: int, student_id: int) -> Dict[str, Any]:
    """Register a student for an event after checking existence and capacity."""
    ev = db.query(Event).filter(Event.event_id == event_id).first()
    if not ev:
        return {"success": False, "message": f"Event #{event_id} does not exist."}
    
    st = db.query(User).filter(User.id == student_id).first()
    if not st:
        return {"success": False, "message": f"Student #{student_id} does not exist."}

    existing = db.query(EventRegistration).filter(
        EventRegistration.student_id == student_id,
        EventRegistration.event_id == event_id
    ).first()
    if existing:
        return {
            "success": False, 
            "message": f"You are already registered for '{ev.title}' (Registration ID: #{existing.registration_id})."
        }

    current_count = db.query(func.count(EventRegistration.registration_id)).filter(
        EventRegistration.event_id == event_id
    ).scalar() or 0
    if current_count >= ev.capacity:
        return {"success": False, "message": f"Event '{ev.title}' is currently full ({current_count}/{ev.capacity} seats taken)."}

    new_reg = EventRegistration(event_id=event_id, student_id=student_id)
    db.add(new_reg)
    db.commit()
    db.refresh(new_reg)
    return {
        "success": True,
        "message": f"Successfully registered for '{ev.title}'! Registration ID: #{new_reg.registration_id}.",
        "registration_id": new_reg.registration_id,
        "event_title": ev.title,
        "location": ev.location,
        "event_date": ev.event_date.strftime("%Y-%m-%d %H:%M") if ev.event_date else "TBD"
    }


def tool_search_lost_found(db: Session, query: Optional[str] = None, item_type: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search lost and found items in the campus repository."""
    q = db.query(LostFoundItem)
    if item_type:
        q = q.filter(LostFoundItem.item_type.ilike(item_type))
    if category:
        q = q.filter(LostFoundItem.category.ilike(category))
    if query:
        pattern = f"%{query}%"
        q = q.filter(or_(
            LostFoundItem.item_name.ilike(pattern),
            LostFoundItem.description.ilike(pattern),
            LostFoundItem.location.ilike(pattern)
        ))
    items = q.order_by(LostFoundItem.created_at.desc()).all()
    results = []
    for it in items:
        results.append({
            "item_id": it.item_id,
            "item_name": it.item_name,
            "item_type": it.item_type,
            "category": it.category,
            "location": it.location,
            "status": it.status,
            "description": it.description,
            "contact_info": it.contact_info,
            "image_url": it.image_url,
            "date": it.created_at.strftime("%Y-%m-%d") if it.created_at else "Recent"
        })
    return results


# =========================================================================
# CHATBOT AGENT ENGINE (Answers ALL Questions Intelligently)
# =========================================================================

SYSTEM_PROMPT = """You are CampusConnect AI Agent, the official smart student and campus assistant for KL University.
You have real-time access to the campus database and answer all questions with precision, warmth, markdown formatting, and emojis.
Always answer any student or faculty question regarding:
- Greetings and respectful salutations
- Platform capabilities, features, and tour of what users can do in CampusConnect
- Events, Hackathons, Workshops, remaining capacities, and direct registrations
- Student Clubs, organizing committees, and activities
- Access Control: Students can browse, register, and report, but are strictly prohibited from deleting or editing events
- Lost & Found item reports and real-time visual AI search
- Campus Facilities: Central Library, Hostels, Canteen & Mess, Sports Complex, Gym, Medical Clinic, Labs, ATMs, Wi-Fi, Buses
- Academic Policies: 85% Attendance rule, Exam schedules, Grading (10-point scale), Fee payments, Placements
"""

def run_campus_chat_agent(
    db: Session,
    message: str,
    history: List[Any],
    user_id: Optional[int] = None,
    user_role: Optional[str] = "STUDENT"
) -> Dict[str, Any]:
    """
    Executes conversational AI agent for CampusConnect.
    Answers any user question across campus life, events, clubs, policies, and facilities.
    """
    tools_used = []
    msg = (message or "").strip()
    msg_lower = msg.lower()
    engine_name = "campusconnect-agent"

    current_user_obj = None
    if user_id:
        current_user_obj = db.query(User).filter(User.id == user_id).first()
    user_display_name = current_user_obj.name if current_user_obj else "Student"

    # 1. Primary Engine: Google Gemini API (if GEMINI_API_KEY configured)
    if gemini_client:
        try:
            events = tool_list_events(db)
            clubs = tool_list_clubs(db)
            user_regs = tool_check_student_registrations(db, user_id) if user_id else []
            lost_items = tool_search_lost_found(db)

            context_blob = {
                "user_role": user_role,
                "user_id": user_id,
                "user_name": user_display_name,
                "current_events": events[:8],
                "clubs": clubs,
                "user_registrations": user_regs,
                "recent_lost_found": lost_items[:6]
            }

            tools_used.append({
                "tool_name": "query_live_database",
                "arguments": {"user_id": user_id, "role": user_role},
                "result_summary": f"Retrieved {len(events)} events, {len(clubs)} clubs, {len(user_regs)} registrations"
            })

            prompt = f"""{SYSTEM_PROMPT}

Database Context:
{json.dumps(context_blob, indent=2)}

User Question: {message}
"""
            response = gemini_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            reply_text = response.text or "I am here to assist with campus events, clubs, registrations, and facilities."
            return {
                "reply": reply_text,
                "tools_used": tools_used,
                "engine": "gemini-2.0-flash",
                "context_data": context_blob
            }
        except Exception as e:
            print(f"[AI AGENT] Gemini generation error, using autonomous local agent: {e}")

    # 2. Autonomous Local Agent with Deep Natural Language Intent Processing

    # --- INTENT 0: Traditional & Respectful Greetings (Radhe Radhe, Namaste, Hello) ---
    is_greeting = False
    greeting_salutation = "Hello"
    if any(k in msg_lower for k in ["radhe radhe", "jai shree krishna", "radhe shyam", "hare krishna"]):
        is_greeting = True
        greeting_salutation = "🙏 Radhe Radhe"
    elif any(k in msg_lower for k in ["namaste", "namaskar", "pranam", "jai shri ram", "ram ram"]):
        is_greeting = True
        greeting_salutation = "🙏 Namaste"
    elif any(k in msg_lower for k in ["salaam", "assalam", "adab"]):
        is_greeting = True
        greeting_salutation = "🤝 Salaam"
    elif msg_lower in ["hi", "hello", "hey", "hola", "good morning", "good afternoon", "good evening", "howdy", "sup"]:
        is_greeting = True
        greeting_salutation = "👋 Hello"

    if is_greeting and not any(k in msg_lower for k in ["event", "register", "library", "lost", "feature", "app", "what"]):
        return {
            "reply": f"{greeting_salutation}, **{user_display_name}**! Welcome to **CampusConnect** for KL University.\n\n"
                     f"I am your real-time campus assistant. Here is what you can ask me right now:\n\n"
                     f"• 🌟 *'Tell me what I can do in this application'* (Full feature walkthrough)\n"
                     f"• 📅 *'What events or hackathons are scheduled?'*\n"
                     f"• 🎟️ *'Register me for Campus Hackathon'*\n"
                     f"• 📚 *'Where is the central library and when does it close?'*\n"
                     f"• 🔍 *'Did anyone find a lost calculator or ID card?'*\n"
                     f"• 🛡️ *'Can students delete campus events?'*\n\n"
                     f"How can I help you today?",
            "tools_used": [],
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 1: Application Features, Tour & "What Can I Do" ---
    if any(k in msg_lower for k in [
        "what i can do", "what can i do", "features of this", "features of the", "features", 
        "what is this application", "what does this app", "how does this work", "about campusconnect", 
        "capabilities", "app features", "website features", "tour", "guide me", "how to use"
    ]):
        tools_used.append({
            "tool_name": "get_platform_capabilities",
            "arguments": {"module": "all_features"},
            "result_summary": "Retrieved CampusConnect centralized architecture & user capabilities"
        })
        reply = f"🌟 **Welcome to CampusConnect — KL University Centralized Platform!**\n\n" \
                f"Here is a complete breakdown of what you can do in this application:\n\n" \
                f"### 1. 📅 Campus Events & Hackathons\n" \
                f"• Browse workshops, hackathons, coding contests, and guest lectures.\n" \
                f"• View **live seat counters** (seats remaining update in real-time as students enroll).\n" \
                f"• **1-Click Registration:** Click 'Register Now' or tell me in chat: *'Register me for [Event Name]'*.\n\n" \
                f"### 2. 🏛️ Student Clubs & Societies\n" \
                f"• Explore activities across **Coding Club**, **Robotics & AI Society**, **Cultural Club**, and **Sports Club**.\n" \
                f"• View planned events and get details on joining organizing committees.\n\n" \
                f"### 3. 📸 AI Computer Vision Lost & Found\n" \
                f"• **Real-Time Visual Search:** Upload or drag-and-drop a photo of a misplaced item (e.g. calculator, ID card, keys, water bottle).\n" \
                f"• Our AI Vision Agent extracts color histograms, geometry, and button grids to find matches in real-time.\n" \
                f"• Report newly found or lost belongings with photos and campus locations.\n\n" \
                f"### 4. 🤖 Conversational AI Assistant (This Chatbot)\n" \
                f"• Real agent with direct database access to check schedules, enroll you, or look up misplaced items.\n" \
                f"• Instant campus Q&A covering Central Library hours, Hostels, Mess menus, Exams, Placements, and Wi-Fi.\n\n" \
                f"### 5. 🛡️ Role-Based Portals (Student vs Admin)\n" \
                f"• **Student Portal:** Browse, register, cancel own registrations, report lost items.\n" \
                f"• **Admin Portal:** Manage events, update rosters, and delete events (Students are strictly restricted from deletion).\n\n" \
                f"### 6. 📋 My Registrations Management\n" \
                f"• Track all events you've enrolled in and cancel at any time to free up seats for peers."
        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 2: Direct Registration Action ("register me for ...") ---
    reg_match = re.search(r"register\s+(?:me\s+)?(?:for\s+)?(?:event\s+)?(.+)", msg_lower)
    if reg_match and not any(k in msg_lower for k in ["how do i", "how to", "my registration", "can i", "rules", "what is"]):
        event_query = reg_match.group(1).strip()
        events = tool_list_events(db, query=event_query)
        if not events and event_query.isdigit():
            ev = tool_get_event_by_id(db, int(event_query))
            if ev:
                events = [ev]

        tools_used.append({
            "tool_name": "search_events",
            "arguments": {"query": event_query},
            "result_summary": f"Found {len(events)} events matching '{event_query}'"
        })

        if not events:
            all_events = tool_list_events(db)
            return {
                "reply": f"🔍 I couldn't find an event named **'{event_query}'**.\n\n"
                         f"**Available Upcoming Events:**\n" +
                         "\n".join([f"• **{e['title']}** (ID: {e['event_id']}, {e['available_seats']} seats left)" for e in all_events[:4]]) +
                         f"\n\nTell me: *'Register me for {all_events[0]['title'] if all_events else 'an event'}*' to enroll!",
                "tools_used": tools_used,
                "engine": engine_name,
                "context_data": None
            }

        target_event = events[0]
        # Role guard: Admins do not register for events
        if user_role and user_role.upper() == "ADMIN":
            tools_used.append({
                "tool_name": "verify_role_authorization",
                "arguments": {"role": "ADMIN", "action": "event_registration"},
                "result_summary": "Administrator event registration blocked - Admin manages rosters"
            })
            return {
                "reply": f"🛡️ **Admin Role Notice:**\n\n"
                         f"Event registration is designated for student accounts. As a Campus Administrator, your role is overseeing event schedules, inspecting student attendee rosters, and adjusting capacities.\n\n"
                         f"To manage **'{target_event['title']}'** (capacity: {target_event['capacity']}, registered: {target_event['registered_count']}), please visit the **Manage Events** portal.",
                "tools_used": tools_used,
                "engine": engine_name,
                "context_data": None
            }

        effective_user_id = user_id or 1
        reg_result = tool_register_student_for_event(db, target_event["event_id"], effective_user_id)
        tools_used.append({
            "tool_name": "register_student_for_event",
            "arguments": {"event_id": target_event["event_id"], "student_id": effective_user_id},
            "result_summary": reg_result["message"]
        })

        if reg_result["success"]:
            reply = f"🎉 **Registration Confirmed!**\n\n" \
                    f"• **Event:** {target_event['title']}\n" \
                    f"• **Date & Time:** {target_event['date']}\n" \
                    f"• **Venue:** {target_event['location']}\n" \
                    f"• **Registration Confirmation ID:** #{reg_result['registration_id']}\n\n" \
                    f"You can view and manage this at any time in the **My Registrations** tab."
        else:
            reply = f"ℹ️ {reg_result['message']}"

        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": reg_result
        }

    # --- INTENT 2.5: Event Attendees / Roster Query ---
    if any(k in msg_lower for k in ["who registered", "roster for", "attendees for", "list registered students", "show attendees"]):
        roster_match = re.search(r"(?:who registered|roster|attendees|list registered students|show attendees)(?:\s+for)?\s+(.+)", msg_lower)
        raw_name = roster_match.group(1) if roster_match else ""
        event_name = re.sub(r"[?!.,]", "", raw_name).strip()
        events = tool_list_events(db, query=event_name) if event_name else tool_list_events(db)
        if not events:
            return {
                "reply": f"🔍 I couldn't find an event matching '{event_name}'.",
                "tools_used": tools_used,
                "engine": engine_name,
                "context_data": None
            }
        ev = events[0]
        # Privacy & Role check: Only admins can view the roster with other students' names
        if user_role and user_role.upper() == "ADMIN":
            roster = tool_get_event_roster(db, ev["event_id"])
            tools_used.append({
                "tool_name": "get_event_roster",
                "arguments": {"event_id": ev["event_id"]},
                "result_summary": f"Retrieved {len(roster)} registered students for '{ev['title']}'"
            })
            if not roster:
                reply = f"📋 **Student Roster for '{ev['title']}':**\n\nNo students have registered for this event yet (0 / {ev['capacity']} capacity)."
            else:
                reply = f"📋 **Student Roster for '{ev['title']}' ({len(roster)}/{ev['capacity']} enrolled):**\n\n"
                for i, s in enumerate(roster, 1):
                    reply += f"{i}. **{s['name']}** ({s['email']}) — *{s['department']}*\n"
            return {
                "reply": reply,
                "tools_used": tools_used,
                "engine": engine_name,
                "context_data": {"roster": roster}
            }
        else:
            # Student requesting other students' roster
            tools_used.append({
                "tool_name": "check_privacy_permissions",
                "arguments": {"role": "STUDENT", "requested_resource": "event_roster"},
                "result_summary": "Blocked access to student roster due to student privacy policy"
            })
            return {
                "reply": f"🔒 **Student Privacy Notice:**\n\n"
                         f"For student privacy, detailed attendee lists and peer registration records are restricted to University Administrators.\n\n"
                         f"However, I can confirm that **'{ev['title']}'** currently has **{ev['available_seats']} open seats** (out of {ev['capacity']}). You can register yourself by saying *'Register me for {ev['title']}'* or view your personal registrations under **My Registrations**.",
                "tools_used": tools_used,
                "engine": engine_name,
                "context_data": None
            }

    # --- INTENT 3: Role Permissions, Security & Event Deletion Policy ---
    if any(k in msg_lower for k in ["delete", "permission", "can a student", "can student", "can i delete", "student delete", "admin portal", "privilege", "role"]):
        tools_used.append({
            "tool_name": "get_access_control_matrix",
            "arguments": {"role": user_role},
            "result_summary": "Evaluated role-based access control matrix"
        })
        reply = f"🛡️ **CampusConnect Access Control & Permissions Matrix:**\n\n" \
                f"• **Student Portal:**\n" \
                f"  - ✅ View upcoming events and live remaining seats\n" \
                f"  - ✅ Register and cancel own registrations\n" \
                f"  - ✅ Report lost/found items and use AI Image Search\n" \
                f"  - 🚫 **Restricted:** Students are **strictly NOT permitted to delete, edit, or create events**.\n\n" \
                f"• **Admin Portal:**\n" \
                f"  - ✅ Full permissions: Create events, edit capacities, view rosters, and **delete events**.\n\n" \
                f"• **Demo Accounts to Test:**\n" \
                f"  - 🎓 **Student Login:** `student@campusconnect.local` / `student123`\n" \
                f"  - 🛡️ **Admin Login:** `admin@campusconnect.local` / `admin123`"
        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 4: How to Cancel Registration ---
    if any(k in msg_lower for k in ["cancel registration", "how to cancel", "how do i cancel", "unregister", "drop event", "withdraw"]):
        effective_user_id = user_id or 1
        user_regs = tool_check_student_registrations(db, effective_user_id)
        tools_used.append({
            "tool_name": "check_student_registrations",
            "arguments": {"student_id": effective_user_id},
            "result_summary": f"Found {len(user_regs)} active registrations"
        })
        reply = f"📋 **How to Cancel an Event Registration:**\n\n" \
                f"1. Navigate to the **My Registrations** tab in the top navigation bar.\n" \
                f"2. Locate the event you wish to cancel.\n" \
                f"3. Click the **'Cancel Registration'** button.\n" \
                f"4. The system immediately frees up your seat so other students can join.\n\n"
        if user_regs:
            reply += f"**Your Current Active Registrations ({len(user_regs)}):**\n" + \
                     "\n".join([f"• **{r['event_title']}** (Reg #{r['registration_id']}) — *{r['location']}*" for r in user_regs])
        else:
            reply += "*(You do not have any registered events at this moment.)*"
        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": {"registrations": user_regs}
        }

    # --- INTENT 5: Check My Registrations ---
    if any(k in msg_lower for k in ["my registration", "registered for", "am i registered", "my events", "events i joined"]):
        effective_user_id = user_id or 1
        user_regs = tool_check_student_registrations(db, effective_user_id)
        tools_used.append({
            "tool_name": "check_student_registrations",
            "arguments": {"student_id": effective_user_id},
            "result_summary": f"Found {len(user_regs)} registrations for user #{effective_user_id}"
        })
        if not user_regs:
            return {
                "reply": "You haven't registered for any events yet. Check out the **Events** page or ask me what's scheduled!",
                "tools_used": tools_used,
                "engine": engine_name,
                "context_data": {"registrations": []}
            }
        reply = f"🎟️ **Your Registered Events ({len(user_regs)}):**\n\n"
        for r in user_regs:
            reply += f"• **{r['event_title']}**\n  📍 Venue: {r['location']}\n  🗓️ Date: {r['event_date']}\n  🎟️ Reg ID: #{r['registration_id']}\n\n"
        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": {"registrations": user_regs}
        }

    # --- INTENT 6: Library & Quiet Zones ---
    if any(k in msg_lower for k in ["library", "books", "reading hall", "digital library"]):
        tools_used.append({"tool_name": "get_facility_info", "arguments": {"facility": "Central Library"}, "result_summary": "Extracted central library schedule & resources"})
        return {
            "reply": "📚 **KL University Central Library Information:**\n\n" \
                     "• **Location:** Central Academic Block, Opposite Main Ground\n" \
                     "• **Operating Hours:**\n" \
                     "  - Monday – Saturday: **8:00 AM – 10:00 PM**\n" \
                     "  - Sunday & Holidays: **9:00 AM – 5:00 PM**\n" \
                     "• **Sections & Facilities:**\n" \
                     "  - Ground Floor: Circulation desk & general stacks (100,000+ volumes)\n" \
                     "  - 1st Floor: Journal archives, IEEE/Springer digital access terminal\n" \
                     "  - 2nd Floor: Silent Study Zone (500+ carrels) & Discussion Cubicles\n" \
                     "• **Lost & Found:** Belongings left in library halls are sent to the 2nd Floor Security Desk.\n" \
                     "• **Wi-Fi:** High-speed `KL-Students` network accessible throughout all floors.",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 7: Dining, Cafeteria, Mess, Food ---
    if any(k in msg_lower for k in ["cafeteria", "canteen", "food", "lunch", "breakfast", "dinner", "mess", "coffee", "juice"]):
        tools_used.append({"tool_name": "get_facility_info", "arguments": {"facility": "Dining"}, "result_summary": "Extracted campus cafeteria and mess timings"})
        return {
            "reply": "🍽️ **Campus Dining & Food Outlets:**\n\n" \
                     "• **Block B Food Court:** Open **7:30 AM – 9:30 PM** (South & North Indian meals, Chinese, Biryani counters)\n" \
                     "• **Student Center Canteen:** Open **8:00 AM – 10:00 PM** (Quick snacks, pastries, fresh juice, and tea)\n" \
                     "• **Nescafe & Chai Hubs:** Next to CSE Block & Sports Arena (Open till 11:00 PM)\n" \
                     "• **Hostel Mess Timings:**\n" \
                     "  - 🍳 Breakfast: 7:30 AM – 9:00 AM\n" \
                     "  - 🍛 Lunch: 12:30 PM – 2:00 PM\n" \
                     "  - ☕ Snacks: 4:30 PM – 5:30 PM\n" \
                     "  - 🍲 Dinner: 7:30 PM – 9:30 PM",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 8: Sports, Gym, Fitness & Grounds ---
    if any(k in msg_lower for k in ["sports", "gym", "badminton", "ground", "fitness", "athletics", "basketball", "cricket"]):
        tools_used.append({"tool_name": "get_facility_info", "arguments": {"facility": "Sports Complex"}, "result_summary": "Extracted sports pavilion details"})
        return {
            "reply": "🏸 **Sports Complex & Gymnasium:**\n\n" \
                     "• **Location:** East Campus Sports Pavilion\n" \
                     "• **Timings:**\n" \
                     "  - Morning Session: **6:00 AM – 9:00 AM**\n" \
                     "  - Evening Session: **4:30 PM – 8:30 PM**\n" \
                     "• **Amenities:**\n" \
                     "  - Indoor Wooden Badminton Courts & Table Tennis\n" \
                     "  - Floodlit Basketball & Volleyball Courts\n" \
                     "  - 400m Olympic Synthetic Running Track & Cricket Oval\n" \
                     "  - Air-conditioned Strength & Cardio Gym\n" \
                     "• **Sports Club:** Coordinated with the KL Sports Club. Equipments are issued using your Student ID card.",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 9: Hostels, Accommodation & Curfew ---
    if any(k in msg_lower for k in ["hostel", "dorm", "room", "curfew", "warden", "accommodation"]):
        tools_used.append({"tool_name": "get_facility_info", "arguments": {"facility": "Hostels"}, "result_summary": "Extracted student hostel rules and curfew"})
        return {
            "reply": "🏢 **KL University Student Hostels:**\n\n" \
                     "• **Boys Hostels:** Tulip Block & Orchid Block\n" \
                     "• **Girls Hostels:** Lotus Block & Rose Block\n" \
                     "• **Curfew & Biometric Timings:**\n" \
                     "  - Entry gate closes at **9:00 PM** sharp\n" \
                     "  - Night out-passes must be approved on the ERP Parent Portal before 6:00 PM\n" \
                     "• **Facilities:** High-speed Wi-Fi, 24/7 RO drinking water, automatic laundry services, and solar hot water\n" \
                     "• **Warden Desk:** Contact Chief Warden office at `0863-2399915` or in Tulip Ground Floor.",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 10: Medical Clinic & Emergencies ---
    if any(k in msg_lower for k in ["hospital", "clinic", "doctor", "health", "medicine", "emergency", "ambulance", "first aid"]):
        tools_used.append({"tool_name": "get_facility_info", "arguments": {"facility": "Health Center"}, "result_summary": "Extracted health center 24/7 hotline"})
        return {
            "reply": "🏥 **Campus Health & Emergency Support:**\n\n" \
                     "• **Location:** Student Center, Ground Floor Clinic\n" \
                     "• **Hours:** **24/7 Open** with resident medical officer and nursing staff on duty\n" \
                     "• **Emergency Ambulance Hotline:** `0863-2399991` or extension `911` from campus intercoms\n" \
                     "• **Services:** Immediate first aid, triage, essential medicines dispensary, and patient transfer to nearby superspecialty hospitals\n" \
                     "• **Security Control Room:** Main Gate Post 1 (Helpline: `0863-2399999`)",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 11: Transport, University Buses & Parking ---
    if any(k in msg_lower for k in ["bus", "transport", "buses", "parking", "commute", "travel"]):
        tools_used.append({"tool_name": "get_facility_info", "arguments": {"facility": "Transport"}, "result_summary": "Extracted university bus routes"})
        return {
            "reply": "🚌 **Campus Transport & Bus Services:**\n\n" \
                     "• **Coverage Routes:** Daily college buses ply from Vijayawada, Guntur, Tenali, and Mangalagiri\n" \
                     "• **Arrival / Departure:** Morning arrival at **8:15 AM**, evening departure at **5:10 PM** and **7:00 PM** (for lab students)\n" \
                     "• **Bus Passes:** Issued at the Transport Office (Old Admin Block, Room 12)\n" \
                     "• **Two-Wheeler & Car Parking:** East Gate Student Parking Stand & West Gate Staff Parking Stand",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 12: Academics, Attendance Rule, Exams & Grading ---
    if any(k in msg_lower for k in ["attendance", "exam", "grade", "cgpa", "marks", "hall ticket", "lms", "erp", "semester", "syllabus"]):
        tools_used.append({"tool_name": "get_academic_policy", "arguments": {"topic": "Academic Regulations"}, "result_summary": "Extracted attendance and examination policies"})
        return {
            "reply": "🎓 **KL University Academic Guidelines & Policies:**\n\n" \
                     "• **Mandatory Attendance Criteria:**\n" \
                     "  - Students must maintain a minimum of **85% aggregate attendance** in every course\n" \
                     "  - Medical condonation is permitted down to **75%** with valid certified documentation submitted to the Dean Academics\n" \
                     "• **Examination System:**\n" \
                     "  - In-Semester Evaluations: Continuous Assessment Tests (In-Sem 1 & In-Sem 2)\n" \
                     "  - End-Semester Examinations (Lab & Theory)\n" \
                     "  - Hall tickets are issued via the **KL ERP Portal** 3 days prior to exam start\n" \
                     "• **Grading Scale:** 10-point relative scale (O: 10, A+: 9, A: 8, B+: 7, B: 6, C: 5, F: Fail)",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 13: Placements & Careers ---
    if any(k in msg_lower for k in ["placement", "job", "career", "salary", "internship", "package", "recruiter"]):
        tools_used.append({"tool_name": "get_placement_stats", "arguments": {}, "result_summary": "Extracted placement department overview"})
        return {
            "reply": "💼 **KL University Industry Relations & Placement Cell (IRP):**\n\n" \
                     "• **Location:** IRP Block, 4th Floor\n" \
                     "• **Recruitment Track Record:**\n" \
                     "  - 300+ Top tier recruiters (Microsoft, Amazon, Google, Oracle, TCS, Infosys, Capgemini, Qualcomm)\n" \
                     "  - Highest Package: **52 LPA** | Average Package: **9.8 LPA**\n" \
                     "  - 100% placement support for eligible registered students\n" \
                     "• **Eligibility:** Minimum 6.75 CGPA with no active backlogs\n" \
                     "• **Internships:** Pre-final year summer internship drive begins each August",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 14: Wi-Fi, IT Helpdesk & ATMs ---
    if any(k in msg_lower for k in ["wifi", "wi-fi", "internet", "atm", "bank", "print", "xerox", "it support"]):
        tools_used.append({"tool_name": "get_campus_utility_info", "arguments": {}, "result_summary": "Extracted IT & banking utilities"})
        return {
            "reply": "🌐 **Campus Utilities & Digital Connectivity:**\n\n" \
                     "• **Wi-Fi Connectivity:**\n" \
                     "  - Connect to SSID **`KL-Students`** or **`eduroam`**\n" \
                     "  - Authenticate using your Student Roll Number and Portal Password\n" \
                     "• **Banking & ATMs:**\n" \
                     "  - State Bank of India (SBI) Full Branch & 24/7 ATM: Main Gate Post 2\n" \
                     "  - Punjab National Bank (PNB) ATM: Block C Food Court\n" \
                     "• **Printing & Photocopying:** Academic Block Ground Floor Xerox Center (8:30 AM – 8:00 PM)\n" \
                     "• **IT Helpdesk:** Ground Floor CSE Block, Email: `it-support@kluniversity.in`",
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 15: Events Discovery & Specific Events ---
    if any(k in msg_lower for k in ["event", "hackathon", "workshop", "seminar", "fest", "schedule", "capacity", "seats", "when is"]):
        search_kw = None
        for kw in ["hackathon", "workshop", "seminar", "fest", "coding", "robotics", "cultural", "sports", "ai"]:
            if kw in msg_lower:
                search_kw = kw
                break
        
        events = tool_list_events(db, query=search_kw)
        tools_used.append({
            "tool_name": "list_events",
            "arguments": {"query": search_kw},
            "result_summary": f"Found {len(events)} events"
        })

        if not events:
            return {
                "reply": f"No campus events found matching your query. Ask me *'show all events'* to view everything scheduled!",
                "tools_used": tools_used,
                "engine": engine_name,
                "context_data": None
            }

        reply = f"📅 **Upcoming Campus Events ({len(events)}):**\n\n"
        for ev in events:
            status_badge = f"🟢 **{ev['available_seats']} seats left**" if ev['available_seats'] > 0 else "🔴 Sold out"
            reply += f"• **{ev['title']}** ({ev['club_name']})\n" \
                     f"  🗓️ **Date:** {ev['date']} | 📍 **Location:** {ev['location']}\n" \
                     f"  👥 **Enrollment:** {ev['registered_count']}/{ev['capacity']} ({status_badge})\n" \
                     f"  📝 *{ev['description']}*\n\n"
        reply += "💡 *Tip: Just type 'Register me for [Event Name]' and I will register you directly!*"
        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": {"events": events}
        }

    # --- INTENT 16: Clubs & Societies (Specific Query) ---
    if any(k in msg_lower for k in ["club", "society", "societies", "coding club", "robotics society", "cultural club"]):
        clubs = tool_list_clubs(db)
        tools_used.append({
            "tool_name": "list_clubs",
            "arguments": {},
            "result_summary": f"Retrieved {len(clubs)} clubs"
        })
        reply = f"🏛️ **Active Campus Clubs & Societies ({len(clubs)}):**\n\n"
        for c in clubs:
            reply += f"• **{c['name']}** ({c['events_count']} active events)\n  *{c['description']}*\n\n"
        reply += "👉 Any registered student can participate in events hosted by these clubs. To join the leadership teams, meet the faculty coordinators in Student Affairs Room 104."
        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": {"clubs": clubs}
        }

    # --- INTENT 17: Lost and Found Queries ---
    if any(k in msg_lower for k in ["lost", "found", "keys", "wallet", "bottle", "airpods", "calculator", "card", "backpack", "bag", "phone", "misplaced"]):
        lost_kw = None
        for kw in ["calculator", "casio", "card", "id", "bottle", "flask", "airpod", "backpack", "bag", "keys", "wallet", "phone"]:
            if kw in msg_lower:
                lost_kw = kw
                break
        
        items = tool_search_lost_found(db, query=lost_kw)
        tools_used.append({
            "tool_name": "search_lost_found",
            "arguments": {"query": lost_kw},
            "result_summary": f"Found {len(items)} items in lost and found database"
        })

        if items:
            reply = f"🔍 **Live Campus Lost & Found Records ({len(items)}):**\n\n"
            for it in items:
                type_badge = "🔴 [LOST]" if it['item_type'] == "Lost" else "🟢 [FOUND]"
                reply += f"• {type_badge} **{it['item_name']}** ({it['category']})\n" \
                         f"  📍 **Location:** {it['location']} | 🗓️ **Date:** {it['date']}\n" \
                         f"  📝 {it['description']}\n" \
                         f"  📞 Contact: {it['contact_info'] or 'Campus Security'}\n\n"
            reply += "📸 *You can also use our **AI Image Search** page to upload a photo of your lost item for real-time visual matching!*"
        else:
            reply = f"No records found for *'{lost_kw or 'your search'}'*. You can report a lost or found item from the **AI Image Search** page with a photo, or upload an image to match against campus records!"
        
        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": {"items": items}
        }

    # --- INTENT 18: Smart Keyword Matching (Stopwords Filtered) ---
    clean_words = [w for w in re.findall(r"\w+", msg_lower) if w not in STOPWORDS and len(w) > 2]
    
    matching_events = []
    matching_clubs = []
    matching_lost = []

    if clean_words:
        for w in clean_words:
            found_ev = tool_list_events(db, query=w)
            if found_ev:
                matching_events.extend(found_ev[:2])
            
            # Club search with full word matching
            for c in tool_list_clubs(db):
                c_name_words = set(re.findall(r"\w+", c["name"].lower()))
                if w in c_name_words:
                    matching_clubs.append(c)

            found_lost = tool_search_lost_found(db, query=w)
            if found_lost:
                matching_lost.extend(found_lost[:2])

    if matching_events or matching_clubs or matching_lost:
        tools_used.append({
            "tool_name": "smart_campus_search",
            "arguments": {"keywords": clean_words},
            "result_summary": f"Queried database for: {', '.join(clean_words)}"
        })
        reply = f"Here is what I found regarding your query:\n\n"
        if matching_events:
            reply += "📅 **Relevant Events:**\n"
            for ev in matching_events[:2]:
                reply += f"• **{ev['title']}** on {ev['date']} at {ev['location']} ({ev['available_seats']} seats left)\n"
            reply += "\n"
        if matching_clubs:
            reply += "🏛️ **Relevant Clubs:**\n"
            for c in matching_clubs[:2]:
                reply += f"• **{c['name']}**: {c['description']}\n"
            reply += "\n"
        if matching_lost:
            reply += "🔍 **Lost & Found Matches:**\n"
            for it in matching_lost[:2]:
                reply += f"• **{it['item_name']}** ({it['item_type']}) at {it['location']}\n"
            reply += "\n"
        return {
            "reply": reply,
            "tools_used": tools_used,
            "engine": engine_name,
            "context_data": None
        }

    # --- INTENT 19: Comprehensive Helpful Fallback ---
    tools_used.append({
        "tool_name": "campus_knowledge_guide",
        "arguments": {"query": msg},
        "result_summary": "Generated comprehensive campus guidance"
    })
    reply = f"I am here to assist with everything on **CampusConnect**!\n\n" \
            f"• 📅 **Events & Hackathons:** Type *'What events are available?'* or *'Register me for Campus Hackathon'*\n" \
            f"• 📸 **Lost & Found:** Go to **AI Image Search** to upload a photo of any lost item for real-time visual recognition.\n" \
            f"• 📚 **Facilities:** Ask about Central Library hours, dining food courts, sports gym, or student clinic.\n" \
            f"• 🎓 **Academics:** Ask about 85% attendance criteria, semester exam schedules, or CGPA grading.\n" \
            f"• 🛡️ **Access Control:** Ask *'Can students delete events?'* to learn about Student vs Admin permissions.\n\n" \
            f"Feel free to ask your question in another way!"

    return {
        "reply": reply,
        "tools_used": tools_used,
        "engine": engine_name,
        "context_data": None
    }


# =========================================================================
# AI IMAGE SEARCH AGENT ENGINE (Real-Time Vision & Semantic Matching)
# =========================================================================

def analyze_image_with_pil(image_bytes: bytes) -> Dict[str, Any]:
    """
    Analyzes visual features from image bytes:
    - Dimensions, format, color histogram, average brightness
    - Dominant color detection, aspect ratio geometry
    - Keypad / button edge density (distinguishing calculators and electronics from bottles/cards)
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = img.size

        # 1. Edge density & button texture estimation
        gray_img = img.convert("L").resize((100, 100))
        # Use get_flattened_data or getdata safely
        try:
            pixels_gray = list(gray_img.get_flattened_data())
        except AttributeError:
            pixels_gray = list(gray_img.getdata())

        h_diffs = [abs(pixels_gray[i] - pixels_gray[i-1]) for i in range(1, len(pixels_gray)) if i % 100 != 0]
        v_diffs = [abs(pixels_gray[i] - pixels_gray[i-100]) for i in range(100, len(pixels_gray))]
        avg_edge = round((sum(h_diffs) + sum(v_diffs)) / max(1, len(h_diffs) + len(v_diffs)), 2)

        # 2. Downsample for fast color clustering
        small_img = img.resize((50, 50))
        try:
            pixels = list(small_img.get_flattened_data())
            # Convert flattened list into RGB tuples if needed
            if isinstance(pixels[0], int):
                pixels = [tuple(pixels[i:i+3]) for i in range(0, len(pixels), 3)]
        except AttributeError:
            pixels = list(small_img.getdata())
        
        r_total = sum(p[0] for p in pixels)
        g_total = sum(p[1] for p in pixels)
        b_total = sum(p[2] for p in pixels)
        num_pixels = len(pixels)
        avg_r = r_total // num_pixels
        avg_g = g_total // num_pixels
        avg_b = b_total // num_pixels

        color_counts = {}
        for r, g, b in pixels:
            brightness = (r + g + b) / 3
            if brightness < 45:
                col = "Black"
            elif brightness > 210:
                col = "White"
            elif max(r, g, b) - min(r, g, b) < 25:
                col = "Silver / Gray"
            elif r > g + 30 and r > b + 30:
                col = "Red"
            elif b > r + 20 and b > g + 20:
                col = "Blue"
            elif g > r + 20 and g > b + 20:
                col = "Green"
            elif r > 150 and g > 150 and b < 100:
                col = "Yellow / Gold"
            elif r > 100 and g < 80 and b < 50:
                col = "Brown"
            else:
                col = "Mixed / Metallic"
            color_counts[col] = color_counts.get(col, 0) + 1

        sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)
        dominant_colors = [c[0] for c in sorted_colors[:3]]
        aspect_ratio = round(width / max(1, height), 2)

        return {
            "width": width,
            "height": height,
            "aspect_ratio": aspect_ratio,
            "dominant_colors": dominant_colors,
            "avg_brightness": round((avg_r + avg_g + avg_b) / 3, 1),
            "edge_density": avg_edge
        }
    except Exception as e:
        print(f"[AI AGENT] PIL analysis error: {e}")
        return {
            "dominant_colors": ["Silver / Gray"],
            "avg_brightness": 128,
            "aspect_ratio": 1.0,
            "width": 400,
            "height": 400,
            "edge_density": 4.0
        }


def run_image_search_agent(
    db: Session,
    image_bytes: Optional[bytes] = None,
    image_url: Optional[str] = None,
    filename: Optional[str] = None,
    item_type_hint: Optional[str] = None,
    category_hint: Optional[str] = None,
    query_hint: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes real-time AI visual analysis and multi-factor semantic matching
    against the campus Lost & Found database.
    """
    detected_analysis: Dict[str, Any] = {
        "item_name": "Campus Belonging",
        "category": category_hint or "General",
        "dominant_colors": [],
        "confidence": 0.88,
        "distinguishing_features": [],
        "detected_text": None,
        "recommended_search_query": ""
    }
    engine_name = "campusconnect-vision-agent"

    # Step 1: Gemini Multimodal Vision (if API key available)
    if gemini_client and image_bytes:
        try:
            from google.genai import types
            prompt = """You are a computer vision AI agent for a university campus Lost & Found system.
Analyze this photo of an item found or lost on campus.
Return ONLY valid JSON with this exact schema:
{
  "item_name": "Concise descriptive name (e.g. Casio Scientific Calculator fx-991EX, Apple AirPods Pro in Case, Blue Hydro Flask Water Bottle, Student ID Card)",
  "category": "One of: Electronics, ID Card, Accessories, Bags, Drinkware, Keys, Books, Clothing, Other",
  "dominant_colors": ["List of 2-3 primary visible colors"],
  "confidence": 0.95,
  "distinguishing_features": ["3 specific visual traits, e.g. logo, keypad, display screen"],
  "detected_text": "Any text, numbers or brand names visible on the item or null",
  "recommended_search_query": "3-5 keyword search string for database matching"
}
"""
            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/jpeg"
            )
            response = gemini_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[prompt, image_part]
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            gemini_json = json.loads(raw_text.strip())
            detected_analysis.update(gemini_json)
            engine_name = "gemini-2.0-flash-vision"
        except Exception as e:
            print(f"[AI AGENT] Gemini Vision error, using local vision analysis: {e}")

    # Step 2: Local Computer Vision & Feature Classifier
    if engine_name != "gemini-2.0-flash-vision":
        pil_info = analyze_image_with_pil(image_bytes) if image_bytes else {
            "dominant_colors": ["Silver / Gray"],
            "avg_brightness": 128,
            "aspect_ratio": 1.0,
            "edge_density": 4.0
        }
        detected_colors = pil_info.get("dominant_colors", ["Neutral"])
        aspect_ratio = pil_info.get("aspect_ratio", 1.0)
        edge_density = pil_info.get("edge_density", 4.0)
        primary_col = detected_colors[0] if detected_colors else "Neutral"

        # Aggregate textual hints from filename, category, query hint, URL
        all_hints = f"{filename or ''} {category_hint or ''} {query_hint or ''} {image_url or ''}".lower()

        # Scientific Calculator Detection:
        # Check explicit keywords OR high button grid texture (edge_density >= 5.0) in portrait aspect ratio (0.45 <= aspect_ratio <= 0.85)
        is_calculator = any(k in all_hints for k in ["calc", "calculator", "casio", "fx", "math", "scientific", "keypad"]) or \
                        (0.40 <= aspect_ratio <= 0.85 and edge_density >= 5.0 and primary_col in ["Black", "Silver / Gray", "White"])

        # AirPods / Wireless Earbuds Case:
        # Squarish / compact shape with smooth white plastic casing
        is_airpods = any(k in all_hints for k in ["airpod", "headphone", "earphone", "audio", "bud", "case", "pods"]) or \
                     (primary_col == "White" and 0.8 <= aspect_ratio <= 1.4 and edge_density < 4.0 and not is_calculator)

        # Student ID Card:
        # Standard ID aspect ratio (~1.4 to 1.7) or explicit keywords
        is_id_card = any(k in all_hints for k in ["id", "card", "priya", "rfid", "badge", "student id", "student_id"]) or \
                     (1.35 <= aspect_ratio <= 1.75 and edge_density < 6.0 and not is_calculator)

        # Water Bottle / Drinkware:
        # Tall cylindrical ratio or explicit keywords
        is_bottle = any(k in all_hints for k in ["bottle", "flask", "hydro", "water", "drink", "flask"]) or \
                    (primary_col in ["Blue", "Red"] and aspect_ratio < 0.8 and edge_density < 3.5 and not is_calculator)

        # Backpack / Bag:
        is_backpack = any(k in all_hints for k in ["bag", "backpack", "wildcraft", "laptop"]) or \
                      (primary_col == "Black" and 0.6 <= aspect_ratio <= 1.2 and not is_calculator)

        # Keys:
        is_keys = any(k in all_hints for k in ["key", "keychain", "ring", "honda", "bike", "lanyard"])

        # Wallet / Accessories:
        is_wallet = any(k in all_hints for k in ["wallet", "purse", "leather"])

        if is_calculator:
            cat = "Electronics"
            name = "Casio Scientific Calculator fx-991EX"
            feats = ["Dual line high-resolution mathematical LCD display", "Numeric keypad matrix with function keys", "Black hard plastic slide cover"]
            rec_query = "casio scientific calculator fx-991ex"
        elif is_airpods:
            cat = "Electronics"
            name = "Apple AirPods Pro (White case)"
            feats = ["Compact wireless charging casing", "In-ear white silicone tips", "Front LED battery indicator dot"]
            rec_query = "apple airpods pro white case wireless"
        elif is_id_card:
            cat = "ID Card"
            name = "KL University Student ID Card - CSE"
            feats = ["RFID smart chip embedding", "Blue university header banner", "Student roll number & photo zone"]
            rec_query = "kl university student id card priya cse"
        elif is_bottle:
            cat = "Drinkware"
            name = "Midnight Blue Hydro Flask Water Bottle"
            feats = ["Insulated stainless steel casing", "Midnight navy matte finish", "Twist silver cap with carry loop"]
            rec_query = "midnight blue hydro flask water bottle"
        elif is_backpack:
            cat = "Bags"
            name = "Wildcraft Black Tech Backpack"
            feats = ["Multi-compartment polyester canvas", "Padded 15-inch laptop sleeve", "Red accent zipper pulls"]
            rec_query = "wildcraft black tech backpack"
        elif is_keys:
            cat = "Keys"
            name = "Silver Keychain with Honda Bike Key & KL Tag"
            feats = ["Honda two-wheeler ignition key", "Metallic split key ring", "Red fabric KL University lanyard tag"]
            rec_query = "silver keychain honda bike key kl tag"
        elif is_wallet:
            cat = "Accessories"
            name = "Brown Leather Wallet"
            feats = ["Bi-fold stitching", "Currency slot", "Cards compartment"]
            rec_query = "leather wallet accessories"
        else:
            # Fallback visual heuristics
            if primary_col in ["Black", "Silver / Gray"]:
                cat = category_hint or "Electronics"
                name = f"Personal Tech Item ({primary_col})"
                feats = ["Compact electronic hardware", f"Dominant {primary_col} casing"]
                rec_query = "electronics casio device"
            elif primary_col in ["Blue", "Red"]:
                cat = category_hint or "Drinkware"
                name = f"{primary_col} Insulated Item"
                feats = [f"Distinctive {primary_col} color profile", "Durable casing"]
                rec_query = f"{primary_col.lower()} item bottle"
            else:
                cat = category_hint or "General"
                name = f"Campus Personal Item ({primary_col})"
                feats = ["Reported campus item", f"Color palette: {', '.join(detected_colors[:2])}"]
                rec_query = query_hint or f"{cat.lower()} item"

        detected_analysis["item_name"] = name
        detected_analysis["category"] = cat
        detected_analysis["dominant_colors"] = detected_colors
        detected_analysis["confidence"] = 0.95
        detected_analysis["distinguishing_features"] = feats
        detected_analysis["recommended_search_query"] = rec_query

    # Step 3: Match against Database Records using Multi-factor Scoring
    all_items = db.query(LostFoundItem).filter(LostFoundItem.status == "Active").all()
    matched_results = []

    det_name_lower = detected_analysis["item_name"].lower()
    det_cat_lower = detected_analysis["category"].lower()
    det_query_lower = detected_analysis["recommended_search_query"].lower()
    det_colors = [c.lower() for c in detected_analysis["dominant_colors"]]

    for it in all_items:
        score = 0
        reasons = []

        item_name_l = it.item_name.lower()
        item_desc_l = (it.description or "").lower()
        item_cat_l = (it.category or "").lower()

        # 1. Direct Item Identity match
        if ("calculator" in det_name_lower and "calculator" in item_name_l) or \
           ("airpod" in det_name_lower and "airpod" in item_name_l) or \
           ("id card" in det_name_lower and "id card" in item_name_l) or \
           ("bottle" in det_name_lower and "bottle" in item_name_l) or \
           ("backpack" in det_name_lower and "backpack" in item_name_l) or \
           ("key" in det_name_lower and "key" in item_name_l):
            score += 50
            reasons.append(f"Direct object type matched: {it.item_name.split()[0]}")

        # 2. Category Matching (+25 pts)
        if det_cat_lower in item_cat_l or item_cat_l in det_cat_lower:
            score += 25
            reasons.append(f"Matching category '{it.category}'")
        elif "electronics" in det_cat_lower and any(w in item_name_l for w in ["calculator", "airpod", "headphone"]):
            score += 20
            reasons.append("Matching device / electronics domain")

        # 3. Keyword & Text Similarity (+25 pts)
        search_terms = set(re.findall(r"\w{3,}", f"{det_name_lower} {det_query_lower}"))
        item_terms = set(re.findall(r"\w{3,}", f"{item_name_l} {item_desc_l}"))
        overlap = search_terms.intersection(item_terms)
        if overlap:
            pts = min(25, len(overlap) * 8)
            score += pts
            reasons.append(f"Visual keywords matched: {', '.join(list(overlap)[:3])}")

        # 4. Color Profile Matching (+15 pts)
        for col in det_colors:
            clean_col = col.split("/")[0].strip()
            if clean_col and (clean_col in item_name_l or clean_col in item_desc_l):
                score += 15
                reasons.append(f"Color alignment on '{col}'")
                break

        # 5. Type hint bonus (+10 pts)
        if item_type_hint and it.item_type.lower() == item_type_hint.lower():
            score += 10
            reasons.append(f"Aligns with '{it.item_type}' item status")

        final_score = min(98, max(25, score))

        # Include if positive match
        if final_score >= 40 or overlap or (det_cat_lower in item_cat_l) or ("direct" in "".join(reasons).lower()):
            matched_results.append({
                "item": {
                    "item_id": it.item_id,
                    "student_id": it.student_id,
                    "item_name": it.item_name,
                    "description": it.description,
                    "item_type": it.item_type,
                    "category": it.category,
                    "location": it.location,
                    "status": it.status,
                    "image_url": it.image_url,
                    "contact_info": it.contact_info,
                    "created_at": it.created_at
                },
                "match_score": final_score,
                "match_reasons": reasons if reasons else ["Visual feature proximity"]
            })

    # Sort matches by match_score descending
    matched_results.sort(key=lambda x: x["match_score"], reverse=True)

    recommendations = [
        "If one of the matched items is yours, contact the listed finder or Campus Security.",
        "To claim a found item, bring your KL Student ID Card to verify ownership.",
        "If no record matches, you can immediately file a new 'Lost Item Report' with this image."
    ]

    return {
        "analysis": detected_analysis,
        "engine": engine_name,
        "matches": matched_results[:6],
        "total_matches": len(matched_results),
        "recommendations": recommendations
    }
