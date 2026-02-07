/**
 * Reach House Book Editor — Server entry point.
 *
 * Express app setup, middleware stack, route registration, and startup.
 * Version tracked in frontend/src/constants/version.js.
 */

'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const logger = require('./services/logger');
const config = require('./config/app');

// Route imports
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const usageRoutes = require('./routes/usage');
const adminRoutes = require('./routes/admin');
const setupRoutes = require('./routes/setup');
const { validateEnvironment } = require('./routes/health');
const { database } = require('./services/database');

// --- Express app ---

const app = express();
const PORT = config.PORT;

// --- Middleware stack ---

// Trust first proxy (required for correct IP in rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
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
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));

// Permissions-Policy: restrict unused browser APIs
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

// CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Slow response logging (>1s for API routes)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    if (req.path.startsWith('/api/') && duration > 1000) {
      logger.warn('Slow response', {
        method: req.method,
        path: req.path,
        duration: Math.round(duration),
        status: res.statusCode
      });
    }
  });
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.API.windowMs,
  max: config.RATE_LIMIT.API.max,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Request timeout (5 min for large documents)
app.use((req, res, next) => {
  res.setTimeout(config.REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// JSON body parser
app.use(express.json({ limit: config.MAX_JSON_SIZE }));

// Static files — Vite build output (versioned assets cached 1y, index.html uncached)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  immutable: true,
  index: false
}));

app.get('/index.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Route registration ---

app.use(healthRoutes);
app.use(setupRoutes);
app.use(authRoutes);
app.use(projectRoutes);
app.use(usageRoutes);
app.use(adminRoutes);
app.use(apiRoutes);

// API 404 — return JSON instead of falling through to SPA
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// SPA fallback — serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Global error handler ---

const { AppError } = require('./services/errors');

app.use((err, req, res, next) => {
  const errorId = crypto.randomBytes(4).toString('hex').toUpperCase();

  if (err instanceof AppError) {
    logger.warn('Application error', {
      errorId,
      status: err.status,
      code: err.code,
      message: err.message,
      path: req.path
    });
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      errorId
    });
  }

  logger.error('Unhandled error', {
    errorId,
    message: err.message,
    path: req.path,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(500).json({
    error: 'Internal server error',
    errorId,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// --- Server startup ---

const envIssues = validateEnvironment();

logger.info('Initializing database...');
try {
  database.init();
  logger.info('Database ready');
} catch (err) {
  logger.error('FATAL: Database initialization failed', {
    error: err.message,
    hint: 'Check disk space, permissions, or DB_PATH'
  });
  process.exit(1);
}

// Periodic session cleanup (every hour)
const cleanupIntervalId = setInterval(() => {
  try {
    const deleted = database.sessions.deleteExpired();
    if (deleted > 0) {
      logger.info('Session cleanup', { deleted });
    }
  } catch (err) {
    logger.error('Session cleanup error', { error: err.message });
  }
}, config.SESSION_CLEANUP_INTERVAL_MS);

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('Reach House Book Editor started', {
    port: PORT,
    url: `http://localhost:${PORT}`,
    apiKey: process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT SET',
    jwtSecret: process.env.JWT_SECRET ? 'configured' : 'auto-generated',
    environment: process.env.NODE_ENV || 'development',
    database: database.initialized ? 'ready' : 'failed'
  });

  if (envIssues.length > 0) {
    logger.warn('Configuration warnings', { issues: envIssues });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error('Server startup error', { error: err.message });
  }
  process.exit(1);
});

// --- Graceful shutdown ---

function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  clearInterval(cleanupIntervalId);

  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    database.close();
    logger.info('Database connection closed');
  } catch (err) {
    logger.error('Error closing database', { error: err.message });
  }

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  const errorId = crypto.randomBytes(4).toString('hex').toUpperCase();
  logger.error(`Uncaught Exception ${errorId}`, { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const errorId = crypto.randomBytes(4).toString('hex').toUpperCase();
  logger.error(`Unhandled Rejection ${errorId}`, { reason: String(reason) });
  process.exit(1);
});
