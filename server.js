/**
 * Reach Publishers Book Editor - Server Entry Point
 *
 * A professional AI-powered manuscript editing application
 * with native Microsoft Word Track Changes support.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');
const { validateEnvironment } = require('./routes/health');

// ============================================================================
// APP CONFIGURATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Enable CORS for all origins (consider restricting in production)
app.use(cors());

// Parse JSON with generous limit for large documents
app.use(express.json({ limit: '50mb' }));

// Trust proxy for accurate IP detection behind Nginx/reverse proxy
app.set('trust proxy', 1);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// ROUTES
// ============================================================================

// Health check and status endpoints
app.use(healthRoutes);

// API endpoints for editing and document generation
app.use(apiRoutes);

// ============================================================================
// SPA FALLBACK
// ============================================================================

// Serve React app for any unmatched routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const envIssues = validateEnvironment();

app.listen(PORT, '0.0.0.0', () => {
  console.log('==================================================');
  console.log('  Reach Publishers Book Editor');
  console.log('==================================================');
  console.log(`  Port:          ${PORT}`);
  console.log(`  URL:           http://localhost:${PORT}`);
  console.log(`  API Key:       ${process.env.ANTHROPIC_API_KEY ? 'Configured' : 'NOT SET'}`);
  console.log(`  Track Changes: Native Word Format`);
  console.log(`  Environment:   ${process.env.NODE_ENV || 'development'}`);

  if (envIssues.length > 0) {
    console.log('');
    console.log('  WARNINGS:');
    envIssues.forEach(issue => console.log(`    - ${issue}`));
  }

  console.log('==================================================');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
