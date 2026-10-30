# Reason-First: Educational Diagnostic System

A teacher diagnostic prototype for Class 3 subtraction reasoning with regrouping.
Built for the MIT Solve 2027 Global Learning Challenge.

## System Architecture

```text
[Frontend: React + Vite + Tailwind] (Port 5173)
             │
             ▼  REST API (JSON)
[Backend: Express.js + PostgreSQL]  (Port 4000)
             │
             ▼  HTTP Predict (JSON)
[ML Diagnostic Engine: Python]      (Port 8000)
```

## Quick Start (How to Run Everything)

### Option A: One-Click Windows Launcher
Double-click `start_all.bat` or run:
```powershell
.\start_all.bat
```

### Option B: Run in Separate Terminals

1. **ML Diagnostic Engine (Python)**
   ```powershell
   python ml_model/math-diagnostic-ml/server.py
   # Runs on http://localhost:8000
   ```

2. **Backend Server (Express)**
   ```powershell
   cd backend
   npm install
   npm run dev
   # Runs on http://localhost:4000
   ```

3. **Frontend Application (React + Vite)**
   ```powershell
   cd frontend
   npm run dev
   # Opens on http://localhost:5173
   ```

## API Endpoints

- **ML Server (`:8000`)**:
  - `GET /health` — Service health & approved probe list
  - `GET /probes` — Assessment question probes
  - `POST /predict` — Analyzes responses & detects mathematical misconceptions (Smaller-From-Larger, Borrow-Without-Decrement)

- **Backend Server (`:4000`)**:
  - `GET /health` — Checks DB and ML Service connectivity
  - `GET /api/probes` — Fetches active assessment questions
  - `POST /api/responses` — Submits student answers, queries ML engine, stores result
  - `GET /api/dashboard` — Live teacher dashboard statistics & student roster
  - `GET /api/reports/:id` — Diagnostic report by response ID