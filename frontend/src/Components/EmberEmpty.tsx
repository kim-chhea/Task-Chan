import { Partner } from '@/Components/characters';
import { useCharacter } from '@/Components/useCharacter';

/** Empty state: the equipped partner shrugs. */
export default function EmptyState({ children = 'Nothing here. Ember checked twice.' }: { children?: string }) {
    const ch = useCharacter();
    return (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Partner partner={ch.partner} size={96} className="bob" />
            <span className="font-semibold text-ink-3">{children}</span>
        </div>
    );
}