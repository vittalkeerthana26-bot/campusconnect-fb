from datetime import datetime
from typing import List, Optional
import base64
from fastapi import FastAPI, Depends, HTTPException, status, Query, APIRouter, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import get_db
from models import User, Club, Event, EventRegistration, LostFoundItem, Complaint
from schemas import (
    UserResponse,
    ClubCreate,
    ClubUpdate,
    ClubResponse,
    EventCreate,
    EventUpdate,
    EventResponse,
    RegistrationCreate,
    RegistrationResponse,
    MessageResponse,
    DashboardStats,
    HealthResponse,
    LoginRequest,
    RegisterRequest,
    LoginResponse,
    LostFoundCreate,
    LostFoundUpdate,
    LostFoundResponse,
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintResponse,
    ChatRequest,
    ChatResponse,
    ImageSearchRequest,
    ImageSearchResponse
)
from ai_agent import run_campus_chat_agent, run_image_search_agent, gemini_client

app = FastAPI(
    title="CampusConnect API",
    description="Backend API for CampusConnect with AI Agent Chatbot, AI Image Search, and Role-Based Portals",
    version="2.0.0"
)

# Enable CORS for React frontend (Vite defaults to 5173, Create-React-App to 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")


# ---------------- Helper Functions & Auth Dependencies ----------------

def format_event_response(event: Event, db: Session) -> dict:
    reg_count = db.query(func.count(EventRegistration.registration_id)).filter(
        EventRegistration.event_id == event.event_id
    ).scalar() or 0
    available = max(0, event.capacity - reg_count)

    club_info = None
    if event.club:
        club_info = {
            "club_id": event.club.club_id,
            "name": event.club.name
        }

    return {
        "event_id": event.event_id,
        "club_id": event.club_id,
        "title": event.title,
        "description": event.description,
        "event_date": event.event_date,
        "location": event.location,
        "capacity": event.capacity,
        "created_at": event.created_at,
        "registered_count": reg_count,
        "available_seats": available,
        "club": club_info
    }


def get_current_user_context(
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    db: Session = Depends(get_db)
) -> User:
    """Resolve current user based on headers or fallback to student."""
    if x_user_id:
        u = db.query(User).filter(User.id == x_user_id).first()
        if u:
            return u
    if x_user_role:
        role_u = db.query(User).filter(User.role == x_user_role.upper()).first()
        if role_u:
            return role_u
    # Fallback to demo student
    default_u = db.query(User).filter(User.role == "STUDENT").first()
    if default_u:
        return default_u
    return db.query(User).first()


def verify_admin_or_coordinator_role(
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    db: Session = Depends(get_db)
) -> User:
    """Ensure user is an ADMIN or COORDINATOR. Students are forbidden."""
    user = get_current_user_context(x_user_id, x_user_role, db)
    if not user or user.role.upper() not in ["ADMIN", "COORDINATOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: Students are not permitted to create or modify campus events. Admin/Coordinator credentials required."
        )
    return user


def verify_admin_role_only(
    x_user_id: Optional[int] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    db: Session = Depends(get_db)
) -> User:
    """Ensure user is strictly an ADMIN. Students and coordinators cannot delete events."""
    user = get_current_user_context(x_user_id, x_user_role, db)
    if not user or user.role.upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: Students and unauthorized users cannot delete events. Administrator privileges are required."
        )
    return user


# ---------------- Health Check ----------------
@app.get("/health", response_model=HealthResponse, tags=["Health"])
@api_router.get("/health", response_model=HealthResponse, tags=["Health"])
def check_health():
    """Health check endpoint to confirm backend and AI service status."""
    ai_status = "Google Gemini 2.0 active" if gemini_client else "Autonomous Campus Agent Engine active"
    return HealthResponse(
        status="healthy",
        message="CampusConnect backend and AI systems are up and running",
        ai_status=ai_status
    )


