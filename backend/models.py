from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password = Column(String(200), nullable=True, default="student123")
    department = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    role = Column(String(50), default="STUDENT", nullable=False)  # STUDENT, COORDINATOR, ADMIN
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    registrations = relationship("EventRegistration", back_populates="student", cascade="all, delete-orphan")
    lost_found_items = relationship("LostFoundItem", back_populates="student", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="student", cascade="all, delete-orphan")


class Club(Base):
    __tablename__ = "clubs"

    club_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    events = relationship("Event", back_populates="club", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.club_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    event_date = Column(DateTime, nullable=False)
    location = Column(String(200), nullable=False)
    capacity = Column(Integer, nullable=False, default=50)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("capacity > 0", name="chk_event_capacity_positive"),
    )

    # Relationships
    club = relationship("Club", back_populates="events")
    registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    registration_id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    registered_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "event_id", name="uq_student_event"),
    )

    # Relationships
    event = relationship("Event", back_populates="registrations")
    student = relationship("User", back_populates="registrations")


class LostFoundItem(Base):
    __tablename__ = "lost_found"

    item_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    item_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    item_type = Column(String(20), nullable=False)  # 'Lost' or 'Found'
    category = Column(String(100), nullable=True, default="General")  # Electronics, ID Card, Accessories, Bags, Drinkware, Keys, Books, Other
    location = Column(String(200), nullable=True)
    status = Column(String(50), default="Active")  # 'Active', 'Claimed', 'Resolved'
    image_url = Column(Text, nullable=True)
    contact_info = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="lost_found_items")


class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), default="General", nullable=False)  # 'Hostel', 'Academics', 'Infrastructure', 'Mess/Food', 'Library', 'Security', 'Other'
    priority = Column(String(20), default="Medium", nullable=False)    # 'Low', 'Medium', 'High', 'Urgent'
    status = Column(String(50), default="Pending", nullable=False)      # 'Pending', 'In Progress', 'Resolved', 'Rejected'
    admin_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="complaints")

