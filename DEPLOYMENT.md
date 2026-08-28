# TradeLens Deployment Guide

This guide outlines how to deploy the TradeLens application to a production environment. TradeLens is a full-stack application consisting of a React frontend and a FastAPI backend with a PostgreSQL database.

## Architecture Overview

For a typical production deployment, we recommend the following stack:
- **Database**: [Supabase](https://supabase.com/) or [Railway](https://railway.app/) (PostgreSQL)
- **Backend API**: [Render](https://render.com/) or [Railway](https://railway.app/) (FastAPI)
- **Frontend**: [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/) (React/Vite)

---

## 1. Database Deployment

You need a PostgreSQL database. Here is how to set one up using Supabase (free tier available):

1. Go to [Supabase](https://supabase.com/) and create a new project.
2. In your project dashboard, go to **Settings > Database**.
3. Locate your **Connection String (URI)**. It will look something like this:
   `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`
4. Save this URI; you will need it for the backend environment variables.

---

## 2. Backend Deployment (Render)

Render makes deploying FastAPI very simple.

### Prerequisites
Make sure your project is pushed to a GitHub repository.

### Steps
1. Create an account on [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the TradeLens code.
4. Configure the Web Service:
   - **Name**: `tradelens-backend` (or similar)
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python apply_schema.py && alembic upgrade head`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

   > **Why `apply_schema.py` runs first**: Alembic's migration chain only tracks
   > changes made *after* the original schema (adding the `users` table, etc.) —
   > it assumes `accounts`/`trades`/`symbols`/etc. already exist. Those are
   > defined in `schema.sql`, which `apply_schema.py` applies (idempotently —
   > safe to run on every deploy). Skipping this step means `alembic upgrade
   > head` fails on a fresh database with "relation accounts does not exist".

   Alternatively, use the `render.yaml` Blueprint at the repo root — Render
   auto-detects it when you connect the repo, and it already includes this
   build command; you'll just be prompted for the `sync: false` env vars below.
5. Click **Advanced** and add the following **Environment Variables**:
   - `DATABASE_URL`: The PostgreSQL connection string from step 1.
   - `SECRET_KEY`: A strong random string (generate one via `python -c "import secrets; print(secrets.token_hex(32))"`).
   - `APP_DEBUG`: `false`
   - `ALLOWED_ORIGINS_STR`: The URL of your future Vercel frontend (e.g., `https://tradelens.vercel.app`), or `*` temporarily if you haven't deployed the frontend yet.
   - `PYTHON_VERSION`: `3.11.9` — **required**. Without this, Render defaults to
     the newest Python it supports, which is often too new for `pydantic-core`
     to have a prebuilt wheel for yet; pip then tries to compile it from Rust
     source and fails in Render's build sandbox with a `Read-only file system`
     error from `cargo`/`maturin`. Pinning to 3.11.x (matching local dev)
     avoids this.
6. Click **Create Web Service**. Render will now build and deploy your API. Note the URL of your deployed backend (e.g., `https://tradelens-backend.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

Vercel is the best platform for deploying Vite/React applications.

### Steps
1. Create an account on [Vercel](https://vercel.com/) and link your GitHub account.
2. Click **Add New... > Project**.
3. Import your TradeLens repository.
4. Configure the Project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Open the **Environment Variables** section and add:
   - `VITE_API_URL`: The URL of your deployed backend, appended with `/api` (e.g., `https://tradelens-backend.onrender.com/api`).
6. Click **Deploy**. Vercel will build and publish your frontend.

   `frontend/vercel.json` (already in the repo) adds a catch-all rewrite to
   `index.html`, needed because this is a client-side-routed React app —
   without it, refreshing on a route like `/trades/{id}` 404s.
7. Once deployed, note the frontend URL. **Important:** Go back to your Backend environment variables on Render and update `ALLOWED_ORIGINS_STR` to include your exact Vercel frontend URL (without a trailing slash).

---

## Known Limitations

- **Journal screenshot uploads are lost on redeploy.** They're saved to local
  disk (`backend/uploads/`), and Render's free tier filesystem is ephemeral —
  wiped on every deploy/restart. Fine for evaluating the app; for real use,
  this needs migrating to persistent storage (a paid Render disk, or S3/R2/
  Supabase Storage) — not yet implemented.
- **MT5 trade sync requires the local agent** (see `agent/README.md`) — the
  hosted backend can't reach MT5 directly. Same applies to trade-detail
  chart data, which the agent also pushes.

---

## Post-Deployment Checklist

- [ ] **Test Registration/Login**: Create a new account on the live frontend.
- [ ] **Check Database**: Verify the user was created in your PostgreSQL database.
- [ ] **CORS**: If the frontend cannot communicate with the backend, verify that the `ALLOWED_ORIGINS_STR` in the backend exactly matches the frontend URL.
- [ ] **Environment Variables**: Ensure `APP_DEBUG` is set to `false` in the backend for security.

## Updating the Application

When you push new code to the `main` branch of your GitHub repository, Vercel and Render will automatically detect the changes, pull the latest code, build it, and deploy the new version seamlessly.
