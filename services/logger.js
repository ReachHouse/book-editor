/** Logger — Structured logging with levels. JSON in production, readable in development. */

'use strict';

const isProduction = process.env.NODE_ENV === 'production';

const LEVELS = {
  error: { priority: 0, label: 'ERROR', fn: console.error },
  warn:  { priority: 1, label: 'WARN ', fn: console.warn },
  info:  { priority: 2, label: 'INFO ', fn: console.log },
  debug: { priority: 3, label: 'DEBUG', fn: console.log }
};

// In production, suppress debug logs
const minLevel = isProduction ? 2 : 3;

/**
 * Format and output a log entry.
 *
 * @param {string} level - Log level name
 * @param {string} message - Log message
 * @param {Object} [meta] - Additional metadata
 */
function log(level, message, meta) {
  const config = LEVELS[level];
  if (!config || config.priority > minLevel) return;

  const timestamp = new Date().toISOString();

  if (isProduction) {
    // JSON format for production log aggregation
    const entry = { level, message, timestamp, ...meta };
    config.fn(JSON.stringify(entry));
  } else {
    // Human-readable format for development
    const time = timestamp.split('T')[1].split('.')[0];
    if (meta && Object.keys(meta).length > 0) {
      config.fn(`[${time}] ${config.label} ${message}`, meta);
    } else {
      config.fn(`[${time}] ${config.label} ${message}`);
    }
  }
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn:  (message, meta) => log('warn', message, meta),
  info:  (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta)
};

module.exports = logger;
