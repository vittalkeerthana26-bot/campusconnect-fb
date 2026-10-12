import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getUserRegistrations } from '../services/api';
import { 
  BookmarkCheck, 
  Calendar, 
  MapPin, 
  Building2, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle,
  Shield
} from 'lucide-react';

export default function MyRegistrations() {
  const { currentUser, isAdmin } = useUser();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegistrations = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getUserRegistrations(currentUser.id);
      setRegistrations(data);
    } catch (err) {
      console.error('Failed to fetch user registrations:', err);
      setError(err.message || 'Could not load your registrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [currentUser]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
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

  const formatRegTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  if (isAdmin) {
    return (
      <div className="page-wrapper">
        <header className="page-header-row">
          <div>
            <div className="badge-tag">
              <span className="status-dot"></span>
              Administrator View
            </div>
            <h1 className="page-title">Event Registrations</h1>
            <p className="page-subtitle">
              Event registrations are strictly for students.
            </p>
          </div>
        </header>
        <div className="state-container">
          <Shield size={48} className="state-icon text-indigo" />
          <h3 className="state-title">Student-Only Feature</h3>
          <p className="state-desc">
            Event registrations are designed for students attending campus workshops, hackathons, and fests. As an administrator, you manage event schedules, seat capacities, and student rosters via the Manage Events portal.
          </p>
          <Link to="/manage-events" className="action-btn">
            Open Manage Events Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <header className="page-header-row">
        <div>
          <div className="badge-tag">
            <span className="status-dot"></span>
            Student Activity
          </div>
          <h1 className="page-title">My Registered Events</h1>
          <p className="page-subtitle">
            Showing all events confirmed for <strong className="user-highlight">{currentUser?.name || 'Current User'}</strong>.
          </p>
        </div>

        <button className="refresh-btn" onClick={fetchRegistrations} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </header>

      {/* Content */}
      {loading ? (
        <div className="state-container">
          <div className="spinner"></div>
          <p className="state-desc">Fetching your event registrations...</p>
        </div>
      ) : error ? (
        <div className="state-container">
          <AlertCircle size={36} className="state-icon error" />
          <h3 className="state-title">Unable to Load Registrations</h3>
          <p className="state-desc">{error}</p>
          <button className="action-btn" onClick={fetchRegistrations}>Try Again</button>
        </div>
      ) : registrations.length === 0 ? (
        <div className="state-container">
          <BookmarkCheck size={36} className="state-icon" />
          <h3 className="state-title">No Registered Events Yet</h3>
          <p className="state-desc">
            You haven't registered for any events yet. Check out upcoming workshops and fests!
          </p>
          <Link to="/events" className="action-btn">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="registrations-list">
          {registrations.map(reg => {
            const ev = reg.event;
            if (!ev) return null;
            return (
              <article key={reg.registration_id} className="registration-card">
                <div className="registration-card-main">
                  <div className="reg-header">
                    {ev.club && (
                      <span className="event-club-tag">
                        <Building2 size={13} />
                        {ev.club.name}
                      </span>
                    )}
                    <span className="reg-id-tag">Reg #{reg.registration_id}</span>
                  </div>

                  <h3 className="reg-title">
                    <Link to={`/events/${ev.event_id}`}>{ev.title}</Link>
                  </h3>

                  <p className="reg-desc">{ev.description}</p>

                  <div className="reg-meta-row">
                    <div className="reg-meta-item">
                      <Calendar size={15} />
                      <span>{formatDate(ev.event_date)}</span>
                    </div>

                    <div className="reg-meta-item">
                      <MapPin size={15} />
                      <span>{ev.location || 'Location TBA'}</span>
                    </div>

                    <div className="reg-meta-item text-muted">
                      <Clock size={15} />
                      <span>Registered on: {formatRegTime(reg.registered_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="registration-card-action">
                  <Link to={`/events/${ev.event_id}`} className="reg-details-btn">
                    <span>View Event</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
