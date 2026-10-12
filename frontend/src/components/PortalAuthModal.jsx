import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { 
  ShieldCheck, 
  GraduationCap, 
  Lock, 
  Mail, 
  KeyRound, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function PortalAuthModal() {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    loginWithCredentials, 
    quickDemoLogin,
    currentUser,
    activePortal 
  } = useUser();

  const [selectedTab, setSelectedTab] = useState(activePortal || 'STUDENT');
  const [email, setEmail] = useState(selectedTab === 'ADMIN' ? 'admin@campusconnect.local' : 'student@campusconnect.local');
  const [password, setPassword] = useState(selectedTab === 'ADMIN' ? 'admin123' : 'student123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isAuthModalOpen) return null;

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setError(null);
    setSuccess(null);
    if (tab === 'STUDENT') {
      setEmail('student@campusconnect.local');
      setPassword('student123');
    } else {
      setEmail('admin@campusconnect.local');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await loginWithCredentials(email, password, selectedTab);
      setSuccess(`Authenticated as ${res.user.name} (${res.user.role})`);
      setTimeout(() => {
        closeAuthModal();
      }, 700);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    setLoading(true);
    setError(null);
    try {
      await quickDemoLogin(role);
      closeAuthModal();
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop-overlay" onClick={closeAuthModal}>
      <div className="portal-auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-icon-btn" onClick={closeAuthModal} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="auth-header-section">
          <div className="auth-brand-badge">
            <Sparkles size={16} /> CampusConnect Access Control
          </div>
          <h2 className="auth-modal-title">Select Portal & Credentials</h2>
          <p className="auth-modal-subtitle">
            Switch between Student and Admin portals to verify role-based permissions.
          </p>
        </div>

        {/* Portal Tabs */}
        <div className="portal-switcher-tabs">
          <button 
            type="button"
            className={`portal-tab-btn ${selectedTab === 'STUDENT' ? 'active student' : ''}`}
            onClick={() => handleTabChange('STUDENT')}
          >
            <GraduationCap size={18} />
            <div className="tab-text-block">
              <span className="tab-title">Student Portal</span>
              <span className="tab-sub">Browse, Register, AI Chatbot</span>
            </div>
          </button>

          <button 
            type="button"
            className={`portal-tab-btn ${selectedTab === 'ADMIN' ? 'active admin' : ''}`}
            onClick={() => handleTabChange('ADMIN')}
          >
            <ShieldCheck size={18} />
            <div className="tab-text-block">
              <span className="tab-title">Admin Portal</span>
              <span className="tab-sub">Manage & Delete Events</span>
            </div>
          </button>
        </div>

        {/* Quick Demo Access Box */}
        <div className="quick-credentials-callout">
          <div className="credentials-box-header">
            <KeyRound size={15} />
            <span>Preset Demo Credentials for Testing</span>
          </div>
          <div className="credentials-table">
            <div className={`cred-row ${selectedTab === 'STUDENT' ? 'highlight' : ''}`}>
              <strong>🎓 Student:</strong> <code>student@campusconnect.local</code> / <code>student123</code>
            </div>
            <div className={`cred-row ${selectedTab === 'ADMIN' ? 'highlight' : ''}`}>
              <strong>🛡️ Admin:</strong> <code>admin@campusconnect.local</code> / <code>admin123</code>
            </div>
          </div>
          <div className="quick-actions-row">
            <button 
              type="button"
              className={`quick-login-chip ${selectedTab === 'STUDENT' ? 'primary' : ''}`}
              onClick={() => handleQuickDemo('STUDENT')}
              disabled={loading}
            >
              1-Click Student Login <ArrowRight size={14} />
            </button>
            <button 
              type="button"
              className={`quick-login-chip ${selectedTab === 'ADMIN' ? 'primary' : ''}`}
              onClick={() => handleQuickDemo('ADMIN')}
              disabled={loading}
            >
              1-Click Admin Login <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Role Permissions Notice */}
        <div className="permissions-notice-box">
          {selectedTab === 'STUDENT' ? (
            <div className="role-rule student-rule">
              <AlertCircle size={15} className="rule-icon" />
              <span>
                <strong>Student Restrictions:</strong> Students can register for events, search lost items, and use the AI Agent. 
                <span className="restriction-alert"> Students are NOT permitted to delete or edit events.</span>
              </span>
            </div>
          ) : (
            <div className="role-rule admin-rule">
              <CheckCircle2 size={15} className="rule-icon" />
              <span>
                <strong>Admin Privileges:</strong> Full administrative rights to create new events, edit event rosters, and <strong>delete events</strong>.
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="auth-alert-message error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-alert-message success">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="auth-credentials-form">
          <div className="form-group-field">
            <label className="field-label">Email / Demo ID</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input 
                type="email"
                required
                className="form-input-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter demo ID or email"
              />
            </div>
          </div>

          <div className="form-group-field">
            <label className="field-label">Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input 
                type="password"
                required
                className="form-input-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn" 
            disabled={loading}
          >
            {loading ? 'Authenticating...' : `Enter ${selectedTab === 'ADMIN' ? 'Admin Portal' : 'Student Portal'}`}
          </button>
        </form>
      </div>
    </div>
  );
}
