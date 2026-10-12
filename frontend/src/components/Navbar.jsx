import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Compass, 
  Calendar, 
  Users, 
  BookmarkCheck, 
  Bot, 
  Camera, 
  CalendarPlus, 
  Shield, 
  GraduationCap, 
  Sparkles, 
  ShieldAlert,
  LogOut,
  KeyRound,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  ChevronDown,
  Check
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentUser, 
    isAdmin, 
    isStudent, 
    logout
  } = useUser();

  const { theme, resolvedTheme, setTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setThemeDropdownOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const themeOptions = [
    { key: 'light', label: 'Light Theme', icon: Sun },
    { key: 'dark', label: 'Dark Theme', icon: Moon },
    { key: 'system', label: 'System Theme', icon: Monitor }
  ];

  const currentThemeIcon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  const CurrentIcon = currentThemeIcon;

  return (
    <>
      <header className="navbar-wrapper">
        <div className="navbar-container">
          {/* Brand */}
          <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
            <div className="brand-icon-wrapper">
              <Sparkles className="brand-icon" size={20} />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">CampusConnect</span>
              <span className="brand-tagline">KL University</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-links desktop-only-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Compass size={17} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Calendar size={17} />
              <span>Events</span>
            </NavLink>

            <NavLink to="/clubs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={17} />
              <span>Clubs</span>
            </NavLink>

            {/* AI Campus Agent Chatbot */}
            <NavLink to="/chatbot" className={({ isActive }) => `nav-link ai-nav-link ${isActive ? 'active' : ''}`}>
              <Bot size={17} className="ai-nav-icon" />
              <span>AI Chatbot</span>
              <span className="ai-pill-tag">Agent</span>
            </NavLink>

            {/* AI Image Search & Lost-and-Found */}
            <NavLink to="/lost-found" className={({ isActive }) => `nav-link ai-nav-link ${isActive ? 'active' : ''}`}>
              <Camera size={17} className="ai-nav-icon" />
              <span>AI Image Search</span>
              <span className="ai-pill-tag">Vision</span>
            </NavLink>

            {/* Student Registrations (Students only) */}
            {isStudent && (
              <NavLink to="/my-registrations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookmarkCheck size={17} />
                <span>My Registrations</span>
              </NavLink>
            )}

            {/* Grievances & Complaints */}
            <NavLink to="/complaints" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ShieldAlert size={17} />
              <span>Complaints</span>
            </NavLink>

            {/* Manage Events (Admin only) */}
            {isAdmin && (
              <NavLink to="/manage-events" className={({ isActive }) => `nav-link manage-link ${isActive ? 'active' : ''}`}>
                <CalendarPlus size={17} />
                <span>Manage Events</span>
                <span className="admin-badge-mini">Admin</span>
              </NavLink>
            )}
          </nav>

          {/* Desktop Right Controls (Theme + User Badge + Logout) */}
          <div className="nav-user-control desktop-only-controls">
            {/* Theme Selector Segment / Dropdown */}
            <div className="theme-selector-container">
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                aria-label="Toggle theme selection"
                title={`Active Theme: ${theme.toUpperCase()} (${resolvedTheme} mode)`}
              >
                <CurrentIcon size={16} className="theme-toggle-icon" />
                <span className="theme-toggle-label">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                <ChevronDown size={13} className={`theme-chevron ${themeDropdownOpen ? 'rotated' : ''}`} />
              </button>

              {themeDropdownOpen && (
                <>
                  <div className="theme-dropdown-backdrop" onClick={() => setThemeDropdownOpen(false)} />
                  <div className="theme-dropdown-menu">
                    <div className="theme-dropdown-header">Appearance</div>
                    {themeOptions.map((opt) => {
                      const OptIcon = opt.icon;
                      const isSelected = theme === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={`theme-dropdown-item ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setTheme(opt.key);
                            setThemeDropdownOpen(false);
                          }}
                        >
                          <OptIcon size={15} />
                          <span>{opt.label}</span>
                          {isSelected && <Check size={14} className="theme-check-icon" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Locked User Badge & Logout Group */}
            <div className="user-badge-logout-group">
              <div 
                className={`portal-status-badge locked-session ${isAdmin ? 'admin-mode' : 'student-mode'}`}
                title={`Active Session: ${currentUser ? currentUser.name : 'User'} (${isAdmin ? 'Admin' : 'Student'})`}
              >
                <div className="portal-icon-wrapper">
                  {isAdmin ? <Shield size={16} /> : <GraduationCap size={16} />}
                </div>
                <div className="portal-info-summary">
                  <span className="portal-role-label">
                    {isAdmin ? '🛡️ Admin' : '🎓 Student'}
                  </span>
                  <span className="portal-user-name">
                    {currentUser ? currentUser.name : 'User'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="navbar-logout-btn"
                onClick={handleLogout}
                title="Log out of session"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Right Controls: Theme Quick Button + Direct Logout + Hamburger Toggle */}
          <div className="mobile-header-actions">
            <button
              type="button"
              className="mobile-quick-theme-btn"
              onClick={() => {
                const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
                setTheme(next);
              }}
              aria-label="Cycle theme"
              title={`Current: ${theme}. Click to change.`}
            >
              <CurrentIcon size={18} />
            </button>

            <button
              type="button"
              className="mobile-header-logout-btn"
              onClick={handleLogout}
              aria-label="Log out of session"
              title="Log out of session"
            >
              <LogOut size={18} />
            </button>

            <button
              type="button"
              className="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="mobile-drawer-brand">
                <div className="brand-icon-wrapper mini">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="drawer-brand-title">CampusConnect</div>
                  <div className="drawer-brand-sub">KL University Portal</div>
                </div>
              </div>
              <button 
                type="button" 
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Active User Summary in Drawer */}
            <div className={`drawer-user-card ${isAdmin ? 'admin-mode' : 'student-mode'}`}>
              <div className="drawer-user-icon">
                {isAdmin ? <Shield size={18} /> : <GraduationCap size={18} />}
              </div>
              <div className="drawer-user-details">
                <span className="drawer-user-role">
                  {isAdmin ? '🛡️ Administrator Portal' : '🎓 Student Portal'}
                </span>
                <span className="drawer-user-name">
                  {currentUser ? currentUser.name : 'Active User'}
                </span>
                <span className="drawer-user-email">
                  {currentUser?.email || ''}
                </span>
              </div>
            </div>

            {/* Theme Selector in Mobile Drawer */}
            <div className="drawer-theme-section">
              <span className="drawer-section-title">Theme / Appearance</span>
              <div className="drawer-theme-segment">
                {themeOptions.map((opt) => {
                  const OptIcon = opt.icon;
                  const isSelected = theme === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`drawer-theme-pill ${isSelected ? 'active' : ''}`}
                      onClick={() => setTheme(opt.key)}
                    >
                      <OptIcon size={14} />
                      <span>{opt.label.replace(' Theme', '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Nav Links */}
            <div className="drawer-links-section">
              <span className="drawer-section-title">Navigation</span>
              <nav className="mobile-drawer-nav">
                <NavLink 
                  to="/" 
                  end 
                  className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Compass size={18} />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink 
                  to="/events" 
                  className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Calendar size={18} />
                  <span>Campus Events</span>
                </NavLink>

                <NavLink 
                  to="/clubs" 
                  className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users size={18} />
                  <span>Student Clubs</span>
                </NavLink>

                <NavLink 
                  to="/chatbot" 
                  className={({ isActive }) => `drawer-nav-item ai-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Bot size={18} />
                  <div className="drawer-item-content">
                    <span>AI Campus Agent</span>
                    <span className="ai-pill-tag">Chatbot</span>
                  </div>
                </NavLink>

                <NavLink 
                  to="/lost-found" 
                  className={({ isActive }) => `drawer-nav-item ai-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Camera size={18} />
                  <div className="drawer-item-content">
                    <span>AI Image Search</span>
                    <span className="ai-pill-tag">Vision</span>
                  </div>
                </NavLink>

                {isStudent && (
                  <NavLink 
                    to="/my-registrations" 
                    className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookmarkCheck size={18} />
                    <span>My Registrations</span>
                  </NavLink>
                )}

                <NavLink 
                  to="/complaints" 
                  className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShieldAlert size={18} />
                  <span>Grievances & Complaints</span>
                </NavLink>

                {isAdmin && (
                  <NavLink 
                    to="/manage-events" 
                    className={({ isActive }) => `drawer-nav-item admin-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <CalendarPlus size={18} />
                    <div className="drawer-item-content">
                      <span>Manage Events</span>
                      <span className="admin-badge-mini">Admin</span>
                    </div>
                  </NavLink>
                )}
              </nav>
            </div>

            {/* Mobile Drawer Footer Actions */}
            <div className="mobile-drawer-footer">
              <NavLink
                to="/login"
                className="drawer-action-btn login-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <KeyRound size={16} />
                <span>Login & Credentials</span>
              </NavLink>

              <button
                type="button"
                className="drawer-action-btn logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
