import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { 
  Sparkles, 
  Lock, 
  Mail, 
  User, 
  Building, 
  Calendar, 
  Shield, 
  GraduationCap, 
  Copy, 
  Check, 
  ArrowRight, 
  KeyRound, 
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithCredentials, registerWithDetails, currentUser } = useUser();

  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science');
  const [regYear, setRegYear] = useState(3);
  const [regRole, setRegRole] = useState('STUDENT');

  const demoAccounts = [
    {
      id: 'student',
      title: 'Student Account',
      role: 'STUDENT',
      icon: GraduationCap,
      badgeClass: 'badge-student',
      email: 'student@campusconnect.local',
      password: 'student123',
      description: 'Standard campus access: event registrations, clubs, AI chatbot, and filing complaints.',
      color: '#3b82f6'
    },
    {
      id: 'admin',
      title: 'Administrator Account',
      role: 'ADMIN',
      icon: Shield,
      badgeClass: 'badge-admin',
      email: 'admin@campusconnect.local',
      password: 'admin123',
      description: 'Full campus control: manage events, resolve grievances & complaints, oversee clubs.',
      color: '#8b5cf6'
    }
  ];

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleQuickFill = (acc) => {
    setActiveTab('login');
    setLoginEmail(acc.email);
    setLoginPassword(acc.password);
    setErrorMessage('');
    setSuccessMessage(`Credentials filled for ${acc.title}. Click "Sign In" or instant access.`);
  };

  const handleQuickSignIn = async (acc) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await loginWithCredentials(acc.email, acc.password, acc.role);
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Quick login failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await loginWithCredentials(loginEmail.trim(), loginPassword, null);
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await registerWithDetails({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        department: regDepartment,
        year: regYear,
        role: regRole
      });
      setSuccessMessage('Registration successful! Redirecting to campus portal...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Email might already be registered in database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-layout">
        
        {/* Left Side: Auth Forms */}
        <div className="auth-form-card">
          <div className="auth-brand-header">
            <div className="auth-logo-badge">
              <Sparkles size={24} className="text-primary-glow" />
            </div>
            <div>
              <h1 className="auth-app-title">CampusConnect</h1>
              <p className="auth-app-subtitle">KL University Centralized Academic Portal</p>
            </div>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
            >
              <KeyRound size={17} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
              }}
            >
              <User size={17} />
              <span>Create Account</span>
            </button>
          </div>

          {errorMessage && (
            <div className="auth-alert-box alert-error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert-box alert-success">
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="auth-form-body">
              <div className="auth-input-group">
                <label className="auth-input-label">Campus Email Address</label>
                <div className="auth-input-container">
                  <Mail className="auth-field-icon" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. student@campusconnect.local"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="auth-input-field"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Password</label>
                <div className="auth-input-container">
                  <Lock className="auth-field-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="auth-input-field"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-submit-btn btn-primary"
              >
                {loading ? (
                  <span className="auth-btn-spinner">Signing in...</span>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="auth-form-footer-tip">
                <span>New student or staff member? </span>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => setActiveTab('register')}
                >
                  Create an account
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="auth-form-body">
              <div className="auth-input-group">
                <label className="auth-input-label">Full Name</label>
                <div className="auth-input-container">
                  <User className="auth-field-icon" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="auth-input-field"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Campus Email Address</label>
                <div className="auth-input-container">
                  <Mail className="auth-field-icon" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. john@campusconnect.local"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="auth-input-field"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Password</label>
                <div className="auth-input-container">
                  <Lock className="auth-field-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="auth-input-field"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-input-row">
                <div className="auth-input-group">
                  <label className="auth-input-label">Department</label>
                  <div className="auth-input-container">
                    <Building className="auth-field-icon" size={18} />
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="auth-input-field auth-select"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics & Comm">Electronics & Comm</option>
                      <option value="Mechanical Eng">Mechanical Eng</option>
                      <option value="Biotechnology">Biotechnology</option>
                      <option value="Administration">Administration</option>
                    </select>
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-input-label">Academic Year</label>
                  <div className="auth-input-container">
                    <Calendar className="auth-field-icon" size={18} />
                    <select
                      value={regYear}
                      onChange={(e) => setRegYear(parseInt(e.target.value, 10))}
                      className="auth-input-field auth-select"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="auth-student-only-banner">
                <div className="student-badge-pill">
                  <GraduationCap size={16} />
                  <span>Student Portal Account</span>
                </div>
                <p className="student-badge-caption">
                  Self-registration is strictly for students to access events, clubs, AI assistance, and file complaints. Administrator accounts are pre-authorized by university administration.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-submit-btn btn-primary"
              >
                {loading ? (
                  <span className="auth-btn-spinner">Registering student account...</span>
                ) : (
                  <>
                    <span>Create Student Account</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="auth-form-footer-tip">
                <span>Already have an account? </span>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => setActiveTab('login')}
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: Demo Credentials Box */}
        <div className="demo-credentials-panel">
          <div className="demo-panel-header">
            <div className="demo-tag">
              <Zap size={14} />
              <span>LIVE DEMO ACCESS</span>
            </div>
            <h2 className="demo-panel-title">Dummy Credentials Box</h2>
            <p className="demo-panel-desc">
              Instant copy-paste credentials configured in the PostgreSQL database for testing & evaluation.
            </p>
          </div>

          <div className="demo-accounts-list">
            {demoAccounts.map((acc) => {
              const Icon = acc.icon;
              const isEmailCopied = copiedKey === `${acc.id}-email`;
              const isPasswordCopied = copiedKey === `${acc.id}-password`;

              return (
                <div key={acc.id} className="demo-account-card">
                  <div className="demo-card-top">
                    <div className="demo-role-badge">
                      <Icon size={16} />
                      <span>{acc.title}</span>
                    </div>
                    <span className="demo-role-tag">{acc.role}</span>
                  </div>

                  <p className="demo-card-desc">{acc.description}</p>

                  <div className="demo-credential-rows">
                    {/* Email item */}
                    <div className="demo-credential-item">
                      <div className="credential-label-val">
                        <span className="credential-label">Email:</span>
                        <code className="credential-value">{acc.email}</code>
                      </div>
                      <button
                        type="button"
                        className={`credential-copy-btn ${isEmailCopied ? 'copied' : ''}`}
                        onClick={() => handleCopy(acc.email, `${acc.id}-email`)}
                        title="Copy Email"
                      >
                        {isEmailCopied ? (
                          <>
                            <Check size={14} />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Password item */}
                    <div className="demo-credential-item">
                      <div className="credential-label-val">
                        <span className="credential-label">Password:</span>
                        <code className="credential-value">{acc.password}</code>
                      </div>
                      <button
                        type="button"
                        className={`credential-copy-btn ${isPasswordCopied ? 'copied' : ''}`}
                        onClick={() => handleCopy(acc.password, `${acc.id}-password`)}
                        title="Copy Password"
                      >
                        {isPasswordCopied ? (
                          <>
                            <Check size={14} />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="demo-card-actions">
                    <button
                      type="button"
                      className="demo-autofill-btn"
                      onClick={() => handleQuickFill(acc)}
                    >
                      Paste to Form
                    </button>
                    <button
                      type="button"
                      className="demo-quick-login-btn"
                      onClick={() => handleQuickSignIn(acc)}
                      disabled={loading}
                    >
                      <span>1-Click Sign In</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="demo-panel-footer">
            <div className="db-sync-indicator">
              <span className="db-status-dot"></span>
              <span>PostgreSQL Database Connected (campusconnect)</span>
            </div>
            <p className="db-sync-note">
              Registrations made via "Create Account" are committed directly into PostgreSQL table <code>users</code>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
