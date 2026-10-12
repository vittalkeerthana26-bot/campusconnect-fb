import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, CheckCircle, ArrowRight } from 'lucide-react';

export default function EventCard({ event, onRegister, isRegistered = false, registering = false }) {
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

  const isFull = event.available_seats <= 0;
  const capacityPercent = Math.min(100, Math.round((event.registered_count / event.capacity) * 100));

  return (
    <article className="event-card">
      <div className="event-card-header">
        <div className="event-meta-row">
          {event.club && (
            <span className="event-club-tag">
              {event.club.name}
            </span>
          )}
          {isRegistered && (
            <span className="registered-badge">
              <CheckCircle size={13} /> Registered
            </span>
          )}
          {!isRegistered && isFull && (
            <span className="full-badge">Event Full</span>
          )}
        </div>

        <h3 className="event-title">
          <Link to={`/events/${event.event_id}`}>{event.title}</Link>
        </h3>
      </div>

      <p className="event-description">
        {event.description || 'No description provided.'}
      </p>

      <div className="event-details">
        <div className="event-detail-item">
          <Calendar size={15} />
          <span>{formatDate(event.event_date)}</span>
        </div>

        <div className="event-detail-item">
          <MapPin size={15} />
          <span>{event.location || 'Location TBA'}</span>
        </div>
      </div>

      {/* Capacity & Progress */}
      <div className="event-capacity-section">
        <div className="capacity-labels">
          <span className="seats-info">
            <Users size={14} />
            <strong>{event.registered_count}</strong> / {event.capacity} registered
          </span>
          <span className={`seats-available ${isFull ? 'full' : 'open'}`}>
            {isFull ? '0 seats left' : `${event.available_seats} seats left`}
          </span>
        </div>
        <div className="capacity-bar-track">
          <div 
            className={`capacity-bar-fill ${capacityPercent > 80 ? 'warning' : ''} ${isFull ? 'full' : ''}`}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
      </div>

      <div className="event-card-footer">
        <Link to={`/events/${event.event_id}`} className="view-details-btn">
          <span>View Details</span>
          <ArrowRight size={15} />
        </Link>

        {onRegister && (
          <button
            className={`register-action-btn ${isRegistered ? 'registered' : ''}`}
            onClick={() => onRegister(event.event_id)}
            disabled={isRegistered || isFull || registering}
          >
            {isRegistered ? 'Already Registered' : isFull ? 'Event Full' : (registering ? 'Registering...' : 'Register')}
          </button>
        )}
      </div>
    </article>
  );
}
