from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, ConfigDict, Field


# ---------------- User Schemas ----------------
class UserBase(BaseModel):
    name: str
    email: str
    department: Optional[str] = None
    year: Optional[int] = None
    role: str = "STUDENT"


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None


# ---------------- Club Schemas ----------------
class ClubBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class ClubCreate(ClubBase):
    pass


class ClubUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class ClubSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    club_id: int
    name: str


class ClubResponse(ClubBase):
    model_config = ConfigDict(from_attributes=True)

    club_id: int
    created_at: Optional[datetime] = None
    events_count: int = 0


# ---------------- Event Schemas ----------------
class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    event_date: datetime
    location: str = Field(..., min_length=1, max_length=200)
    capacity: int = Field(..., gt=0)
    club_id: int


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    event_date: Optional[datetime] = None
    location: Optional[str] = Field(None, min_length=1, max_length=200)
    capacity: Optional[int] = Field(None, gt=0)
    club_id: Optional[int] = None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: int
    club_id: int
    title: str
    description: str
    event_date: datetime
    location: str
    capacity: int
    created_at: Optional[datetime] = None
    registered_count: int = 0
    available_seats: int = 0
    club: Optional[ClubSimple] = None


# ---------------- Registration Schemas ----------------
class RegistrationCreate(BaseModel):
    student_id: int


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    registration_id: int
    event_id: int
    student_id: int
    registered_at: datetime
    student: Optional[UserResponse] = None
    event: Optional[EventResponse] = None


class MessageResponse(BaseModel):
    message: str
    registration_id: Optional[int] = None


# ---------------- Auth Schemas ----------------
class LoginRequest(BaseModel):
    email: str
    password: str
    portal: Optional[str] = None  # "STUDENT" or "ADMIN"


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=4, max_length=200)
    department: Optional[str] = "Computer Science"
    year: Optional[Union[int, str]] = 1
    role: str = "STUDENT"  # STUDENT, COORDINATOR, ADMIN


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    portal: str
    message: str



# ---------------- Lost & Found Schemas ----------------
class LostFoundBase(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    item_type: str = Field(..., pattern="^(Lost|Found)$")
    category: Optional[str] = "General"
    location: Optional[str] = None
    status: Optional[str] = "Active"
    image_url: Optional[str] = None
    contact_info: Optional[str] = None


class LostFoundCreate(LostFoundBase):
    student_id: Optional[int] = None


class LostFoundUpdate(BaseModel):
    item_name: Optional[str] = None
    description: Optional[str] = None
    item_type: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    contact_info: Optional[str] = None


class LostFoundResponse(LostFoundBase):
    model_config = ConfigDict(from_attributes=True)

    item_id: int
    student_id: Optional[int] = None
    created_at: Optional[datetime] = None


# ---------------- AI Chatbot Schemas ----------------
class ChatMessage(BaseModel):
    role: str  # "user" or "model" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    user_id: Optional[int] = None
    role: Optional[str] = "STUDENT"


class ToolCallInfo(BaseModel):
    tool_name: str
    arguments: dict
    result_summary: str


class ChatResponse(BaseModel):
    reply: str
    tools_used: List[ToolCallInfo] = []
    engine: str  # "gemini-2.0-flash", "gemini-1.5-flash", or "campusconnect-agent"
    context_data: Optional[dict] = None


# ---------------- AI Image Search Schemas ----------------
class ImageSearchRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    item_type_hint: Optional[str] = None  # "Lost" or "Found" or None
    category_hint: Optional[str] = None


class DetectedAttributes(BaseModel):
    item_name: str
    category: str
    dominant_colors: List[str] = []
    confidence: float
    distinguishing_features: List[str] = []
    detected_text: Optional[str] = None
    recommended_search_query: str


class MatchedItem(BaseModel):
    item: LostFoundResponse
    match_score: int  # 0 to 100 percentage
    match_reasons: List[str] = []


class ImageSearchResponse(BaseModel):
    analysis: DetectedAttributes
    engine: str
    matches: List[MatchedItem] = []
    total_matches: int
    recommendations: List[str] = []


# ---------------- Complaint Schemas ----------------
class ComplaintBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    category: str = Field("General", max_length=100)
    priority: str = Field("Medium", max_length=20)


class ComplaintCreate(ComplaintBase):
    student_id: Optional[int] = None


class ComplaintUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    admin_response: Optional[str] = None


class ComplaintResponse(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)

    complaint_id: int
    student_id: int
    status: str
    admin_response: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_department: Optional[str] = None


# ---------------- Dashboard & Health Schemas ----------------
class DashboardStats(BaseModel):
    total_clubs: int
    upcoming_events: int
    my_registrations: int
    total_registrations: int = 0
    available_events: int
    lost_items_count: int = 0
    found_items_count: int = 0
    total_complaints: int = 0
    pending_complaints: int = 0


class HealthResponse(BaseModel):
    status: str
    message: str
    ai_status: Optional[str] = None


