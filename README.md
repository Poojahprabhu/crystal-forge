# Crystal Forge

A career-fit assistant: parse a resume, quiz the candidate over weak skills, then match the verified profile against one or more job descriptions to produce a percentage match, skill-gap breakdown, curated learning resources, and a week-by-week study plan.

This repository is a monorepo with two apps:

| Path                  | Stack                                                       |
| --------------------- | ----------------------------------------------------------- |
| `crystal_forge_be/`   | Django 6 + DRF + SimpleJWT + Celery + Postgres 18 + Redis 7 |
| `crystal_forge_fe/`   | React 18 + TypeScript + Vite + Tailwind + React Router      |

The backend uses LLMs (Mistral) for resume parsing and JD matching, and Tavily for resource search. Both keys are required for the matcher and parser flows to work end-to-end.

---

## Prerequisites

- **Docker** + **Docker Compose** (recommended path for the backend)
- **just** — task runner used by the backend (`brew install just` / `cargo install just`)
- **Node.js 20+** and **npm 10+** for the frontend
- API keys:
  - `MISTRAL_API_KEY` — https://console.mistral.ai/
  - `TAVILY_API_KEY` — https://tavily.com/

If you'd rather run the backend without Docker, you also need:

- **Python 3.14** (the version pinned in `crystal_forge_be/.python-version`)
- **uv** — https://docs.astral.sh/uv/ (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Postgres 18** and **Redis 7** running locally

---

## Repository layout

```
crystalforge/
├── crystal_forge_be/        # Django project
│   ├── config/              # Django settings, urls, celery
│   ├── crystal_forge_be/
│   │   ├── parser/          # Resume parsing + clarification quiz
│   │   ├── matcher/         # JD ↔ resume matching, study plans
│   │   └── users/           # Auth, profile API
│   ├── compose/             # Dockerfiles (local + production)
│   ├── docker-compose.local.yml
│   ├── justfile             # Docker shortcuts
│   ├── manage.py
│   └── pyproject.toml
└── crystal_forge_fe/        # Vite/React app
    ├── src/
    ├── package.json
    └── vite.config.ts
```

---

## Backend setup

### Option A — Docker (recommended)

This is the path the `justfile` is built around. It spins up Django, Postgres, Redis, Celery worker, Celery beat, Flower, and Mailpit in one shot.

#### 1. Configure environment files

The backend reads two env files at runtime: `.envs/.local/.django` (app config) and `.envs/.local/.postgres` (database). They're already present in the repo with sensible defaults — you just need to fill in the API keys.

`crystal_forge_be/.envs/.local/.django` requires:

```dotenv
USE_DOCKER=yes
IPYTHONDIR=/app/.ipython
REDIS_URL=redis://redis:6379/0
CELERY_FLOWER_USER=debug
CELERY_FLOWER_PASSWORD=debug
MISTRAL_API_KEY=sk-...               # required
MISTRAL_OCR_MODEL=mistral-ocr-latest
MISTRAL_CHAT_MODEL=mistral-large-latest
TAVILY_API_KEY=tvly-...              # required
```

`crystal_forge_be/.envs/.local/.postgres`:

```dotenv
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=crystal_forge_be
POSTGRES_USER=debug
POSTGRES_PASSWORD=debug
DATABASE_URL=postgres://debug:debug@postgres:5432/crystal_forge_be
```

> Both env files are committed (they hold no real secrets). Add your API keys locally and **do not** commit changes that include real credentials.

#### 2. Build and start the stack

From `crystal_forge_be/`:

```bash
just build           # builds the Django image
just up              # starts Django + Postgres + Redis + Celery + Mailpit + Flower
just logs django     # tail Django logs (Ctrl+C to detach)
```

#### 3. Run migrations and create a superuser

```bash
just manage migrate
just manage createsuperuser
```

Use `just manage <cmd>` to run any `manage.py` subcommand inside the Django container.

#### 4. Verify

| Service        | URL                                |
| -------------- | ---------------------------------- |
| Django         | http://localhost:8000              |
| API schema     | http://localhost:8000/api/schema/  |
| Swagger UI     | http://localhost:8000/api/docs/    |
| Django admin   | http://localhost:8000/admin/       |
| Flower (Celery)| http://localhost:5555 (debug/debug)|
| Mailpit        | http://localhost:8025              |

#### 5. Common just commands

```bash
just down              # stop containers (keeps volumes)
just prune             # stop + delete volumes (resets the database)
just logs celeryworker # tail celery worker
just manage shell      # Django shell
just manage makemigrations
```

### Option B — Native (no Docker)

You'll need Postgres and Redis running on your host. Update `DATABASE_URL` and `REDIS_URL` accordingly.

```bash
cd crystal_forge_be

# Install Python deps into a project-local virtualenv
uv sync

# Create a .env at the project root (settings/base.py reads it)
cat > .env <<'EOF'
DATABASE_URL=postgres://debug:debug@localhost:5432/crystal_forge_be
REDIS_URL=redis://localhost:6379/0
USE_DOCKER=no
DJANGO_SETTINGS_MODULE=config.settings.local
MISTRAL_API_KEY=sk-...
MISTRAL_OCR_MODEL=mistral-ocr-latest
MISTRAL_CHAT_MODEL=mistral-large-latest
TAVILY_API_KEY=tvly-...
EOF

# Migrate + run
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver 0.0.0.0:8000
```

