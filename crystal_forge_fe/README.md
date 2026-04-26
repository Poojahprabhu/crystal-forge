# Crystal Forge — Frontend

React + TypeScript + Vite + Tailwind frontend for the Crystal Forge Django backend.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- React Router v6
- React Hook Form + Zod
- Axios with JWT access/refresh interceptors

## Setup

```bash
cd crystal_forge_fe
npm install
cp .env.example .env   # adjust VITE_API_BASE_URL if needed
npm run dev
```

The dev server runs on `http://localhost:5173` and talks to the Django backend at `VITE_API_BASE_URL` (default `http://localhost:8000`).

> **Note:** the backend uses `django-cors-headers` but does not currently set
> `CORS_ALLOWED_ORIGINS` for the Vite dev server. If browser requests to the
> API are blocked by CORS, add `http://localhost:5173` (and `127.0.0.1:5173`)
> to `CORS_ALLOWED_ORIGINS` in `crystal_forge_be/config/settings/local.py`.

## Backend endpoints used

- `POST /api/auth/register/` — create account, returns `{ user, tokens: { access, refresh } }`
- `POST /api/auth/login/` — exchange username/password for `{ access, refresh }`
- `POST /api/auth/refresh/` — exchange refresh for new access (auto-called by axios interceptor on 401)
- `GET  /api/users/me/` — current user

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build
- `npm run typecheck` — TypeScript-only check

## Routes

- `/login` — public, redirects to `/` when already signed in
- `/register` — public, redirects to `/` when already signed in
- `/` — protected dashboard, redirects to `/login` otherwise
