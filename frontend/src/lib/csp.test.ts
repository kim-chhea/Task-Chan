import { describe, expect, it } from 'vitest';
import { apiOrigin, connectOrigins, contentSecurityPolicy, CSP_NONCE_PLACEHOLDER } from '../../cspPolicy.mjs';

describe('contentSecurityPolicy', () => {
    it('keeps fonts and styles on self and covers a same-origin API', () => {
        const policy = contentSecurityPolicy();
        expect(policy).toContain("font-src 'self'");
        expect(policy).toContain("style-src 'self'");
        expect(policy).not.toContain('fonts.googleapis.com');
        expect(policy).not.toContain('fonts.gstatic.com');
        expect(directive(policy, 'style-src')).toBe("'self'");
        expect(directive(policy, 'style-src')).not.toContain('unsafe-inline');
        expect(directive(policy, 'style-src-attr')).toBe("'unsafe-inline'");
        expect(directive(policy, 'connect-src')).toBe("'self'");
        expect(directive(policy, 'frame-ancestors')).toBe("'none'");
        expect(contentSecurityPolicy({ delivery: 'meta' })).not.toContain('frame-ancestors');
    });

    it('uses CSP_CONNECT_SRC for connect-src on both the header and the meta tag', () => {
        expect(apiOrigin('https://api.example.com')).toBe('https://api.example.com');
        expect(apiOrigin('https://api.example.com/')).toBe('https://api.example.com');
        expect(apiOrigin('https://api.example.com:443/v1')).toBe('https://api.example.com');
        expect(connectOrigins('https://api.example.com/v1, not-a-url')).toEqual(["'self'", 'https://api.example.com']);

        const connectSrc = 'https://api.example.com/v1';
        const header = directive(contentSecurityPolicy({ connectSrc, delivery: 'header' }), 'connect-src');
        const meta = directive(contentSecurityPolicy({ connectSrc, delivery: 'meta' }), 'connect-src');
        expect(header).toBe("'self' https://api.example.com");
        expect(meta).toBe(header);
        expect(contentSecurityPolicy({ connectSrc, delivery: 'meta' })).not.toContain('frame-ancestors');
    });

    it('nonces style-src without allowing unsafe-inline', () => {
        const policy = contentSecurityPolicy({ nonce: CSP_NONCE_PLACEHOLDER, delivery: 'meta' });
        expect(directive(policy, 'style-src')).toBe(`'self' 'nonce-${CSP_NONCE_PLACEHOLDER}'`);
        expect(directive(policy, 'style-src')).not.toContain('unsafe-inline');
        expect(policy).not.toContain('frame-ancestors');
    });

    it('rejects the old VITE_API_URL-only call', () => {
        expect(() => contentSecurityPolicy('https://api.example.com' as never)).toThrow(/CSP_CONNECT_SRC/);
    });
});

function directive(policy: string, name: string): string {
    const match = policy.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `) || part === name);
    if (!match || match === name) return '';
    return match.slice(name.length).trim();
}
