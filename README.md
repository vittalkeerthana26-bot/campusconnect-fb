# 🎓 CampusConnect — KL University Centralized Academic Portal

[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Database-Firebase_Cloud_Database-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini_Tool_Calling_%26_Vision-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub_Pages-222222?logo=githubpages&logoColor=white)](https://vittalkeerthana26-bot.github.io/campusconnect-fb/)
[![License](https://img.shields.io/badge/License-Academic_Evaluation-orange.svg)]()

> **CampusConnect** is a centralized, AI-augmented student and administrative platform developed for **KL University**. It integrates event registrations, student club management, grievance redressal, agentic tool-calling conversational AI, and computer vision-based lost-and-found matching into a responsive dual-portal experience backed by **Firebase**.

🌐 **Live GitHub Pages URL:** [https://vittalkeerthana26-bot.github.io/campusconnect-fb/](https://vittalkeerthana26-bot.github.io/campusconnect-fb/)

---

## 👥 Project Team & Mentorship

- **Project Guide:**
  - **Dr. Rafeeq Mohammed** (Faculty Guide)
- **Team Members:**
  - **Anvith Kumar**
  - **K. Sai Srinath**
  - **Gokul Arnav**
  - **S. Keerthana**
  - **V. Keerthana**

---

## 🌟 Key Features

### 1. 🛡️ Role-Based Dual Portals (Student & Admin)
- **Student Portal:**
  - Register for upcoming campus events and hackathons with real-time capacity counters.
  - Track registered events with timestamps and calendar details in *My Registrations*.
  - File grievance tickets with categories (Hostel, Academics, Mess, Security, Infrastructure) and live resolution tracking.
  - Explore campus clubs and activities.
- **Admin Portal:**
  - Full CRUD operations on university events (create, update schedule, change venue, manage capacities).
  - Inspect student registration rosters per event with attendee details and download counts.
  - Review, categorize, resolve, and publish official responses to student complaints.
  - Moderate Lost & Found inventory and mark items as claimed or returned.

### 2. 🔥 Firebase Cloud Database
- Migrated from PostgreSQL to **Firebase Cloud Database & Realtime Persistence**.
- Real-time event registrations, seat decrementing, and instant status updates.
- All master database records preserved exactly across Users, Clubs, Events, Registrations, Lost & Found, and Grievance tickets.

### 3. 🤖 Agentic AI Campus Assistant (`/chatbot`)
- Powered by **Google Gemini** with structured function calling / tool execution.
- Connected directly to the live Firebase database to:
  - Query upcoming event schedules, locations, and remaining capacities.
  - Lookup active student clubs and their leads.
  - Register authenticated students for events on request through conversational commands.
  - Search lost and found records dynamically.

### 4. 👁️ AI Computer Vision & Semantic Image Search (`/lost-found`)
- Multi-modal visual inspection for lost and found items.
- Extracts visual category hints, dominant colors, and distinguishing item attributes.
- Runs ranked similarity matching against active database records with real-time confidence scores.
- One-click testing with pre-curated campus sample items or custom photo uploads.

### 5. 🎨 Design System & Theme Engine
- **Light Theme:** Warm ivory (`#f7f4ed`), soft neutral surfaces (`#ede8de`), teal (`#0d9488`), and indigo (`#4f46e5`) accents. Zero pure white cards or harsh black boxes.
- **Dark Theme:** Deep slate (`#0b0f19`) with translucent glassmorphic surfaces (`rgba(17, 24, 39, 0.78)`).
- **System Theme:** Automatically adapts to operating system color scheme preferences.
- **Mobile-First Responsive Engine:** Smoothly scales from mobile viewports (360px–430px), tablets (768px), to 4K displays with dedicated slide-out navigation drawer.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["React 18 + Vite Frontend"] -->|"Firebase Web SDK"| FB[("Firebase Database")]
    Client -->|"REST APIs"| API["FastAPI Backend (Optional)"]
    API -->|"Firebase Admin SDK"| FB
    Client -->|"Agentic AI"| Gemini["Google Gemini API (Agentic Tools & Vision)"]
    Client -->|"Theme Engine"| CSS["Vanilla CSS Tokens & Responsive System"]
```

---

## 🗂️ Project Structure

```
campusconnect/
├── backend/
│   ├── main.py              # FastAPI application entrypoint & API routes
│   ├── models.py            # Data models (Users, Events, Registrations, etc.)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── firebase_db.py       # Firebase backend connector & data persistence
│   ├── database.py          # Database session management
│   ├── ai_agent.py          # Gemini AI agent with tool calling & computer vision search
│   ├── seed.py              # Firebase database seeder script
│   └── requirements.txt     # Python dependencies with Firebase
├── database/
│   ├── firebase_data.json   # Exact preserved seed records for Firebase
│   ├── firestore.rules      # Cloud Firestore security rules
│   └── schema.sql           # Database schema reference
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, EventCard, ClubCard, EventForm, etc.
│   │   ├── context/         # ThemeContext (Light/Dark/System) & UserContext (Auth)
│   │   ├── pages/           # Dashboard, Events, Clubs, AIChatbot, AIImageSearch, Complaints, ManageEvents
│   │   ├── services/        # Firebase Database service & API client
│   │   ├── index.css        # Centralized theme tokens, utilities & responsive engine
│   │   ├── App.jsx          # Route definitions & application layout
│   │   └── main.jsx         # React root initialization
│   ├── package.json         # Node.js project manifest & scripts
│   └── vite.config.js       # Vite build configuration (base: './' for GitHub Pages)
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Actions automated deployment to GitHub Pages
```

---

## 🚀 Getting Started

### 1. Frontend Setup (GitHub Pages / Local)

```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
Frontend application will be accessible at: `http://localhost:5173`

---

### 2. Backend Setup (Optional)

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed initial Firebase database records
python seed.py

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

---

## 🔑 Demo Access Credentials

The Firebase database comes pre-seeded with instant test credentials:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Student** | `student@campusconnect.local` | `student123` | Event registration, My Registrations, File Complaints, AI Chatbot |
| **Coordinator** | `coordinator@campusconnect.local` | `coordinator123` | Event Management, Attendee Rosters, Complaints |
| **Administrator** | `admin@campusconnect.local` | `admin123` | Full Event Management (CRUD), Student Rosters, Complaint Resolution |

---

## 📜 Acknowledgements & Academic Notice
Developed for academic presentation and university evaluation at **KL University**. Guided by **Dr. Rafeeq Mohammed**.
