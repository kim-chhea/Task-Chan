import { Head, Link, router } from '@/runtime';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Mood } from '@/Components/characters/palette';
import { useGame } from '@/Components/GameContext';
import Scene from '@/Components/Scene';
import Card from '@/Components/ui/Card';
import Checkbox from '@/Components/ui/Checkbox';
import { InfoChip, TypeChip } from '@/Components/ui/Chip';
import ProgressBar from '@/Components/ui/ProgressBar';
import TokenPill from '@/Components/ui/TokenPill';
import { useToast } from '@/Components/ui/Toast';
import AppLayout from '@/Layouts/AppLayout';
import { api, ApiError } from '@/lib/api';
import { dueText, isOverdue, longDay } from '@/lib/format';
import { dueLabel, parseQuickAdd } from '@/lib/parser';
import { openNewItem } from '@/lib/newItem';
import { weekDoneAdjusted } from '@/lib/tokens';
import type { ItemDto } from '@/types';

interface Props {
    today: string;
    groups: { due: ItemDto[]; in_progress: ItemDto[]; coming_up: ItemDto[] };
    progress: { done: number; total: number };
    week: { dow: string; n: number; date: string; count: number; today: boolean }[];
    weekRange: string;
    weekDone: number;
}

interface StatusResponse {
    item: ItemDto;
    balance: number;
    awarded: number;
    streak_bonus: number;
    reversed: number;
}

function greeting(today: string) {
    return longDay(today).replace(/^(\w+) (.*)$/, '$1 · $2');
}

