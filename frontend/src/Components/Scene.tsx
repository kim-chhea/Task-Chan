import { Mascot, Partner } from '@/Components/characters';
import type { Mood } from '@/Components/characters/palette';
import { useCharacter } from '@/Components/useCharacter';

interface Props {
    mood: Mood;
    message?: string | null;
    messageKey?: number;
    size?: number;
}

/** The user's mascot with their partner and an optional speech bubble. Reacts via `mood`. */
export default function Scene({ mood, message, messageKey = 0, size = 150 }: Props) {
    const ch = useCharacter();
    const partnerSize = Math.round(size * 0.64);

    return (
        <div className="relative hidden shrink-0 items-end md:flex" style={{ height: size * 1.2 }} data-mood={mood}>
            {message && (
                <div
                    key={messageKey}
                    className="bubble absolute bottom-[132px] max-w-[230px] rounded-2xl border-2.5 border-ink bg-white px-3.5 py-2.5 text-[13px] font-semibold shadow-hard-sm"
                    style={{ right: size * 0.72, width: 'max-content' }}
                    role="status"
                >
                    {message}
                </div>
            )}
            <Mascot mascot={ch.mascot} {...ch.kai} mood={mood} size={size} />
            <Partner partner={ch.partner} size={partnerSize} className={`-ml-9 ${mood === 'cheer' ? 'cheer' : ''}`} />
        </div>
    );
}