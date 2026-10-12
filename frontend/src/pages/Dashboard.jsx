import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { 
  getDashboardStats, 
  getEvents, 
  registerForEvent, 
  getUserRegistrations 
} from '../services/api';
import EventCard from '../components/EventCard';
import { 
  Users, 
  Calendar, 
  BookmarkCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Bot,
  Camera,
  ShieldCheck,
  GraduationCap,
  KeyRound,
  Tag,
  ShieldAlert
} from 'lucide-react';

export default function Dashboard() {
  const { currentUser, isStudent, isAdmin } = useUser();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [userRegEventIds, setUserRegEventIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registeringId, setRegisteringId] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats and events in parallel
      const [statsData, eventsData] = await Promise.all([
        getDashboardStats(currentUser?.id),
        getEvents(),
      ]);

      setStats(statsData);
      setUpcomingEvents(eventsData.slice(0, 3));

      // Fetch user's registered event IDs
      if (currentUser?.id) {
        try {
          const userRegs = await getUserRegistrations(currentUser.id);
          setUserRegEventIds(new Set(userRegs.map(r => r.event_id)));
        } catch {
          // Ignore
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Could not connect to CampusConnect server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const handleRegister = async (eventId) => {
    if (!currentUser?.id) {
      alert('Please log in with your student credentials to register.');
      return;
    }

    try {
      setRegisteringId(eventId);
      setSuccessNotice(null);
      const res = await registerForEvent(eventId, currentUser.id);
      setSuccessNotice(res.message || 'Successfully registered for event!');
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to register for this event.');
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <div className="dashboard-page">
      {/* Welcome Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} className="sparkle-icon" />
          <span>KL University Intelligent Student & Admin Platform</span>
        </div>
        <h1 className="hero-title">
          Welcome to <span className="gradient-text">CampusConnect</span>
        </h1>
        <p className="hero-subtitle">
          {currentUser ? (
            <>Currently signed in as <strong className="user-highlight">{currentUser.name}</strong> ({currentUser.role}). Access events, interact with our real AI Agent, and match lost belongings with Computer Vision.</>
          ) : (
            <>Discover campus events, interact with the AI assistant, and report lost items across KL University.</>
          )}
        </p>

        {/* Portal & Credentials Callout */}
        <div className="dashboard-portal-bar">
          <div className="portal-indicator-block">
            {isAdmin ? <ShieldCheck size={18} className="shield-icon" /> : <GraduationCap size={18} className="cap-icon" />}
            <div>
              <span className="portal-status-title">
                {isAdmin ? 'Active: Admin Portal' : 'Active: Student Portal'}
              </span>
              <span className="portal-sub-detail">
                {isAdmin 
                  ? 'Authorized for Event Management, deletion & student rosters.'
                  : 'Authorized for event registration, AI chatbot, and lost-and-found.'}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <Link to="/events" className="btn-hero-primary">
            <span>Explore Events</span>
            <ArrowRight size={17} />
          </Link>
          <Link to="/chatbot" className="btn-hero-ai">
            <Bot size={17} />
            <span>Chat with AI Agent</span>
          </Link>
          <Link to="/lost-found" className="btn-hero-secondary">
            <Camera size={17} />
            <span>AI Image Search</span>
          </Link>
          <button 
            type="button" 
            className="btn-hero-secondary"
            onClick={loadDashboardData}
            disabled={loading}
            title="Refresh database metrics"
          >
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Sync Live Data'}</span>
          </button>
        </div>
      </section>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="success-banner">
          <CheckCircle2 size={18} />
          <span>{successNotice}</span>
          <button className="banner-dismiss" onClick={() => setSuccessNotice(null)}>×</button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <section className="stats-grid">
        <Link to="/clubs" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-icon-box indigo">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Clubs</span>
            <span className="stat-value">{stats ? stats.total_clubs : '—'}</span>
            <span className="stat-sub">Active campus clubs</span>
          </div>
        </Link>

        <Link to="/events" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-icon-box purple">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Upcoming Events</span>
            <span className="stat-value">{stats ? stats.upcoming_events : '—'}</span>
            <span className="stat-sub">Scheduled across campus</span>
          </div>
        </Link>

        {isAdmin ? (
          <Link to="/manage-events" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-icon-box emerald">
              <BookmarkCheck size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Registrations</span>
              <span className="stat-value">{stats?.total_registrations ?? '—'}</span>
              <span className="stat-sub">Student event registrations</span>
            </div>
          </Link>
        ) : (
          <Link to="/my-registrations" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-icon-box emerald">
              <BookmarkCheck size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">My Registrations</span>
              <span className="stat-value">{stats?.my_registrations ?? '—'}</span>
              <span className="stat-sub">Joined by you</span>
            </div>
          </Link>
        )}

        <Link to="/lost-found" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-icon-box sky">
            <Tag size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Lost & Found Items</span>
            <span className="stat-value">
              {stats ? `${stats.lost_items_count + stats.found_items_count}` : '—'}
            </span>
            <span className="stat-sub">Tracked by AI Vision</span>
          </div>
        </Link>

        <Link to="/complaints" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-icon-box rose">
            <ShieldAlert size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Complaints</span>
            <span className="stat-value">
              {stats?.total_complaints ?? '—'}
            </span>
            <span className="stat-sub">{stats?.pending_complaints ?? 0} pending review</span>
          </div>
        </Link>
      </section>

      {/* Feature Spotlight: Real AI Agents */}
      <section className="ai-feature-spotlight-grid">
        <Link to="/chatbot" className="spotlight-card chatbot-card">
          <div className="spotlight-icon-wrap bot">
            <Bot size={28} />
          </div>
          <div className="spotlight-content">
            <span className="spotlight-badge">Agentic AI Tool Calling</span>
            <h3 className="spotlight-title">CampusConnect AI Assistant</h3>
            <p className="spotlight-desc">
              Ask about hackathons, workshops, venue locations, or tell the agent: 
              <em> "Register me for Campus Hackathon"</em>.
            </p>
            <span className="spotlight-action">Launch Chatbot <ArrowRight size={15} /></span>
          </div>
        </Link>

        <Link to="/lost-found" className="spotlight-card vision-card">
          <div className="spotlight-icon-wrap vision">
            <Camera size={28} />
          </div>
          <div className="spotlight-content">
            <span className="spotlight-badge">Computer Vision & Semantic Search</span>
            <h3 className="spotlight-title">AI Image Search & Lost-and-Found</h3>
            <p className="spotlight-desc">
              Upload a photo of an item you lost or found. The agent extracts visual categories, dominant colors, and matches records.
            </p>
            <span className="spotlight-action">Try AI Visual Search <ArrowRight size={15} /></span>
          </div>
        </Link>
      </section>

      {/* Upcoming Events Section */}
      <section className="upcoming-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Featured Upcoming Events</h2>
            <p className="section-subtitle">Catch the next exciting workshops, tech talks, and fests.</p>
          </div>
          <div className="section-controls">
            <button className="refresh-icon-btn" onClick={loadDashboardData} disabled={loading} title="Refresh">
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
            <Link to="/events" className="section-link">
              <span>View All</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="state-container">
            <div className="spinner"></div>
            <p className="state-desc">Loading live campus stats and events...</p>
          </div>
        ) : error ? (
          <div className="state-container">
            <AlertCircle size={36} className="state-icon error" />
            <h3 className="state-title">Backend Connection Error</h3>
            <p className="state-desc">{error}</p>
            <button className="action-btn" onClick={loadDashboardData}>Retry Connection</button>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="state-container">
            <Calendar size={36} className="state-icon" />
            <h3 className="state-title">No Upcoming Events</h3>
            <p className="state-desc">No events are currently scheduled.</p>
          </div>
        ) : (
          <div className="events-grid">
            {upcomingEvents.map(event => (
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
      </section>
    </div>
  );
}
