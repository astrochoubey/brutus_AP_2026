import { describe, it, expect } from 'vitest';
import {
  normalizeUsername,
  extractUsernameFromLink,
} from '../../extension/src/content/following.js';

function mockAnchor(href) {
  return { getAttribute: (attr) => (attr === 'href' ? href : null) };
}

function mockAnchorNoHref() {
  return { getAttribute: () => null };
}

describe('normalizeUsername (Following Collector)', () => {
  it('lowercases and trims following username', () => {
    expect(normalizeUsername('  Charlie_Dev  ')).toBe('charlie_dev');
  });

  it('strips leading @ symbols', () => {
    expect(normalizeUsername('@david')).toBe('david');
    expect(normalizeUsername('@@david')).toBe('david');
  });

  it('returns null for empty or invalid usernames', () => {
    expect(normalizeUsername(null)).toBeNull();
    expect(normalizeUsername('')).toBeNull();
    expect(normalizeUsername('a'.repeat(31))).toBeNull();
    expect(normalizeUsername('invalid..dots')).toBeNull();
    expect(normalizeUsername('.leadingdot')).toBeNull();
  });

  it('allows valid usernames up to 30 characters', () => {
    expect(normalizeUsername('valid.user_123')).toBe('valid.user_123');
  });
});

describe('extractUsernameFromLink (Following Collector)', () => {
  it('extracts from single-segment profile paths', () => {
    expect(extractUsernameFromLink(mockAnchor('/david/'))).toBe('david');
    expect(extractUsernameFromLink(mockAnchor('/eve'))).toBe('eve');
  });

  it('rejects navigation paths and multi-segment links', () => {
    expect(extractUsernameFromLink(mockAnchor('/explore/'))).toBeNull();
    expect(extractUsernameFromLink(mockAnchor('/direct/'))).toBeNull();
    expect(extractUsernameFromLink(mockAnchor('/david/followers/'))).toBeNull();
    expect(extractUsernameFromLink(mockAnchorNoHref())).toBeNull();
  });
});
