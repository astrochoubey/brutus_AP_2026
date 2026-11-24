/**
 * Brutus – Instagram Network Observatory
 * Content Script Unified Entry Point
 *
 * Injected into instagram.com pages. Loads both followers and following
 * collection modules in a single bundled script to avoid global scope
 * variable collisions in Manifest V3.
 */

import './followers.js';
import './following.js';
