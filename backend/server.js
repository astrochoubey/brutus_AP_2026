// server.js — Native Node.js HTTP server entry point for Brutus.
//
// Features:
//   1. Built strictly on native node:http (zero external server frameworks).
//   2. Integrates request logging, CORS, body parsing, and routing.
//   3. Configurable development port (process.env.PORT || 3000).
//   4. Clean database initialization on startup and graceful shutdown.

import { createServer } from 'node:http';
import { initDatabase, closeDatabase } from './database.js';
import { loggerMiddleware, corsMiddleware, parseJsonBody, sendError, sendJson } from './middleware.js';
import { handleRoute } from './routes.js';

// Read configuration from environment (zero dotenv dependency)
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 1. Initialize SQLite database schema and seed records
console.log('[server] Initializing SQLite database…');
initDatabase();
console.log('[server] SQLite database ready.');

// 2. Create the native HTTP server
const server = createServer(async (req, res) => {
  // A. Request logging
  loggerMiddleware(req);

  // B. CORS handling (returns true if preflight OPTIONS was completed)
  if (corsMiddleware(req, res)) {
    return;
  }

  // C. Parse JSON request body
  try {
    req.body = await parseJsonBody(req);
  } catch (err) {
    return sendError(res, err.statusCode || 400, err.message);
  }

  // D. Dispatch request to route handler
  try {
    await handleRoute(req, res);
  } catch (err) {
    console.error('[server] Uncaught route error:', err);
    sendError(res, err.statusCode || 500, err.message || 'Internal server error');
  }
});

// 3. Start listening
server.listen(PORT, HOST, () => {
  console.log(`[server] Brutus Node.js backend listening on http://${HOST}:${PORT}`);
  console.log(`[server] Health check available at: http://localhost:${PORT}/health`);
});

// 4. Graceful shutdown handler
function handleShutdown(signal) {
  console.log(`\n[server] Received ${signal}. Shutting down cleanly…`);
  server.close(() => {
    closeDatabase();
    console.log('[server] Server and database closed. Bye!');
    process.exit(0);
  });

  // Force exit if hanging
  setTimeout(() => {
    console.error('[server] Force shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default server;
