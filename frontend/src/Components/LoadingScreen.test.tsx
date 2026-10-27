import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LoadingScreen, { LoadingBadge, LoadingPanel } from './LoadingScreen';

afterEach(() => cleanup());

describe('loading indicator', () => {
    it('shows an ink card and sun stamp instead of a plain spinner', () => {
        render(<LoadingScreen />);

        const status = screen.getByRole('status', { name: 'Loading' });
        expect(status.getAttribute('aria-busy')).toBe('true');
        expect(status.className).toContain('border-ink');
        expect(status.className).toContain('bg-white');
        expect(status.className).toContain('shadow-hard');
        expect(status.querySelector('.ink-spin-ring')).toBeTruthy();
        expect(status.querySelector('.bg-sun')).toBeTruthy();
        expect(status.querySelector('.border-ink')).toBeTruthy();
        expect(screen.getByText('Task-Chan')).toBeTruthy();
    });

    it('can sit in the page shell without the guest wordmark', () => {
        render(<LoadingPanel />);
        expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
        expect(screen.queryByText('Task-Chan')).toBeNull();
    });

    it('uses the same ink ring for in-place fetches', () => {
        render(<LoadingBadge />);
        const status = screen.getByRole('status', { name: 'Loading' });
        expect(status.className).toContain('border-ink');
        expect(status.className).toContain('bg-sun');
        expect(status.querySelector('.ink-spin-ring')).toBeTruthy();
    });
});
