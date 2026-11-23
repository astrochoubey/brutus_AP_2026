import { describe, it, expect } from 'vitest';
import {
  normalizeUsername,
  extractUsernameFromLink,
} from '../../extension/src/content/followers.js';

// ─────────────────────────────────────────────────────────────────────
//  Test helper — lightweight mock anchor
//
//  extractUsernameFromLink only calls anchor.getAttribute('href'),
//  so a plain object with that method is sufficient for unit testing
//  without requiring a full DOM environment.
// ─────────────────────────────────────────────────────────────────────

function mockAnchor(href) {
  return { getAttribute: (attr) => (attr === 'href' ? href : null) };
}

function mockAnchorNoHref() {
  return { getAttribute: () => null };
}

// ═════════════════════════════════════════════════════════════════════
//  normalizeUsername
// ═════════════════════════════════════════════════════════════════════

describe('normalizeUsername', () => {
  it('lowercases and trims a standard username', () => {
    expect(normalizeUsername('  Alice_Dev  ')).toBe('alice_dev');
  });

  it('strips leading @ symbols', () => {
    expect(normalizeUsername('@alice')).toBe('alice');
    expect(normalizeUsername('@@alice')).toBe('alice');
    expect(normalizeUsername('@@@bob')).toBe('bob');
  });

  it('returns null for null, undefined, and empty strings', () => {
    expect(normalizeUsername(null)).toBeNull();
    expect(normalizeUsername(undefined)).toBeNull();
    expect(normalizeUsername('')).toBeNull();
    expect(normalizeUsername('   ')).toBeNull();
    expect(normalizeUsername('@')).toBeNull();
  });

  it('rejects usernames longer than 30 characters', () => {
    expect(normalizeUsername('a'.repeat(31))).toBeNull();
  });

  it('allows usernames at the 30-character boundary', () => {
    const exact = 'a'.repeat(30);
    expect(normalizeUsername(exact)).toBe(exact);
  });

  it('allows periods and underscores in the middle', () => {
    expect(normalizeUsername('a.b_c')).toBe('a.b_c');
    expect(normalizeUsername('the_real.alice')).toBe('the_real.alice');
  });

  it('rejects leading or trailing periods', () => {
    expect(normalizeUsername('.alice')).toBeNull();
    expect(normalizeUsername('alice.')).toBeNull();
  });

  it('rejects consecutive periods', () => {
    expect(normalizeUsername('a..b')).toBeNull();
  });

  it('rejects characters outside a-z 0-9 . _', () => {
    expect(normalizeUsername('alice!')).toBeNull();
    expect(normalizeUsername('alice bob')).toBeNull();
    expect(normalizeUsername('aliçe')).toBeNull();
    expect(normalizeUsername('alice#dev')).toBeNull();
    expect(normalizeUsername('alice/bob')).toBeNull();
  });

  it('accepts purely numeric usernames', () => {
    expect(normalizeUsername('12345')).toBe('12345');
  });

  it('accepts single-character usernames', () => {
    expect(normalizeUsername('a')).toBe('a');
    expect(normalizeUsername('1')).toBe('1');
  });

  it('handles non-string input by coercing to string', () => {
    expect(normalizeUsername(12345)).toBe('12345');
  });
});

// ═════════════════════════════════════════════════════════════════════
//  extractUsernameFromLink  (using mock anchors)
// ═════════════════════════════════════════════════════════════════════

describe('extractUsernameFromLink', () => {
  it('extracts from a simple profile href with trailing slash', () => {
    expect(extractUsernameFromLink(mockAnchor('/alice/'))).toBe('alice');
  });

  it('extracts from a profile href without trailing slash', () => {
    expect(extractUsernameFromLink(mockAnchor('/bob'))).toBe('bob');
  });

  it('lowercases the extracted username', () => {
    expect(extractUsernameFromLink(mockAnchor('/Alice_Dev/'))).toBe('alice_dev');
  });

  it('returns null for multi-segment paths', () => {
    expect(extractUsernameFromLink(mockAnchor('/alice/followers/'))).toBeNull();
    expect(extractUsernameFromLink(mockAnchor('/p/abc123/'))).toBeNull();
  });

  it('returns null for excluded Instagram navigation paths', () => {
    expect(extractUsernameFromLink(mockAnchor('/explore/'))).toBeNull();
    expect(extractUsernameFromLink(mockAnchor('/direct/'))).toBeNull();
    expect(extractUsernameFromLink(mockAnchor('/reels/'))).toBeNull();
    expect(extractUsernameFromLink(mockAnchor('/accounts/'))).toBeNull();
    expect(extractUsernameFromLink(mockAnchor('/stories/'))).toBeNull();
  });

  it('returns null when href is missing', () => {
    expect(extractUsernameFromLink(mockAnchorNoHref())).toBeNull();
  });

  it('returns null for hrefs with query strings', () => {
    expect(extractUsernameFromLink(mockAnchor('/alice?ref=1'))).toBeNull();
  });

  it('returns null for hrefs with hash fragments', () => {
    expect(extractUsernameFromLink(mockAnchor('/alice#section'))).toBeNull();
  });

  it('returns null for root path', () => {
    expect(extractUsernameFromLink(mockAnchor('/'))).toBeNull();
  });
});
