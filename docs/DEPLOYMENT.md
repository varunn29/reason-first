# ReasonFirst — Production Deployment Guide

This guide covers step-by-step deployment for ReasonFirst across all 3 tiers:
1. **Frontend (React + Vite SPA)**: Deployable to Vercel, Netlify, or Cloudflare Pages.
2. **Backend (Node.js Express API)**: Deployable to Render, Railway, Fly.io, or VPS.
3. **ML Diagnostic Engine (Python Standard Library Server)**: Deployable to Render, Railway, Fly.io, or Docker.

---

## Architecture Overview

```
[ Student / Teacher Browser ]
            │
            ▼
┌─────────────────────────┐
│   Frontend (Vite SPA)   │  (Hosted on Vercel / Netlify)
└───────────┬─────────────┘
            │  VITE_API_URL
            ▼
┌─────────────────────────┐
│  Backend (Express API)  │  (Hosted on Render / Railway / Fly.io)
└─────┬──────────────┬────┘
      │              │
      │ ML_API_URL   │ DATABASE_URL (Neon Postgres)
      ▼              ▼
┌───────────┐  ┌───────────┐
│ ML Engine │  │ Postgres  │
│ (Python)  │  │ Database  │
└───────────┘  └───────────┘
```

---

## 1. Deploying the ML Diagnostic Engine (Python)

The Python diagnostic engine (`ml_model/math-diagnostic-ml/server.py`) has **zero external package dependencies** (built strictly with the Python standard library).

### Option A: Render / Railway Web Service
- **Root Directory**: `ml_model/math-diagnostic-ml`
- **Build Command**: *(None required or `echo "Ready"`)*
- **Start Command**: `python server.py`
- **Port Environment**: Render/Railway automatically injects `PORT`. `server.py` listens dynamically to `os.environ.get("PORT", 8000)`.
- **Health Check Path**: `/health`

Once deployed, note your ML engine URL (e.g., `https://reason-first-ml.onrender.com`).

---

## 2. Deploying the Backend API (Node.js Express)

The backend (`backend/server.js`) handles session lifecycle, evidence aggregation, speech-to-text, chat reasoning, teacher interventions, and ML proxying.

### Option A: Render / Railway Web Service
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start` (or `node server.js`)
- **Environment Variables**:
  | Variable | Required | Description | Example / Default |
  | :--- | :--- | :--- | :--- |
  | `PORT` | Auto | Port assigned by hosting provider | `4000` |
  | `ML_API_URL` | Recommended | URL of deployed ML Diagnostic Service | `https://reason-first-ml.onrender.com` *(falls back to built-in local engine if unreached)* |
  | `DATABASE_URL` | Optional | Neon Postgres connection string | `postgres://user:pass@ep-xyz.neon.tech/neondb` *(falls back to in-memory store if unset)* |
  | `GEMINI_API_KEY` | Optional | Google Gemini API key for live reasoning | `AIzaSy...` *(falls back to deterministic simulator if unset)* |
  | `OPENAI_API_KEY` | Optional | Alternative OpenAI API key | `sk-...` |
  | `CHAT_LLM_MODEL` | Optional | Model identifier | `gemini-2.5-flash` or `gemini-1.5-flash` |
  | `CHAT_FEATURE_ENABLED` | Optional | Enable reasoning chat | `true` |
  | `CHAT_DEFAULT_LANGUAGE` | Optional | Default language | `hi` (Hindi) |

Once deployed, note your Backend URL (e.g., `https://reason-first-backend.onrender.com`).

---

## 3. Deploying the Frontend (React + Vite)

The frontend is configured with SPA redirect rules (`frontend/vercel.json` for Vercel, `frontend/public/_redirects` for Netlify) to ensure direct route visits (e.g. `/dashboard`, `/solve`, `/students`) work seamlessly without 404s.

### Option A: Vercel
1. Import repository on [Vercel Dashboard](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite** (auto-detected).
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Environment Variables**:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://reason-first-backend.onrender.com` without trailing slash).
7. Click **Deploy**.

### Option B: Netlify
1. Connect repository on [Netlify Dashboard](https://app.netlify.com).
2. Set **Base directory**: `frontend`
3. **Build command**: `npm run build`
4. **Publish directory**: `frontend/dist`
5. **Environment variables**:
   - `VITE_API_URL`: Your deployed backend URL.
6. Click **Deploy site**.

---

## 4. Single-Server / Monolithic Deployment (Docker / VPS Alternative)

If deploying the entire application to a single Virtual Private Server (Ubuntu/Debian, EC2, DigitalOcean Droplet):

```bash
# 1. Clone repository
git clone https://github.com/varunn29/reason-first.git
cd reason-first

# 2. Start ML Engine with PM2 or systemd
cd ml_model/math-diagnostic-ml
python3 server.py &

# 3. Setup Backend
cd ../../backend
npm install
npm start &

# 4. Build Frontend & Serve with Nginx
cd ../frontend
npm install
npm run build
# Point Nginx to frontend/dist with `try_files $uri /index.html;`
```

---

## 5. Verification Checklist Post-Deployment

After deployment, verify that all three tiers are communicating:

- [ ] **ML Health Check**: `GET https://your-ml-url.com/health` returns `{"status": "ok", "engine_version": "0.1.0"}`.
- [ ] **Backend Health Check**: `GET https://your-backend-url.com/health` returns status `200`.
- [ ] **Assignment Loading**: Visit frontend `/solve` — loads Class 3 subtraction probes.
- [ ] **Session Submission**: Complete an assessment — diagnostic result status shows `SUPPORTED_HYPOTHESIS` / `CANDIDATE_MISCONCEPTION`.
- [ ] **Teacher Dashboard**: Visit `/dashboard` — displays class mastery, misconception radar, and intervention tracker.
- [ ] **Deep Link Refresh**: Refresh browser on `/dashboard` or `/report` — page reloads cleanly without 404 errors.

