# Book Editor

AI-powered manuscript editor for Reach House publishing. Uploads DOCX, edits via Claude API, generates DOCX with native Word Track Changes.

---

## Rules

- Use parallel tool calls: When calling multiple tools with no dependencies between them, make all calls in parallel (e.g., read 3 files simultaneously instead of sequentially). If a call depends on a previous call's result, run them sequentially instead. Never use placeholders or guess missing parameters.
- Reduce hallucinations: Never speculate about code you have not opened. If the user references a specific file, you or a dedicated sub-agent MUST read it before answering. Always investigate and read relevant files BEFORE making claims about the codebase.
- Keep CLAUDE.md accurate: Before pushing any change set to GitHub, review CLAUDE.md and update it to reflect your changes—add new files, update outdated/redundant information, and remove anything that is incorrect and/or no longer true. This file is the single source of truth for future sessions; stale documentation causes mistakes.
- Compress working context: Once you've read and understood CLAUDE.md and understand the codebase, proactively compress and compact your working context as you go so you maintain continuity and avoid forgetting details, making repeat mistakes, or complaining about prompt/token length/limits. 
- Protect main context window via subagents: Default to offloading tasks to Claude Code subagents—anything involving >2 files, long logs, or external research—so the main thread's context window is open for decisions and final integration. Subagents must report back briefly (no raw dumps) in this format: Findings / Evidence (file:line or command + key output) / Risks / Next step (≤12 bullets total). Plans and ToDos must label items as [DELEGATE] -offloaded tasks- (include deliverable) OR [MAIN] -performed by main agent OR team lead-.

---

## Commands

```bash
# Backend Tests (16 test files, node environment)
npx jest --config jest.config.js                   # Run all backend tests
npx jest --config jest.config.js --watch           # Watch mode
npx jest --config jest.config.js --coverage        # With coverage report

# Frontend Tests (11 test files, jsdom environment)
cd frontend && npx jest --config jest.config.cjs   # Run all frontend tests
cd frontend && npx jest --config jest.config.cjs --watch    # Watch mode
cd frontend && npx jest --config jest.config.cjs --coverage # With coverage report

# Local Development
npm start                             # Start backend on port 3001
cd frontend && npm run dev            # Start Vite dev server on port 5173
cd frontend && npm run build          # Build frontend for production (outputs to frontend/dist/)
```

---

## Project Structure

```
book-editor/
├── server.js                  # Express entry point
├── config/
│   ├── app.js                 # Centralized backend configuration
│   └── styleGuide.js          # Reach House Style Guide (used in AI prompts)
├── routes/                    # Express route handlers (admin, api, auth, health, projects, setup, usage)
├── middleware/auth.js         # JWT verification (requireAuth, requireAdmin, optionalAuth)
├── services/
│   ├── anthropicService.js    # Claude API with circuit breaker
│   ├── authService.js         # Login/register/JWT logic
│   ├── database.js            # SQLite wrapper + auto-migration runner
│   ├── diffService.js         # LCS diff for Track Changes
│   ├── errors.js              # Custom error hierarchy (AppError, ValidationError, AuthError, etc.)
│   ├── logger.js              # Structured logging (JSON prod, readable dev)
│   ├── document/              # DOCX generation module (8 files) — see Gotchas
│   ├── styleRules.js          # Aggregates style rule modules
│   └── styleRules/            # Individual rule definitions (spelling, grammar, punctuation, etc.)
├── database/migrations/       # 8 migrations (001–008), auto-run on startup
├── __tests__/                 # integration/ and unit/ test suites
├── frontend/                  # React (Vite + Tailwind)
│   └── src/
│       ├── App.jsx            # Main component — routing, layout
│       ├── components/        # UI components + admin/ sub-components
│       ├── constants/         # index.js (API config, style guide copy) + version.js
│       ├── contexts/          # AuthContext.jsx (login, logout, token refresh)
│       ├── hooks/             # useProjects.js, useToast.js
│       ├── services/api.js    # All frontend API calls
│       └── utils/             # documentUtils.js, fetchUtils.js, jwtUtils.js
├── docs/
│   ├── API.md                 # Complete API endpoint reference
│   └── DEPLOYMENT.md          # VPS deployment guide and troubleshooting
├── Dockerfile                 # Multi-stage build (Node 18-alpine)
├── docker-compose.yml         # Docker orchestration
└── deploy.sh                  # Deployment script (generates .env, builds, deploys)
```

---

## Architecture

- **Backend**: Express.js (CommonJS) + better-sqlite3 + bcryptjs + jsonwebtoken + docx library
- **Frontend**: React/Vite (ESM) + Tailwind CSS + mammoth.js for DOCX parsing
- **Auth**: JWT access tokens (15min) + refresh tokens (7 days) with rotation. Middleware reads role from DB (not JWT) for immediate effect.
- **AI**: Claude Sonnet via Anthropic API with circuit breaker (5 failures -> OPEN -> 60s -> HALF_OPEN)
- **Database**: SQLite in WAL mode, foreign keys enabled. Singleton DatabaseService with getter-based namespaces.
- **Key patterns**: Custom error hierarchy, shared refresh promise in api.js and AuthContext.jsx, ETag caching on project list, rate limiting per endpoint type

