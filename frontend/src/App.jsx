import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Clubs from './pages/Clubs';
import MyRegistrations from './pages/MyRegistrations';
import ManageEvents from './pages/ManageEvents';
import AIChatbot from './pages/AIChatbot';
import AIImageSearch from './pages/AIImageSearch';
import Complaints from './pages/Complaints';
import Login from './pages/Login';

function AppContent() {
  const { currentUser, loading } = useUser();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner"></div>
        <p className="auth-loading-text">Connecting to CampusConnect Database...</p>
      </div>
    );
  }

  // If user is not logged in, enforce login page first
  if (!currentUser) {
    return (
      <div className="campus-app-layout unauthenticated-layout">
        <main className="auth-main-area">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    );
  }

  // Authenticated layout
  return (
    <div className="campus-app-layout">
      <Navbar />
      <main className="main-content-area">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/chatbot" element={<AIChatbot />} />
          <Route path="/lost-found" element={<AIImageSearch />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/my-registrations" element={<MyRegistrations />} />
          <Route path="/manage-events" element={<ManageEvents />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="campus-footer">
        <div className="footer-inner">
          <p className="footer-brand">
            <strong>CampusConnect</strong> • KL University Centralized Platform
          </p>
          <p className="footer-note">
            AI Agent Chatbot, Visual Image Search, and Role-Based Student & Admin Portals Active.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <AppContent />
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
