import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FocusSession } from '@/types';
import FocusOverlay from './FocusOverlay';

const ENDS = '2026-10-28T10:25:00.000Z';
const START = '2026-10-28T10:00:00.000Z';

function session(endsAt: string, bonus = 10, minutes = 25): FocusSession {
    return {
        id: 9,
        item_id: 42,
        item: { id: 42, number: '0042', title: 'Write the brief', type: 'task' },
        planned_minutes: minutes,
        started_at: START,
        ends_at: endsAt,
        status: 'running',
        awarded_tokens: 0,
        bonus,
    };
}

function renderOverlay(now: number, extra: Partial<FocusSession> = {}, props: { reducedMotion?: boolean } = {}) {
    const onClaim = vi.fn();
    const onCancel = vi.fn();
    render(
        <FocusOverlay
            session={{ ...session(ENDS), ...extra, ends_at: extra.ends_at ?? ENDS }}
            now={now}
            reducedMotion={props.reducedMotion}
            onClaim={onClaim}
            onCancel={onCancel}
        />,
    );
    return { onClaim, onCancel };
}

describe('Focus overlay', () => {
    afterEach(cleanup);

    it('counts down and withholds Claim until the clock hits zero', () => {
        const { onClaim } = renderOverlay(Date.parse(START));
        expect(screen.getByText('25:00')).toBeTruthy();
        expect(screen.getByRole('heading', { name: '#0042 Write the brief' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
        expect(onClaim).not.toHaveBeenCalled();
    });

    it('still withholds Claim one millisecond early', () => {
        renderOverlay(Date.parse(ENDS) - 1);
        expect(screen.getByText('00:01')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Claim +10' })).toBeNull();
    });

    it('offers Claim +N only when msLeft is zero or less', () => {
        const atEnd = renderOverlay(Date.parse(ENDS));
        expect(screen.getByText('00:00')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Claim +10' }));
        expect(atEnd.onClaim).toHaveBeenCalledTimes(1);
        cleanup();

        const after = renderOverlay(Date.parse(ENDS) + 5_000, { bonus: 20, planned_minutes: 50 });
        expect(screen.getByText('00:00')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Claim +20' }));
        expect(after.onClaim).toHaveBeenCalledTimes(1);
    });

    it('cancels without offering a payout', () => {
        const { onCancel, onClaim } = renderOverlay(Date.parse(START));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onClaim).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
    });

    it('names a free Focus when the session has no item', () => {
        renderOverlay(Date.parse(START), { item: null, item_id: null });
        expect(screen.getByRole('heading', { name: 'Free focus' })).toBeTruthy();
    });

    it('skips the entrance motion when the user prefers reduced motion', () => {
        renderOverlay(Date.parse(START), {}, { reducedMotion: true });
        const dialog = screen.getByRole('dialog');
        expect(dialog.getAttribute('data-reduced-motion')).toBe('true');
        expect(dialog.className).not.toContain('rise');
        expect(screen.getByText('25:00')).toBeTruthy();
    });
});
