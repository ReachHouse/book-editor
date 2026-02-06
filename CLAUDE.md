# Claude Code Reference - Book Editor

**CRITICAL: Read this file before making any deployment or structural changes.**

---

## VPS PATH WARNINGS - READ FIRST

| Path | Status | Notes |
|------|--------|-------|
| `/docker/book-editor` | **CORRECT** | Use this for all VPS operations |
| `/docker/book-editor-app` | **DOES NOT EXIST** | Wrong path - never use |
| `~/book-editor` | **DOES NOT EXIST** | Wrong path - never use |
| `/root/book-editor-backend` | **LEGACY** | Old deployment - do not use |
| `/root/book-editor-backend-OLD` | **LEGACY** | Old backup - do not use |

**If you get "No such file or directory", you are using the wrong path.**

---

## Environment Overview

| Environment | Location | Purpose |
|-------------|----------|---------|
| **Local Dev** | `/home/user/book-editor` | Development, testing, code changes |
| **VPS Production** | `/docker/book-editor` | Live site at reachhouse.cloud |

---

## VPS Deployment Commands

### To Update Live Site (after pushing to main):

```bash
cd /docker/book-editor && ./deploy.sh
```

### Quick Update (alternative):

```bash
cd /docker/book-editor && ./update.sh
```

---

## Project Structure (Verified)

```
/home/user/book-editor/          # LOCAL DEV ROOT
├── server.js                    # Express backend entry point
├── Dockerfile                   # Docker build config
├── docker-compose.yml           # Docker orchestration
├── deploy.sh                    # VPS deployment script
├── update.sh                    # Quick update script
├── package.json                 # Backend dependencies
│
├── frontend/                    # REACT FRONTEND
│   ├── src/
│   │   ├── App.jsx              # Main app component
│   │   ├── main.jsx             # Entry point
│   │   ├── index.css            # Global styles
│   │   ├── components/          # React components
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── CompletionView.jsx
│   │   │   ├── DebugLog.jsx
│   │   │   ├── DocumentAnalysis.jsx
│   │   │   ├── ErrorDisplay.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PasswordStrength.jsx
│   │   │   ├── ProcessingView.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── SavedProjects.jsx
│   │   │   ├── SetupWizard.jsx
│   │   │   ├── StyleGuideModal.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── UsageDisplay.jsx
│   │   │   ├── index.js
│   │   │   └── __tests__/       # Component tests
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx  # Auth state management
│   │   ├── hooks/
│   │   │   ├── useProjects.js
│   │   │   └── useToast.js
│   │   ├── services/
│   │   │   └── api.js           # All API calls
│   │   ├── utils/
│   │   │   ├── jwtUtils.js      # JWT decode/expiry checking
│   │   │   ├── fetchUtils.js    # fetchWithTimeout wrapper
│   │   │   └── documentUtils.js # Document utilities
│   │   └── constants/
│   │       ├── index.js         # App constants
│   │       └── version.js       # Version info
│   ├── package.json             # Frontend dependencies
│   └── vite.config.js           # Vite build config
│
├── routes/                      # EXPRESS ROUTES
│   ├── api.js                   # Main API routes (/api/edit-chunk, etc.)
│   ├── auth.js                  # Auth routes (/api/auth/*)
│   ├── setup.js                 # First-time setup route
│   ├── admin.js                 # Admin routes (/api/admin/*)
│   ├── health.js                # Health check route
│   ├── projects.js              # Project routes (/api/projects/*)
│   └── usage.js                 # Usage tracking routes
│
├── services/                    # BACKEND SERVICES
│   ├── database.js              # SQLite database layer
│   ├── authService.js           # Authentication logic
│   ├── anthropicService.js      # Claude API integration
│   ├── diffService.js           # Diff/change tracking
│   ├── styleRules.js            # Style rules loader
│   ├── styleRules/              # Style rule definitions
│   └── document/                # Document processing (empty)
│
├── middleware/                  # EXPRESS MIDDLEWARE
│   └── auth.js                  # JWT verification middleware
│
├── config/                      # APP CONFIGURATION
│   └── styleGuide.js            # Style guide config
│
├── __tests__/                   # TEST SUITES
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
│
├── database/                    # DB MIGRATIONS
│   └── migrations/
│
└── data/                        # SQLite database (gitignored)
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `server.js` | Express server setup, middleware, routes |
| `frontend/src/services/api.js` | All frontend API calls |
| `frontend/src/contexts/AuthContext.jsx` | Auth state management |
| `frontend/src/utils/jwtUtils.js` | Shared JWT utilities |
| `frontend/src/utils/fetchUtils.js` | Shared fetch with timeout |
| `routes/api.js` | Backend API endpoints |
| `routes/admin.js` | Admin management endpoints |
| `routes/health.js` | Health check endpoint |
| `services/authService.js` | Login/register/token logic |
| `services/database.js` | SQLite queries |
| `services/diffService.js` | Change tracking logic |

---

## Docker Configuration

| Setting | Value |
|---------|-------|
| External Port | 3002 |
| Internal Port | 3001 |
| Data Volume | `book-editor-data:/app/data` |
| Memory Limit | 2GB |
| Restart Policy | unless-stopped |

### Health Check:
```bash
curl http://localhost:3002/health
```

---

## Environment Variables (Production)

| Variable | Required | Source |
|----------|----------|--------|
| `ANTHROPIC_API_KEY` | Yes | Set in ~/.bashrc on VPS |
| `SETUP_SECRET` | Yes | Auto-generated by deploy.sh |
| `JWT_SECRET` | Yes | Auto-generated by deploy.sh |
| `NODE_ENV` | Yes | Set to "production" in docker-compose |

---

## Common Commands

### Local Development:
```bash
npm test                    # Run all tests
npm start                   # Start backend
cd frontend && npm run dev  # Start frontend dev server
```

### VPS Production:
```bash
cd /docker/book-editor
./deploy.sh                 # Full deployment with health check
./update.sh                 # Quick update
docker compose logs -f      # View logs
docker compose down         # Stop containers
```

---

## Git Workflow

1. Make changes locally in `/home/user/book-editor`
2. Run `npm test` to verify
3. Commit and push to branch
4. Merge to main via PR
5. SSH to VPS: `cd /docker/book-editor && ./deploy.sh`

---

## VPS Directory Structure (Hostinger)

```
/root/                           # User home
├── book-editor-backend/         # LEGACY - do not use
├── book-editor-backend-OLD/     # LEGACY - do not use
└── package-lock.json

