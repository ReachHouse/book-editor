/**
 * =============================================================================
 * REACH PUBLISHERS BOOK EDITOR - SERVER ENTRY POINT
 * =============================================================================
 *
 * This is the main entry point for the Reach Publishers AI Book Editor backend.
 * The application provides AI-powered manuscript editing with native Microsoft
 * Word Track Changes support.
 *
 * ARCHITECTURE OVERVIEW:
 * ----------------------
 * The backend is organized into modular components:
 *
 *   server.js (this file)     - Express app setup, middleware, and startup
 *   routes/health.js          - Health check and status endpoints
 *   routes/api.js             - Core API endpoints (edit, style guide, docx)
 *   routes/auth.js            - Authentication endpoints (register, login, etc.)
 *   middleware/auth.js         - JWT verification middleware
 *   services/authService.js   - Authentication logic (password, tokens)
 *   services/database.js      - SQLite database layer (users, sessions, usage)
 *   services/anthropicService.js - Claude AI API communication
 *   services/diffService.js   - LCS-based diff algorithms for Track Changes
 *   services/document/          - Word document generation with Track Changes
 *   database/migrations/      - Versioned database schema migrations
 *   config/styleGuide.js      - Reach Publishers House Style Guide
 *
 * DEPLOYMENT:
 * -----------
 * - Runs in Docker container (see Dockerfile)
 * - Default port: 3001 (mapped to 3002 externally via docker-compose)
 * - Requires ANTHROPIC_API_KEY environment variable
 * - Frontend is built and served from /public directory
 *
 * VERSIONING:
 * -----------
 * Version is tracked in frontend/src/constants/version.js
 * Update that file with each release before pushing.
 * See version.js for tag conventions ([Refactor], [Feature], [Bugfix], etc.)
 *
 * =============================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

// -----------------------------------------------------------------------------
// Route Imports
// -----------------------------------------------------------------------------
// Routes are split into logical modules for maintainability:
// - healthRoutes: System health and configuration status
// - apiRoutes: Core editing functionality (edit-chunk, generate-docx, etc.)
// - authRoutes: User authentication (register, login, token refresh, logout)

const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const usageRoutes = require('./routes/usage');
const adminRoutes = require('./routes/admin');
const setupRoutes = require('./routes/setup');
const { validateEnvironment } = require('./routes/health');
const { database } = require('./services/database');

// =============================================================================
// EXPRESS APP CONFIGURATION
// =============================================================================

const app = express();

// Port configuration: Use environment variable or default to 3001
// In Docker, this is mapped to external port 3002 via docker-compose.yml
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE STACK
// =============================================================================

// Proxy Trust: Enable accurate client IP detection when behind reverse proxy
// MUST be set before rate limiter for correct IP-based limiting
// Required for Hostinger/Nginx deployment to log correct client IPs
app.set('trust proxy', 1);

// Security Headers: Helmet sets various HTTP headers for protection
// - X-Content-Type-Options: nosniff (prevent MIME sniffing)
// - X-Frame-Options: DENY (prevent clickjacking)
// - X-XSS-Protection: 0 (disabled, CSP is preferred)
// - Strict-Transport-Security: max-age=15552000 (HSTS for HTTPS)
// - Content-Security-Policy: configured below
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind uses inline styles
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Required for some browsers with file downloads
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));

// Permissions-Policy: Restrict browser features the app doesn't need
// This prevents potential misuse of sensitive APIs
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

// CORS: Configure allowed origins based on environment
// In production, restricts to specific domains; in development, allows localhost
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    : true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight for 24 hours
};
app.use(cors(corsOptions));

// Compression: Reduce response size for faster transfers
app.use(compression());

// Rate Limiting: Protect against API abuse and quota exhaustion
// Limits each IP to 100 requests per 15 minutes for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false // Disable `X-RateLimit-*` headers
});
app.use('/api/', apiLimiter);

// Request Timeout: Prevent indefinite hangs (5 minutes for large documents)
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
app.use((req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// JSON Parser: Accept large payloads for manuscript processing
// 50MB limit accommodates large documents with full text content
app.use(express.json({ limit: '50mb' }));

// Static Files: Serve the built React frontend from /public
// The Dockerfile copies the Vite build output here during container build
app.use(express.static(path.join(__dirname, 'public')));

// =============================================================================
// ROUTE REGISTRATION
// =============================================================================

// Health & Status Routes: /health, /api/status
// Used for monitoring, deployment verification, and debugging
app.use(healthRoutes);

// Setup Routes: /api/setup/status, /api/setup/complete
// First-time setup wizard (only active when no users exist)
app.use(setupRoutes);

// Auth Routes: /api/auth/register, /api/auth/login, /api/auth/refresh, /api/auth/me, /api/auth/logout
// User authentication and session management
app.use(authRoutes);

// Project Routes: /api/projects (CRUD for server-side project storage)
// Requires auth — users can only access their own projects
app.use(projectRoutes);

// Usage Routes: /api/usage (user usage summary), /api/admin/usage (admin stats)
// Token usage tracking and limit reporting
app.use(usageRoutes);

// Admin Routes: /api/admin/users, /api/admin/invite-codes
// User management and invite code generation (admin only)
app.use(adminRoutes);

// API Routes: /api/edit-chunk, /api/generate-style-guide, /api/generate-docx
// Core editing functionality that communicates with Claude AI (requires auth)
app.use(apiRoutes);

// =============================================================================
// SPA (SINGLE PAGE APPLICATION) FALLBACK
// =============================================================================

// Catch-all route: Serve React app for any unmatched routes
// This enables client-side routing in the React frontend
// All non-API, non-static requests return index.html, letting React Router handle them
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================================================
// GLOBAL ERROR HANDLER
// =============================================================================

// Express error handler middleware (must have 4 parameters)
// Catches any unhandled errors from route handlers
// Generates a unique error ID for tracking and user support
app.use((err, req, res, next) => {
  // Generate a short error ID for tracking (8 hex chars)
  const errorId = require('crypto').randomBytes(4).toString('hex').toUpperCase();
  const timestamp = new Date().toISOString();

  // Log full error details server-side with error ID
  console.error(`[${timestamp}] Error ${errorId}:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Return sanitized response with error ID for user support
  res.status(500).json({
    error: 'Internal server error',
    errorId,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Validate environment before starting
// This checks for required variables like ANTHROPIC_API_KEY
const envIssues = validateEnvironment();

// Initialize the SQLite database (runs migrations, seeds defaults)
console.log('Initializing database...');
try {
  database.init();
  console.log('Database ready.');
} catch (err) {
  console.error('═══════════════════════════════════════════════════════════');
  console.error('FATAL: Database initialization failed');
  console.error('═══════════════════════════════════════════════════════════');
  console.error(`Error: ${err.message}`);
  console.error('');
  console.error('Possible causes:');
  console.error('  - Disk full or no write permission to data directory');
  console.error('  - Corrupted database file');
  console.error('  - Invalid DB_PATH environment variable');
  console.error('═══════════════════════════════════════════════════════════');
  process.exit(1);
}

// Periodic cleanup: remove expired sessions every hour.
// Prevents the sessions table from growing unbounded.
const SESSION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const cleanupIntervalId = setInterval(() => {
  try {
    const deleted = database.sessions.deleteExpired();
    if (deleted > 0) {
      console.log(`Session cleanup: removed ${deleted} expired session(s)`);
    }
  } catch (err) {
    console.error('Session cleanup error:', err.message);
  }
}, SESSION_CLEANUP_INTERVAL_MS);

// Start listening on all network interfaces (0.0.0.0)
// This is required for Docker container networking
const server = app.listen(PORT, '0.0.0.0', () => {
  // Startup banner with configuration summary
  console.log('==================================================');
  console.log('  Reach Publishers Book Editor');
  console.log('==================================================');
  console.log(`  Port:          ${PORT}`);
  console.log(`  URL:           http://localhost:${PORT}`);
  console.log(`  API Key:       ${process.env.ANTHROPIC_API_KEY ? 'Configured' : 'NOT SET'}`);
  console.log(`  JWT Secret:    ${process.env.JWT_SECRET ? 'Configured' : 'Auto-generated (set JWT_SECRET for persistence)'}`);
  console.log(`  Track Changes: Native Word Format`);
  console.log(`  Environment:   ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Database:      SQLite (${database.initialized ? 'ready' : 'failed'})`);

  // Display any configuration warnings
  if (envIssues.length > 0) {
    console.log('');
    console.log('  WARNINGS:');
    envIssues.forEach(issue => console.log(`    - ${issue}`));
  }

  console.log('==================================================');
});

// Handle server startup errors (port in use, binding failures)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use`);
  } else {
    console.error('Server startup error:', err.message);
  }
  process.exit(1);
});

// =============================================================================
// GRACEFUL SHUTDOWN HANDLERS
// =============================================================================

/**
 * Gracefully shuts down the server.
 * Clears intervals, closes connections, and exits cleanly.
 *
 * @param {string} signal - The signal that triggered shutdown (SIGTERM, SIGINT, etc.)
 */
function gracefulShutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);

  // Clear the session cleanup interval
  clearInterval(cleanupIntervalId);

  // Close the HTTP server (stop accepting new connections)
  server.close(() => {
    console.log('HTTP server closed.');
  });

  // Close the database connection
  try {
    database.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error closing database:', err.message);
  }

  process.exit(0);
}

// Handle SIGTERM (Docker stop, Kubernetes pod termination)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT (Ctrl+C in terminal)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// UNHANDLED ERROR HANDLERS
// =============================================================================

// Handle uncaught exceptions (synchronous errors that weren't caught)
process.on('uncaughtException', (err) => {
  const errorId = require('crypto').randomBytes(4).toString('hex').toUpperCase();
  console.error(`[${new Date().toISOString()}] Uncaught Exception ${errorId}:`, err.message);
  console.error(err.stack);
  // Exit with failure code - the process manager should restart us
  process.exit(1);
});

// Handle unhandled promise rejections (async errors that weren't caught)
process.on('unhandledRejection', (reason, promise) => {
  const errorId = require('crypto').randomBytes(4).toString('hex').toUpperCase();
  console.error(`[${new Date().toISOString()}] Unhandled Rejection ${errorId}:`, reason);
  // Exit with failure code - the process manager should restart us
  process.exit(1);
});
