import { Head, Link } from '@/runtime';
import { Partner } from '@/Components/characters';

const COPY: Record<number, { title: string; body: string }> = {
    403: { title: 'Not yours', body: 'That item belongs to someone else.' },
    404: { title: 'Lost it', body: 'Ember looked everywhere. That page is not here.' },
    419: { title: 'Timed out', body: 'Your session expired. Reload and try again.' },
    429: { title: 'Slow down', body: 'Too many requests. Wait a moment.' },
    500: { title: 'Oops', body: 'Something broke on our side. Try again in a moment.' },
    503: { title: 'Back soon', body: 'The app is being updated.' },
};

/** Standalone (no shell data needed) so it also renders when the session is gone. */
export default function Error({ status }: { status: number }) {
    const c = COPY[status] ?? COPY[500];
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-paper px-4 text-center">
            <Head title={c.title} />
            <Partner partner="ember" size={140} className="bob" />
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">Error {status}</span>
            <h1 className="font-display text-5xl font-normal">{c.title}<span className="text-accent">.</span></h1>
            <p className="max-w-sm font-medium text-ink-2">{c.body}</p>
            <Link href="/today" className="inline-flex min-h-[46px] items-center rounded-[11px] border-2 border-ink bg-accent px-5 text-sm font-bold text-white no-underline shadow-hard-sm">Back to Today</Link>
        </div>
    );
}
