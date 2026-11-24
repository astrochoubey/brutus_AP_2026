// middleware.js — Native Node.js middleware for logging, CORS, body parsing, and error handling.
//
// No third-party packages (no express, no cors, no body-parser).
// Built purely on native Node HTTP streams and URL parsing.

/**
 * Helper to write a JSON response with status code and headers.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {any} data
 */
export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(data));
}

/**
 * Helper to write an error response in a consistent JSON format.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {string} message
 * @param {any} [details]
 */
export function sendError(res, statusCode, message, details = null) {
  const payload = {
    error: message,
    statusCode
  };
  if (details) {
    payload.details = details;
  }
  sendJson(res, statusCode, payload);
}

/**
 * Middleware: Simple structured HTTP request logger.
 *
 * @param {import('node:http').IncomingMessage} req
 */
export function loggerMiddleware(req) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
}

/**
 * Middleware: Native CORS configuration.
 * Handles OPTIONS preflight requests and permits Chrome extension and localhost origins.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {boolean} True if the request was an OPTIONS preflight and already handled; false otherwise.
 */
export function corsMiddleware(req, res) {
  const origin = req.headers.origin || '*';

  // Allow localhost development and Chrome Extension origins
  const isAllowedOrigin =
    origin === '*' ||
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('moz-extension://') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1');

  const allowedOriginHeader = isAllowedOrigin ? origin : 'null';

  res.setHeader('Access-Control-Allow-Origin', allowedOriginHeader);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // If this is an OPTIONS preflight request, answer immediately with 204 No Content
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}

/**
 * Middleware: Asynchronously parse incoming JSON request body from the native stream.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {number} [maxBytes=10485760] Max size (default 10MB)
 * @returns {Promise<any>} Parsed JSON body or empty object
 */
export function parseJsonBody(req, maxBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    // Only attempt to read body for methods that convey payloads
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return resolve({});
    }

    const contentType = req.headers['content-type'] || '';
    let rawBody = '';
    let bytesReceived = 0;

    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        req.destroy();
        const err = new Error('Request payload too large (exceeded 10MB limit)');
        err.statusCode = 413;
        return reject(err);
      }
      rawBody += chunk;
    });

    req.on('end', () => {
      const trimmed = rawBody.trim();
      if (!trimmed) {
        return resolve({});
      }

      // If Content-Type indicates JSON or payload looks like JSON, parse it
      try {
        const parsed = JSON.parse(trimmed);
        resolve(parsed);
      } catch (parseErr) {
        const err = new Error('Malformed JSON payload');
        err.statusCode = 400;
        err.original = parseErr.message;
        reject(err);
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}