---

## Sync Requirements

These files must stay in sync — changing one requires updating the others:

| Source | Must match | What |
|--------|-----------|------|
| `config/styleGuide.js` | `frontend/src/constants/index.js` STYLE_GUIDE | Reach House Style Guide text (constant content must be identical) |
| `package.json` version | `frontend/package.json` version | App version number (both must match) |
| `package.json` version | `frontend/src/constants/version.js` | App version number (all three files must match) |

### Shared Utilities (do NOT duplicate)

`frontend/src/utils/jwtUtils.js` and `frontend/src/utils/fetchUtils.js` are imported by **both** `api.js` and `AuthContext.jsx`. Do not recreate these functions elsewhere.

---

## Environment Variables

Create `.env` in project root for local development (see `.env.example` for full reference):

```bash
# REQUIRED
ANTHROPIC_API_KEY=sk-ant-...

# REQUIRED (Production) — generates random if unset in dev
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=

# REQUIRED — prevents unauthorized admin account creation
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SETUP_SECRET=

# OPTIONAL
PORT=3001                        # Default: 3001
NODE_ENV=development             # Default: development
DB_PATH=./data/book-editor.db   # Default: ./data/book-editor.db
```

Production `.env` is auto-generated by `deploy.sh` (see `docs/DEPLOYMENT.md`).

---

## Database

SQLite with 8 migrations in `database/migrations/` (001-008). Migrations run automatically on server startup via `services/database.js`. Tables: users, sessions, invite_codes, usage_logs, projects, role_defaults, schema_version. No manual migration steps needed.

---

## Role System

Three roles: **admin** (mauve badge, unlimited tokens), **user** (teal badge, 500K daily / 10M monthly default), **guest** (slate badge, restricted). Token limit values: `-1` = unlimited, `0` = restricted, `> 0` = specific limit. Role defaults are configurable in Admin Dashboard. Admins cannot change their own role. Middleware reads role from DB (not JWT) for immediate effect. Frontend constants: `USER_ROLES` and `TOKEN_LIMITS` in `frontend/src/constants/index.js`.

---

## Gotchas

| Mistake | Correction |
|---------|------------|
| Referencing `docxService.js` | Does NOT exist. DOCX generation is the `services/document/` module (8 files: categorization, comments, constants, formatting, generation, index, paragraphs, utils) |
| Duplicating shared utilities | `jwtUtils.js` and `fetchUtils.js` are shared by `api.js` and `AuthContext.jsx` — use them, don't recreate |
| Style guide out of sync | `config/styleGuide.js` (backend) must match STYLE_GUIDE in `frontend/src/constants/index.js` |
| Version out of sync | Three files must match: `package.json`, `frontend/package.json`, `frontend/src/constants/version.js` |
| Wrong module system | Backend is CommonJS (`require`), frontend is ESM (`import`) |
| Wrong Jest config | Backend: `jest.config.js` (root, Node env). Frontend: `frontend/jest.config.cjs` (jsdom env). These are separate configs. |
| Duplicating API docs | Full API reference is in `docs/API.md`. Do not duplicate endpoint tables in CLAUDE.md. |
| Duplicating deployment docs | VPS details, Docker config, and maintenance commands live in `docs/DEPLOYMENT.md`. Do not duplicate here. |
| Vite build output path | `npm run build` outputs to `frontend/dist/`. Dockerfile copies this to `public/`. Express serves static files from `public/`. |
| Mixing environments | Local dev: `/home/user/book-editor` (ports 3001/5173). VPS production: `/root/book-editor-backend` (port 3002 -> 3001). |
| Using old CSS class names | `info-box-blue` was renamed to `info-box-teal`, `info-box-red` to `info-box-rose`, `ambient-glow-blue` to `ambient-glow-teal` (v1.58.0 palette update). |
| Using old color utilities | `red-*` classes are now `rose-*`, `blue-*` info/accent classes are now `teal-*`, `green-*` success classes are now `brand-*`. Tailwind config defines 6 custom scales: `brand`, `surface`, `teal`, `amber`, `rose`, `mauve`. |

---

## Deployment

Production runs on a Hostinger VPS via Docker. Deploy by SSHing to the VPS and running `./deploy.sh` in the application directory. The script pulls latest code, generates `.env`, builds the Docker image, and restarts the container with health checks. For full deployment instructions, rollback procedures, and VPS maintenance commands, see **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

---

## Documentation Maintenance

Before pushing changes, review this file and update:

1. **New files** — add to Project Structure tree
2. **Database schema changes** — note new migrations
3. **Role system changes** — update Role System section
4. **New sync requirements** — add to Sync Requirements table
5. **New gotchas discovered** — add to Gotchas table
6. **Version changes** — update version in all three sync locations (package.json, frontend/package.json, frontend/src/constants/version.js)
7. **Changelog** — append a new entry to **[CHANGELOG.md](./CHANGELOG.md)** (the single source of truth for version history)

---

## Related Docs

- **[docs/API.md](./docs/API.md)** — Complete API endpoint reference with examples
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — VPS deployment, Docker config, maintenance, rollback
- **[CHANGELOG.md](./CHANGELOG.md)** — Version history and patch notes

---

*Last updated: 2026-02-07*
