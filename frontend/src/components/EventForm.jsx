import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, FileText, AlertCircle } from 'lucide-react';
import { getClubs } from '../services/api';

export default function EventForm({ 
  isOpen = true, 
  onClose, 
  onSubmit, 
  initialData = null, 
  event = null, 
  title 
}) {
  const currentEvent = initialData || event;
  const modalTitle = title || (currentEvent ? "Edit Event" : "Create Event");

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    club_id: '',
    event_date: '',
    location: '',
    capacity: 50,
  });

  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadClubs() {
      try {
        setLoadingClubs(true);
        const data = await getClubs();
        if (!isMounted) return;
        setClubs(data);
        if (!currentEvent && data.length > 0) {
          setFormData(prev => ({ 
            ...prev, 
            club_id: prev.club_id || data[0].club_id 
          }));
        }
      } catch (err) {
        console.error('Failed to load clubs:', err);
      } finally {
        if (isMounted) setLoadingClubs(false);
      }
    }

    if (isOpen !== false) {
      loadClubs();
      if (currentEvent) {
        // Format ISO date to YYYY-MM-DDTHH:MM for datetime-local input
        let dateVal = '';
        if (currentEvent.event_date) {
          const d = new Date(currentEvent.event_date);
          const offset = d.getTimezoneOffset() * 60000;
          dateVal = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
        }
        setFormData({
          title: currentEvent.title || '',
          description: currentEvent.description || '',
          club_id: currentEvent.club_id || '',
          event_date: dateVal,
          location: currentEvent.location || '',
          capacity: currentEvent.capacity || 50,
        });
      } else {
        // Default to a future date: 7 days from now at 10:00 AM
        const future = new Date();
        future.setDate(future.getDate() + 7);
        future.setHours(10, 0, 0, 0);
        const offset = future.getTimezoneOffset() * 60000;
        const dateVal = (new Date(future.getTime() - offset)).toISOString().slice(0, 16);
        setFormData({
          title: '',
          description: '',
          club_id: '',
          event_date: dateVal,
          location: '',
          capacity: 50,
        });
      }
      setFormError(null);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentEvent]);

  if (isOpen === false) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' || name === 'club_id' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.title.trim()) {
      setFormError('Event title is required');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Event description is required');
      return;
    }
    if (!formData.club_id) {
      setFormError('Please select a valid club');
      return;
    }
    if (!formData.event_date) {
      setFormError('Valid event date and time are required');
      return;
    }
    if (!formData.location.trim()) {
      setFormError('Event location is required');
      return;
    }
    if (!formData.capacity || Number(formData.capacity) <= 0) {
      setFormError('Capacity must be greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        ...formData,
        event_date: new Date(formData.event_date).toISOString(),
      });
      if (onClose) onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{modalTitle}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {formError && (
          <div className="form-error-banner">
            <AlertCircle size={18} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g. AI & Machine Learning Hackathon"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="club_id">Organizing Club *</label>
              <select
                id="club_id"
                name="club_id"
                value={formData.club_id}
                onChange={handleChange}
                required
                disabled={loadingClubs}
              >
                <option value="" disabled>Select a Club</option>
                {clubs.map(c => (
                  <option key={c.club_id} value={c.club_id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label htmlFor="capacity">Capacity (Seats) *</label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                min="1"
                placeholder="e.g. 100"
                value={formData.capacity}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="event_date">Date & Time *</label>
              <input
                type="datetime-local"
                id="event_date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="location">Location / Venue *</label>
              <input
                type="text"
                id="location"
                name="location"
                placeholder="e.g. Main Auditorium / Seminar Hall"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Event Description *</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              placeholder="Provide event details, schedule, prerequisites, and highlights..."
              value={formData.description}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
