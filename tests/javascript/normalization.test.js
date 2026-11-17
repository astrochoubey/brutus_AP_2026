import { describe, it, expect } from 'vitest';
import { normalizeUser, normalizeUserList } from '../../extension/src/utils/normalization.js';

describe('Data Normalization Utilities', () => {
    it('normalizes single raw user profiles with varying key conventions', () => {
        const raw = {
            pk: '12345',
            username: '@Alex_Dev',
            full_name: 'Alex Developer',
            is_verified: true,
            is_private: false
        };

        const result = normalizeUser(raw);
        expect(result.id).toBe('12345');
        expect(result.username).toBe('alex_dev');
        expect(result.fullName).toBe('Alex Developer');
        expect(result.isVerified).toBe(true);
        expect(result.isPrivate).toBe(false);
    });

    it('deduplicates user list by primary identifier', () => {
        const rawList = [
            { id: '1', username: 'alice' },
            { id: '2', username: 'bob' },
            { id: '1', username: 'alice_duplicate' }
        ];

        const list = normalizeUserList(rawList);
        expect(list).toHaveLength(2);
        expect(list[0].username).toBe('alice');
        expect(list[1].username).toBe('bob');
    });
});