# ---------------- Authentication Endpoints ----------------
@api_router.post("/auth/login", response_model=LoginResponse, tags=["Auth"])
def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate demo or real user with separate credentials for Student and Admin portals.
    Demo credentials:
    - Student: student@campusconnect.local / student123
    - Admin: admin@campusconnect.local / admin123
    """
    email_clean = login_data.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"No account found with email '{login_data.email}'"
        )

    # Password check (supports stored password or standard demo defaults)
    valid_password = (user.password == login_data.password) or \
                     (user.role == "STUDENT" and login_data.password == "student123") or \
                     (user.role == "ADMIN" and login_data.password == "admin123")

    if not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password. For demo users use student123 or admin123."
        )

    # Portal validation
    if login_data.portal == "ADMIN" and user.role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Student credentials cannot access the Admin Portal. Please use the Student Portal."
        )

    portal_name = "Admin Portal" if user.role in ["ADMIN", "COORDINATOR"] else "Student Portal"
    token = f"demo-token-{user.id}-{user.role.lower()}"

    return LoginResponse(
        token=token,
        user=user,
        portal=portal_name,
        message=f"Logged in successfully to {portal_name} as {user.name}"
    )


@api_router.post("/auth/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def register_user(reg_data: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new student, coordinator, or administrator into the PostgreSQL database.
    """
    clean_email = reg_data.email.strip().lower()
    existing_user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{reg_data.email}' already exists. Please sign in instead."
        )

    role_clean = reg_data.role.upper()
    if role_clean not in ["STUDENT", "COORDINATOR", "ADMIN"]:
        role_clean = "STUDENT"

    year_val = 1
    if reg_data.year is not None:
        try:
            if isinstance(reg_data.year, int):
                year_val = reg_data.year
            else:
                digits = "".join([c for c in str(reg_data.year) if c.isdigit()])
                year_val = int(digits) if digits else 1
        except Exception:
            year_val = 1

    new_user = User(
        name=reg_data.name.strip(),
        email=clean_email,
        password=reg_data.password,
        department=reg_data.department or "Computer Science",
        year=year_val,
        role=role_clean
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    portal_name = "Admin Portal" if new_user.role in ["ADMIN", "COORDINATOR"] else "Student Portal"
    token = f"demo-token-{new_user.id}-{new_user.role.lower()}"

    return LoginResponse(
        token=token,
        user=new_user,
        portal=portal_name,
        message=f"Account created successfully! Welcome to CampusConnect, {new_user.name}."
    )


@api_router.get("/auth/me", response_model=UserResponse, tags=["Auth"])

def get_current_user_profile(user: User = Depends(get_current_user_context)):
    """Retrieve currently active user."""
    return user


# ---------------- User Endpoints ----------------
@api_router.get("/users", response_model=List[UserResponse], tags=["Users"])
def get_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve all users, optionally filtered by role."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role.upper())
    return query.order_by(User.id.asc()).all()


@api_router.get("/users/{user_id}", response_model=UserResponse, tags=["Users"])
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Retrieve a single user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return user


# ---------------- Club Endpoints ----------------
@api_router.get("/clubs", response_model=List[ClubResponse], tags=["Clubs"])
def get_clubs(db: Session = Depends(get_db)):
    """Retrieve all clubs with the count of associated events."""
    clubs = db.query(Club).order_by(Club.name.asc()).all()
    results = []
    for club in clubs:
        events_count = db.query(func.count(Event.event_id)).filter(Event.club_id == club.club_id).scalar() or 0
        results.append({
            "club_id": club.club_id,
            "name": club.name,
            "description": club.description,
            "created_at": club.created_at,
            "events_count": events_count
        })
    return results


@api_router.get("/clubs/{club_id}", response_model=ClubResponse, tags=["Clubs"])
def get_club(club_id: int, db: Session = Depends(get_db)):
    """Retrieve a single club by ID with its event count."""
    club = db.query(Club).filter(Club.club_id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID {club_id} not found"
        )
    events_count = db.query(func.count(Event.event_id)).filter(Event.club_id == club.club_id).scalar() or 0
    return {
        "club_id": club.club_id,
        "name": club.name,
        "description": club.description,
        "created_at": club.created_at,
        "events_count": events_count
    }


@api_router.post("/clubs", response_model=ClubResponse, status_code=status.HTTP_201_CREATED, tags=["Clubs"])
def create_club(
    club_data: ClubCreate, 
    _admin: User = Depends(verify_admin_role_only),
    db: Session = Depends(get_db)
):
    """Create a new club (Admin only)."""
    existing = db.query(Club).filter(Club.name.ilike(club_data.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A club named '{club_data.name}' already exists"
        )
    new_club = Club(
        name=club_data.name.strip(),
        description=club_data.description
    )
    db.add(new_club)
    db.commit()
    db.refresh(new_club)
    return {
        "club_id": new_club.club_id,
        "name": new_club.name,
        "description": new_club.description,
        "created_at": new_club.created_at,
        "events_count": 0
    }


@api_router.put("/clubs/{club_id}", response_model=ClubResponse, tags=["Clubs"])
def update_club(
    club_id: int, 
    club_data: ClubUpdate, 
    _admin: User = Depends(verify_admin_role_only),
    db: Session = Depends(get_db)
):
    """Update an existing club (Admin only)."""
    club = db.query(Club).filter(Club.club_id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID {club_id} not found"
        )
    if club_data.name is not None:
        trimmed = club_data.name.strip()
        existing = db.query(Club).filter(Club.name.ilike(trimmed), Club.club_id != club_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A club named '{trimmed}' already exists"
            )
        club.name = trimmed
    if club_data.description is not None:
        club.description = club_data.description

    db.commit()
    db.refresh(club)
    events_count = db.query(func.count(Event.event_id)).filter(Event.club_id == club.club_id).scalar() or 0
    return {
        "club_id": club.club_id,
        "name": club.name,
        "description": club.description,
        "created_at": club.created_at,
        "events_count": events_count
    }


@api_router.delete("/clubs/{club_id}", response_model=MessageResponse, tags=["Clubs"])
def delete_club(
    club_id: int, 
    _admin: User = Depends(verify_admin_role_only),
    db: Session = Depends(get_db)
):
    """Delete a club and cascade delete associated events (Admin only)."""
    club = db.query(Club).filter(Club.club_id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Club with ID {club_id} not found"
        )
    db.delete(club)
    db.commit()
    return {"message": f"Club '{club.name}' and associated events successfully deleted"}


# ---------------- Event Endpoints ----------------
@api_router.get("/events", response_model=List[EventResponse], tags=["Events"])
@app.get("/events", response_model=List[EventResponse], tags=["Events"])
def get_events(
    club_id: Optional[int] = Query(None, description="Filter by Club ID"),
    search: Optional[str] = Query(None, description="Search by title, description or location"),
    db: Session = Depends(get_db)
):
    """Retrieve events with live available seats calculation and club summary."""
    query = db.query(Event)
    if club_id:
        query = query.filter(Event.club_id == club_id)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Event.title.ilike(search_pattern),
                Event.description.ilike(search_pattern),
                Event.location.ilike(search_pattern)
            )
        )
    events = query.order_by(Event.event_date.asc()).all()
    return [format_event_response(ev, db) for ev in events]


