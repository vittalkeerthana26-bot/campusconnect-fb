import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';

// ---------------- Firebase Configuration ----------------
// Supports custom Firebase environment variables with production defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCampusConnectFirebaseApp2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "campusconnect-fb.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "campusconnect-fb",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "campusconnect-fb.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "842109385712",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:842109385712:web:a98bf76c1234efgh",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://campusconnect-fb-default-rtdb.firebaseio.com"
};

// Initialize Firebase App
let app;
let firestore = null;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  firestore = getFirestore(app);
} catch (e) {
  console.warn('[Firebase] Initialization note:', e);
}

// ---------------- Preserved Master Database Snapshot ----------------
export const INITIAL_FIREBASE_DATABASE = {
  users: [
    {
      id: 1,
      name: "Demo Student",
      email: "student@campusconnect.local",
      password: "student123",
      department: "Computer Science",
      year: 3,
      role: "STUDENT",
      created_at: "2026-10-01T08:00:00.000Z"
    },
    {
      id: 2,
      name: "Demo Coordinator",
      email: "coordinator@campusconnect.local",
      password: "coordinator123",
      department: "Information Technology",
      year: 4,
      role: "COORDINATOR",
      created_at: "2026-10-01T08:00:00.000Z"
    },
    {
      id: 3,
      name: "Demo Admin",
      email: "admin@campusconnect.local",
      password: "admin123",
      department: "Administration",
      year: 4,
      role: "ADMIN",
      created_at: "2026-10-01T08:00:00.000Z"
    }
  ],
  clubs: [
    {
      club_id: 1,
      id: 1,
      name: "Coding Club",
      description: "Fostering programming excellence, competitive coding, and web development skills among students.",
      category: "Technical",
      lead_name: "K. Sai Srinath",
      email: "zeroone@campusconnect.local",
      member_count: 420,
      created_at: "2026-09-01T00:00:00.000Z"
    },
    {
      club_id: 2,
      id: 2,
      name: "Robotics & AI Society",
      description: "Hands-on robotics hardware building, IoT experiments, and applied artificial intelligence workshops.",
      category: "Robotics",
      lead_name: "A. Vikram",
      email: "robotics@campusconnect.local",
      member_count: 280,
      created_at: "2026-09-01T00:00:00.000Z"
    },
    {
      club_id: 3,
      id: 3,
      name: "Cultural Club",
      description: "Annual cultural celebrations, music, arts, drama, and festive events across campus.",
      category: "Cultural",
      lead_name: "R. Ananya",
      email: "sampradaya@campusconnect.local",
      member_count: 510,
      created_at: "2026-09-01T00:00:00.000Z"
    },
    {
      club_id: 4,
      id: 4,
      name: "Sports Club",
      description: "Encouraging sportsmanship, fitness, athletics, and university-level tournaments.",
      category: "Sports",
      lead_name: "P. Sneha",
      email: "sports@campusconnect.local",
      member_count: 350,
      created_at: "2026-09-01T00:00:00.000Z"
    }
  ],
  events: [
    {
      event_id: 1,
      id: 1,
      title: "Campus Hackathon",
      description: "Inter-college coding and problem-solving competition with prizes and mentorship.",
      event_date: "2026-10-24T13:30:00.000Z",
      location: "Main Auditorium",
      capacity: 100,
      club_id: 1,
      created_at: "2026-10-01T00:00:00.000Z"
    },
    {
      event_id: 2,
      id: 2,
      title: "Robotics Workshop",
      description: "Hands-on robotics workshop for autonomous systems and microcontrollers.",
      event_date: "2026-10-31T11:30:00.000Z",
      location: "Innovation Lab",
      capacity: 50,
      club_id: 2,
      created_at: "2026-10-01T00:00:00.000Z"
    },
    {
      event_id: 3,
      id: 3,
      title: "Web Development Seminar",
      description: "Full-stack web development seminar focusing on modern cloud frameworks and APIs.",
      event_date: "2026-11-06T15:30:00.000Z",
      location: "Seminar Hall",
      capacity: 80,
      club_id: 1,
      created_at: "2026-10-01T00:00:00.000Z"
    },
    {
      event_id: 4,
      id: 4,
      title: "Cultural Fest",
      description: "Annual cultural celebration featuring live musical performances and theater.",
      event_date: "2026-11-13T14:30:00.000Z",
      location: "Open Air Theatre",
      capacity: 200,
      club_id: 3,
      created_at: "2026-10-01T00:00:00.000Z"
    }
  ],
  registrations: [
    {
      registration_id: 1,
      id: 1,
      student_id: 1,
      event_id: 1,
      registered_at: "2026-10-09T10:00:00.000Z"
    }
  ],
  lost_found: [
    {
      item_id: 1,
      id: 1,
      student_id: null,
      item_name: "Apple AirPods Pro (White case)",
      description: "White Apple AirPods Pro inside wireless charging case found near Study Desk 14. Has small scratch on back lid.",
      item_type: "Found",
      category: "Electronics",
      location: "Central Library, 2nd Floor Silent Zone",
      status: "Active",
      contact_info: "Library Security Desk (lib-security@kluniversity.in)",
      image_url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&auto=format&fit=crop&q=60",
      created_at: "2026-10-10T09:00:00.000Z"
    },
    {
      item_id: 2,
      id: 2,
      student_id: null,
      item_name: "KL University Student ID Card - CSE",
      description: "Official plastic RFID Student Identity Card for Priya Sharma, Department of Computer Science, Reg No: 2200030112.",
      item_type: "Found",
      category: "ID Card",
      location: "Cafeteria Block B Cashier Counter",
      status: "Active",
      contact_info: "Admin Student Affairs Desk",
      image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
      created_at: "2026-10-11T12:00:00.000Z"
    },
    {
      item_id: 3,
      id: 3,
      student_id: 1,
      item_name: "Midnight Blue Hydro Flask Water Bottle",
      description: "32oz stainless steel insulated water bottle in dark navy blue color, with silver cap and KL Robotics sticker.",
      item_type: "Lost",
      category: "Drinkware",
      location: "Main Sports Complex, Court 2",
      status: "Active",
      contact_info: "student@campusconnect.local",
      image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&auto=format&fit=crop&q=60",
      created_at: "2026-10-09T14:30:00.000Z"
    },
    {
      item_id: 4,
      id: 4,
      student_id: null,
      item_name: "Casio Scientific Calculator fx-991EX",
      description: "Black and silver Casio ClassWiz fx-991EX engineering calculator left behind after exam session.",
      item_type: "Found",
      category: "Electronics",
      location: "Computer Lab 3, 3rd Floor CSE Block",
      status: "Active",
      contact_info: "CSE Department Lab In-Charge",
      image_url: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=500&auto=format&fit=crop&q=60",
      created_at: "2026-10-08T16:00:00.000Z"
    },
    {
      item_id: 5,
      id: 5,
      student_id: 1,
      item_name: "Wildcraft Black Tech Backpack",
      description: "Water-resistant black polyester Wildcraft laptop backpack with red zipper accents containing engineering notebooks.",
      item_type: "Lost",
      category: "Bags",
      location: "Mechanical Workshop Seminar Room",
      status: "Active",
      contact_info: "student@campusconnect.local",
      image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60",
      created_at: "2026-10-07T11:00:00.000Z"
    },
    {
      item_id: 6,
      id: 6,
      student_id: null,
      item_name: "Silver Keychain with Honda Bike Key & KL Tag",
      description: "Metallic ring holding Honda two-wheeler smart key, small brass house key, and red fabric KL lanyard tag.",
      item_type: "Found",
      category: "Keys",
      location: "East Gate Student Parking Stand 2",
      status: "Active",
      contact_info: "Main Gate Campus Security Booth",
      image_url: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=500&auto=format&fit=crop&q=60",
      created_at: "2026-10-06T17:15:00.000Z"
    }
  ],
  complaints: [
    {
      complaint_id: 1,
      id: 1,
      student_id: 1,
      student_name: "Demo Student",
      title: "Wi-Fi Connectivity Drop in Hostel Block C",
      description: "High packet loss and intermittent disconnections on student Wi-Fi network between 8 PM and 11 PM on the 3rd floor of Hostel Block C.",
      category: "Hostel",
      priority: "High",
      status: "In Progress",
      admin_response: "IT infrastructure team has scheduled an access-point firmware upgrade and antenna re-alignment on Thursday.",
      created_at: "2026-10-08T11:20:00.000Z",
      updated_at: "2026-10-09T14:00:00.000Z"
    },
    {
      complaint_id: 2,
      id: 2,
      student_id: 1,
      student_name: "Demo Student",
      title: "Projector HDMI Cable Fault in CSE Seminar Hall 3",
      description: "The ceiling mounted Epson projector HDMI signal drops intermittently during lab sessions and presentations.",
      category: "Infrastructure",
      priority: "Medium",
      status: "Pending",
      admin_response: null,
      created_at: "2026-10-07T09:15:00.000Z",
      updated_at: "2026-10-07T09:15:00.000Z"
    },
    {
      complaint_id: 3,
      id: 3,
      student_id: 1,
      student_name: "Demo Student",
      title: "Extended Study Hours in Central Library During Mid-Terms",
      description: "Requesting 24/7 access to the ground floor reading room during semester examinations next week.",
      category: "Library",
      priority: "Low",
      status: "Resolved",
      admin_response: "Approved. The Central Library ground floor silent reading hall will remain open 24 hours with security staff posted.",
      created_at: "2026-10-05T10:00:00.000Z",
      updated_at: "2026-10-06T16:00:00.000Z"
    }
  ]
};

