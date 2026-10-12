import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { 
  getEvent, 
  registerForEvent, 
  getUserRegistrations 
} from '../services/api';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Clock,
  Shield,
  ArrowRight
} from 'lucide-react';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin, isStudent } = useUser();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEvent(id);
      setEvent(data);

      // Check if current user is already registered for this event
      if (currentUser?.id) {
        try {
          const userRegs = await getUserRegistrations(currentUser.id);
          const hasReg = userRegs.some(r => r.event_id === Number(id));
          setIsRegistered(hasReg);
        } catch {
          // Ignore registration check error
        }
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
      setError(err.message || 'Event not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventDetails();
  }, [id, currentUser]);

  const handleRegister = async () => {
    if (!currentUser?.id) {
      alert('Please select a demo user to register.');
      return;
    }

    try {
      setRegistering(true);
      setFeedback(null);
      const res = await registerForEvent(event.event_id, currentUser.id);
      setFeedback({ type: 'success', text: res.message || 'Successfully registered for this event!' });
      setIsRegistered(true);
      // Refresh event to get updated registered_count & available_seats
      const updatedEvent = await getEvent(event.event_id);
      setEvent(updatedEvent);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to register for this event.' });
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="state-container full-page">
        <div className="spinner"></div>
        <p className="state-desc">Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="state-container full-page">
        <AlertCircle size={40} className="state-icon error" />
        <h2 className="state-title">Event Not Found</h2>
        <p className="state-desc">{error || 'The requested event could not be found.'}</p>
        <Link to="/events" className="action-btn">Back to Events</Link>
      </div>
    );
  }

  const isFull = event.available_seats <= 0;
  const capacityPercent = Math.min(100, Math.round((event.registered_count / event.capacity) * 100));

  return (
    <div className="event-details-page">
      {/* Navigation Breadcrumb */}
      <div className="details-nav-row">
        <Link to="/events" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to All Events</span>
        </Link>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`feedback-banner ${feedback.type}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
          <button className="banner-dismiss" onClick={() => setFeedback(null)}>×</button>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="details-layout-grid">
        {/* Left Column: Event Info */}
        <div className="details-main-card">
          <div className="details-header">
            {event.club && (
              <span className="details-club-pill">
                <Building2 size={14} />
                {event.club.name}
              </span>
            )}
            <h1 className="details-title">{event.title}</h1>
          </div>

          <div className="details-meta-grid">
            <div className="meta-card">
              <Calendar size={20} className="meta-icon indigo" />
              <div>
                <span className="meta-label">Date & Time</span>
                <span className="meta-value">{formatDate(event.event_date)}</span>
              </div>
            </div>

            <div className="meta-card">
              <MapPin size={20} className="meta-icon sky" />
              <div>
                <span className="meta-label">Location / Venue</span>
                <span className="meta-value">{event.location || 'Location TBA'}</span>
              </div>
            </div>
          </div>

          <div className="details-content-block">
            <h2 className="content-heading">About This Event</h2>
            <p className="content-text">{event.description}</p>
          </div>
        </div>

        {/* Right Column: Registration & Seat Tracker */}
        <div className="details-sidebar">
          <div className="registration-status-card">
            <h3 className="sidebar-heading">Seat Availability</h3>

            {/* Capacity Progress Tracker */}
            <div className="seat-metrics-box">
              <div className="metrics-row">
                <span className="metric-item">
                  <span className="metric-num text-primary">{event.capacity}</span>
                  <span className="metric-label">Total Capacity</span>
                </span>
                <span className="metric-divider"></span>
                <span className="metric-item">
                  <span className="metric-num text-emerald">{event.registered_count}</span>
                  <span className="metric-label">Registered</span>
                </span>
                <span className="metric-divider"></span>
                <span className="metric-item">
                  <span className={`metric-num ${isFull ? 'text-red' : 'text-sky'}`}>
                    {event.available_seats}
                  </span>
                  <span className="metric-label">Seats Left</span>
                </span>
              </div>

              <div className="capacity-bar-track large">
                <div 
                  className={`capacity-bar-fill ${capacityPercent > 80 ? 'warning' : ''} ${isFull ? 'full' : ''}`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
              <span className="capacity-caption">{capacityPercent}% of seats reserved</span>
            </div>

            {isAdmin ? (
              <div className="admin-event-management-box">
                <div className="admin-badge-notice">
                  <Shield size={18} />
                  <span>Admin Event Oversight</span>
                </div>
                <p className="admin-notice-desc">
                  Event registrations are for students only. As an administrator, you manage event schedules and capacities.
                </p>
                <Link to="/manage-events" className="btn-manage-main">
                  <span>Manage Events Portal</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <>
                {/* Current Active User Info */}
                <div className="active-user-prompt">
                  <span className="user-label">Student:</span>
                  <span className="user-name">
                    {currentUser ? currentUser.name : 'Student'}
                  </span>
                </div>

                {/* Main Action Button */}
                <div className="registration-action-wrapper">
                  {isRegistered ? (
                    <div className="status-badge-box registered">
                      <CheckCircle2 size={20} />
                      <span>Already Registered ✓</span>
                    </div>
                  ) : isFull ? (
                    <div className="status-badge-box full">
                      <AlertCircle size={20} />
                      <span>Event Full</span>
                    </div>
                  ) : (
                    <button 
                      className="btn-register-main"
                      onClick={handleRegister}
                      disabled={registering}
                    >
                      <Sparkles size={18} />
                      <span>{registering ? 'Processing Registration...' : 'Register for Event'}</span>
                    </button>
                  )}
                </div>

                <p className="action-hint">
                  {isRegistered 
                    ? 'You are confirmed for this event! View it in My Registrations.'
                    : isFull 
                      ? 'All seats for this event are currently booked.'
                      : 'Instant confirmation. Seats update in real time.'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