In a second terminal, start the Celery worker (the matcher dispatches jobs through it):

```bash
cd crystal_forge_be
uv run celery -A config.celery_app worker -l INFO
```

---

## Frontend setup

```bash
cd crystal_forge_fe
npm install
cp .env.example .env       # default points at http://localhost:8000
npm run dev
```

Open http://localhost:5173.

The Vite dev server is already whitelisted in [`config/settings/local.py`](crystal_forge_be/config/settings/local.py) under `CORS_ALLOWED_ORIGINS`, so the frontend can call the API directly.

### Frontend scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Vite dev server with HMR             |
| `npm run build`    | Type-check + production build        |
| `npm run preview`  | Preview the production build locally |
| `npm run typecheck`| TypeScript only (no emit)            |
| `npm run lint`     | ESLint                               |

### Environment

Only one env var:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

If you proxy the API behind a different host or port, change this.

---

## End-to-end smoke test

With both apps running:

1. Go to http://localhost:5173/register and create an account (email + password — no username).
2. Land on `/dashboard`, upload a resume PDF.
3. Answer the clarification quiz turn by turn (or click **Skip and analyze JDs**).
4. Paste one or more JDs and submit. The dashboard polls `/api/matcher/analyze/<batch>/` until each analysis is done.
5. Visit `/profile` to see all past analyses and study plans. Refresh the page at any point — server state is the source of truth, the UI rehydrates from `/api/parser/analyze/`, `/api/parser/chat/`, and `/api/matcher/analyze/`.

---

## API surface

All API endpoints are JWT-authenticated except `register`, `login`, and `refresh`. Tokens come from `POST /api/auth/login/` (email + password) and the frontend's axios interceptor refreshes them automatically on 401.

### Auth (`/api/auth/`)

| Method | Path        | Body                                   | Returns                          |
| ------ | ----------- | -------------------------------------- | -------------------------------- |
| POST   | `register/` | `first_name, last_name, email, password` | `{ user, tokens: {access, refresh} }` |
| POST   | `login/`    | `email, password`                      | `{ access, refresh }`            |
| POST   | `refresh/`  | `{ refresh }`                          | `{ access }`                     |

### Parser (`/api/parser/`)

| Method | Path        | Notes                                                   |
| ------ | ----------- | ------------------------------------------------------- |
| GET    | `analyze/`  | Latest resume snapshot, 404 if none                     |
| POST   | `analyze/`  | Upload resume `multipart/form-data` field `document`    |
| GET    | `chat/`     | Next clarification question, or final verdict          |
| POST   | `chat/`     | Submit `{ answer }` for the current question           |
| POST   | `answers/`  | Bulk-submit `{ answers: [{id, answer}] }` for re-eval  |

### Matcher (`/api/matcher/`)

| Method | Path             | Notes                                                |
| ------ | ---------------- | ---------------------------------------------------- |
| GET    | `analyze/`       | List all batches for the user (newest first)        |
| POST   | `analyze/`       | `{ jds: ["…", "…"] }` — kicks off async matching     |
| GET    | `analyze/<id>/`  | Poll a single batch with all its analyses            |

### Profile (`/api/profile/`)

| Method | Path                       | Notes                                       |
| ------ | -------------------------- | ------------------------------------------- |
| GET    | `/`                        | User + counts overview                      |
| GET    | `resume/`                  | Full resume snapshot                        |
| GET    | `jd-analyses/`             | Flat list of every analysis                 |
| GET    | `jd-analyses/<id>/`        | Single analysis incl. `jd_text`             |
| GET    | `study-plans/`             | List of completed analyses with plans       |
| GET    | `study-plans/<analysis_id>/` | Single study plan                         |

---

## Troubleshooting

### Database is fresh and empty
The first time you boot the Docker stack you have to run `just manage migrate`. Without that, every API call that touches the DB will 500.

### "MISTRAL_API_KEY is not configured."
The matcher and parser raise this if the key is missing. Add it to `.envs/.local/.django` and `just down && just up` to pick up the change.

### Tavily search returns no resources
The matcher logs a warning and continues with empty resources/study plan if `TAVILY_API_KEY` is missing or the search fails. Check `just logs celeryworker` for the warning.

### CORS errors in the browser
The dev server origin (`http://localhost:5173`) is already in `CORS_ALLOWED_ORIGINS`. If you change the Vite port, update `crystal_forge_be/config/settings/local.py` accordingly.

### "Pre-flight" 401s
The axios interceptor handles 401s by refreshing the access token automatically. If you see repeated 401 loops, your refresh token has likely expired — sign out and log back in.

### Reset everything
```bash
cd crystal_forge_be
just prune              # drops Postgres + Redis volumes
just up
just manage migrate
just manage createsuperuser
```

---

## Running tests

```bash
cd crystal_forge_be
uv run pytest                 # native
# OR
just manage test              # in Docker
```

Frontend has no test runner configured yet; `npm run typecheck` is the closest equivalent.