/docker/
└── book-editor/                 # CURRENT PRODUCTION DEPLOYMENT
    ├── .git/
    ├── .env                     # Secrets (auto-generated)
    ├── deploy.sh
    ├── docker-compose.yml
    └── ... (cloned repo)

/var/lib/docker/volumes/
├── book-editor-app_book-editor-data/    # Docker volume (active)
└── book-editor-backend_book-editor-data/ # Docker volume (legacy)
```

---

## Recent Versions

- **v1.46.0**: Editable style guide feature
- **v1.45.0**: Comprehensive formatting support
- **v1.44.x**: Unlimited token limits, bug fixes
- **v1.43.x**: Design system standardization
- **v1.42.0**: Rebrand to "Reach House Book Editor"

---

## Shared Utilities (Don't Duplicate!)

### JWT Utilities (`frontend/src/utils/jwtUtils.js`):
- `decodeJwt(token)` - Decode JWT payload
- `isTokenExpired(token, bufferMs)` - Check if token expired

### Fetch Utilities (`frontend/src/utils/fetchUtils.js`):
- `fetchWithTimeout(url, options, timeoutMs)` - Fetch with AbortController

**These are imported by both `api.js` and `AuthContext.jsx`.**

---

## Common Mistakes to Avoid

1. **Wrong VPS path**: Always use `/docker/book-editor`, never `/docker/book-editor-app`
2. **Confusing local/VPS paths**: Local is `/home/user/book-editor`, VPS is `/docker/book-editor`
3. **Legacy directories**: Don't use `/root/book-editor-backend` - that's old
4. **Missing docxService.js**: This file does NOT exist - docx handling uses mammoth library

---

*Last updated: February 2026*
*Paths verified against VPS: srv1321944*
