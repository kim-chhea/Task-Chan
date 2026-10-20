import { describe, expect, it } from 'vitest';
import { apiOrigin, contentSecurityPolicy } from '../../cspPolicy.mjs';

describe('contentSecurityPolicy', () => {
    it('keeps fonts and styles on self and covers a same-origin API', () => {
        const policy = contentSecurityPolicy();
        expect(policy).toContain("font-src 'self'");
        expect(policy).toContain("style-src 'self'");
        expect(policy).not.toContain('fonts.googleapis.com');
        expect(policy).not.toContain('fonts.gstatic.com');
        expect(directive(policy, 'style-src')).toBe("'self'");
        expect(directive(policy, 'connect-src')).toBe("'self'");
        expect(directive(policy, 'frame-ancestors')).toBe("'none'");
        expect(contentSecurityPolicy(undefined, 'meta')).not.toContain('frame-ancestors');
    });

    it('adds the API origin when the API is on another host', () => {
        expect(apiOrigin('https://api.example.com')).toBe('https://api.example.com');
        expect(apiOrigin('https://api.example.com/')).toBe('https://api.example.com');
        expect(directive(contentSecurityPolicy('https://api.example.com'), 'connect-src')).toBe(
            "'self' https://api.example.com",
        );
    });
});

function directive(policy: string, name: string): string {
    const match = policy.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `));
    return match?.slice(name.length).trim() ?? '';
}
