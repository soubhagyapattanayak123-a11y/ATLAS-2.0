# ATLAS 2.0 — Next-Gen Full-Stack Platform

A modern, high-performance full-stack application built with **React + TypeScript (Vite)** on the frontend, **Python + FastAPI** on the backend, and **SQLite (with WAL mode)** for lightweight, zero-configuration persistent storage.

---

## 🌟 Tech Stack

| Layer | Technologies | Description |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Vanilla CSS | Sleek glassmorphic dark UI, Google Fonts (Outfit, Inter, JetBrains Mono), responsive CSS grid |
| **Backend** | Python 3.14+, FastAPI, Uvicorn, Pydantic v2 | High-throughput asynchronous REST API, OpenAPI docs, CORS enabled |
| **Database** | SQLite + SQLAlchemy 2.0 | Auto-migrated schema, Write-Ahead Logging (WAL) mode enabled, sample seed data |

---

## 📂 Directory Structure

```text
ATLAS 2.0/
├── backend/
│   ├── app/
│   │   ├── __init__.py       # Package indicator
│   │   ├── main.py           # FastAPI entrypoint, routes, CORS & lifespan
│   │   ├── database.py       # SQLAlchemy SQLite engine & session dependency
│   │   ├── models.py         # SQLAlchemy ORM models (AtlasItem)
│   │   ├── schemas.py        # Pydantic v2 validation & response schemas
│   │   └── crud.py           # Database queries, updates, and metrics
│   ├── requirements.txt      # Backend Python dependencies
│   ├── run.py                # Single-command backend server runner
│   └── venv/                 # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── api.ts            # Typed API client with error handling
│   │   ├── App.tsx           # Interactive node dashboard with CRUD & metrics
│   │   ├── index.css         # Glassmorphic theme & CSS tokens
│   │   ├── main.tsx          # React application root
│   │   └── types.ts          # Shared TypeScript interfaces
│   ├── index.html            # Web entry point with Google Fonts
│   ├── package.json          # Frontend dependencies & scripts
│   ├── tsconfig.json         # TypeScript configuration
│   └── vite.config.ts        # Vite build & dev server configuration
├── .gitignore                # Git exclusions (venv, node_modules, db files)
├── run-dev.bat               # Windows one-click launcher for both servers
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup & Run (FastAPI + SQLite)

Open a terminal in the project directory:

```bash
cd backend

# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Run the backend API server
python run.py
```

- **Backend API URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Alternative ReDoc**: `http://127.0.0.1:8000/redoc`

The SQLite database file `backend/atlas.db` will be automatically initialized and pre-seeded with sample nodes on first run.

---

### 2. Frontend Setup & Run (React + TypeScript)

In a second terminal window:

```bash
cd frontend

# Start the Vite development server
npm run dev
```

- **Frontend App URL**: `http://localhost:5173`

---

## 📡 REST API Endpoints

### 🔐 Authentication & Identity Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account & receive bearer session token |
| `POST` | `/api/auth/login` | Log in with username/email and password |
| `GET` | `/api/auth/me` | Fetch authenticated user profile (Requires `Authorization: Bearer <token>`) |
| `GET` | `/api/auth/demo-accounts` | List available demo accounts with descriptions and roles |
| `PUT` | `/api/auth/profile` | Update user full name and email |
| `POST` | `/api/auth/change-password` | Update account password with PBKDF2 hash verification |
| `POST` | `/api/auth/logout` | Revoke session token and log out |

> **Default Demo Evaluation Credentials**:
> 1. **System Administrator**: `atlas_admin` / `AtlasAdmin123!` (Role: `admin`)
> 2. **Senior Engineer**: `demo_engineer` / `AtlasDev123!` (Role: `developer`)


### 📦 Nodes & Telemetry

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Live service health check & SQLite database connectivity |
| `GET` | `/api/stats` | Real-time counts by status, priority, and category |
| `GET` | `/api/items` | Query nodes (supports `status`, `category`, `priority`, and `search` filters) |
| `GET` | `/api/items/{id}` | Retrieve specific item details |
| `POST` | `/api/items` | Create a new node record |
| `PUT` | `/api/items/{id}` | Update node attributes (title, status, priority, etc.) |
| `DELETE` | `/api/items/{id}` | Remove a node from SQLite |

---

## 🧪 Testing Backend and Frontend

- **Test Frontend Build**:
  ```bash
  cd frontend
  npm run build
  ```

- **Test Backend API Endpoint**:
  ```bash
  curl http://127.0.0.1:8000/api/health
  ```

---

## 🚢 Production Deployment Guide

ATLAS 2.0 can be deployed using three primary strategies depending on your infrastructure:

### Strategy 1: Free / Low-Cost Cloud (Vercel Frontend + Render/Railway Backend)

#### Step 1: Deploy Backend (FastAPI on Render / Railway)
1. Push your project to GitHub.
2. Sign in to [Render.com](https://render.com) or [Railway.app](https://railway.app).
3. Create a **New Web Service** and select your GitHub repository.
4. Configure service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add the values from `backend/.env.example`:
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `ALLOWED_ORIGINS`: Your frontend URL (e.g., `https://your-atlas-app.vercel.app`)
   - `SMTP_USER` & `SMTP_PASSWORD`: Your Gmail address & App Password (for OTPs)
   - `SECRET_KEY` & `SECURITY_PEPPER`: Secure random strings
6. Copy your live backend URL (e.g. `https://atlas-backend.onrender.com`).

#### Step 2: Deploy Frontend (React SPA on Vercel)
1. Go to [Vercel.com](https://vercel.com) and import your GitHub repository.
2. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://atlas-backend.onrender.com/api` (your backend URL + `/api`)
4. Click **Deploy**. Vercel will automatically build and publish your frontend with global CDN acceleration and HTTPS!

---

### Strategy 2: All-in-One Docker Container (Any VPS / Cloud Run / DigitalOcean)

The included multi-stage `Dockerfile` automatically builds the React frontend and packages it inside the FastAPI server, serving the entire application on port `8000`:

1. Copy `.env.example` to `.env`:
   ```bash
   cp backend/.env.example .env
   ```
2. Build and run with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. Access your full application at `http://YOUR_SERVER_IP:8000`!
   - Database is persistently stored in the `atlas-data` Docker volume.

---

### Strategy 3: Ubuntu / Debian Linux VPS (Nginx + Systemd)

#### 1. Server Prerequisites
```bash
sudo apt update && sudo apt install -y python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx
```

#### 2. Clone & Build
```bash
git clone https://github.com/your-username/atlas-2.0.git /var/www/atlas
cd /var/www/atlas/backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env && nano .env

cd /var/www/atlas/frontend
npm ci && npm run build
```

#### 3. Systemd Service for FastAPI
Create `/etc/systemd/system/atlas-backend.service`:
```ini
[Unit]
Description=ATLAS 2.0 FastAPI Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/atlas/backend
ExecStart=/var/www/atlas/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now atlas-backend
```

#### 4. Nginx Configuration
Edit `/etc/nginx/sites-available/atlas`:
```nginx
server {
    server_name yourdomain.com;

    # Serve built React SPA
    location / {
        root /var/www/atlas/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API and WebSocket requests to FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and configure SSL:
```bash
sudo ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```
