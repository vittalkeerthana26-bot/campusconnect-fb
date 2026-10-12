import { firebaseDB } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'firebase://campusconnect';

/**
 * Storage helpers for current user context (session-scoped)
 */
export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem('campus_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    localStorage.removeItem('campus_user');
    if (user) {
      sessionStorage.setItem('campus_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('campus_user');
    }
  } catch (e) {}
}

// ---------------- Authentication API (Firebase) ----------------
export async function loginUser(credentials) {
  return firebaseDB.loginUser(credentials);
}

export async function registerUser(userData) {
  return firebaseDB.registerUser(userData);
}

export async function getCurrentUser() {
  const stored = getStoredUser();
  if (stored) {
    return firebaseDB.getUser(stored.id);
  }
  return null;
}

// ---------------- Clubs API (Firebase) ----------------
export async function getClubs() {
  return firebaseDB.getClubs();
}

export async function getClub(clubId) {
  return firebaseDB.getClub(clubId);
}

export async function createClub(clubData) {
  return firebaseDB.createClub(clubData);
}

export async function updateClub(clubId, clubData) {
  return firebaseDB.updateClub(clubId, clubData);
}

export async function deleteClub(clubId) {
  return firebaseDB.deleteClub(clubId);
}

// ---------------- Events API (Firebase) ----------------
export async function getEvents(params = {}) {
  return firebaseDB.getEvents(params);
}

export async function getEvent(eventId) {
  return firebaseDB.getEvent(eventId);
}

export async function createEvent(eventData) {
  return firebaseDB.createEvent(eventData);
}

export async function updateEvent(eventId, eventData) {
  return firebaseDB.updateEvent(eventId, eventData);
}

export async function deleteEvent(eventId) {
  return firebaseDB.deleteEvent(eventId);
}

// ---------------- Registrations API (Firebase) ----------------
export async function registerForEvent(eventId, studentId) {
  return firebaseDB.registerForEvent(eventId, studentId);
}

export async function cancelRegistration(registrationId) {
  return firebaseDB.cancelRegistration(registrationId);
}

export async function getEventRegistrations(eventId) {
  return firebaseDB.getEventRegistrations(eventId);
}

export async function getUserRegistrations(userId) {
  return firebaseDB.getUserRegistrations(userId);
}

// ---------------- Lost & Found API (Firebase) ----------------
export async function getLostFoundItems(params = {}) {
  return firebaseDB.getLostFoundItems(params);
}

export async function reportLostFoundItem(itemData) {
  return firebaseDB.reportLostFoundItem(itemData);
}

export async function updateLostFoundItem(itemId, itemData) {
  return firebaseDB.updateLostFoundItem(itemId, itemData);
}

export async function deleteLostFoundItem(itemId) {
  return firebaseDB.deleteLostFoundItem(itemId);
}

// ---------------- Complaints API (Firebase) ----------------
export async function getComplaints(params = {}) {
  return firebaseDB.getComplaints(params);
}

export async function getComplaint(complaintId) {
  return firebaseDB.getComplaint(complaintId);
}

export async function fileComplaint(complaintData) {
  return firebaseDB.fileComplaint(complaintData);
}

export async function updateComplaint(complaintId, complaintData) {
  return firebaseDB.updateComplaint(complaintId, complaintData);
}

export async function deleteComplaint(complaintId) {
  return firebaseDB.deleteComplaint(complaintId);
}

// ---------------- AI Agent API (Firebase) ----------------
export async function chatWithAIAgent({ message, history = [], userId = null, role = 'STUDENT' }) {
  return firebaseDB.chatWithAIAgent({ message, history, userId, role });
}

export async function searchItemsWithAIImage(searchPayload) {
  return firebaseDB.searchItemsWithAIImage(searchPayload);
}

// ---------------- Users & Dashboard API (Firebase) ----------------
export async function getUsers(role = null) {
  return firebaseDB.getUsers(role);
}

export async function getDashboardStats(userId = null) {
  return firebaseDB.getDashboardStats(userId);
}

export { API_BASE_URL };
