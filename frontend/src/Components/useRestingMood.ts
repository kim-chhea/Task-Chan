import { usePage } from '@/runtime';
import { streakLength, streakMood } from '@/lib/streakMood';
import type { Mood } from '@/Components/characters/palette';
import type { PageProps } from '@/types';

/** Resting Kai / partner mood from the logged-in streak and bootstrap rules. */
export function useRestingMood(): Mood {
    const { game, rules } = usePage<PageProps>().props;
    return streakMood(game?.streak ?? 0, streakLength(rules));
}
