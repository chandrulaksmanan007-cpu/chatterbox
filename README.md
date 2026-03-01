# 💬 ChatterBox — WhatsApp-like Chat App
**Hackathon Project | Flask + React | 100% Free Stack**

---

## 🗂 Project Structure
```
chatterbox/
├── backend/
│   ├── app.py              ← Flask + SocketIO server
│   └── requirements.txt    ← Python dependencies
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js          ← All React UI (Auth, Chat, Admin)
│   │   ├── api.js          ← Axios + Socket.io client
│   │   └── index.js        ← Entry point
│   └── package.json
├── .vscode/
│   ├── launch.json         ← Debug config
│   └── tasks.json          ← Run both servers at once
└── README.md
```

---

## ⚡ Quick Start (5 Steps)

### Step 1 — Prerequisites
Make sure you have:
- [Python 3.10+](https://python.org)
- [Node.js 18+](https://nodejs.org)
- [VS Code](https://code.visualstudio.com)

### Step 2 — Open in VS Code
```bash
code chatterbox
```

### Step 3 — Setup Backend
Open a terminal in VS Code (`Ctrl+\``) and run:
```bash
cd backend
pip install -r requirements.txt
```

### Step 4 — Setup Frontend
Open a **second terminal** and run:
```bash
cd frontend
npm install
```

### Step 5 — Run Both Servers
**Option A** — Use VS Code Task (easiest):
- Press `Ctrl+Shift+B` → Select **"🚀 Start ChatterBox (Both)"**

**Option B** — Manually in two terminals:
```bash
# Terminal 1
cd backend && python app.py

# Terminal 2
cd frontend && npm start
```

Then open → **http://localhost:3000** 🎉

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin 1 | alex@admin.com | admin123 |
| Admin 2 | maya@admin.com | admin456 |
| User | riya@mail.com | pass123 |
| User | karan@mail.com | pass123 |
| User | priya@mail.com | pass123 |

---

## ✅ Features

### 👤 User Features
- Sign Up / Sign In with email + password
- **Admin approval required** for new accounts
- Private 1-on-1 chats (real-time via WebSocket)
- Group chats — create, name, add members
- File & image sharing
- Typing indicators ("typing...")
- Online/offline status
- Search chats & groups
- Call UI (voice/video — WebRTC ready)

### 🛡 Admin Features (2 Admin Accounts)
- Separate Admin Dashboard
- Live join request notifications
- Approve / Reject new users
- View & remove all users
- Group monitoring
- Stats overview (total users, pending, online, groups)

---

## 🏗 Tech Stack (All Free)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 |
| Backend | Flask (Python) |
| Real-time | Flask-SocketIO + Socket.io-client |
| Auth | Flask-JWT-Extended + Flask-Bcrypt |
| API Client | Axios |
| CORS | Flask-CORS |
| Database | In-memory dict (upgrade to SQLite/PostgreSQL) |

---

## 🚀 Production Upgrades (Post-Hackathon)
- **Database**: Replace in-memory with SQLite (`flask-sqlalchemy`) or PostgreSQL
- **Storage**: Use Cloudinary or AWS S3 for file uploads
- **Deploy Backend**: Railway.app or Render.com (free tier)
- **Deploy Frontend**: Vercel or Netlify (free)
- **Video Calls**: Integrate WebRTC via PeerJS

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register (pending) |
| GET | /api/auth/me | Get current user |
| GET | /api/users | Get all approved users |
| GET | /api/groups | Get my groups |
| POST | /api/groups | Create group |
| GET | /api/messages/:chatId | Get messages |
| POST | /api/messages/upload | Upload file |
| GET | /api/admin/stats | Admin stats |
| GET | /api/admin/pending | Pending users |
| POST | /api/admin/approve/:id | Approve user |
| POST | /api/admin/reject/:id | Reject user |
| DELETE | /api/admin/users/:id | Remove user |

## 🔌 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| authenticate | Client→Server | Login socket session |
| send_message | Client→Server | Send a message |
| new_message | Server→Client | Receive a message |
| typing / stop_typing | Bidirectional | Typing indicators |
| user_online/offline | Server→Client | Presence updates |
| new_join_request | Server→Admin | New registration alert |
| account_approved | Server→Client | Approval notification |
