import { usePage } from '@/runtime';
import type { Mood } from '@/Components/characters/palette';
import type { PageProps } from '@/types';

/** Resolves the user's equipped cosmetics (keys) into render props for <Mascot/>. */
export function useCharacter(overrides?: Partial<PageProps['game']['equipped']>) {
    const { game, catalog } = usePage<PageProps>().props;
    const eq = { ...game.equipped, ...overrides };
    const hair = catalog.hair[eq.hair] ?? catalog.hair.teal;
    const outfit = catalog.outfit[eq.outfit] ?? catalog.outfit.black;

    return {
        mascot: game.mascot,
        partner: eq.partner,
        stage: catalog.stage[eq.stage] ?? catalog.stage.paper,
        stageKey: eq.stage,
        kai: {
            hair: { color: hair.color!, hi: hair.hi! },
            outfit: { color: outfit.color!, trim: outfit.trim! },
            gear: eq.gear,
        },
        moodProps: (mood: Mood) => ({ mood }),
    };
}