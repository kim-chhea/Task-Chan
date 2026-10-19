import { Link } from '@/runtime';
import { PropsWithChildren } from 'react';
import { Mascot } from '@/Components/characters';

/** Login / register shell in the manga style. */
export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-paper px-4 py-10">
            <div className="halftone pointer-events-none absolute -right-8 -top-8 h-[220px] w-[420px] opacity-[0.07]" aria-hidden="true" />
            <div className="rise relative flex w-full max-w-md flex-col gap-5">
                <Link href="/" className="flex items-center gap-3 text-ink no-underline">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border-2 border-ink bg-accent font-display text-white" aria-hidden="true">★</span>
                    <span className="font-display text-2xl">Task-Chan</span>
                </Link>
                <div className="rounded-[18px] border-2.5 border-ink bg-white p-6 shadow-hard">{children}</div>
                <div className="pointer-events-none absolute -right-24 bottom-0 hidden lg:block" aria-hidden="true"><Mascot mascot="kai" size={130} /></div>
            </div>
        </div>
    );
}