@api_router.get("/events/{event_id}", response_model=EventResponse, tags=["Events"])
@app.get("/events/{event_id}", response_model=EventResponse, tags=["Events"])
def get_event(event_id: int, db: Session = Depends(get_db)):
    """Retrieve a single event by event_id with live registration counts."""
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found"
        )
    return format_event_response(event, db)


@api_router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED, tags=["Events"])
def create_event(
    event_data: EventCreate, 
    _auth_user: User = Depends(verify_admin_or_coordinator_role),
    db: Session = Depends(get_db)
):
    """Create a new event (Restricted to Admin / Coordinator. Students forbidden)."""
    club = db.query(Club).filter(Club.club_id == event_data.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Club with ID {event_data.club_id} does not exist"
        )

    if event_data.capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Capacity must be greater than 0"
        )

    event_dt = event_data.event_date.replace(tzinfo=None) if event_data.event_date.tzinfo else event_data.event_date

    new_event = Event(
        title=event_data.title.strip(),
        description=event_data.description.strip() if event_data.description else "",
        event_date=event_dt,
        location=event_data.location.strip() if event_data.location else "",
        capacity=event_data.capacity,
        club_id=event_data.club_id
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return format_event_response(new_event, db)


@api_router.put("/events/{event_id}", response_model=EventResponse, tags=["Events"])
def update_event(
    event_id: int, 
    event_data: EventUpdate, 
    _auth_user: User = Depends(verify_admin_or_coordinator_role),
    db: Session = Depends(get_db)
):
    """Update an existing event (Restricted to Admin / Coordinator. Students forbidden)."""
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found"
        )

    if event_data.club_id is not None:
        club = db.query(Club).filter(Club.club_id == event_data.club_id).first()
        if not club:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Club with ID {event_data.club_id} does not exist"
            )
        event.club_id = event_data.club_id

    if event_data.title is not None:
        event.title = event_data.title.strip()
    if event_data.description is not None:
        event.description = event_data.description.strip()
    if event_data.event_date is not None:
        event.event_date = event_data.event_date.replace(tzinfo=None) if event_data.event_date.tzinfo else event_data.event_date
    if event_data.location is not None:
        event.location = event_data.location.strip()
    if event_data.capacity is not None:
        if event_data.capacity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Capacity must be greater than 0"
            )
        event.capacity = event_data.capacity

    db.commit()
    db.refresh(event)
    return format_event_response(event, db)


