import { Link, router, usePage } from '@/runtime';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import AccountMenu from '@/Components/AccountMenu';
import NewItemModal from '@/Components/NewItemModal';
import { onOpenNewItem, openNewItem } from '@/lib/newItem';
import { api } from '@/lib/api';
import { inboxNavName } from '@/lib/triage';
import { Coin } from '@/Components/ui/TokenPill';
import { ToastProvider } from '@/Components/ui/Toast';
import ErrorBoundary from '@/Components/ErrorBoundary';
import { GameProvider, useGame } from '@/Components/GameContext';
import type { InboxResponse, PageProps } from '@/types';

const NAV = [
    { href: '/today', match: '/today', label: 'Today', jp: '今日', icon: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> },
    { href: '/inbox', match: '/inbox', label: 'Inbox', jp: '受信', icon: <><path d="M4 13h4a4 4 0 0 0 8 0h4" /><path d="M4 13 6.5 5h11L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /></> },
    { href: '/items', match: '/items', label: 'All items', jp: '一覧', icon: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /> },
    { href: '/calendar', match: '/calendar', label: 'Calendar', jp: '予定', icon: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
    { href: '/master-records', match: '/master-records', label: 'Master record', jp: '台帳', icon: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" /> },
    { href: '/review', match: '/review', label: 'Weekly review', jp: '週報', icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
    { href: '/locker', match: '/locker', label: 'Locker', jp: '景品', icon: <path d="M8 3l4 2 4-2 5 4-3 3-2-1v12H8V9l-2 1-3-3z" strokeLinejoin="round" /> },
];

const MoodMark = lazy(() => import('@/Components/MoodMark'));

function MoodSlot({ size }: { size: number }) {
    const height = Math.round((size * 240) / 200);
    return (
        <Suspense fallback={<span className="inline-block shrink-0" style={{ width: size, height }} aria-hidden="true" />}>
            <MoodMark size={size} />
        </Suspense>
    );
}

function TokenCard() {
    const { balance, gain } = useGame();
    return (
        <Link
            href="/locker"
            className="card-hover relative mt-auto flex items-center gap-2 rounded-[14px] border-2.5 border-ink bg-sun-soft p-3.5 text-ink no-underline shadow-hard-md"
        >
            <MoodSlot size={48} />
            <span className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-bold">Your tokens</span>
                <span className="flex items-center gap-2 font-display text-2xl" aria-live="polite" aria-label={`${balance} tokens`}>
                    <Coin />
                    {balance}
                </span>
                <span className="text-xs font-bold text-accent-ink">Spend in Locker →</span>
            </span>
            {gain && (
                <span key={gain.key} className="float absolute -top-3.5 right-2.5 rounded-lg border-2 border-ink bg-sun px-2 py-0.5 font-display text-xs">
                    {gain.amount > 0 ? '+' : '−'}
                    {Math.abs(gain.amount)}
                </span>
            )}
        </Link>
    );
}

/**
 * Inbox count for the nav badge. Today and Inbox already send `counts.inbox`.
 * Other screens do not, so the shell reads GET /api/inbox and refreshes after a mutation.
 */
function useInboxCount(): number | null {
    const { props } = usePage<PageProps & { counts?: { inbox?: number } }>();
    const fromPage = typeof props.counts?.inbox === 'number' ? props.counts.inbox : null;
    const [cached, setCached] = useState<number | null>(fromPage);

    useEffect(() => {
        if (fromPage !== null) {
            setCached(fromPage);
            return;
        }
        let cancelled = false;
        let seq = 0;
        const pull = () => {
            const mine = ++seq;
            api<InboxResponse>('GET', '/inbox')
                .then((res) => {
                    if (!cancelled && mine === seq && typeof res?.counts?.inbox === 'number') setCached(res.counts.inbox);
                })
                .catch(() => {});
        };
        pull();
        const off = router.on('finish', pull);
        return () => {
            cancelled = true;
            off();
        };
    }, [fromPage]);

    return fromPage ?? cached;
}

function Shell({ children }: { children: ReactNode }) {
    const { url } = usePage();
    const path = url.split('?')[0];
    const { auth } = usePage<PageProps>().props;
    const inboxCount = useInboxCount();
    const [newOpen, setNewOpen] = useState(false);
    useEffect(() => onOpenNewItem(() => setNewOpen(true)), []);
    const logout = () => router.post('/logout');
    const onProfile = path === '/profile' || path.startsWith('/profile/');

    return (
        <div className="grid min-h-screen grid-cols-1 bg-paper font-sans text-ink md:grid-cols-[236px_minmax(0,1fr)]">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
                Skip to content
            </a>

            <aside className="hidden flex-col gap-7 border-r-2.5 border-ink bg-white px-3.5 py-6 md:flex">
                <div className="flex items-center gap-2.5 px-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] border-2 border-ink bg-accent font-display text-white" aria-hidden="true">★</span>
                    <span className="font-display text-base">Task-Chan</span>
                </div>
                <nav className="flex flex-col gap-1" aria-label="Main">
                    {NAV.map((n) => {
                        const on = path === n.match || path.startsWith(`${n.match}/`);
                        const isInbox = n.href === '/inbox';
                        return (
                            <Link
                                key={n.href}
                                href={n.href}
                                aria-current={on ? 'page' : undefined}
                                aria-label={isInbox ? inboxNavName(inboxCount) : undefined}
                                className={`nav-link flex min-h-[42px] items-center gap-2.5 rounded-[10px] px-3 text-sm font-semibold no-underline ${on ? 'bg-ink text-white' : 'text-ink-2'}`}
                            >
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{n.icon}</svg>
                                {n.label}
                                {isInbox && inboxCount !== null && inboxCount > 0 && <InboxBadge count={inboxCount} />}
                                <span className="ml-auto text-[11px] font-medium opacity-60">{n.jp}</span>
                            </Link>
                        );
                    })}
                </nav>
                <TokenCard />
                <div className="flex flex-col gap-1">
                    <Link
                        href="/profile"
                        aria-current={onProfile ? 'page' : undefined}
                        className={`nav-link flex min-h-[44px] items-center gap-2.5 rounded-[10px] px-3 text-sm font-semibold no-underline ${onProfile ? 'bg-ink text-white' : 'text-ink-2'}`}
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                        </svg>
                        Profile
                    </Link>
                    <button
                        type="button"
                        onClick={logout}
                        className="min-h-[44px] rounded-[10px] border-2 border-dashed border-ink text-[13px] font-semibold"
                    >
                        Log out · {auth.user.name}
                    </button>
                </div>
            </aside>

            {/* Mobile top bar + tab bar */}
            <header className="flex items-center gap-2 border-b-2.5 border-ink bg-white px-3 py-2 md:hidden">
                <span className="font-display">Task-Chan</span>
                <div className="ml-auto flex items-center gap-2">
                    <button type="button" onClick={openNewItem} className="min-h-11 rounded-[10px] border-2 border-ink bg-accent px-3 text-[13px] font-bold text-white">+ New</button>
                    <Link href="/locker" className="flex min-h-11 items-center gap-1.5 font-display text-sm text-ink no-underline"><MoodSlot size={28} /><MobileBalance /></Link>
                    <AccountMenu name={auth.user.name} onLogout={logout} />
                </div>
            </header>

            <main id="main" className="relative flex min-w-0 flex-col gap-7 overflow-hidden px-4 pb-24 pt-6 md:px-14 md:pb-12 md:pt-9">
                <ErrorBoundary key={url}>{children}</ErrorBoundary>
            </main>

            <NewItemModal show={newOpen} onClose={() => setNewOpen(false)} />

            <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t-2.5 border-ink bg-white md:hidden" aria-label="Main (mobile)">
                {NAV.map((n) => {
                    const on = path === n.match || path.startsWith(`${n.match}/`);
                    const isInbox = n.href === '/inbox';
                    return (
                        <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined} aria-label={isInbox ? inboxNavName(inboxCount) : undefined} className={`flex min-w-0 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold no-underline ${on ? 'bg-ink text-white' : 'text-ink-2'}`}>
                            <span className="relative">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{n.icon}</svg>
                                {isInbox && inboxCount !== null && inboxCount > 0 && <InboxBadge count={inboxCount} className="absolute -right-2.5 -top-1.5" />}
                            </span>
                            <span className="max-w-full truncate">{n.label.split(' ')[0]}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

function InboxBadge({ count, className = '' }: { count: number; className?: string }) {
    return (
        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-pink px-1 text-[11px] font-bold leading-none text-ink ${className}`}>
            {count}
        </span>
    );
}

function MobileBalance() {
    const { balance } = useGame();
    return (
        <>
            <Coin size={18} />
            {balance}
        </>
    );
}

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <GameProvider>
            <ToastProvider>
                <Shell>{children}</Shell>
            </ToastProvider>
        </GameProvider>
    );
}

/** Page header block used by every screen: mono eyebrow + display title. */
export function PageHeader({ eyebrow, title, accent = '.', children }: { eyebrow: string; title: ReactNode; accent?: string; children?: ReactNode }) {
    return (
        <>
            <div className="halftone pointer-events-none absolute -right-8 -top-8 h-[220px] w-[420px] opacity-[0.07]" aria-hidden="true" />
            <header className="rise relative flex flex-wrap items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">{eyebrow}</span>
                    <h1 className="font-display text-[40px] font-normal leading-none md:text-[56px]">
                        {title}
                        <span className="text-accent">{accent}</span>
                    </h1>
                </div>
                {children}
            </header>
        </>
    );
}