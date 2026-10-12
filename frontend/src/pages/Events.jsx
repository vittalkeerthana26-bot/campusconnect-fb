import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { 
  getEvents, 
  getClubs, 
  registerForEvent, 
  getUserRegistrations 
} from '../services/api';
import EventCard from '../components/EventCard';
import { 
  Search, 
  Filter, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClubId = searchParams.get('club_id') || '';

  const { currentUser } = useUser();
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and sort
  const [selectedClubId, setSelectedClubId] = useState(initialClubId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-asc'); // date-asc, date-desc, title-asc

  // Registration state
  const [userRegEventIds, setUserRegEventIds] = useState(new Set());
  const [registeringId, setRegisteringId] = useState(null);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Sync URL query param when changed externally
  useEffect(() => {
    setSelectedClubId(searchParams.get('club_id') || '');
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [clubsData, eventsData] = await Promise.all([
        getClubs(),
        getEvents({
          club_id: selectedClubId || undefined,
          search: searchQuery.trim() || undefined,
        }),
      ]);

      setClubs(clubsData);
      setEvents(eventsData);

      if (currentUser?.id) {
        try {
          const userRegs = await getUserRegistrations(currentUser.id);
          setUserRegEventIds(new Set(userRegs.map(r => r.event_id)));
        } catch {
          // Ignore registration load error
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      setError(err.message || 'Failed to fetch events from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClubId, searchQuery, currentUser]);

  const handleClubFilterChange = (e) => {
    const clubId = e.target.value;
    setSelectedClubId(clubId);
    if (clubId) {
      setSearchParams({ club_id: clubId });
    } else {
      setSearchParams({});
    }
  };

  const handleRegister = async (eventId) => {
    if (!currentUser?.id) {
      alert('Please select a demo user to register.');
      return;
    }

    try {
      setRegisteringId(eventId);
      setFeedbackNotice(null);
      const res = await registerForEvent(eventId, currentUser.id);
      setFeedbackNotice({ type: 'success', text: res.message || 'Successfully registered!' });
      await loadData();
    } catch (err) {
      setFeedbackNotice({ type: 'error', text: err.message || 'Registration failed.' });
    } finally {
      setRegisteringId(null);
    }
  };

  // Client-side sort if needed
  const sortedEvents = [...events].sort((a, b) => {
    if (sortBy === 'date-asc') {
      return new Date(a.event_date) - new Date(b.event_date);
    } else if (sortBy === 'date-desc') {
      return new Date(b.event_date) - new Date(a.event_date);
    } else if (sortBy === 'title-asc') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return (
    <div className="page-wrapper">
      <header className="page-header-row">
        <div>
          <div className="badge-tag">
            <span className="status-dot"></span>
            Campus Schedule
          </div>
          <h1 className="page-title">Campus Events & Workshops</h1>
          <p className="page-subtitle">
            Browse upcoming competitions, workshops, seminars, and club activities.
          </p>
        </div>

        <button className="refresh-btn" onClick={loadData} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </header>

      {/* Feedback Banner */}
      {feedbackNotice && (
        <div className={`feedback-banner ${feedbackNotice.type}`}>
          {feedbackNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedbackNotice.text}</span>
          <button className="banner-dismiss" onClick={() => setFeedbackNotice(null)}>×</button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="filter-controls-card">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search events by title, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        <div className="dropdown-filters-row">
          <div className="filter-select-wrapper">
            <Filter size={16} className="filter-icon" />
            <select 
              className="filter-select"
              value={selectedClubId}
              onChange={handleClubFilterChange}
              aria-label="Filter by club"
            >
              <option value="">All Clubs</option>
              {clubs.map(c => (
                <option key={c.club_id} value={c.club_id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <Calendar size={16} className="filter-icon" />
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort events"
            >
              <option value="date-asc">Date: Upcoming First</option>
              <option value="date-desc">Date: Later First</option>
              <option value="title-asc">Title: Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-count-bar">
        <span>Showing <strong>{sortedEvents.length}</strong> {sortedEvents.length === 1 ? 'event' : 'events'}</span>
        {selectedClubId && (
          <button className="clear-filter-pill" onClick={() => setSelectedClubId('')}>
            Filtered by club ×
          </button>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="state-container">
          <div className="spinner"></div>
          <p className="state-desc">Fetching latest campus events...</p>
        </div>
      ) : error ? (
        <div className="state-container">
          <AlertCircle size={36} className="state-icon error" />
          <h3 className="state-title">Unable to Load Events</h3>
          <p className="state-desc">{error}</p>
          <button className="action-btn" onClick={loadData}>Try Again</button>
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="state-container">
          <Calendar size={36} className="state-icon" />
          <h3 className="state-title">No Matching Events Found</h3>
          <p className="state-desc">
            {searchQuery || selectedClubId
              ? 'Try adjusting your search query or club filter to see more events.'
              : 'The events table is currently empty. Run the seed script to populate demo events.'}
          </p>
          {(searchQuery || selectedClubId) && (
            <button className="action-btn" onClick={() => { setSearchQuery(''); setSelectedClubId(''); }}>
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="events-grid">
          {sortedEvents.map(event => (
            <EventCard
              key={event.event_id}
              event={event}
              onRegister={handleRegister}
              isRegistered={userRegEventIds.has(event.event_id)}
              registering={registeringId === event.event_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