@api_router.delete("/events/{event_id}", response_model=MessageResponse, tags=["Events"])
def delete_event(
    event_id: int, 
    _admin_user: User = Depends(verify_admin_role_only),
    db: Session = Depends(get_db)
):
    """
    Delete an event and its registrations.
    STRICT PERMISSION: Students are explicitly denied access. Only ADMIN can delete events.
    """
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found"
        )
    db.delete(event)
    db.commit()
    return {"message": f"Event '{event.title}' successfully deleted"}


# ---------------- Registration Endpoints ----------------
@api_router.post("/events/{event_id}/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, tags=["Registrations"])
def register_for_event(
    event_id: int, 
    data: RegistrationCreate, 
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Register a student for an event."""
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found"
        )

    student = db.query(User).filter(User.id == data.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {data.student_id} not found"
        )

    if student.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: Only students can register for campus events. Administrators cannot register as event attendees."
        )

    # Privacy check: Students cannot register on behalf of other students
    if x_user_role != "ADMIN" and x_user_id and str(data.student_id) != str(x_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: You can only register yourself for campus events."
        )

    existing_reg = db.query(EventRegistration).filter(
        EventRegistration.student_id == data.student_id,
        EventRegistration.event_id == event_id
    ).first()
    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already registered for this event"
        )

    current_count = db.query(func.count(EventRegistration.registration_id)).filter(
        EventRegistration.event_id == event_id
    ).scalar() or 0
    if current_count >= event.capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is already at full capacity"
        )

    new_reg = EventRegistration(event_id=event_id, student_id=data.student_id)
    db.add(new_reg)
    db.commit()
    db.refresh(new_reg)

    return {
        "message": "Successfully registered for event",
        "registration_id": new_reg.registration_id
    }


@api_router.delete("/registrations/{registration_id}", response_model=MessageResponse, tags=["Registrations"])
def cancel_registration(
    registration_id: int, 
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Cancel an existing registration."""
    reg = db.query(EventRegistration).filter(EventRegistration.registration_id == registration_id).first()
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration #{registration_id} not found"
        )

    # Privacy: only administrator or the registered student can cancel
    if x_user_role != "ADMIN" and x_user_id and str(reg.student_id) != str(x_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: You can only cancel your own registrations unless you are an Administrator."
        )

    db.delete(reg)
    db.commit()
    return {"message": "Registration successfully cancelled"}


@api_router.get("/events/{event_id}/registrations", response_model=List[RegistrationResponse], tags=["Registrations"])
def get_event_registrations(
    event_id: int, 
    _auth_user: User = Depends(verify_admin_or_coordinator_role),
    db: Session = Depends(get_db)
):
    """Retrieve all students registered for an event (Admin / Coordinator only)."""
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found"
        )

    regs = db.query(EventRegistration).filter(EventRegistration.event_id == event_id).order_by(EventRegistration.registered_at.desc()).all()
    results = []
    for r in regs:
        results.append({
            "registration_id": r.registration_id,
            "event_id": r.event_id,
            "student_id": r.student_id,
            "registered_at": r.registered_at,
            "student": r.student,
            "event": format_event_response(event, db)
        })
    return results


