# Reason-First: Educational Diagnostic System

A teacher diagnostic platform for primary school students (Classes 3–5, ages 8–10) in India.  
Built for the **MIT Solve 2027 Global Learning Challenge**.

---

## System Architecture

```text
[Frontend: React + Vite + Tailwind] (Port 5173)
             │
             ▼  REST API (JSON)
[Backend: Express.js + PostgreSQL]  (Port 4000)
             │
             ├──► [Teacher Bot Chat Brain (Hindi / Hinglish / Voice)]
             │
             ▼  HTTP Predict (JSON)
[ML Diagnostic Engine: Python]      (Port 8000)
```

---

## Quick Start (How to Run Everything)

### Option A: One-Click Windows Launcher
Double-click `start_all.bat` or run:
```powershell
.\start_all.bat
```

### Option B: Run Services in Separate Terminals

1. **ML Diagnostic Engine (Python)**
   ```powershell
   python ml_model/math-diagnostic-ml/server.py
   # Runs on http://localhost:8000
   ```

2. **Backend Server (Express + PostgreSQL)**
   ```powershell
   cd backend
   npm install
   npm run dev
   # Runs on http://localhost:4000
   ```

3. **Frontend Application (React + Vite)**
   ```powershell
   cd frontend
   npm install
   npm run dev
   # Opens on http://localhost:5173
   ```

---

## New Feature: "Chat with Teacher Bot" (Dialogue Diagnostics)

After a child submits an answer, a friendly AI teacher bot ("दीदी / Felix") converses with the student in **Hindi, Hinglish, or English** to uncover their internal reasoning using ultra-short (max 15 words) questions, large quick-reply buttons, and hands-free voice input.

### 1. Environment Configuration

Add the following to [`backend/.env`](backend/.env):

```env
# Database Connection (Neon Postgres)
DATABASE_URL="postgresql://neondb_owner:...@ep-holy-fire-a1pq3hr3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
ML_API_URL=http://localhost:8000

# Chat Feature Flag (Toggle false to disable completely)
CHAT_FEATURE_ENABLED=true
CHAT_DEFAULT_LANGUAGE=hi

# LLM API Keys (Supports OpenAI API, Gemini, Groq, or OpenRouter)
OPENAI_API_KEY=your_openai_api_key_here
# or
GEMINI_API_KEY=your_gemini_api_key_here
```

In [`frontend/.env`](frontend/.env):
```env
VITE_API_URL=http://localhost:4000
VITE_CHAT_FEATURE_ENABLED=true
```

### 2. Run the Additive Database Migration

Run the non-destructive migration to create the `chat_sessions`, `chat_messages`, and `chat_summaries` tables in PostgreSQL:

```bash
cd backend
npm run migrate:chat
```

### 3. Run Automated Child-Safety & Edge-Case Tests

Run the automated test suite simulating 5 edge cases (*"I don't know"* child, off-topic cricket chat, cheating attempts, correct reasoning verification, and API fallback recovery):

```bash
cd backend
npm run test:edge-cases
```

To run the interactive terminal chat simulator with Rahul:
```bash
cd backend
npm run test:chat
```

---

## Privacy & Child Data Safety

Please review [`PRIVACY.md`](PRIVACY.md) for full compliance details:
1. **Zero Real Names**: Students are identified only by classroom roll numbers or first names.
2. **Zero Raw Audio**: Speech-to-text is performed in real-time on-device via Web Speech API; no audio files are uploaded or stored.
3. **30-Day Auto Deletion**: Chat transcripts and logs are purged after 30 days via database retention policies.
4. **Formative Only**: The chat is an observational aid for teachers, not a test, and never assigns grades or penalties.

---

## Known Limitations

1. **Curriculum Scope**: Currently optimized for Class 4 fractions (e.g., $1/2 + 1/4 = 2/6$, denominator addition bugs) and Class 3 two-digit subtraction with regrouping ($61 - 24 = 43$). Additional grade levels (multi-digit multiplication and decimals) will be introduced in future releases.
2. **Voice Recognition Environment**: Hands-free voice input relies on the browser's Web Speech API (`hi-IN`), which works best in Chromium-based browsers (Google Chrome, Microsoft Edge). In noisy classrooms with high background chatter, students can tap the large one-touch quick-reply buttons instead.
3. **Teacher Voice Audio Clips**: Pre-recorded human voice clips are placed in `frontend/public/audio/phrases/`. If a specific phrase `.mp3` is not present, the app automatically falls back to browser Text-to-Speech (TTS) or silent text without crashing.

---

## Authentication & User Accounts

The system provides fully functioning authentication for educators and students with zero external npm dependencies (using Node standard library `crypto` for scrypt password hashing and HMAC-SHA256 tokens):

- **Teacher Login**:
  - Email: `teacher@demo.com`
  - Password: `password123`
  - Features: Real authentication, new teacher registration, personalized dashboard greeting, and student join code.
- **Student Class Code Login**:
  - Class Code: `3A` (or custom codes generated upon teacher registration)
  - Student Name: e.g. `Rahul`
  - Features: Frictionless, zero-password login designed specifically for primary school children (ages 8–10).
- **Run Authentication Test Suites**:
  ```powershell
  # Service-level unit tests
  node backend/test-auth.js

  # End-to-end HTTP endpoint tests
  node backend/test-auth-endpoints.js
  ```

---

## API Endpoints Overview

- **Authentication Endpoints (`:4000/api/auth`)**:
  - `POST /api/auth/register` — Registers new teacher account with password hash & assigns classroom
  - `POST /api/auth/login` — Authenticates teacher with email/password and returns JWT token
  - `GET /api/auth/me` — Returns authenticated teacher profile via Bearer token
  - `POST /api/auth/student-login` — Authenticates primary student via Class Code and student name
  - `GET /api/auth/classroom/:code` — Validates class code and returns teacher/grade details

- **ML Server (`:8000`)**:
  - `GET /health` — Service health & approved probe metadata
  - `GET /probes` — Curated assessment question probes
  - `POST /predict` — Deterministic mathematical misconception engine

- **Backend Server (`:4000`)**:
  - `GET /health` — Verifies database and ML service connectivity
  - `GET /api/probes` — Active assessment questions
  - `POST /api/responses` — Submits student answer, queries ML engine, stores result
  - `GET /api/dashboard` — Live teacher dashboard statistics & student roster
  - `GET /api/reports/:id` — Diagnostic report by response ID
  - `POST /chat/start` — Initializes a new 1-on-1 dialogue session
  - `POST /chat/message` — Evaluates student input and returns bot turn
  - `POST /chat/finish` — Completes dialogue and generates Teacher Summary
  - `GET /chat/summary/:sessionId` — Retrieves teacher AI diagnosis summary
  - `GET /chat/transcript/:sessionId` — Retrieves full conversation transcript
  - `POST /chat/feedback` — Records teacher disputes and notes on summaries
