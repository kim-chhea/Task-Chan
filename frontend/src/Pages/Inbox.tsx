import { Head, Link, router } from '@/runtime';
import { useRef, useState, type ReactNode } from 'react';
import { TypeChip } from '@/Components/ui/Chip';
import { useToast } from '@/Components/ui/Toast';
import AppLayout, { PageHeader } from '@/Layouts/AppLayout';
import { api, ApiError } from '@/lib/api';
import { dueText, todayIso } from '@/lib/format';
import { openNewItem } from '@/lib/newItem';
import { daysFromToday, triagePatch, type TriagePatch } from '@/lib/triage';
import type { InboxResponse, ItemDto } from '@/types';

const QUICK = [
    { label: 'Today', days: 0 },
    { label: 'Tomorrow', days: 1 },
    { label: 'Next week', days: 7 },
] as const;

const choice = 'min-h-[42px] rounded-lg border-2 border-ink px-3 text-[13px] font-bold disabled:opacity-60';

export default function Inbox({ inbox, someday, counts }: InboxResponse) {
    const toast = useToast();
    const [tab, setTab] = useState<'inbox' | 'someday'>('inbox');
    const [pending, setPending] = useState<number | null>(null);
    const [draftDate, setDraftDate] = useState<Record<number, string>>({});
    const pendingRef = useRef<number | null>(null);
    const rows = tab === 'inbox' ? inbox : someday;

    async function apply(item: ItemDto, body: TriagePatch, message: string) {
        if (pendingRef.current !== null) return;
        pendingRef.current = item.id;
        setPending(item.id);
        try {
            await api('PATCH', `/items/${item.id}`, body);
            setDraftDate((d) => {
                if (!(item.id in d)) return d;
                const next = { ...d };
                delete next[item.id];
                return next;
            });
            toast(message);
            await router.reload({ only: ['inbox', 'someday', 'counts'] });
        } catch (e) {
            toast(e instanceof ApiError ? e.message : 'Could not update that item.');
        } finally {
            pendingRef.current = null;
            setPending(null);
        }
    }

    const schedule = (item: ItemDto, deadline: string) => apply(item, triagePatch('schedule', deadline), `“${item.title}” is due ${dueText(deadline)}.`);

    return (
        <>
            <Head title="Inbox" />
            <PageHeader eyebrow={`Triage · ${counts.inbox} to sort · ${counts.someday} someday`} title="Inbox">
                <button type="button" onClick={openNewItem} className="inline-flex min-h-[46px] items-center rounded-[11px] border-2 border-ink bg-accent px-5 text-sm font-bold text-white shadow-hard-sm">
                    + New item
                </button>
            </PageHeader>

            <div className="rise relative flex flex-col gap-3" style={{ animationDelay: '0.1s' }}>
                <div role="group" aria-label="Lists" className="inline-flex w-fit max-w-full rounded-[11px] border-2 border-ink bg-white p-1">
                    <TabButton on={tab === 'inbox'} onClick={() => setTab('inbox')} label="Inbox" count={counts.inbox} />
                    <TabButton on={tab === 'someday'} onClick={() => setTab('someday')} label="Someday" count={counts.someday} />
                </div>
                <p className="max-w-xl text-[13px] font-medium text-ink-2">
                    {tab === 'inbox'
                        ? 'These have no due date. Give one a day, or park it for Someday.'
                        : 'Parked on purpose. Give one a day when you are ready, or send an undated one back to the Inbox.'}
                </p>
            </div>

            <div className="relative flex flex-col gap-2.5">
                {rows.map((item) => (
                    <article key={item.id} aria-busy={pending === item.id} className="rise flex flex-col gap-3 rounded-[14px] border-2 border-paper-3 bg-white px-3.5 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="font-mono text-xs text-ink-3">#{item.number}</span>
                            <Link href={`/items/${item.id}`} className="min-w-0 truncate text-[15px] font-semibold text-ink no-underline">{item.title}</Link>
                            <span className="ml-auto shrink-0"><TypeChip type={item.type} /></span>
                        </div>
                        {tab === 'someday' && item.deadline && (
                            <p className="text-xs font-semibold text-ink-3">Still dated {dueText(item.deadline)}. A date takes it out of Someday.</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-ink-3">Give it a day</span>
                            {QUICK.map((q) => (
                                <button
                                    key={q.label}
                                    type="button"
                                    disabled={pending !== null}
                                    aria-label={`${q.label} for ${item.title}`}
                                    onClick={() => void schedule(item, daysFromToday(q.days, todayIso()))}
                                    className={`${choice} bg-white text-ink hover:bg-sun-soft`}
                                >
                                    {q.label}
                                </button>
                            ))}
                            <label className="sr-only" htmlFor={`due-${item.id}`}>Due date for {item.title}</label>
                            <input
                                id={`due-${item.id}`}
                                type="date"
                                value={draftDate[item.id] ?? item.deadline ?? ''}
                                disabled={pending !== null}
                                onChange={(e) => setDraftDate((d) => ({ ...d, [item.id]: e.target.value }))}
                                className="min-h-[42px] rounded-lg border-2 border-ink bg-white px-2 font-mono text-[13px] disabled:opacity-60"
                            />
                            <button
                                type="button"
                                disabled={pending !== null || !(draftDate[item.id] ?? item.deadline)}
                                aria-label={`Set date for ${item.title}`}
                                onClick={() => {
                                    const day = draftDate[item.id] ?? item.deadline;
                                    if (day) void schedule(item, day);
                                }}
                                className={`${choice} bg-accent text-white`}
                            >
                                Set date
                            </button>
                            {tab === 'inbox' && (
                                <button
                                    type="button"
                                    disabled={pending !== null}
                                    aria-label={`Park ${item.title} for someday`}
                                    onClick={() => void apply(item, triagePatch('park'), `Parked “${item.title}” for someday.`)}
                                    className={`${choice} bg-sun text-ink`}
                                >
                                    Park
                                </button>
                            )}
                            {tab === 'someday' && !item.deadline && (
                                <button
                                    type="button"
                                    disabled={pending !== null}
                                    aria-label={`Send ${item.title} back to Inbox`}
                                    onClick={() => void apply(item, triagePatch('inbox'), `“${item.title}” is back in the Inbox.`)}
                                    className={`${choice} bg-white text-ink`}
                                >
                                    Back to Inbox
                                </button>
                            )}
                            {tab === 'someday' && item.deadline && (
                                <button
                                    type="button"
                                    disabled={pending !== null}
                                    aria-label={`Schedule ${item.title} on ${item.deadline}`}
                                    onClick={() => item.deadline && void schedule(item, item.deadline)}
                                    className={`${choice} bg-sun text-ink`}
                                >
                                    Use {dueText(item.deadline)}
                                </button>
                            )}
                        </div>
                    </article>
                ))}
                {rows.length === 0 && (
                    <p className="rounded-2xl border-2 border-dashed border-ink p-6 text-center font-semibold">
                        {tab === 'inbox' ? 'Inbox is clear. A new item with no date lands here.' : 'Nothing is parked for someday.'}
                    </p>
                )}
            </div>
        </>
    );
}

function TabButton({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
    return (
        <button type="button" aria-pressed={on} onClick={onClick} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-bold ${on ? 'bg-ink text-white' : 'text-ink-2'}`}>
            {label}{' '}<span className={`font-mono text-xs ${on ? 'text-sun' : 'text-ink-3'}`}>{count}</span>
        </button>
    );
}

Inbox.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
