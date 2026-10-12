import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { 
  getEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  getEventRegistrations 
} from '../services/api';
import EventForm from '../components/EventForm';
import { 
  CalendarPlus, 
  Edit3, 
  Trash2, 
  Users, 
  Calendar, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  X,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Lock
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export default function ManageEvents() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    isAdmin, 
    isStudent, 
    canManageEvents, 
    canDeleteEvents,
    logout
  } = useUser();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Registrations modal state
  const [viewingRegsEvent, setViewingRegsEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [regsError, setRegsError] = useState(null);

  // Feedback notice
  const [notice, setNotice] = useState(null);

  const fetchEventsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events for management:', err);
      setError(err.message || 'Could not load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageEvents) {
      fetchEventsList();
    }
  }, [canManageEvents]);

  // If user is a Student, show Access Denied screen
  if (isStudent) {
    return (
      <div className="page-wrapper access-denied-wrapper">
        <div className="access-denied-card">
          <div className="access-denied-icon">
            <ShieldAlert size={48} />
          </div>
          <div className="access-badge-pill">
            <Lock size={14} /> Student Role Restricted
          </div>
          <h2 className="access-title">Administrator Privileges Required</h2>
          <p className="access-explanation">
            You are currently logged into the <strong>Student Portal</strong> as <em>{currentUser?.name || 'Demo Student'}</em>.
            Students are given permissions to browse, register, and use the AI agent, but are <strong>not permitted to create, edit, or delete events</strong>.
          </p>

          <div className="demo-credentials-banner">
            <div className="cred-banner-title">
              <strong>Administrator Access Required</strong>
            </div>
            <p className="cred-banner-text">
              Your active session is locked as Student (<strong>{currentUser?.name}</strong>). To manage campus events, please log out and sign in using Administrator credentials (<code>admin@campusconnect.local</code>).
            </p>
            <div className="access-actions-row">
              <button 
                type="button" 
                className="btn-primary access-btn"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <span>Log Out to Switch to Admin</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingEvent) {
        const res = await updateEvent(editingEvent.event_id, formData);
        setNotice({ type: 'success', text: `Event "${res.title}" successfully updated!` });
      } else {
        const res = await createEvent(formData);
        setNotice({ type: 'success', text: `Event "${res.title}" successfully created!` });
      }
      setIsFormOpen(false);
      setEditingEvent(null);
      await fetchEventsList();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Operation failed' });
      throw err;
    }
  };

  const handleDelete = async (event) => {
    if (!canDeleteEvents) {
      alert("Permission Denied: Only Admin users have permission to delete events.");
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${event.title}"? All student registrations for this event will also be removed.`);
    if (!confirmed) return;

    try {
      await deleteEvent(event.event_id);
      setNotice({ type: 'success', text: `Event "${event.title}" deleted successfully.` });
      await fetchEventsList();
    } catch (err) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const handleViewRegistrations = async (event) => {
    setViewingRegsEvent(event);
    setLoadingRegs(true);
    setRegsError(null);
    try {
      const data = await getEventRegistrations(event.event_id);
      setRegistrations(data);
    } catch (err) {
      console.error('Failed to load event registrations:', err);
      setRegsError(err.message || 'Could not load registered students');
    } finally {
      setLoadingRegs(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateString;
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.club && e.club.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    e.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <header className="page-header-row">
        <div>
          <div className="badge-tag coordinator">
            <ShieldCheck size={14} />
            <span>Admin Portal Active — {currentUser?.name}</span>
          </div>
          <h1 className="page-title">Event Management & Control</h1>
          <p className="page-subtitle">
            Create, update, manage event capacities, view student rosters, and delete campus events.
          </p>
        </div>

        <div className="header-actions-row">
          <button className="refresh-btn" onClick={fetchEventsList} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn-primary" onClick={handleOpenCreate}>
            <CalendarPlus size={16} />
            <span>Create Event</span>
          </button>
        </div>
      </header>

      {/* Notice */}
      {notice && (
        <div className={`notification-banner ${notice.type}`}>
          <div className="notice-inner">
            {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notice.text}</span>
          </div>
          <button className="close-notice-btn" onClick={() => setNotice(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="management-filter-bar">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text"
            placeholder="Filter events by title, club, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="event-count-pill">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* Table of Events */}
      {loading ? (
        <div className="loading-state-container">
          <div className="spinner"></div>
          <p>Loading events inventory...</p>
        </div>
      ) : error ? (
        <div className="empty-state-card error">
          <AlertCircle size={32} />
          <h3>Error loading events</h3>
          <p>{error}</p>
          <button className="btn-secondary" onClick={fetchEventsList}>Try Again</button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state-card">
          <Calendar size={36} />
          <h3>No events found</h3>
          <p>Create a new event using the button above.</p>
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="management-table">
            <thead>
              <tr>
                <th>Event Title & Club</th>
                <th>Schedule</th>
                <th>Location</th>
                <th>Capacity / Reg.</th>
                <th>Live Status</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => {
                const isFull = event.available_seats <= 0;
                return (
                  <tr key={event.event_id}>
                    <td>
                      <div className="event-primary-cell">
                        <strong>{event.title}</strong>
                        {event.club && (
                          <span className="club-subtext">{event.club.name}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <Calendar size={14} />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="location-cell">
                        <MapPin size={14} />
                        <span>{event.location}</span>
                      </div>
                    </td>
                    <td>
                      <div className="capacity-stat-cell">
                        <span><strong>{event.registered_count}</strong> / {event.capacity}</span>
                        <div className="mini-progress-bar">
                          <div 
                            className={`mini-progress-fill ${isFull ? 'full' : ''}`}
                            style={{ width: `${Math.min(100, Math.round((event.registered_count / event.capacity) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-tag ${isFull ? 'sold-out' : 'available'}`}>
                        {isFull ? 'Full' : `${event.available_seats} open`}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="table-action-btn roster"
                        onClick={() => handleViewRegistrations(event)}
                        title="View registered students"
                      >
                        <Users size={15} />
                        <span>Roster</span>
                      </button>
                      <button 
                        className="table-action-btn edit"
                        onClick={() => handleOpenEdit(event)}
                        title="Edit event details"
                      >
                        <Edit3 size={15} />
                        <span>Edit</span>
                      </button>
                      {canDeleteEvents && (
                        <button 
                          className="table-action-btn delete"
                          onClick={() => handleDelete(event)}
                          title="Delete event (Admin only)"
                        >
                          <Trash2 size={15} />
                          <span>Delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Event Form Modal */}
      {isFormOpen && (
        <EventForm 
          isOpen={isFormOpen}
          initialData={editingEvent}
          event={editingEvent}
          title={editingEvent ? "Edit Event" : "Create New Event"}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingEvent(null);
          }}
        />
      )}

      {/* Registrations Modal */}
      {viewingRegsEvent && (
        <div className="modal-backdrop-overlay" onClick={() => setViewingRegsEvent(null)}>
          <div className="roster-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h3 className="modal-title">Student Registrations</h3>
                <p className="modal-subtext">
                  Event: <strong>{viewingRegsEvent.title}</strong> • Capacity: {viewingRegsEvent.capacity}
                </p>
              </div>
              <button className="modal-close-icon-btn" onClick={() => setViewingRegsEvent(null)}>
                <X size={18} />
              </button>
            </div>

            {loadingRegs ? (
              <div className="modal-loading-state">
                <div className="spinner"></div>
                <p>Loading attendee list...</p>
              </div>
            ) : regsError ? (
              <div className="modal-error-banner">
                <AlertCircle size={16} />
                <span>{regsError}</span>
              </div>
            ) : registrations.length === 0 ? (
              <div className="empty-roster-state">
                <Users size={32} />
                <h4>No registrations yet</h4>
                <p>No students have registered for this event so far.</p>
              </div>
            ) : (
              <div className="roster-table-wrapper">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg, idx) => (
                      <tr key={reg.registration_id}>
                        <td>{idx + 1}</td>
                        <td><strong>{reg.student ? reg.student.name : `User #${reg.student_id}`}</strong></td>
                        <td>{reg.student ? reg.student.email : 'N/A'}</td>
                        <td>{reg.student ? reg.student.department || 'N/A' : 'N/A'}</td>
                        <td>{formatDate(reg.registered_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
