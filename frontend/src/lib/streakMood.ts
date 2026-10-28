import type { Mood } from '@/Components/characters/palette';

/** Matches `config/locker.php` when bootstrap has not sent streak rules yet. */
export const DEFAULT_STREAK_LENGTH = 5;
export const DEFAULT_STREAK_BONUS = 50;

const RANK: Record<Mood, number> = { idle: 0, happy: 1, cheer: 2 };

function positiveInt(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
    return Math.floor(value);
}

function nonNegativeInt(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    return Math.floor(value);
}

/**
 * Working days required for the streak bonus.
 * Bootstrap `rules.streak_length` wins. Otherwise use the caller's fallback (Review's streak.length, Locker's prop), then 5.
 */
export function streakLength(rules?: { streak_length?: number } | null, fallback = DEFAULT_STREAK_LENGTH): number {
    return positiveInt(rules?.streak_length) ?? positiveInt(fallback) ?? DEFAULT_STREAK_LENGTH;
}

/** Token payout at a full streak. Bootstrap `rules.streak_bonus` wins, otherwise 50. */
export function streakBonus(rules?: { streak_bonus?: number } | null, fallback = DEFAULT_STREAK_BONUS): number {
    return nonNegativeInt(rules?.streak_bonus) ?? nonNegativeInt(fallback) ?? DEFAULT_STREAK_BONUS;
}

/**
 * Partner / Kai resting mood.
 * s <= 0 → idle, 0 < s < L → happy, s >= L → cheer.
 */
export function streakMood(streak: number, length: number): Mood {
    const s = Number.isFinite(streak) ? streak : 0;
    const goal = positiveInt(length) ?? DEFAULT_STREAK_LENGTH;
    if (s <= 0) return 'idle';
    if (s < goal) return 'happy';
    return 'cheer';
}

/** Weekly Review hero. A cleared week forces cheer even when the streak is short. */
export function reviewHeroMood(streak: number, length: number, cleared: boolean): Mood {
    if (cleared) return 'cheer';
    return streakMood(streak, length);
}

/** Keep the stronger of two moods. Local cheers still beat a quiet streak. */
export function liftMood(base: Mood, floor: Mood): Mood {
    return RANK[base] >= RANK[floor] ? base : floor;
}
