import { Mascot } from '@/Components/characters';
import { useCharacter } from '@/Components/useCharacter';
import { useRestingMood } from '@/Components/useRestingMood';

/** Small streak-mood mascot for the shell. Loaded on its own so the page runtime does not pull Kai in early. */
export default function MoodMark({ size }: { size: number }) {
    const ch = useCharacter();
    const mood = useRestingMood();
    return (
        <span className="inline-flex shrink-0" aria-hidden="true" data-mood={mood}>
            <Mascot mascot={ch.mascot} {...ch.kai} mood={mood} size={size} />
        </span>
    );
}
