# Reach House Book Editor

AI-powered manuscript editing with tracked changes following the Reach House Style Guide.

## Features

- Upload Microsoft Word documents (.doc, .docx)
- AI-powered editing via Claude API following UK English standards
- Track Changes output in native Word format for easy review
- Progress saving and resume capability
- Role-based access control (admin/user) with configurable token limits
- Guest browsing mode (no account required)
- First-run setup wizard for secure admin account creation

## Quick Start (Docker)

### Prerequisites

- Docker and Docker Compose installed
- Anthropic API key (`sk-ant-...`)

### Deploy

```bash
git clone https://github.com/ReachHouse/book-editor.git
cd book-editor
./deploy.sh
```

The deploy script automatically generates `JWT_SECRET` and `SETUP_SECRET` on first run, builds the Docker image, and starts the container.

### First-Time Setup

1. Open `http://your-server:3002` in a browser
2. Enter the setup secret displayed by `deploy.sh`
3. Create your admin account (username, email, password)
4. Start using the application

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Claude API key |
| `JWT_SECRET` | Yes | (auto-generated) | JWT signing secret |
| `SETUP_SECRET` | Yes | (auto-generated) | First-time setup wizard secret |
| `PORT` | No | 3001 | Internal server port |
| `NODE_ENV` | No | development | Set to "production" in Docker |

See `.env.example` for the full reference and `docs/DEPLOYMENT.md` for production deployment details.

## Local Development

```bash
# Backend
npm install
npm start                         # Express on port 3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                       # Vite dev server on port 5173
```

## Testing

```bash
# Backend (16 suites, 522 tests)
npm install                                        # Required — installs better-sqlite3, supertest, docx
npx jest --config jest.config.js

# Frontend (11 suites, 126 tests)
cd frontend && npm install
npx jest --config jest.config.cjs
```

## Architecture

```
book-editor/
├── server.js                  # Express entry point
├── config/                    # Backend config (app settings, style guide)
├── routes/                    # Express route handlers
├── middleware/                 # JWT auth middleware
├── services/                  # Business logic (auth, database, AI, DOCX generation)
├── database/migrations/       # SQLite migrations (auto-run on startup)
├── __tests__/                 # Backend test suites (integration + unit)
├── frontend/                  # React (Vite + Tailwind CSS)
├── docs/                      # API reference and deployment guide
├── .claude/                   # Claude Code session hooks
├── Dockerfile                 # Multi-stage build (Node 18-alpine)
├── docker-compose.yml         # Docker orchestration (port 3002 → 3001)
└── deploy.sh                  # VPS deployment script
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Developer guide (project structure, patterns, gotchas)
- **[docs/API.md](./docs/API.md)** — Complete API endpoint reference
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — VPS deployment, Docker config, troubleshooting
- **[CHANGELOG.md](./CHANGELOG.md)** — Version history and patch notes

## License

Private - Reach House
