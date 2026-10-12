import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, ArrowRight } from 'lucide-react';

export default function ClubCard({ club }) {
  return (
    <div className="club-card">
      <div className="club-card-top">
        <div className="club-icon-avatar">
          <Users size={22} />
        </div>
        <span className="club-events-count">
          <Calendar size={13} />
          {club.events_count || 0} {club.events_count === 1 ? 'Event' : 'Events'}
        </span>
      </div>

      <h3 className="club-name">{club.name}</h3>

      <p className="club-description">
        {club.description || 'Dedicated to student activities and community growth.'}
      </p>

      <div className="club-card-footer">
        <Link to={`/events?club_id=${club.club_id}`} className="view-club-events-btn">
          <span>View Events</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
