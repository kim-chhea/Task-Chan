import { describe, expect, it } from 'vitest';
import { liftMood, reviewHeroMood, streakBonus, streakLength, streakMood } from './streakMood';

describe('streakLength', () => {
    it('prefers bootstrap rules, then the caller fallback, then 5', () => {
        expect(streakLength({ streak_length: 7 }, 5)).toBe(7);
        expect(streakLength(undefined, 4)).toBe(4);
        expect(streakLength(null, 0)).toBe(5);
        expect(streakLength({ streak_length: 0 }, 4)).toBe(4);
        expect(streakLength({})).toBe(5);
    });
});

describe('streakBonus', () => {
    it('prefers bootstrap rules and keeps a real zero', () => {
        expect(streakBonus({ streak_bonus: 80 })).toBe(80);
        expect(streakBonus(undefined)).toBe(50);
        expect(streakBonus({ streak_bonus: 0 })).toBe(0);
        expect(streakBonus(null, 25)).toBe(25);
    });
});

describe('streakMood', () => {
    it('is idle at zero, happy mid-streak, and cheer at the goal', () => {
        expect(streakMood(0, 5)).toBe('idle');
        expect(streakMood(-2, 5)).toBe('idle');
        expect(streakMood(1, 5)).toBe('happy');
        expect(streakMood(4, 5)).toBe('happy');
        expect(streakMood(5, 5)).toBe('cheer');
        expect(streakMood(7, 5)).toBe('cheer');
    });

    it('uses length 5 when the goal is missing', () => {
        expect(streakMood(4, 0)).toBe('happy');
        expect(streakMood(5, Number.NaN)).toBe('cheer');
    });
});

describe('reviewHeroMood', () => {
    it('follows the streak unless the week is cleared', () => {
        expect(reviewHeroMood(0, 5, false)).toBe('idle');
        expect(reviewHeroMood(3, 5, false)).toBe('happy');
        expect(reviewHeroMood(5, 5, false)).toBe('cheer');
        expect(reviewHeroMood(0, 5, true)).toBe('cheer');
        expect(reviewHeroMood(2, 5, true)).toBe('cheer');
    });
});

describe('liftMood', () => {
    it('keeps the stronger mood', () => {
        expect(liftMood('idle', 'happy')).toBe('happy');
        expect(liftMood('cheer', 'happy')).toBe('cheer');
        expect(liftMood('happy', 'idle')).toBe('happy');
        expect(liftMood('idle', 'cheer')).toBe('cheer');
    });
});