@api_router.get("/users/{user_id}/registrations", response_model=List[RegistrationResponse], tags=["Registrations"])
def get_user_registrations(
    user_id: int, 
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Retrieve all event registrations for a given user with privacy protection."""
    # Privacy check: students can only access their own registrations
    if x_user_role != "ADMIN" and x_user_id and str(user_id) != str(x_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: Students are not permitted to access other students' personal registration records."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )

    regs = db.query(EventRegistration).filter(EventRegistration.student_id == user_id).order_by(EventRegistration.registered_at.desc()).all()
    results = []
    for r in regs:
        ev = db.query(Event).filter(Event.event_id == r.event_id).first()
        results.append({
            "registration_id": r.registration_id,
            "event_id": r.event_id,
            "student_id": r.student_id,
            "registered_at": r.registered_at,
            "student": user,
            "event": format_event_response(ev, db) if ev else None
        })
    return results


# ---------------- Lost & Found Endpoints ----------------
@api_router.get("/lost-found", response_model=List[LostFoundResponse], tags=["Lost & Found"])
def get_lost_found_items(
    item_type: Optional[str] = Query(None, description="Filter by 'Lost' or 'Found'"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search item name or description"),
    status: Optional[str] = Query("Active", description="Filter by status"),
    db: Session = Depends(get_db)
):
    """Retrieve all Lost & Found items."""
    query = db.query(LostFoundItem)
    if status and status != "All":
        query = query.filter(LostFoundItem.status == status)
    if item_type and item_type != "All":
        query = query.filter(LostFoundItem.item_type == item_type)
    if category and category != "All":
        query = query.filter(LostFoundItem.category == category)
    if search:
        p = f"%{search}%"
        query = query.filter(or_(
            LostFoundItem.item_name.ilike(p),
            LostFoundItem.description.ilike(p),
            LostFoundItem.location.ilike(p)
        ))
    return query.order_by(LostFoundItem.created_at.desc()).all()


@api_router.post("/lost-found", response_model=LostFoundResponse, status_code=status.HTTP_201_CREATED, tags=["Lost & Found"])
def report_lost_found_item(data: LostFoundCreate, db: Session = Depends(get_db)):
    """Report a new Lost or Found campus item."""
    item = LostFoundItem(
        student_id=data.student_id,
        item_name=data.item_name.strip(),
        description=data.description,
        item_type=data.item_type,
        category=data.category or "General",
        location=data.location,
        status="Active",
        image_url=data.image_url,
        contact_info=data.contact_info
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@api_router.put("/lost-found/{item_id}", response_model=LostFoundResponse, tags=["Lost & Found"])
def update_lost_found_item(item_id: int, data: LostFoundUpdate, db: Session = Depends(get_db)):
    """Update status of a Lost/Found item (e.g., mark as Claimed or Resolved)."""
    item = db.query(LostFoundItem).filter(LostFoundItem.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lost & Found item not found")
    if data.item_name is not None:
        item.item_name = data.item_name
    if data.description is not None:
        item.description = data.description
    if data.item_type is not None:
        item.item_type = data.item_type
    if data.category is not None:
        item.category = data.category
    if data.location is not None:
        item.location = data.location
    if data.status is not None:
        item.status = data.status
    if data.image_url is not None:
        item.image_url = data.image_url
    if data.contact_info is not None:
        item.contact_info = data.contact_info
    db.commit()
    db.refresh(item)
    return item


@api_router.delete("/lost-found/{item_id}", response_model=MessageResponse, tags=["Lost & Found"])
def delete_lost_found_item(
    item_id: int, 
    _admin: User = Depends(verify_admin_role_only),
    db: Session = Depends(get_db)
):
    """Delete a Lost & Found record (Admin only)."""
    item = db.query(LostFoundItem).filter(LostFoundItem.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Lost & Found record successfully removed"}


# ---------------- COMPLAINTS ENDPOINTS ----------------

def format_complaint_response(complaint: Complaint) -> dict:
    return {
        "complaint_id": complaint.complaint_id,
        "student_id": complaint.student_id,
        "title": complaint.title,
        "description": complaint.description,
        "category": complaint.category or "General",
        "priority": complaint.priority or "Medium",
        "status": complaint.status or "Pending",
        "admin_response": complaint.admin_response,
        "created_at": complaint.created_at,
        "updated_at": complaint.updated_at,
        "student_name": complaint.student.name if complaint.student else "Student",
        "student_email": complaint.student.email if complaint.student else None,
        "student_department": complaint.student.department if complaint.student else None,
    }


@api_router.get("/complaints", response_model=List[ComplaintResponse], tags=["Complaints"])
def get_complaints(
    status: Optional[str] = Query(None, description="Filter by status (e.g. Pending, In Progress, Resolved)"),
    category: Optional[str] = Query(None, description="Filter by category (e.g. Hostel, Academics, Infrastructure)"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    search: Optional[str] = Query(None, description="Search keyword in title or description"),
    db: Session = Depends(get_db)
):
    """Retrieve all student complaints with filtering support."""
    query = db.query(Complaint)
    if status and status != "All":
        query = query.filter(Complaint.status == status)
    if category and category != "All":
        query = query.filter(Complaint.category == category)
    if priority and priority != "All":
        query = query.filter(Complaint.priority == priority)
    if student_id:
        query = query.filter(Complaint.student_id == student_id)
    if search:
        p = f"%{search}%"
        query = query.filter(or_(
            Complaint.title.ilike(p),
            Complaint.description.ilike(p),
            Complaint.category.ilike(p)
        ))
    complaints = query.order_by(Complaint.created_at.desc()).all()
    return [format_complaint_response(c) for c in complaints]


@api_router.post("/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED, tags=["Complaints"])
def file_complaint(
    data: ComplaintCreate,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """File a new student complaint/grievance."""
    student_id = data.student_id
    if not student_id and x_user_id:
        try:
            student_id = int(x_user_id)
        except ValueError:
            pass

    if not student_id:
        # Fallback to first student if unauthenticated demo user
        demo_student = db.query(User).filter(User.role == "STUDENT").first()
        student_id = demo_student.id if demo_student else 1

    complaint = Complaint(
        student_id=student_id,
        title=data.title.strip(),
        description=data.description.strip(),
        category=data.category or "General",
        priority=data.priority or "Medium",
        status="Pending"
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return format_complaint_response(complaint)


@api_router.get("/complaints/{complaint_id}", response_model=ComplaintResponse, tags=["Complaints"])
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a single complaint."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint record not found")
    return format_complaint_response(complaint)


@api_router.put("/complaints/{complaint_id}", response_model=ComplaintResponse, tags=["Complaints"])
def update_complaint(
    complaint_id: int,
    data: ComplaintUpdate,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Update complaint details or status.
    - ONLY Administrators can change status (e.g. mark as Resolved/In Progress/Rejected) or write official responses.
    - Students can only edit their own title, description, category, and priority.
    """
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    is_admin = (x_user_role == "ADMIN")

    # Strict Role Security: Only Admins can change status or write official responses
    if data.status is not None and data.status != complaint.status:
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission Denied: Students cannot mark complaints as solved or change ticket status. Only Administrators are authorized to update complaint statuses."
            )
        complaint.status = data.status
        complaint.updated_at = datetime.utcnow()

    if data.admin_response is not None:
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission Denied: Only Administrators can provide official administrative responses."
            )
        complaint.admin_response = data.admin_response.strip()
        complaint.updated_at = datetime.utcnow()

    # Content updates (title, description, category, priority)
    if any(field is not None for field in [data.title, data.description, data.category, data.priority]):
        if not is_admin and x_user_id and str(complaint.student_id) != str(x_user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission Denied: You cannot modify complaints filed by another student."
            )

        if data.title is not None:
            complaint.title = data.title.strip()
        if data.description is not None:
            complaint.description = data.description.strip()
        if data.category is not None:
            complaint.category = data.category
        if data.priority is not None:
            complaint.priority = data.priority
        complaint.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(complaint)
    return format_complaint_response(complaint)