export default function Today({ today, groups, week, weekRange, weekDone }: Props) {
    const { reconcile, optimistic } = useGame();
    const toast = useToast();
    const [text, setText] = useState('');
    const [mood, setMood] = useState<Mood>('idle');
    const [msg, setMsg] = useState<{ text: string | null; key: number }>({ text: null, key: 0 });
    const [override, setOverride] = useState<Record<number, boolean>>({});
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<Set<number>>(new Set());
    const timer = useRef<number>(0);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    // Server data is fresh again: drop optimistic overrides.
    useEffect(() => setOverride({}), [groups]);

    const parsed = useMemo(() => parseQuickAdd(text), [text]);

    const react = (message: string, m: Mood = 'cheer') => {
        window.clearTimeout(timer.current);
        setMood(m);
        setMsg((p) => ({ text: message, key: p.key + 1 }));
        timer.current = window.setTimeout(() => setMood('idle'), 1400);
    };

    const isDone = (i: ItemDto) => override[i.id] ?? i.done;
    const dueItems = groups.due;
    const doneN = dueItems.filter(isDone).length;
    const totalN = dueItems.length;
    const weekDoneShown = weekDoneAdjusted(weekDone, [...groups.due, ...groups.in_progress, ...groups.coming_up], override);

    async function add() {
        if (!text.trim() || busy) return;
        setBusy(true);
        try {
            await api('POST', '/items', {
                title: parsed.title,
                type: parsed.type,
                deadline: parsed.deadline,
                ...(parsed.priority ? { priority: parsed.priority } : {}),
            });
            react(`Got it! ${cap(parsed.type)} locked in for ${dueLabel(parsed.deadline)}. ✦`);
            setText('');
            router.reload({ only: ['groups', 'progress', 'week', 'weekDone'] });
        } catch (e) {
            toast(e instanceof ApiError ? e.message : 'Could not add that item.');
        } finally {
            setBusy(false);
        }
    }

    async function toggle(item: ItemDto) {
        if (pending.has(item.id)) return;
        const nowDone = !isDone(item);
        setPending((p) => new Set(p).add(item.id));
        setOverride((o) => ({ ...o, [item.id]: nowDone })); // optimistic checkbox
        if (nowDone) optimistic(item.reward);
        else optimistic(-item.reward);

        try {
            const res = await api<StatusResponse>('PATCH', `/items/${item.id}/status`, { status: nowDone ? 'done' : 'previous' });
            reconcile(res.balance, nowDone ? res.awarded + res.streak_bonus : -res.reversed);
            if (nowDone) {
                const left = dueItems.filter((x) => x.id !== item.id && !isDone(x)).length;
                const got = res.awarded + res.streak_bonus;
                react(left === 0 ? `Clear! +${got} tokens. Today is done, GG!` : `+${got} tokens! ${left} left today.`);
            }
            router.reload({ only: ['groups', 'progress', 'week', 'weekDone'] });
        } catch (e) {
            setOverride((o) => ({ ...o, [item.id]: !nowDone })); // roll back
            router.reload({ only: ['game', 'groups'] }); // resync balance + list from the server
            toast(e instanceof ApiError ? e.message : 'Could not update that item.');
        } finally {
            setPending((p) => { const n = new Set(p); n.delete(item.id); return n; });
        }
    }

    const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') add();
    };

    const bubble = msg.text ?? (text.trim() ? `A ${parsed.type}, due ${dueLabel(parsed.deadline)}? Hit Enter!` : 'What landed on your desk?');

    return (
        <>
            <Head title="Today" />
            <div className="halftone pointer-events-none absolute -right-8 -top-8 h-[220px] w-[420px] opacity-[0.07]" aria-hidden="true" />

            <header className="rise relative flex flex-wrap items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">{greeting(today)}</span>
                    <h1 className="font-display text-[40px] font-normal leading-none md:text-[56px]">
                        Today<span className="text-accent">.</span>
                    </h1>
                </div>
                <Card hover className="flex w-full flex-col gap-2.5 rounded-2xl !px-4 !py-3.5 md:w-[290px]">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[13px] font-semibold">Today&apos;s progress</span>
                        <span className="font-display text-lg">{doneN}/{totalN}</span>
                    </div>
                    <ProgressBar value={totalN ? (doneN / totalN) * 100 : 0} label="Today's progress" />
                </Card>
            </header>

            <section className="rise relative flex items-end gap-6" style={{ animationDelay: '0.1s' }}>
                <div className="flex min-w-0 grow flex-col gap-3">
                    <label htmlFor="qa" className="text-[13px] font-bold">Quick add</label>
                    <div className="qa flex min-h-[66px] items-center gap-3.5 rounded-2xl border-2.5 border-ink bg-white pl-5 pr-2.5 shadow-hard">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15161D" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                        <input
                            id="qa"
                            value={text}
                            onChange={(e) => { setText(e.target.value); setMsg((m) => ({ ...m, text: null })); }}
                            onKeyDown={onKey}
                            placeholder="Ticket from DGB, due Friday"
                            autoComplete="off"
                            className="min-w-0 grow border-0 bg-transparent p-0 text-lg font-medium text-ink focus:outline-hidden focus:ring-0"
                        />
                        <button type="button" onClick={add} disabled={busy || !text.trim()} className="min-h-[46px] rounded-[11px] border-2 border-ink bg-accent px-5 text-sm font-bold text-white disabled:opacity-60">
                            Add ↵
                        </button>
                        <button type="button" onClick={openNewItem} className="min-h-[46px] whitespace-nowrap rounded-[11px] border-2 border-ink bg-white px-4 text-sm font-bold text-ink hover:bg-paper-2">
                            + New item
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[13px]" aria-live="polite">
                        <span className="text-ink-3">Will create</span>
                        <InfoChip label="Type" className="bg-accent-soft">{cap(parsed.type)}</InfoChip>
                        <InfoChip label="Title" className="bg-white">{parsed.title}</InfoChip>
                        <InfoChip label="Due" className="-rotate-[1.5deg] bg-sun">{dueLabel(parsed.deadline)}</InfoChip>
                        {parsed.priority && <InfoChip label="Priority" className="bg-pink-soft">{cap(parsed.priority)}</InfoChip>}
                    </div>
                </div>
                <Scene mood={mood} message={bubble} messageKey={msg.key} />
            </section>

            <div className="relative grid grid-cols-1 items-start gap-9 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="flex flex-col gap-6">
                    <Group name="Due today" tag="bg-pink text-ink" items={groups.due} isDone={isDone} toggle={toggle} pending={pending} hot />
                    <Group name="In progress" tag="bg-accent text-white" items={groups.in_progress} isDone={isDone} toggle={toggle} pending={pending} />
                    <Group name="Coming up" tag="bg-white text-ink" items={groups.coming_up} isDone={isDone} toggle={toggle} pending={pending} />
                    {groups.due.length + groups.in_progress.length + groups.coming_up.length === 0 && (
                        <p className="rounded-2xl border-2 border-dashed border-ink p-6 text-center font-semibold">Nothing on your plate. Ember is suspicious.</p>
                    )}
                </div>

                <aside className="flex flex-col gap-4">
                    <Card hover rise style={{ animationDelay: '0.3s' }} className="flex flex-col gap-3.5">
                        <div className="flex items-baseline justify-between">
                            <h2 className="text-[15px] font-bold">This week</h2>
                            <span className="text-xs text-ink-3">{weekRange}</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {week.map((d, i) => (
                                <div key={i} className={`flex flex-col items-center gap-1 rounded-[10px] py-2 ${d.today ? '-rotate-3 bg-ink text-white' : ''}`}>
                                    <span className="text-[11px]">{d.dow}</span>
                                    <span className="text-[15px] font-bold">{d.n}</span>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.count ? (d.today ? '#FFD23F' : '#FF4D8D') : 'transparent' }} aria-label={d.count ? `${d.count} due` : undefined} />
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Link href="/review" className="card-hover relative flex flex-col gap-1.5 overflow-hidden rounded-[18px] border-2.5 border-ink bg-sun p-[18px] text-ink no-underline shadow-hard">
                        <div className="halftone absolute -bottom-2.5 -right-2.5 h-[100px] w-[140px] opacity-15" aria-hidden="true" />
                        <span className="relative text-[13px] font-bold">Done this week</span>
                        <span className="relative font-display text-[40px] leading-none">{weekDoneShown} items</span>
                        <span className="relative text-[13px] font-bold">Open weekly review →</span>
                    </Link>
                </aside>
            </div>
        </>
    );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Group({ name, tag, items, isDone, toggle, pending, hot }: { name: string; tag: string; items: ItemDto[]; isDone: (i: ItemDto) => boolean; toggle: (i: ItemDto) => void; pending: Set<number>; hot?: boolean }): ReactNode {
    if (items.length === 0) return null;
    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center rounded-lg border-2 border-ink px-2.5 py-1 text-[13px] font-bold ${tag}`}>{name}</span>
                <span className="font-mono text-xs text-ink-3">×{items.length}</span>
            </div>
            {items.map((it, k) => {
                const done = isDone(it);
                return (
                    <div key={it.id} className="row-hover rise grid min-h-[56px] grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border-2 border-paper-3 bg-white px-3.5 py-2 md:grid-cols-[28px_52px_minmax(0,1fr)_auto_auto_auto] md:py-0" style={{ animationDelay: `${0.25 + k * 0.06}s` }}>
                        <Checkbox checked={done} disabled={pending.has(it.id)} onChange={() => toggle(it)} label={`${done ? 'Mark not done' : 'Mark done'}: ${it.title}`} />
                        <span className="hidden font-mono text-xs text-ink-3 md:inline">#{it.number}</span>
                        <Link href={`/items/${it.id}`} className={`truncate text-[15px] font-semibold no-underline ${done ? 'text-ink-3 line-through' : 'text-ink'}`}>{it.title}</Link>
                        <span className="hidden md:inline"><TypeChip type={it.type} /></span>
                        <TokenPill amount={it.reward} prefix={done ? '✓ ' : '+'} tone={done ? 'mint' : 'sun'} />
                        <span className={`hidden min-w-[76px] text-right text-xs font-bold md:inline ${(hot && !done && it.deadline) || isOverdue(it.deadline, done) ? 'text-[#C2185B]' : 'text-ink-3'}`}>{dueText(it.deadline)}</span>
                    </div>
                );
            })}
        </section>
    );
}

Today.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;