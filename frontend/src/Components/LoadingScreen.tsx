/** Playful ink-and-paper mark shown while a screen is waiting on the network. */
function LoadingMark() {
    return (
        <span className="relative inline-flex h-16 w-16 items-center justify-center" aria-hidden="true">
            <span className="ink-spin-ring absolute inset-0 rounded-full" />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border-2.5 border-ink bg-sun font-display text-xl leading-none text-ink shadow-hard-sm">
                ★
            </span>
        </span>
    );
}

/** Card placed in the app shell (or on the guest splash) while route data is in flight. */
export function LoadingPanel({ label = 'Loading' }: { label?: string }) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={label}
            className="flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-[18px] border-2.5 border-ink bg-white px-8 py-12 text-center shadow-hard"
        >
            <LoadingMark />
            <p className="font-display text-xl text-ink">{label}</p>
        </div>
    );
}

/** Small pill for when the current screen stays mounted but a fetch is still running. */
export function LoadingBadge() {
    return (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-auto md:top-6">
            <div
                role="status"
                aria-live="polite"
                aria-label="Loading"
                className="flex items-center gap-2 rounded-full border-2.5 border-ink bg-sun px-3 py-1.5 text-ink shadow-hard-sm"
            >
                <span className="ink-spin-ring inline-block h-4 w-4 shrink-0 rounded-full" aria-hidden="true" />
                <span className="text-xs font-bold">Loading</span>
            </div>
        </div>
    );
}

/** Full-page splash used before we know who is logged in, and for guest screens. */
export default function LoadingScreen({ label = 'Loading' }: { label?: string }) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-10">
            <div className="halftone pointer-events-none absolute -right-8 -top-8 h-[220px] w-[420px] opacity-[0.07]" aria-hidden="true" />
            <div className="rise relative flex w-full max-w-sm flex-col items-center gap-5">
                <div className="flex items-center gap-3 text-ink">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border-2 border-ink bg-accent font-display text-white" aria-hidden="true">
                        ★
                    </span>
                    <span className="font-display text-2xl">Task-Chan</span>
                </div>
                <LoadingPanel label={label} />
            </div>
        </div>
    );
}
