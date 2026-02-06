# =============================================================================
# DOCKERFILE - Multi-Stage Build for Reach Publishers Book Editor
# =============================================================================
#
# This Dockerfile uses a multi-stage build to:
# 1. Build the React frontend (Vite)
# 2. Create a slim production image with Node.js backend + static frontend
#
# ARCHITECTURE:
# -------------
# The application consists of:
# - Node.js/Express backend (server.js + routes/ + services/ + config/)
# - React frontend (Vite build → static files in public/)
# - The backend serves both the API and the static frontend
#
# BUILD STAGES:
# -------------
# Stage 1 (frontend-build): Builds React app with Vite
# Stage 2 (production): Creates final runtime image
#
# NATIVE MODULES:
# ---------------
# better-sqlite3 requires C/C++ compilation (build-base, python3).
# Build tools are installed temporarily and removed after npm install
# to keep the final image small.
#
# USAGE:
# ------
# Build:
#   docker build -t book-editor .
#
# Run:
#   docker run -p 3001:3001 -e ANTHROPIC_API_KEY=sk-ant-xxx book-editor
#
# Or use docker-compose (recommended):
#   docker compose up --build
#
# DEPLOYMENT ON HOSTINGER VPS:
# ----------------------------
# 1. SSH into VPS
# 2. Navigate to /root/book-editor-backend
# 3. Set API key: export ANTHROPIC_API_KEY=sk-ant-xxx
# 4. Build: docker compose build
# 5. Run: docker compose up -d
# 6. Verify: curl http://localhost:3002/health
#
# DATA PERSISTENCE:
# -----------------
# SQLite database file is stored at /app/data/book-editor.db
# Mount a Docker volume to /app/data for persistence across container restarts.
# See docker-compose.yml for the volume configuration.
#
# FILES COPIED TO IMAGE:
# ----------------------
# Backend:
#   - server.js          → Main Express server
#   - routes/            → API route handlers (health.js, api.js, auth.js)
#   - services/          → Business logic (anthropicService.js, authService.js, database.js, etc.)
#   - middleware/         → Express middleware (auth.js)
#   - database/          → Database migrations
#   - config/            → Configuration (styleGuide.js)
#   - package.json       → Dependencies
#
# Frontend (built):
#   - public/            → Vite build output (index.html, JS, CSS)
#
# PORTS:
# ------
# Internal: 3001 (configured via PORT env var)
# External: 3002 (mapped in docker-compose.yml)
#
# NOTE: If you add new backend directories, update the COPY commands below!
#
# =============================================================================

# =============================================================================
# STAGE 1: Build Frontend
# =============================================================================
# Uses Node.js Alpine for smaller image size
# Builds the React app with Vite, outputs to /app/frontend/dist

FROM node:18-alpine AS frontend-build

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy package files first (better layer caching)
# Using npm install since package-lock.json may not exist in repo
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --include=dev

# Copy all frontend source files
COPY frontend/ ./

# Build the Vite application
# Output goes to /app/frontend/dist
RUN npm run build

# =============================================================================
# STAGE 2: Production Image
# =============================================================================
# Slim Node.js image with only what's needed to run the server

FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies only
# better-sqlite3 requires build tools for native compilation;
# install temporarily, then remove to keep image small.
COPY package.json package-lock.json* ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm install --omit=dev && \
    npm cache clean --force && \
    apk del .build-deps

# Copy backend server and module directories
# IMPORTANT: If you create new directories (middleware/, utils/, etc.),
# add corresponding COPY commands here!
COPY server.js ./
COPY routes/ ./routes/
COPY services/ ./services/
COPY middleware/ ./middleware/
COPY database/ ./database/
COPY config/ ./config/

# Create public directory for static files and data directory for SQLite
RUN mkdir -p public data

# Copy built frontend from Stage 1
# The Express server serves these files from /public
COPY --from=frontend-build /app/frontend/dist ./public/

# Create non-root user for security
# Running as root inside containers is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the internal port
# Note: External port mapping is done in docker-compose.yml
EXPOSE 3001

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check to verify the server is running
# Docker/orchestrators use this to detect unhealthy containers
# Note: Use 127.0.0.1 instead of localhost to force IPv4 (Node.js doesn't listen on IPv6)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

# Start the server
# ANTHROPIC_API_KEY must be provided at runtime via docker-compose or -e flag
CMD ["node", "server.js"]
