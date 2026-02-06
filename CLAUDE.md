# Claude Code Reference - Book Editor

**CRITICAL: Read this file before making any deployment or structural changes.**

---

## VPS Deployment Location

| Environment | Path | Notes |
|-------------|------|-------|
| **Local Dev** | `/home/user/book-editor` | Development machine |
| **VPS Production** | `/root/book-editor-backend` | Hostinger VPS srv1321944 |

These are the **ONLY TWO LOCATIONS** that matter. There are no other deployment directories.

---

## VPS Deployment Commands

### To Update Live Site (after pushing to main):

```bash
cd /root/book-editor-backend && ./deploy.sh
```

### Quick Update (alternative):

```bash
cd /root/book-editor-backend && ./update.sh
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
cd /root/book-editor-backend
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
5. SSH to VPS: `cd /root/book-editor-backend && ./deploy.sh`

---

## VPS Directory Structure (Hostinger)

```
/root/                           # User home (root user)
└── book-editor-backend/         # PRODUCTION DEPLOYMENT
    ├── .git/
    ├── .env                     # Secrets (auto-generated by deploy.sh)
    ├── deploy.sh
    ├── docker-compose.yml
    └── ... (full cloned repo)

/var/lib/docker/volumes/
└── book-editor-backend_book-editor-data/  # SQLite database volume
```

**Note:** VPS was cleaned on 2026-02-06. Legacy directories removed.

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

1. **Wrong VPS path**: The ONLY deployment location is `/root/book-editor-backend`
2. **Confusing local/VPS**: Local = `/home/user/book-editor`, VPS = `/root/book-editor-backend`
3. **Non-existent file**: `docxService.js` does NOT exist - docx handling uses mammoth library

---

*Last updated: 2026-02-06*
*VPS cleaned and verified: srv1321944*