@api_router.delete("/complaints/{complaint_id}", response_model=MessageResponse, tags=["Complaints"])
def delete_complaint(
    complaint_id: int,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Delete a complaint record."""
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Only admins or the filing student can delete
    if x_user_role != "ADMIN" and x_user_id and str(complaint.student_id) != str(x_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: You can only delete your own complaints unless you are an Administrator."
        )

    db.delete(complaint)
    db.commit()
    return {"message": "Complaint successfully removed"}


# ---------------- AI AGENT ENDPOINTS ----------------


@api_router.post("/ai/chat", response_model=ChatResponse, tags=["AI Agent"])
@app.post("/ai/chat", response_model=ChatResponse, tags=["AI Agent"])
def chat_with_campus_agent(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Chat with the real CampusConnect AI Agent.
    Interacts with live events, clubs, remaining capacities, and student registrations.
    """
    res = run_campus_chat_agent(
        db=db,
        message=req.message,
        history=req.history or [],
        user_id=req.user_id,
        user_role=req.role or "STUDENT"
    )
    return ChatResponse(
        reply=res["reply"],
        tools_used=res["tools_used"],
        engine=res["engine"],
        context_data=res.get("context_data")
    )


@api_router.post("/ai/image-search", response_model=ImageSearchResponse, tags=["AI Agent"])
@app.post("/ai/image-search", response_model=ImageSearchResponse, tags=["AI Agent"])
async def ai_image_search_json(
    req: ImageSearchRequest,
    db: Session = Depends(get_db)
):
    """AI Visual Search via image URL or base64 data."""
    img_bytes = None
    if req.image_base64:
        try:
            base64_data = req.image_base64.split(",")[-1]
            img_bytes = base64.b64decode(base64_data)
        except Exception:
            pass

    results = run_image_search_agent(
        db=db,
        image_bytes=img_bytes,
        image_url=req.image_url,
        item_type_hint=req.item_type_hint,
        category_hint=req.category_hint
    )

    return ImageSearchResponse(
        analysis=results["analysis"],
        engine=results["engine"],
        matches=results["matches"],
        total_matches=results["total_matches"],
        recommendations=results["recommendations"]
    )


@api_router.post("/ai/image-upload-search", response_model=ImageSearchResponse, tags=["AI Agent"])
@app.post("/ai/image-upload-search", response_model=ImageSearchResponse, tags=["AI Agent"])
async def ai_image_search_file(
    file: UploadFile = File(...),
    item_type: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    query: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """AI Visual Search via direct multipart image file upload with real-time matching and validation."""
    img_bytes = await file.read()
    if not img_bytes or len(img_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(img_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image exceeds 10MB size limit.")

    # Validate image format
    allowed_content_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/jpg"]
    if file.content_type and file.content_type.lower() not in allowed_content_types and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Please upload an image file (JPEG, PNG, WEBP)."
        )

    try:
        from PIL import Image
        import io
        test_img = Image.open(io.BytesIO(img_bytes))
        test_img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image file. Please upload a valid image."
        )

    results = run_image_search_agent(
        db=db,
        image_bytes=img_bytes,
        filename=file.filename,
        item_type_hint=item_type,
        category_hint=category,
        query_hint=query
    )

    return ImageSearchResponse(
        analysis=results["analysis"],
        engine=results["engine"],
        matches=results["matches"],
        total_matches=results["total_matches"],
        recommendations=results["recommendations"]
    )



# ---------------- Dashboard Stats Endpoint ----------------
@api_router.get("/dashboard/stats", response_model=DashboardStats, tags=["Dashboard"])
def get_dashboard_stats(user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Get summarized statistics for the Dashboard."""
    total_clubs = db.query(func.count(Club.club_id)).scalar() or 0
    all_events = db.query(Event).all()
    upcoming_events = len(all_events)

    available_events = 0
    for ev in all_events:
        reg_count = db.query(func.count(EventRegistration.registration_id)).filter(
            EventRegistration.event_id == ev.event_id
        ).scalar() or 0
        if ev.capacity > reg_count:
            available_events += 1

    my_registrations = 0
    if user_id:
        my_registrations = db.query(func.count(EventRegistration.registration_id)).filter(
            EventRegistration.student_id == user_id
        ).scalar() or 0

    total_registrations = db.query(func.count(EventRegistration.registration_id)).scalar() or 0

    lost_count = db.query(func.count(LostFoundItem.item_id)).filter(
        LostFoundItem.item_type == "Lost",
        LostFoundItem.status == "Active"
    ).scalar() or 0

    found_count = db.query(func.count(LostFoundItem.item_id)).filter(
        LostFoundItem.item_type == "Found",
        LostFoundItem.status == "Active"
    ).scalar() or 0

    total_complaints = db.query(func.count(Complaint.complaint_id)).scalar() or 0
    pending_complaints = db.query(func.count(Complaint.complaint_id)).filter(
        Complaint.status == "Pending"
    ).scalar() or 0

    return {
        "total_clubs": total_clubs,
        "upcoming_events": upcoming_events,
        "my_registrations": my_registrations,
        "total_registrations": total_registrations,
        "available_events": available_events,
        "lost_items_count": lost_count,
        "found_items_count": found_count,
        "total_complaints": total_complaints,
        "pending_complaints": pending_complaints
    }



# Include the API router
app.include_router(api_router)
