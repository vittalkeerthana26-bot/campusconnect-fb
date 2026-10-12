import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getComplaints, fileComplaint, updateComplaint, deleteComplaint } from '../services/api';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  Search, 
  MessageSquare, 
  Send, 
  Trash2, 
  X, 
  ShieldAlert, 
  RefreshCw,
  Edit3,
  RotateCcw,
  Check
} from 'lucide-react';

const CATEGORIES = ['All', 'Hostel', 'Academics', 'Infrastructure', 'Mess/Food', 'Library', 'Security', 'Other'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];

export default function Complaints() {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useUser();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // File Modal state
  const [showFileModal, setShowFileModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'Hostel',
    priority: 'Medium',
    description: ''
  });

  // Edit Modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    category: 'Hostel',
    priority: 'Medium',
    status: 'Pending',
    description: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Admin response modal / inline state
  const [activeRespondId, setActiveRespondId] = useState(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [adminStatusSelect, setAdminStatusSelect] = useState('In Progress');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchComplaintsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (selectedPriority !== 'All') params.priority = selectedPriority;
      if (search.trim()) params.search = search.trim();

      const data = await getComplaints(params);
      setComplaints(data);
    } catch (err) {
      console.error('Failed to load complaints:', err);
      setError(err.message || 'Could not load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintsList();
    const interval = setInterval(() => {
      fetchComplaintsList();
    }, 20000);
    return () => clearInterval(interval);
  }, [selectedCategory, selectedStatus, selectedPriority, search]);

  const handleFileComplaint = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await fileComplaint({
        title: form.title,
        category: form.category,
        priority: form.priority,
        description: form.description,
        student_id: currentUser?.id
      });
      setShowFileModal(false);
      setForm({ title: '', category: 'Hostel', priority: 'Medium', description: '' });
      setSuccessMsg('Complaint submitted successfully! Campus administration has been notified.');
      setTimeout(() => setSuccessMsg(''), 4500);
      fetchComplaintsList();
    } catch (err) {
      setError(err.message || 'Failed to file complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick mark as Solved / Reopen (ADMIN ONLY)
  const handleToggleSolved = async (item) => {
    if (!isAdmin) {
      setError("Permission Denied: Only administrators are authorized to mark complaints as solved.");
      return;
    }
    try {
      setUpdatingId(item.complaint_id);
      const newStatus = item.status === 'Resolved' ? 'In Progress' : 'Resolved';
      await updateComplaint(item.complaint_id, {
        status: newStatus,
        admin_response: item.status !== 'Resolved' && !item.admin_response 
          ? 'Marked as resolved by campus administration.' 
          : item.admin_response
      });
      setSuccessMsg(`Complaint status updated to: ${newStatus}`);
      setTimeout(() => setSuccessMsg(''), 3500);
      fetchComplaintsList();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Start Editing modal
  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      title: item.title,
      category: item.category,
      priority: item.priority,
      status: item.status,
      description: item.description
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSavingEdit(true);
      const payload = {
        title: editForm.title,
        category: editForm.category,
        priority: editForm.priority,
        description: editForm.description
      };
      if (isAdmin) {
        payload.status = editForm.status;
      }
      await updateComplaint(editingItem.complaint_id, payload);
      setEditingItem(null);
      setSuccessMsg('Complaint details updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3500);
      fetchComplaintsList();
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAdminUpdate = async (complaintId) => {
    try {
      setUpdatingId(complaintId);
      await updateComplaint(complaintId, {
        status: adminStatusSelect,
        admin_response: adminResponseText.trim() ? adminResponseText.trim() : undefined
      });
      setActiveRespondId(null);
      setAdminResponseText('');
      setSuccessMsg('Complaint status & response updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchComplaintsList();
    } catch (err) {
      setError(err.message || 'Failed to update complaint.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (complaintId) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;
    try {
      await deleteComplaint(complaintId);
      setSuccessMsg('Complaint deleted.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchComplaintsList();
    } catch (err) {
      setError(err.message || 'Could not delete complaint.');
    }
  };

  // Metrics
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return <span className="complaint-badge badge-resolved"><CheckCircle2 size={13} /> Resolved</span>;
      case 'In Progress':
        return <span className="complaint-badge badge-progress"><RefreshCw size={13} className="spin-slow" /> In Progress</span>;
      case 'Rejected':
        return <span className="complaint-badge badge-rejected"><X size={13} /> Rejected</span>;
      default:
        return <span className="complaint-badge badge-pending"><Clock size={13} /> Pending</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return <span className="priority-pill priority-urgent">🔴 Urgent</span>;
      case 'High':
        return <span className="priority-pill priority-high">🟠 High</span>;
      case 'Medium':
        return <span className="priority-pill priority-medium">🟡 Medium</span>;
      default:
        return <span className="priority-pill priority-low">🟢 Low</span>;
    }
  };

  return (
    <div className="page-wrapper complaints-page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div className="section-eyebrow">
            <ShieldAlert size={16} />
            <span>Campus Grievance Redressal</span>
          </div>
          <h1 className="page-title">Student Complaints & Help Desk</h1>
          <p className="page-subtitle">
            Submit, track, edit, and mark complaints as solved with transparent real-time updates.
          </p>
        </div>

        <div className="header-actions-row">
          <button 
            type="button" 
            className="btn btn-outline"
            onClick={fetchComplaintsList}
            disabled={loading}
            title="Sync live complaints"
          >
            <RefreshCw size={16} className={loading ? 'spin-slow' : ''} />
            <span>Sync</span>
          </button>
          <button 
            className="btn btn-primary file-complaint-btn"
            onClick={() => setShowFileModal(true)}
          >
            <PlusCircle size={18} />
            <span>File a Complaint</span>
          </button>
        </div>
      </div>

      {/* Quick Statistics Row */}
      <div className="complaint-stats-grid">
        <div className="complaint-stat-card">
          <span className="stat-label">Total Filed</span>
          <span className="stat-value">{totalCount}</span>
          <span className="stat-hint">Active grievance tickets</span>
        </div>
        <div className="complaint-stat-card stat-pending">
          <span className="stat-label">Pending Review</span>
          <span className="stat-value">{pendingCount}</span>
          <span className="stat-hint">Awaiting admin assessment</span>
        </div>
        <div className="complaint-stat-card stat-progress">
          <span className="stat-label">In Progress</span>
          <span className="stat-value">{inProgressCount}</span>
          <span className="stat-hint">Being actively investigated</span>
        </div>
        <div className="complaint-stat-card stat-resolved">
          <span className="stat-label">Resolved / Solved</span>
          <span className="stat-value">{resolvedCount}</span>
          <span className="stat-hint">Successfully completed</span>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="complaint-alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="complaint-alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="complaint-filters-bar">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search complaints by title, keyword, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-select-group">
          {/* Category Dropdown */}
          <div className="select-wrapper">
            <span className="select-label">Category:</span>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="select-wrapper">
            <span className="select-label">Status:</span>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {STATUSES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="select-wrapper">
            <span className="select-label">Priority:</span>
            <select 
              value={selectedPriority} 
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              {PRIORITIES.map(pr => (
                <option key={pr} value={pr}>{pr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="complaints-loading-state">
          <RefreshCw size={32} className="spin-slow" />
          <p>Loading complaints from database...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="complaints-empty-card">
          <CheckCircle2 size={44} className="empty-icon" />
          <h3>No Complaints Found</h3>
          <p>No complaints match your current filter criteria or none have been submitted yet.</p>
          <button 
            className="btn btn-outline"
            onClick={() => { setSelectedCategory('All'); setSelectedStatus('All'); setSelectedPriority('All'); setSearch(''); }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="complaints-card-list">
          {complaints.map((item) => {
            const isOwner = currentUser?.id && String(currentUser.id) === String(item.student_id);
            const canModify = isAdmin || isOwner;

            return (
              <div key={item.complaint_id} className={`complaint-item-card status-${item.status.toLowerCase().replace(' ', '-')}`}>
                <div className="card-top-row">
                  <div className="badges-cluster">
                    {getStatusBadge(item.status)}
                    {getPriorityBadge(item.priority)}
                    <span className="category-tag">{item.category}</span>
                  </div>

                  <div className="meta-timestamp">
                    <Clock size={13} />
                    <span>
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    {canModify && (
                      <button 
                        className="delete-complaint-btn"
                        onClick={() => handleDelete(item.complaint_id)}
                        title="Delete this complaint"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="complaint-card-title">{item.title}</h3>
                <p className="complaint-card-desc">{item.description}</p>

                {/* Student Info Footer */}
                <div className="card-student-info">
                  <span className="student-author-tag">
                    👤 Filed by: <strong>{item.student_name}</strong>
                    {item.student_department && ` (${item.student_department})`}
                  </span>
                </div>

                {/* Admin Official Response Box */}
                {item.admin_response && (
                  <div className="admin-response-box">
                    <div className="response-header">
                      <ShieldAlert size={15} />
                      <strong>Official University Administration Response:</strong>
                    </div>
                    <p className="response-content">{item.admin_response}</p>
                  </div>
                )}

                {/* Action Controls */}
                <div className="card-action-bar">
                  <div className="quick-action-btns">
                    {/* Mark as Solved / Reopen Button (ADMIN ONLY) */}
                    {isAdmin ? (
                      <button 
                        className={`btn btn-sm ${item.status === 'Resolved' ? 'btn-outline reopen-btn' : 'btn-success solve-btn'}`}
                        disabled={updatingId === item.complaint_id}
                        onClick={() => handleToggleSolved(item)}
                        title={item.status === 'Resolved' ? 'Reopen this ticket' : 'Mark issue as solved'}
                      >
                        {item.status === 'Resolved' ? (
                          <>
                            <RotateCcw size={14} />
                            <span>Reopen Ticket (Admin)</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Mark as Solved (Admin)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="student-status-indicator">
                        <span className="status-note">
                          Resolution status is managed by Campus Administration.
                        </span>
                      </div>
                    )}

                    {/* Edit Details Button (Filing Student or Admin) */}
                    {canModify && (
                      <button 
                        className="btn btn-outline btn-sm edit-btn"
                        onClick={() => openEditModal(item)}
                        title="Edit title, description, or category"
                      >
                        <Edit3 size={14} />
                        <span>Edit Details</span>
                      </button>
                    )}
                  </div>


                  {/* Admin Specific Detailed Response Control */}
                  {isAdmin && (
                    <div className="admin-controls-panel">
                      {activeRespondId === item.complaint_id ? (
                        <div className="admin-inline-editor">
                          <div className="editor-row">
                            <label>Update Status:</label>
                            <select 
                              value={adminStatusSelect}
                              onChange={(e) => setAdminStatusSelect(e.target.value)}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>
                          <div className="editor-row">
                            <label>Official Resolution / Response Note:</label>
                            <textarea 
                              rows={3}
                              placeholder="Write official response to student..."
                              value={adminResponseText}
                              onChange={(e) => setAdminResponseText(e.target.value)}
                            />
                          </div>
                          <div className="editor-actions">
                            <button 
                              className="btn btn-primary btn-sm"
                              disabled={updatingId === item.complaint_id}
                              onClick={() => handleAdminUpdate(item.complaint_id)}
                            >
                              {updatingId === item.complaint_id ? 'Saving...' : 'Save & Publish Response'}
                            </button>
                            <button 
                              className="btn btn-outline btn-sm"
                              onClick={() => setActiveRespondId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          className="btn btn-outline btn-sm admin-respond-btn"
                          onClick={() => {
                            setActiveRespondId(item.complaint_id);
                            setAdminStatusSelect(item.status);
                            setAdminResponseText(item.admin_response || '');
                          }}
                        >
                          <MessageSquare size={14} />
                          <span>{item.admin_response ? 'Edit Admin Response' : 'Respond as Administrator'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* File Complaint Modal */}
      {showFileModal && (
        <div className="complaint-modal-overlay">
          <div className="complaint-modal-box">
            <div className="modal-header">
              <div className="modal-title-group">
                <ShieldAlert size={20} className="modal-icon" />
                <h2>File a Campus Grievance / Complaint</h2>
              </div>
              <button 
                className="close-modal-btn" 
                onClick={() => setShowFileModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFileComplaint} className="complaint-modal-form">
              <div className="form-group">
                <label>Issue Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Wi-Fi Connectivity Drop in Hostel Block C"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Category *</label>
                  <select 
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="Hostel">Hostel & Accommodation</option>
                    <option value="Academics">Academics & Classes</option>
                    <option value="Infrastructure">Infrastructure & Labs</option>
                    <option value="Mess/Food">Mess & Food Quality</option>
                    <option value="Library">Library & Reading Rooms</option>
                    <option value="Security">Campus Security</option>
                    <option value="Other">Other / General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority Level *</label>
                  <select 
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="Low">Low - Informational / Non-urgent</option>
                    <option value="Medium">Medium - Regular Priority</option>
                    <option value="High">High - Impairing Study / Life</option>
                    <option value="Urgent">Urgent - Safety or Critical Outage</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Detailed Description *</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Describe the problem, specific room/lab location, timing, and any relevant details..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="modal-footer-actions">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => setShowFileModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  <Send size={16} />
                  <span>{submitting ? 'Submitting...' : 'Submit Complaint'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Complaint Modal */}
      {editingItem && (
        <div className="complaint-modal-overlay">
          <div className="complaint-modal-box">
            <div className="modal-header">
              <div className="modal-title-group">
                <Edit3 size={20} className="modal-icon" />
                <h2>Edit Complaint #{editingItem.complaint_id}</h2>
              </div>
              <button 
                className="close-modal-btn" 
                onClick={() => setEditingItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="complaint-modal-form">
              <div className="form-group">
                <label>Issue Title *</label>
                <input 
                  type="text" 
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Category *</label>
                  <select 
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  >
                    <option value="Hostel">Hostel & Accommodation</option>
                    <option value="Academics">Academics & Classes</option>
                    <option value="Infrastructure">Infrastructure & Labs</option>
                    <option value="Mess/Food">Mess & Food Quality</option>
                    <option value="Library">Library & Reading Rooms</option>
                    <option value="Security">Campus Security</option>
                    <option value="Other">Other / General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  {isAdmin ? (
                    <select 
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved (Solved)</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  ) : (
                    <div className="status-locked-indicator">
                      🔒 <strong>{editForm.status}</strong> (Managed by Campus Administration)
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Priority Level *</label>
                <select 
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label>Detailed Description *</label>
                <textarea 
                  rows={4}
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div className="modal-footer-actions">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  <Check size={16} />
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
