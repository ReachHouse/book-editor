# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- An Anthropic API key (`sk-ant-...`)

## Quick Start (Docker)

### 1. Clone and Configure

```bash
git clone <repo-url>
cd book-editor
```

### 2. Run Deploy Script

```bash
./deploy.sh
```

The deploy script automatically:
- Loads secrets from `.env` file (creates it on first run)
- Generates `JWT_SECRET` and `SETUP_SECRET` (first run only)
- Requires `ANTHROPIC_API_KEY` in `.env` or environment
- Pulls latest code from GitHub
- Tags current image as "previous" for rollback
- Rebuilds the Docker image
- Starts the container with health check
- Displays the setup secret for first-time admin creation

### 3. Complete First-Time Setup

1. Open `http://your-server:3002` in a browser
2. Enter the setup secret displayed by `deploy.sh`
3. Create your admin account (username, email, password)
4. Start using the application

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `JWT_SECRET` | Yes | JWT signing secret (auto-generated) |
| `SETUP_SECRET` | Yes | First-time setup secret (auto-generated) |
| `NODE_ENV` | No | Set to "production" in docker-compose |
| `PORT` | No | Internal port (default: 3001) |

## Docker Configuration

### Port Mapping

```
External (3002) -> Internal (3001)
```

### Persistent Storage

SQLite database is stored in a Docker volume:
```
book-editor-data:/app/data/book-editor.db
```

### Memory Limit

Container is limited to 2GB RAM via `docker-compose.yml`.

## Manual Deployment

If you prefer not to use `deploy.sh`:

```bash
# 1. Create .env file
cat > .env << EOF
ANTHROPIC_API_KEY=sk-ant-your-key
JWT_SECRET=$(openssl rand -hex 32)
SETUP_SECRET=$(openssl rand -hex 16)
EOF

# 2. Build and start
docker compose build --no-cache
docker compose up -d

# 3. Verify
curl http://localhost:3002/health
```

## Updating

```bash
# Update (pulls latest code, rebuilds, and deploys)
./deploy.sh

# Or manually:
git pull origin main
docker compose build --no-cache
docker compose up -d
```

## Rollback

If a deployment fails:

```bash
# Tag previous image before deploying
docker tag book-editor-backend-book-editor:latest book-editor-backend-book-editor:previous

# Deploy new version...
# If it fails, rollback:
docker tag book-editor-backend-book-editor:previous book-editor-backend-book-editor:latest
docker compose up -d
```

## Database Backup

```bash
# Create backup
docker cp book-editor-backend-book-editor-1:/app/data/book-editor.db ./backup-$(date +%Y%m%d).db

# Restore backup
docker compose down
docker cp ./backup-20260206.db book-editor-backend-book-editor-1:/app/data/book-editor.db
docker compose up -d
```

## Monitoring

### Health Check

```bash
curl http://localhost:3002/health
```

Response includes: status, message, apiKeyConfigured, databaseHealthy.

### Logs

```bash
# Live logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail 100
```

In production, logs are JSON-formatted for aggregation.

### Resource Usage

```bash
docker stats --no-stream
```

## Security Checklist

- [ ] `ANTHROPIC_API_KEY` set and valid
- [ ] `JWT_SECRET` is unique and random (auto-generated)
- [ ] `SETUP_SECRET` is unique and random (auto-generated)
- [ ] HTTPS configured (via reverse proxy or hosting provider)
- [ ] Firewall allows only ports 22 (SSH) and 3002 (app)
- [ ] Regular `apt update && apt upgrade` for OS security
- [ ] Docker images updated periodically (`docker compose build --no-cache`)

## Troubleshooting

### Container won't start

```bash
docker compose logs
# Check for missing env vars or port conflicts
```

### Migration fails (CHECK constraint / restart loop)

If logs show `FATAL: Database initialization failed` with a CHECK constraint error and the container restarts in a loop:

```bash
# 1. Stop the restart loop
docker compose down

# 2. Inspect full logs (migration step logging shows exactly where it fails)
docker compose logs

# Look for lines like:
#   [Migration 006] Step 8/8: Copying role_defaults with role conversion
#   Migration 006_rename_restricted_to_guest.js FAILED: CHECK constraint failed: ...
```

**Root cause (Feb 2026 incident):** The VPS `role_defaults` table contained `viewer` instead of the expected `restricted` value. The migration's `CASE WHEN role='restricted' THEN 'guest' ELSE role END` passed `viewer` through unchanged, violating the new CHECK constraint. This was fixed by:
- Reading role_defaults rows into JS memory before any DDL
- Inserting programmatically with a whitelist filter (skipping unexpected values)
- Using defensive CASE statements that explicitly map each valid role

**If a migration partially corrupts the DB**, restore from backup:
```bash
docker compose down
docker cp ./backup-YYYYMMDD.db book-editor-backend-book-editor-1:/app/data/book-editor.db
docker compose up -d
```

**Prevention:** All migrations now use individual `db.exec()` calls with `console.log` between steps, so Docker logs always show the exact failing step. See `database/migrations/006_rename_restricted_to_guest.js` and `007_merge_roles_to_user.js` for the pattern.

### Database locked

```bash
# Check for zombie processes
docker exec book-editor-backend-book-editor-1 ls -la /app/data/
# Restart if needed
docker compose restart
```

### Out of disk space

```bash
docker system prune -f
docker image prune -a -f
```

## Architecture

```
Client Browser
    |
    | HTTPS (Hostinger infrastructure)
    |
    v
Docker Container (port 3002 -> 3001)
    |
    +-- Express.js (server.js)
    |   +-- Helmet (security headers)
    |   +-- Compression (gzip)
    |   +-- Rate limiting
    |   +-- JWT auth middleware
    |   |
    |   +-- /api/auth/*      (authentication)
    |   +-- /api/edit-chunk   (Claude API)
    |   +-- /api/projects/*   (CRUD)
    |   +-- /api/admin/*      (user management)
    |   +-- /api/usage        (token tracking)
    |   +-- /health           (monitoring)
    |   |
    |   +-- Static files (built React frontend)
    |
    +-- SQLite (persistent volume)
    +-- Claude API (external)
```
