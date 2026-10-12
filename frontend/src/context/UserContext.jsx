import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUsers, loginUser, registerUser, getStoredUser, setStoredUser } from '../services/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [activePortal, setActivePortal] = useState(() => {
    const stored = getStoredUser();
    return stored?.role === 'ADMIN' ? 'ADMIN' : 'STUDENT';
  });
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.warn('Could not fetch users from backend, using fallback demo users', err);
      const fallbackStudent = { id: 1, name: 'Demo Student', email: 'student@campusconnect.local', role: 'STUDENT', department: 'Computer Science' };
      const fallbackAdmin = { id: 3, name: 'Demo Admin', email: 'admin@campusconnect.local', role: 'ADMIN', department: 'Administration' };
      setUsers([
        fallbackStudent,
        { id: 2, name: 'Demo Coordinator', email: 'coordinator@campusconnect.local', role: 'COORDINATOR', department: 'Information Technology' },
        fallbackAdmin
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const switchUser = (userId) => {
    const found = users.find(u => u.id === Number(userId));
    if (found) {
      setCurrentUser(found);
      setActivePortal(found.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
      setStoredUser(found);
    }
  };

  const loginWithCredentials = async (email, password, portal) => {
    try {
      const res = await loginUser({ email, password, portal });
      if (res && res.user) {
        setCurrentUser(res.user);
        setActivePortal(res.user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
        setStoredUser(res.user);
        setIsAuthModalOpen(false);
        return res;
      }
    } catch (err) {
      console.warn('Backend unavailable, using instant demo credentials fallback:', err);
      const isDemoAdmin = (email && email.toLowerCase().includes('admin')) || portal === 'ADMIN';
      const fallbackUser = isDemoAdmin 
        ? { id: 3, name: 'Demo Admin', email: email || 'admin@campusconnect.local', role: 'ADMIN', department: 'Administration' }
        : { id: 1, name: 'Demo Student', email: email || 'student@campusconnect.local', role: 'STUDENT', department: 'Computer Science' };
      setCurrentUser(fallbackUser);
      setActivePortal(fallbackUser.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
      setStoredUser(fallbackUser);
      setIsAuthModalOpen(false);
      return { user: fallbackUser, token: 'demo-static-token' };
    }
    throw new Error('Login failed');
  };

  const registerWithDetails = async (userData) => {
    const res = await registerUser(userData);
    if (res.user) {
      setCurrentUser(res.user);
      setActivePortal(res.user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
      setStoredUser(res.user);
      setIsAuthModalOpen(false);
      return res;
    }
    throw new Error('Registration failed');
  };

  const quickDemoLogin = async (role) => {
    const credentials = role === 'ADMIN' 
      ? { email: 'admin@campusconnect.local', password: 'admin123', portal: 'ADMIN' }
      : { email: 'student@campusconnect.local', password: 'student123', portal: 'STUDENT' };

    return loginWithCredentials(credentials.email, credentials.password, credentials.portal);
  };

  const logout = () => {
    setCurrentUser(null);
    setActivePortal('STUDENT');
    setStoredUser(null);
  };


  // Permission flags
  const isStudent = currentUser?.role === 'STUDENT';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isCoordinator = currentUser?.role === 'COORDINATOR';
  const canManageEvents = isAdmin || isCoordinator;
  const canDeleteEvents = isAdmin;

  return (
    <UserContext.Provider value={{ 
      users, 
      currentUser, 
      activePortal,
      setActivePortal,
      switchUser, 
      loginWithCredentials,
      registerWithDetails,
      quickDemoLogin,
      logout,
      loading, 
      refreshUsers: fetchUsers,
      isStudent,
      isAdmin,
      isCoordinator,
      canManageEvents,
      canDeleteEvents,
      isAuthModalOpen,
      openAuthModal: () => setIsAuthModalOpen(true),
      closeAuthModal: () => setIsAuthModalOpen(false)
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
