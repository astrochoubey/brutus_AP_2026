import { describe, it, expect } from 'vitest';
import { validateScan } from '../../extension/src/utils/validation.js';

describe('validateScan', () => {
  it('validates counts and rejects invalid objects or negative/overflow values', () => {
    expect(validateScan(null).isValid).toBe(false);
    expect(validateScan({ reportedCount: -1, collectedCount: 0 }).isValid).toBe(false);
    expect(validateScan({ reportedCount: 10, collectedCount: 10 }).isValid).toBe(true);
    expect(validateScan({ reportedCount: 5, collectedCount: 10 }).isValid).toBe(false);
  });
});
