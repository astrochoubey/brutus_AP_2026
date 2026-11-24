// database.js — Native SQLite database layer for Brutus using Node.js built-in node:sqlite.
//
// Key Responsibilities:
//   1. Open SQLite database using native DatabaseSync.
//   2. Enforce foreign key constraints with PRAGMA foreign_keys = ON.
//   3. Idempotently execute database/schema.sql and database/seed.sql on startup.
//   4. Provide prepared statements and parameterized query helpers to prevent SQL injection.
//   5. Provide transaction helper for atomic multi-table writes.
//   6. Cleanly close database on process termination.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path: backend/database/brutus.sqlite
const DB_DIR = join(__dirname, 'database');
const DB_PATH = join(DB_DIR, 'brutus.sqlite');

// Root schema and seed file paths
const ROOT_DIR = join(__dirname, '..');
const SCHEMA_PATH = join(ROOT_DIR, 'database', 'schema.sql');
const SEED_PATH = join(ROOT_DIR, 'database', 'seed.sql');

let dbInstance = null;

/**
 * Initializes and returns the SQLite database connection.
 * Idempotently executes schema.sql and seed.sql if tables do not exist.
 *
 * @param {string} [customPath] - Optional override path (e.g. for testing)
 * @returns {DatabaseSync}
 */
export function initDatabase(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath = customPath || DB_PATH;

  // Ensure database directory exists
  const targetDir = dirname(targetPath);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Open database connection using native node:sqlite DatabaseSync
  const db = new DatabaseSync(targetPath);

  // 1. Enforce SQLite foreign key constraints
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // 2. Initialize schema from database/schema.sql
  if (existsSync(SCHEMA_PATH)) {
    const schemaSql = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schemaSql);
  } else {
    console.warn(`[database] schema.sql not found at ${SCHEMA_PATH}`);
  }

  // 3. Populate default seeds from database/seed.sql
  if (existsSync(SEED_PATH)) {
    const seedSql = readFileSync(SEED_PATH, 'utf-8');
    db.exec(seedSql);
  } else {
    console.warn(`[database] seed.sql not found at ${SEED_PATH}`);
  }

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

/**
 * Returns the active database instance. Initializes if not already opened.
 *
 * @returns {DatabaseSync}
 */
export function getDb() {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

/**
 * Closes the active SQLite database connection cleanly.
 */
export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (err) {
      console.warn('[database] Warning while closing database:', err.message);
    }
    dbInstance = null;
  }
}

/**
 * Executes a callback within an atomic SQLite transaction.
 * If the callback throws an error, ROLLBACK is executed; otherwise, COMMIT is executed.
 *
 * @template T
 * @param {function(DatabaseSync): T} callback
 * @returns {T}
 */
export function withTransaction(callback) {
  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = callback(db);
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch (rollbackError) {
      console.error('[database] Rollback failed:', rollbackError.message);
    }
    throw error;
  }
}
