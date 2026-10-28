import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { canClaimFocus, formatFocusClock, msLeft } from '@/lib/focus';
import { usePrefersReducedMotion } from '@/Components/usePrefersReducedMotion';
import type { FocusSession } from '@/types';

interface Props {
    session: FocusSession;
    busy?: boolean;
    /** Freeze the clock. The live overlay ticks on its own when this is omitted. */
    now?: number;
    reducedMotion?: boolean;
    onClaim: () => void;
    onCancel: () => void;
}

/**
 * Running Focus. Cancel is always available. Claim appears only after the countdown hits zero.
 * Completing pays tokens and leaves the linked item open.
 */
export default function FocusOverlay({ session, busy = false, now, reducedMotion, onClaim, onCancel }: Props) {
    const titleId = useId();
    const systemReduced = usePrefersReducedMotion();
    const reduced = reducedMotion ?? systemReduced;
    const [tick, setTick] = useState(() => Date.now());
    const frozen = now !== undefined;

    useEffect(() => {
        if (frozen) return;
        const id = window.setInterval(() => setTick(Date.now()), reduced ? 1000 : 250);
        return () => window.clearInterval(id);
    }, [frozen, reduced]);

    const left = msLeft(session.ends_at, frozen ? now : tick);
    const ready = canClaimFocus(left);
    const clock = formatFocusClock(left);
    const subject = session.item ? `#${session.item.number} ${session.item.title}` : 'Free focus';

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-ink/60" aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-reduced-motion={reduced ? 'true' : 'false'}
                className={`relative flex w-full max-w-sm flex-col gap-4 rounded-[18px] border-2.5 border-ink bg-white p-6 shadow-hard-lg ${reduced ? '' : 'rise'}`}
            >
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Focus · {session.planned_minutes} min</span>
                    <h2 id={titleId} className="font-display text-2xl font-normal leading-tight">{subject}</h2>
                </div>
                <p className="font-display text-[64px] leading-none" data-focus-clock aria-live="off">
                    {clock}
                </p>
                <p className="text-sm font-semibold text-ink-2">
                    {ready
                        ? `Time's up. Claim +${session.bonus}. The item stays open.`
                        : `Stay with it. +${session.bonus} when the clock hits zero.`}
                </p>
                <div className="flex flex-col gap-2">
                    {ready && (
                        <button
                            type="button"
                            onClick={onClaim}
                            disabled={busy}
                            className="min-h-[46px] rounded-[11px] border-2 border-ink bg-sun text-sm font-bold text-ink shadow-hard-sm disabled:opacity-60"
                        >
                            Claim +{session.bonus}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="min-h-[42px] rounded-[11px] border-2 border-ink bg-white text-sm font-bold text-ink disabled:opacity-60"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