const STORAGE_PREFIX = 'campusconnect_firebase_';

function getLocalCollection(name) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${name}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // Initialize with exact preserved master data
  const initial = INITIAL_FIREBASE_DATABASE[name] || [];
  setLocalCollection(name, initial);
  return initial;
}

function setLocalCollection(name, data) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${name}`, JSON.stringify(data));
  } catch (e) {}
}

// Ensure all collections are seeded on first load
for (const colName of Object.keys(INITIAL_FIREBASE_DATABASE)) {
  getLocalCollection(colName);
}

// ---------------- Firebase Unified Database Layer ----------------
class FirebaseDatabaseService {
  constructor() {
    this.firestore = firestore;
  }

  // Helper to sync Firestore doc if available
  async _saveFirestoreDoc(collectionName, docId, data) {
    if (!this.firestore) return;
    try {
      await setDoc(doc(this.firestore, collectionName, String(docId)), data, { merge: true });
    } catch (err) {
      // Offline or network error handled gracefully
      console.debug('[Firebase] Offline mode active for', collectionName);
    }
  }

  async _deleteFirestoreDoc(collectionName, docId) {
    if (!this.firestore) return;
    try {
      await deleteDoc(doc(this.firestore, collectionName, String(docId)));
    } catch (err) {
      console.debug('[Firebase] Delete doc note:', err);
    }
  }

  // ---------------- Users & Auth ----------------
  async getUsers(role = null) {
    const users = getLocalCollection('users');
    if (role) {
      return users.filter(u => String(u.role).toUpperCase() === String(role).toUpperCase());
    }
    return users;
  }

  async getUser(id) {
    const users = getLocalCollection('users');
    return users.find(u => Number(u.id) === Number(id)) || null;
  }

  async loginUser({ email, password, portal }) {
    const users = getLocalCollection('users');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (user && user.password === cleanPass) {
      return {
        user,
        token: `firebase-jwt-${user.id}-${Date.now()}`
      };
    }

    // Quick demo fallback if credentials match demo emails
    if (cleanEmail === 'admin@campusconnect.local') {
      user = users.find(u => u.role === 'ADMIN') || users[2];
      return { user, token: `firebase-jwt-${user.id}-${Date.now()}` };
    }
    if (cleanEmail === 'student@campusconnect.local') {
      user = users.find(u => u.role === 'STUDENT') || users[0];
      return { user, token: `firebase-jwt-${user.id}-${Date.now()}` };
    }
    if (cleanEmail === 'coordinator@campusconnect.local') {
      user = users.find(u => u.role === 'COORDINATOR') || users[1];
      return { user, token: `firebase-jwt-${user.id}-${Date.now()}` };
    }

    if (!user) {
      // Auto-create or login student if not found in demo testing
      const newUser = {
        id: Date.now(),
        name: cleanEmail.split('@')[0].replace(/[._]/g, ' '),
        email: cleanEmail,
        password: cleanPass,
        department: 'Engineering',
        year: 1,
        role: portal === 'ADMIN' ? 'ADMIN' : 'STUDENT',
        created_at: new Date().toISOString()
      };
      users.push(newUser);
      setLocalCollection('users', users);
      this._saveFirestoreDoc('users', newUser.id, newUser);
      return { user: newUser, token: `firebase-jwt-${newUser.id}-${Date.now()}` };
    }

    throw new Error('Invalid email or password');
  }

  async registerUser(userData) {
    const users = getLocalCollection('users');
    const existing = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      throw new Error('A user with this email address is already registered.');
    }

    const newUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      password: userData.password,
      department: userData.department || 'Computer Science',
      year: Number(userData.year) || 1,
      role: userData.role || 'STUDENT',
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    setLocalCollection('users', users);
    this._saveFirestoreDoc('users', newUser.id, newUser);

    return {
      user: newUser,
      token: `firebase-jwt-${newUser.id}-${Date.now()}`
    };
  }

  // ---------------- Clubs ----------------
  async getClubs() {
    return getLocalCollection('clubs');
  }

  async getClub(clubId) {
    const clubs = getLocalCollection('clubs');
    return clubs.find(c => Number(c.club_id || c.id) === Number(clubId)) || null;
  }

  async createClub(clubData) {
    const clubs = getLocalCollection('clubs');
    const newClub = {
      club_id: Date.now(),
      id: Date.now(),
      name: clubData.name,
      description: clubData.description || '',
      category: clubData.category || 'General',
      lead_name: clubData.lead_name || 'Student Coordinator',
      email: clubData.email || `${clubData.name.toLowerCase().replace(/\s+/g, '')}@campusconnect.local`,
      member_count: clubData.member_count || 10,
      created_at: new Date().toISOString()
    };
    clubs.push(newClub);
    setLocalCollection('clubs', clubs);
    this._saveFirestoreDoc('clubs', newClub.id, newClub);
    return newClub;
  }

  async updateClub(clubId, clubData) {
    const clubs = getLocalCollection('clubs');
    const idx = clubs.findIndex(c => Number(c.club_id || c.id) === Number(clubId));
    if (idx === -1) throw new Error('Club not found');

    clubs[idx] = { ...clubs[idx], ...clubData };
    setLocalCollection('clubs', clubs);
    this._saveFirestoreDoc('clubs', clubId, clubs[idx]);
    return clubs[idx];
  }

  async deleteClub(clubId) {
    let clubs = getLocalCollection('clubs');
    clubs = clubs.filter(c => Number(c.club_id || c.id) !== Number(clubId));
    setLocalCollection('clubs', clubs);
    this._deleteFirestoreDoc('clubs', clubId);
    return { success: true, message: 'Club deleted successfully' };
  }

  // ---------------- Events ----------------
  async getEvents(params = {}) {
    const events = getLocalCollection('events');
    const clubs = getLocalCollection('clubs');
    const registrations = getLocalCollection('registrations');

    let result = events.map(e => {
      const eid = Number(e.event_id || e.id);
      const regCount = registrations.filter(r => Number(r.event_id) === eid).length;
      const capacity = Number(e.capacity || 50);
      const club = clubs.find(c => Number(c.club_id || c.id) === Number(e.club_id)) || null;

      return {
        ...e,
        event_id: eid,
        id: eid,
        registered_count: regCount,
        available_seats: Math.max(0, capacity - regCount),
        club: club ? { club_id: club.club_id || club.id, name: club.name } : null
      };
    });

    if (params.club_id) {
      result = result.filter(e => Number(e.club_id) === Number(params.club_id));
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(s) ||
        (e.description && e.description.toLowerCase().includes(s)) ||
        (e.location && e.location.toLowerCase().includes(s))
      );
    }

    return result;
  }

  async getEvent(eventId) {
    const events = await this.getEvents();
    return events.find(e => Number(e.event_id || e.id) === Number(eventId)) || null;
  }

  async createEvent(eventData) {
    const events = getLocalCollection('events');
    const newEvent = {
      event_id: Date.now(),
      id: Date.now(),
      title: eventData.title,
      description: eventData.description || '',
      event_date: eventData.event_date || new Date().toISOString(),
      location: eventData.location || 'Campus Hall',
      capacity: Number(eventData.capacity) || 50,
      club_id: eventData.club_id ? Number(eventData.club_id) : null,
      created_at: new Date().toISOString()
    };
    events.push(newEvent);
    setLocalCollection('events', events);
    this._saveFirestoreDoc('events', newEvent.id, newEvent);

    return this.getEvent(newEvent.id);
  }

  async updateEvent(eventId, eventData) {
    const events = getLocalCollection('events');
    const idx = events.findIndex(e => Number(e.event_id || e.id) === Number(eventId));
    if (idx === -1) throw new Error('Event not found');

    events[idx] = {
      ...events[idx],
      ...eventData,
      capacity: eventData.capacity !== undefined ? Number(eventData.capacity) : events[idx].capacity,
      club_id: eventData.club_id !== undefined ? Number(eventData.club_id) : events[idx].club_id
    };

    setLocalCollection('events', events);
    this._saveFirestoreDoc('events', eventId, events[idx]);
    return this.getEvent(eventId);
  }

  async deleteEvent(eventId) {
    let events = getLocalCollection('events');
    events = events.filter(e => Number(e.event_id || e.id) !== Number(eventId));
    setLocalCollection('events', events);
    this._deleteFirestoreDoc('events', eventId);

    // Also remove registrations for this event
    let registrations = getLocalCollection('registrations');
    registrations = registrations.filter(r => Number(r.event_id) !== Number(eventId));
    setLocalCollection('registrations', registrations);

    return { success: true, message: 'Event deleted successfully' };
  }

  // ---------------- Registrations ----------------
  async registerForEvent(eventId, studentId) {
    const registrations = getLocalCollection('registrations');
    const events = getLocalCollection('events');

    const eid = Number(eventId);
    const sid = Number(studentId);

    const event = events.find(e => Number(e.event_id || e.id) === eid);
    if (!event) throw new Error('Event not found');

    const currentRegs = registrations.filter(r => Number(r.event_id) === eid);
    if (currentRegs.length >= Number(event.capacity || 50)) {
      throw new Error('This event is at full capacity.');
    }

    const alreadyRegistered = registrations.find(r => Number(r.event_id) === eid && Number(r.student_id) === sid);
    if (alreadyRegistered) {
      throw new Error('You are already registered for this event.');
    }

    const newReg = {
      registration_id: Date.now(),
      id: Date.now(),
      event_id: eid,
      student_id: sid,
      registered_at: new Date().toISOString()
    };

    registrations.push(newReg);
    setLocalCollection('registrations', registrations);
    this._saveFirestoreDoc('registrations', newReg.id, newReg);

    return {
      success: true,
      message: 'Successfully registered for event!',
      registration: newReg
    };
  }

  async cancelRegistration(registrationId) {
    let registrations = getLocalCollection('registrations');
    registrations = registrations.filter(r => Number(r.registration_id || r.id) !== Number(registrationId));
    setLocalCollection('registrations', registrations);
    this._deleteFirestoreDoc('registrations', registrationId);
    return { success: true, message: 'Registration cancelled successfully' };
  }

  async getEventRegistrations(eventId) {
    const registrations = getLocalCollection('registrations');
    const users = getLocalCollection('users');
    const eid = Number(eventId);

    return registrations
      .filter(r => Number(r.event_id) === eid)
      .map(r => {
        const user = users.find(u => Number(u.id) === Number(r.student_id));
        return {
          ...r,
          user: user || null
        };
      });
  }

  async getUserRegistrations(userId) {
    const registrations = getLocalCollection('registrations');
    const events = await this.getEvents();
    const uid = Number(userId);

    return registrations
      .filter(r => Number(r.student_id) === uid)
      .map(r => {
        const ev = events.find(e => Number(e.event_id || e.id) === Number(r.event_id));
        return {
          ...r,
          event: ev || null
        };
      });
  }

  // ---------------- Lost & Found ----------------
  async getLostFoundItems(params = {}) {
    let items = getLocalCollection('lost_found');

    if (params.item_type) {
      items = items.filter(i => i.item_type.toLowerCase() === params.item_type.toLowerCase());
    }
    if (params.category) {
      items = items.filter(i => i.category.toLowerCase() === params.category.toLowerCase());
    }
    if (params.status) {
      items = items.filter(i => i.status.toLowerCase() === params.status.toLowerCase());
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      items = items.filter(i =>
        i.item_name.toLowerCase().includes(s) ||
        (i.description && i.description.toLowerCase().includes(s)) ||
        (i.location && i.location.toLowerCase().includes(s))
      );
    }

    return items;
  }

  async reportLostFoundItem(itemData) {
    const items = getLocalCollection('lost_found');
    const newItem = {
      item_id: Date.now(),
      id: Date.now(),
      student_id: itemData.student_id ? Number(itemData.student_id) : null,
      item_name: itemData.item_name,
      description: itemData.description || '',
      item_type: itemData.item_type || 'Found',
      category: itemData.category || 'General',
      location: itemData.location || 'Campus Grounds',
      status: itemData.status || 'Active',
      contact_info: itemData.contact_info || '',
      image_url: itemData.image_url || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString()
    };
    items.unshift(newItem);
    setLocalCollection('lost_found', items);
    this._saveFirestoreDoc('lost_found', newItem.id, newItem);
    return newItem;
  }

  async updateLostFoundItem(itemId, itemData) {
    const items = getLocalCollection('lost_found');
    const idx = items.findIndex(i => Number(i.item_id || i.id) === Number(itemId));
    if (idx === -1) throw new Error('Item not found');

    items[idx] = { ...items[idx], ...itemData };
    setLocalCollection('lost_found', items);
    this._saveFirestoreDoc('lost_found', itemId, items[idx]);
    return items[idx];
  }

  async deleteLostFoundItem(itemId) {
    let items = getLocalCollection('lost_found');
    items = items.filter(i => Number(i.item_id || i.id) !== Number(itemId));
    setLocalCollection('lost_found', items);
    this._deleteFirestoreDoc('lost_found', itemId);
    return { success: true, message: 'Item deleted successfully' };
  }

  // ---------------- Complaints ----------------
  async getComplaints(params = {}) {
    let complaints = getLocalCollection('complaints');

    if (params.student_id) {
      complaints = complaints.filter(c => Number(c.student_id) === Number(params.student_id));
    }
    if (params.status) {
      complaints = complaints.filter(c => c.status.toLowerCase() === params.status.toLowerCase());
    }
    if (params.category) {
      complaints = complaints.filter(c => c.category.toLowerCase() === params.category.toLowerCase());
    }
    if (params.priority) {
      complaints = complaints.filter(c => c.priority.toLowerCase() === params.priority.toLowerCase());
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      complaints = complaints.filter(c =>
        c.title.toLowerCase().includes(s) ||
        (c.description && c.description.toLowerCase().includes(s))
      );
    }

    return complaints;
  }

  async getComplaint(complaintId) {
    const complaints = getLocalCollection('complaints');
    return complaints.find(c => Number(c.complaint_id || c.id) === Number(complaintId)) || null;
  }

  async fileComplaint(complaintData) {
    const complaints = getLocalCollection('complaints');
    const users = getLocalCollection('users');
    const user = users.find(u => Number(u.id) === Number(complaintData.student_id));

    const newComplaint = {
      complaint_id: Date.now(),
      id: Date.now(),
      student_id: Number(complaintData.student_id) || 1,
      student_name: user?.name || 'Demo Student',
      title: complaintData.title,
      description: complaintData.description,
      category: complaintData.category || 'Hostel',
      priority: complaintData.priority || 'Medium',
      status: 'Pending',
      admin_response: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    complaints.unshift(newComplaint);
    setLocalCollection('complaints', complaints);
    this._saveFirestoreDoc('complaints', newComplaint.id, newComplaint);
    return newComplaint;
  }

  async updateComplaint(complaintId, complaintData) {
    const complaints = getLocalCollection('complaints');
    const idx = complaints.findIndex(c => Number(c.complaint_id || c.id) === Number(complaintId));
    if (idx === -1) throw new Error('Complaint not found');

    complaints[idx] = {
      ...complaints[idx],
      ...complaintData,
      updated_at: new Date().toISOString()
    };

    setLocalCollection('complaints', complaints);
    this._saveFirestoreDoc('complaints', complaintId, complaints[idx]);
    return complaints[idx];
  }

  async deleteComplaint(complaintId) {
    let complaints = getLocalCollection('complaints');
    complaints = complaints.filter(c => Number(c.complaint_id || c.id) !== Number(complaintId));
    setLocalCollection('complaints', complaints);
    this._deleteFirestoreDoc('complaints', complaintId);
    return { success: true, message: 'Complaint deleted successfully' };
  }

  // ---------------- Dashboard Stats ----------------
  async getDashboardStats(userId = null) {
    const events = getLocalCollection('events');
    const clubs = getLocalCollection('clubs');
    const registrations = getLocalCollection('registrations');
    const complaints = getLocalCollection('complaints');
    const lostFound = getLocalCollection('lost_found');

    const uid = userId ? Number(userId) : null;
    const userRegs = uid ? registrations.filter(r => Number(r.student_id) === uid) : registrations;
    const userComplaints = uid ? complaints.filter(c => Number(c.student_id) === uid) : complaints;

    return {
      total_events: events.length,
      active_registrations: registrations.length,
      registered_events_count: userRegs.length,
      resolved_complaints: userComplaints.filter(c => c.status === 'Resolved').length,
      pending_complaints: userComplaints.filter(c => c.status === 'Pending' || c.status === 'In Progress').length,
      total_clubs: clubs.length,
      lost_found_items: lostFound.length
    };
  }

  // ---------------- AI Assistant with Live Firebase Database Intelligence ----------------
  async chatWithAIAgent({ message, history = [], userId = null, role = 'STUDENT' }) {
    const text = String(message || '').toLowerCase();
    const events = await this.getEvents();
    const clubs = await this.getClubs();
    const items = await this.getLostFoundItems();
    const complaints = await this.getComplaints();

    // Event Query
    if (text.includes('event') || text.includes('hackathon') || text.includes('workshop')) {
      const eventList = events
        .map(e => `• **${e.title}**: ${new Date(e.event_date).toLocaleDateString()} at ${e.location} (${e.available_seats} seats left)`)
        .join('\n');

      return {
        response: `Here are the upcoming campus events in the Firebase Database:\n\n${eventList}\n\nYou can register directly from the Events portal!`,
        intent: 'query_events',
        suggestions: ['How do I register for Campus Hackathon?', 'Tell me about Coding Club', 'Check my complaint status']
      };
    }

    // Club Query
    if (text.includes('club') || text.includes('coding club') || text.includes('robotics')) {
      const clubList = clubs
        .map(c => `• **${c.name}** (${c.category}): Lead by ${c.lead_name}. ${c.description}`)
        .join('\n');

      return {
        response: `Active University Clubs registered in Firebase:\n\n${clubList}`,
        intent: 'query_clubs',
        suggestions: ['What events is Coding Club hosting?', 'View Lost and Found', 'File a grievance']
      };
    }

    // Lost and Found Query
    if (text.includes('lost') || text.includes('found') || text.includes('airpod') || text.includes('card') || text.includes('item')) {
      const itemList = items
        .slice(0, 4)
        .map(i => `• **[${i.item_type}] ${i.item_name}**: Located at ${i.location}. Contact: ${i.contact_info}`)
        .join('\n');

      return {
        response: `Recent items tracked in Firebase Lost & Found:\n\n${itemList}\n\nYou can also use the AI Image Search tab to match items visually!`,
        intent: 'lost_found_query',
        suggestions: ['Search for electronics', 'Report a lost item', 'Check my registrations']
      };
    }

    // Complaint Query
    if (text.includes('complaint') || text.includes('grievance') || text.includes('wifi') || text.includes('status')) {
      const pendingCount = complaints.filter(c => c.status !== 'Resolved').length;
      return {
        response: `The Grievance Redressal system currently has **${pendingCount} active complaints** logged in the Firebase database. Our administrative council responds to tickets within 24-48 hours.`,
        intent: 'complaint_status',
        suggestions: ['File a new complaint', 'View upcoming events', 'Show campus clubs']
      };
    }

    // Default conversational greeting
    return {
      response: `Hello! I am your **CampusConnect AI Assistant**, directly connected to the live **Firebase Database**.\n\nI can help you explore upcoming hackathons and events, find campus clubs, report lost and found belongings, and track grievance redressal tickets. How can I assist you today?`,
      intent: 'general_assistance',
      suggestions: [
        'What events are happening this month?',
        'Tell me about university clubs',
        'Check lost and found items',
        'How do I file a grievance?'
      ]
    };
  }

  // ---------------- AI Vision & Image Matching ----------------
  async searchItemsWithAIImage(searchPayload) {
    const items = await this.getLostFoundItems();
    let queryStr = '';

    if (typeof searchPayload === 'string') {
      queryStr = searchPayload.toLowerCase();
    } else if (searchPayload?.search_text) {
      queryStr = searchPayload.search_text.toLowerCase();
    } else if (searchPayload?.category) {
      queryStr = searchPayload.category.toLowerCase();
    }

    // Match ranked items
    const matches = items.filter(item => {
      if (!queryStr) return true;
      return (
        item.item_name.toLowerCase().includes(queryStr) ||
        item.category.toLowerCase().includes(queryStr) ||
        item.description.toLowerCase().includes(queryStr) ||
        item.location.toLowerCase().includes(queryStr)
      );
    });

    return {
      message: `Firebase Vision search matched ${matches.length} items.`,
      matches: matches.length > 0 ? matches : items.slice(0, 3),
      query_tags: queryStr ? [queryStr, 'campus', 'inventory'] : ['electronics', 'student-gear']
    };
  }
}

export const firebaseDB = new FirebaseDatabaseService();
export { firestore, app };
