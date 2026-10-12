import React, { useState, useEffect } from 'react';
import { getClubs } from '../services/api';
import ClubCard from '../components/ClubCard';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClubsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClubs();
      setClubs(data);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
      setError(err.message || 'Unable to load clubs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubsData();
  }, []);

  return (
    <div className="page-wrapper">
      <header className="page-header-row">
        <div>
          <div className="badge-tag">
            <span className="status-dot"></span>
            Campus Communities
          </div>
          <h1 className="page-title">University Student Clubs</h1>
          <p className="page-subtitle">
            Join vibrant student organizations, develop leadership skills, and participate in exciting events.
          </p>
        </div>

        <button className="refresh-btn" onClick={fetchClubsData} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </header>

      {/* Content State */}
      {loading ? (
        <div className="state-container">
          <div className="spinner"></div>
          <p className="state-desc">Loading clubs from database...</p>
        </div>
      ) : error ? (
        <div className="state-container">
          <AlertCircle size={36} className="state-icon error" />
          <h3 className="state-title">Unable to Load Clubs</h3>
          <p className="state-desc">{error}</p>
          <button className="action-btn" onClick={fetchClubsData}>Try Again</button>
        </div>
      ) : clubs.length === 0 ? (
        <div className="state-container">
          <Users size={36} className="state-icon" />
          <h3 className="state-title">No Clubs Found</h3>
          <p className="state-desc">The clubs table is empty. Please run the seed script to populate clubs.</p>
          <button className="action-btn" onClick={fetchClubsData}>Refresh</button>
        </div>
      ) : (
        <div className="clubs-grid">
          {clubs.map(club => (
            <ClubCard key={club.club_id} club={club} />
          ))}
        </div>
      )}
    </div>
  );
}
