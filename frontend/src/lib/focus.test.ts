import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import type { FocusRules } from '@/types';
import { canClaimFocus, cancelFocus, completeFocus, focusBonusPreview, focusEarnLine, formatFocusClock, getActiveFocus, msLeft, startFocus } from './focus';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));

const rules: FocusRules = {
    presets: [25, 50],
    bonuses: { '25': 10, '50': 20 },
    daily_cap: 4,
};

describe('msLeft', () => {
    const ends = '2026-10-28T10:25:00.000Z';
    const endMs = Date.parse(ends);

    it('counts down to the end and goes negative after it', () => {
        expect(msLeft(ends, endMs - 25 * 60 * 1000)).toBe(25 * 60 * 1000);
        expect(msLeft(ends, endMs - 1)).toBe(1);
        expect(msLeft(ends, endMs)).toBe(0);
        expect(msLeft(ends, endMs + 5_000)).toBe(-5_000);
    });

    it('is NaN when the timestamp cannot be read', () => {
        expect(msLeft('not-a-date', endMs)).toBeNaN();
        expect(msLeft(ends, Number.NaN)).toBeNaN();
    });
});

describe('canClaimFocus', () => {
    it('allows a claim only when no time is left', () => {
        expect(canClaimFocus(1)).toBe(false);
        expect(canClaimFocus(0)).toBe(true);
        expect(canClaimFocus(-1)).toBe(true);
        expect(canClaimFocus(Number.NaN)).toBe(false);
    });
});

describe('formatFocusClock', () => {
    it('renders remaining time and holds at 00:00', () => {
        expect(formatFocusClock(25 * 60 * 1000)).toBe('25:00');
        expect(formatFocusClock(50 * 60 * 1000)).toBe('50:00');
        expect(formatFocusClock(1_000)).toBe('00:01');
        expect(formatFocusClock(1)).toBe('00:01');
        expect(formatFocusClock(0)).toBe('00:00');
        expect(formatFocusClock(-20)).toBe('00:00');
        expect(formatFocusClock(Number.NaN)).toBe('--:--');
    });
});

describe('focusBonusPreview', () => {
    it('reads rules.focus.bonuses string keys', () => {
        expect(focusBonusPreview(rules, 25)).toBe(10);
        expect(focusBonusPreview(rules, 50)).toBe(20);
    });

    it('does not invent a payout for a missing preset', () => {
        expect(focusBonusPreview(rules, 15)).toBe(0);
        expect(focusBonusPreview(undefined, 25)).toBe(0);
        expect(focusBonusPreview({ bonuses: {} }, 25)).toBe(0);
    });

    it('ignores a nested bonus_per_preset field', () => {
        const wire = {
            ...rules,
            bonus_per_preset: { 25: 999 },
        };
        expect(focusBonusPreview(wire, 25)).toBe(10);
        expect(focusBonusPreview(wire, 50)).toBe(20);
    });
});

describe('focusEarnLine', () => {
    it('builds one earn sentence from presets and the daily cap', () => {
        expect(focusEarnLine(rules)).toBe('Focus pays +10 for 25 min and +20 for 50 min, up to 4 a day. It does not mark the item Done.');
    });

    it('is empty without presets', () => {
        expect(focusEarnLine(undefined)).toBeNull();
        expect(focusEarnLine({ ...rules, presets: [] })).toBeNull();
    });
});

describe('focus api', () => {
    beforeEach(() => {
        vi.mocked(api).mockReset();
        vi.mocked(api).mockResolvedValue({});
    });

    it('starts, reads, completes, and cancels on the focus routes', async () => {
        await startFocus(25, 42);
        expect(api).toHaveBeenCalledWith('POST', '/focus/start', { minutes: 25, item_id: 42 });

        await startFocus(50);
        expect(api).toHaveBeenCalledWith('POST', '/focus/start', { minutes: 50 });

        await getActiveFocus();
        expect(api).toHaveBeenCalledWith('GET', '/focus/active');

        await completeFocus(9);
        expect(api).toHaveBeenCalledWith('POST', '/focus/9/complete');

        await cancelFocus(9);
        expect(api).toHaveBeenCalledWith('POST', '/focus/9/cancel');
    });
});
