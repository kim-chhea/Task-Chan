import { Head, Link, router, usePage } from '@/runtime';
import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Mascot } from '@/Components/characters';
import { useGame } from '@/Components/GameContext';
import { useCharacter } from '@/Components/useCharacter';
import Card from '@/Components/ui/Card';
import Checkbox from '@/Components/ui/Checkbox';
import ProgressBar from '@/Components/ui/ProgressBar';
import Sticker from '@/Components/ui/Sticker';
import { Coin } from '@/Components/ui/TokenPill';
import { useToast } from '@/Components/ui/Toast';
import { TypeChip } from '@/Components/ui/Chip';
import AppLayout from '@/Layouts/AppLayout';
import { attachmentErrorText, ATTACHMENT_ACCEPT, clientFileError } from '@/lib/attachments';
import { api, apiUrl, ApiError } from '@/lib/api';
import { fileSize, longDay, PRIORITY_LABEL, shortDay, STATUS_LABEL, todayIso, TYPE_LABEL } from '@/lib/format';
import { liftMood } from '@/lib/streakMood';
import { useRestingMood } from '@/Components/useRestingMood';
import { rewardPreview } from '@/lib/tokens';
import type { CustomFieldDto } from '@/lib/columns';
import type { ItemDto, ItemStatus, MasterRecordRef, PageProps } from '@/types';

const NotesEditor = lazy(() => import('@/Components/NotesEditor'));

interface SubTask { id: number; title: string; done: boolean }
interface Attachment { id: number; name: string; size: number; mime: string | null; url: string }
/** POST /api/items/{item}/attachments returns the row, not the screen's `name` + `url` shape. The list reloads from the item. */
interface CreatedAttachment {
    id: number;
    item_id: number;
    disk: string;
    path: string;
    original_name: string;
    mime: string | null;
    size: number;
    created_at: string;
    updated_at: string;
}
interface FullItem extends ItemDto {
    notes: unknown[] | null;
    sub_tasks: SubTask[];
    attachments: Attachment[];
}
interface Props {
    item: FullItem;
    linked: ItemDto[];
    linkable: { id: number; number: string; title: string }[];
    cases: { id: number; code: string; title: string }[];
    fields: CustomFieldDto[];
}
interface StatusResponse { item: ItemDto; balance: number; awarded: number; streak_bonus: number; reversed: number }

const STATUSES: ItemStatus[] = ['not_started', 'in_progress', 'done'];
const STATUS_ON: Record<ItemStatus, string> = { not_started: 'bg-ink text-white', in_progress: 'bg-accent text-white', done: 'bg-mint text-ink' };

export default function Show({ item, linked, linkable, cases, fields }: Props) {
    const { reconcile, optimistic } = useGame();
    const toast = useToast();
    const ch = useCharacter();
    const [status, setStatus] = useState<ItemStatus>(item.status);
    const [subs, setSubs] = useState<SubTask[]>(item.sub_tasks);
    const [cheer, setCheer] = useState(false);
    const [burst, setBurst] = useState(0);
    const [savedAt, setSavedAt] = useState<string>('Saved');
    const [newSub, setNewSub] = useState('');
    const [fileErrors, setFileErrors] = useState<string[]>([]);
    const [title, setTitle] = useState(item.title);
    const editingTitle = useRef(false);
    const { rules } = usePage<PageProps>().props;
    const resting = useRestingMood();
    const timer = useRef<number>(0);
    const fileInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        setStatus(item.status);
        setSubs(item.sub_tasks);
        if (!editingTitle.current) setTitle(item.title); // never clobber a title the user is typing
    }, [item]);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    const isDone = status === 'done';
    const mood = liftMood(cheer ? 'cheer' : isDone ? 'happy' : 'idle', resting);
    const doneCount = subs.filter((s) => s.done).length;
    const reload = (only: string[]) => router.reload({ only });
    const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Something went wrong.');

    async function changeStatus(next: ItemStatus) {
        if (next === status) return;
        const prev = status;
        setStatus(next);
        if (next === 'done') { optimistic(item.reward); setSubs((s) => s.map((x) => ({ ...x, done: true }))); }
        if (prev === 'done') optimistic(-item.reward);
        try {
            const res = await api<StatusResponse>('PATCH', `/items/${item.id}/status`, { status: next });
            reconcile(res.balance, next === 'done' ? res.awarded + res.streak_bonus : prev === 'done' ? -res.reversed : 0);
            if (next === 'done' && res.awarded > 0) {
                setCheer(true); setBurst((b) => b + 1);
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => setCheer(false), 1100);
            }
            reload(['item', 'game']);
        } catch (e) { setStatus(prev); reload(['item', 'game']); fail(e); }
    }

    async function patch(data: Record<string, unknown>) {
        try { await api('PATCH', `/items/${item.id}`, data); reload(['item', 'linked']); }
        catch (e) { fail(e); }
    }

    async function toggleSub(s: SubTask) {
        setSubs((all) => all.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)));
        try { await api('PATCH', `/sub-tasks/${s.id}`, { done: !s.done }); } catch (e) { fail(e); reload(['item']); }
    }
    async function addSub() {
        const t = newSub.trim();
        if (!t) return;
        try { await api('POST', `/items/${item.id}/sub-tasks`, { title: t }); setNewSub(''); reload(['item']); } catch (e) { fail(e); }
    }
    async function removeSub(s: SubTask) {
        try { await api('DELETE', `/sub-tasks/${s.id}`); reload(['item']); } catch (e) { fail(e); }
    }
    async function upload(files: FileList | null) {
        if (!files?.length) return;
        const messages: string[] = [];
        for (const f of Array.from(files)) {
            const local = clientFileError(f);
            if (local) { messages.push(local); continue; }
            const fd = new FormData(); fd.append('file', f);
            try {
                await api<CreatedAttachment>('POST', `/items/${item.id}/attachments`, fd);
            } catch (e) {
                messages.push(...attachmentErrorText(e));
            }
        }
        setFileErrors(messages);
        reload(['item']);
    }
    async function link(id: number) {
        try { await api('POST', `/items/${item.id}/links`, { linked_item_id: id }); reload(['linked', 'linkable']); } catch (e) { fail(e); }
    }
    async function unlink(id: number) {
        try { await api('DELETE', `/items/${item.id}/links/${id}`); reload(['linked', 'linkable']); } catch (e) { fail(e); }
    }
    async function saveNotes(blocks: unknown[]) {
        try { await api('PATCH', `/items/${item.id}`, { notes: blocks }); setSavedAt('Saved just now'); } catch (e) { fail(e); }
    }

    const preview = rewardPreview(rules, item.priority, item.deadline, isDone && item.completed_at ? item.completed_at.slice(0, 10) : todayIso());
    const kaiLine = isDone ? `Done. +${item.reward} in the bag.` : doneCount >= 2 ? 'Halfway there. Keep going!' : 'Let’s knock this one out.';

    return (
        <>
            <Head title={`#${item.number} ${item.title}`} />
            <nav aria-label="Breadcrumb" className="rise flex items-center gap-2 text-[13px] font-semibold text-ink-3">
                <Link href="/items" className="text-accent-ink">All items</Link><span aria-hidden="true">/</span><span className="font-mono">#{item.number}</span>
            </nav>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex min-w-0 flex-col gap-6">
                    <header className="rise flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <TypeChip type={item.type} className="!text-[13px] !py-1" />
                            <Sticker color={item.priority === 'high' ? 'pink' : item.priority === 'medium' ? 'yellow' : 'white'}>{PRIORITY_LABEL[item.priority]} priority</Sticker>
                            <Sticker color="white" rotate={1.5}>Due {shortDay(item.deadline)}</Sticker>
                        </div>
                        <input
                            aria-label="Title"
                            value={title}
                            onFocus={() => { editingTitle.current = true; }}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => { editingTitle.current = false; if (title.trim() && title !== item.title) patch({ title: title.trim() }); }}
                            className="w-full border-0 bg-transparent p-0 font-display text-[32px] font-normal leading-tight focus:ring-0 md:text-[44px]"
                        />
                        <div role="radiogroup" aria-label="Status" className="inline-flex self-start rounded-xl border-2.5 border-ink bg-white p-1">
                            {STATUSES.map((s) => (
                                <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => changeStatus(s)} className={`min-h-[42px] rounded-[10px] px-4 text-sm font-bold ${status === s ? STATUS_ON[s] : 'text-ink-2'}`}>
                                    {s === 'done' ? 'Done ✓' : STATUS_LABEL[s]}
                                </button>
                            ))}
                        </div>
                    </header>

                    <Card rise aria-label="Notes" className="flex flex-col gap-2 !p-5">
                        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-ink-3"><span>NOTES · メモ</span><span>{savedAt}</span></div>
                        <Suspense fallback={<p className="text-sm text-ink-3">Loading editor…</p>}>
                            <NotesEditor initial={item.notes} onSave={saveNotes} />
                        </Suspense>
                    </Card>

                    <Card rise className="flex flex-col gap-3.5 !p-5">
                        <div className="flex items-baseline justify-between"><h2 className="text-base font-bold">Sub-tasks</h2><span className="font-mono text-[13px] text-ink-3">{doneCount}/{subs.length}</span></div>
                        <ProgressBar value={subs.length ? (doneCount / subs.length) * 100 : 0} label="Sub-task progress" />
                        {subs.map((s) => (
                            <div key={s.id} className="group flex items-center gap-3">
                                <Checkbox checked={s.done} onChange={() => toggleSub(s)} label={`${s.done ? 'Untick' : 'Tick'}: ${s.title}`} />
                                <span className={`grow text-[15px] font-medium ${s.done ? 'text-ink-4 line-through' : ''}`}>{s.title}</span>
                                <button
                                    type="button"
                                    onClick={() => removeSub(s)}
                                    aria-label={`Delete sub-task ${s.title}`}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-base text-ink-3 hover:text-pink focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                                >
                                    <span aria-hidden="true">✕</span>
                                </button>
                            </div>
                        ))}
                        <form onSubmit={(e) => { e.preventDefault(); addSub(); }} className="flex gap-2">
                            <input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="+ Add sub-task" aria-label="New sub-task" className="min-h-[38px] grow rounded-lg border-2 border-dashed border-ink bg-transparent px-3 text-sm focus:border-solid focus:ring-0" />
                        </form>
                    </Card>

                    <Card rise className="flex flex-col gap-3 !p-5">
                        <h2 className="text-base font-bold">Files</h2>
                        {item.attachments.map((a) => (
                            <div key={a.id} className="flex items-center gap-3 rounded-[10px] border-2 border-paper-3 px-3 py-2 text-sm">
                                <span aria-hidden="true">📎</span>
                                <a href={apiUrl(a.url)} className="grow truncate font-semibold">{a.name}</a>
                                <span className="font-mono text-xs text-ink-3">{fileSize(a.size)}</span>
                                <button type="button" aria-label={`Delete ${a.name}`} onClick={async () => { try { await api('DELETE', `/attachments/${a.id}`); reload(['item']); } catch (e) { fail(e); } }} className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-base text-ink-3 hover:text-pink">✕</button>
                            </div>
                        ))}
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
                            className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-ink p-5 text-center"
                        >
                            <button type="button" onClick={() => fileInput.current?.click()} className="font-bold text-accent-ink">Drop files or browse</button>
                            <span className="text-xs text-ink-3">pdf, images, text, Office, or zip. Up to 10 MB each.</span>
                            {fileErrors.length > 0 && (
                                <div role="alert" className="mt-1 w-full rounded-[10px] border-2 border-ink bg-pink-soft px-3 py-2 text-left text-sm font-semibold text-ink">
                                    {fileErrors.map((msg, i) => <p key={i}>{msg}</p>)}
                                </div>
                            )}
                            <input ref={fileInput} type="file" accept={ATTACHMENT_ACCEPT} multiple hidden onChange={(e: ChangeEvent<HTMLInputElement>) => { upload(e.target.files); e.target.value = ''; }} />
                        </div>
                    </Card>
                </div>

                <aside className="flex flex-col gap-4">
                    <Card rise tone={isDone ? 'yellow' : 'soft-yellow'} className="flex flex-col gap-3 overflow-hidden">
                        {burst > 0 && isDone && <span key={burst} className="float absolute right-4 top-3 rounded-lg border-2 border-ink bg-white px-2.5 py-1 font-display text-sm">+{item.reward}</span>}
                        <div className="flex items-center gap-3" data-mood={mood}>
                            <Mascot mascot={ch.mascot} {...ch.kai} mood={mood} size={84} />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold">{isDone ? 'Claimed!' : 'Reward when done'}</span>
                                <span className="flex items-center gap-1.5 font-display text-[32px] leading-none"><Coin size={26} />{item.reward}</span>
                                <span className="text-[11px] font-semibold">{PRIORITY_LABEL[item.priority]} +{preview.base}{preview.early > 0 ? ` · on-time bonus +${preview.early}` : ' · no on-time bonus'}</span>
                            </div>
                        </div>
                        <span className="rounded-xl border-2 border-ink bg-white px-3 py-2 text-[13px] font-semibold" role="status">{kaiLine}</span>
                    </Card>

                    <Card rise className="flex flex-col gap-3 !p-4">
                        <Prop k="Number"><span className="font-mono text-[13px]">#{item.number}</span></Prop>
                        <Prop k="Type">
                            <select value={item.type} onChange={(e) => patch({ type: e.target.value })} className={selectCls} aria-label="Type">{Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                        </Prop>
                        <Prop k="Status"><span className="font-semibold">{STATUS_LABEL[status]}</span></Prop>
                        <Prop k="Priority">
                            <select value={item.priority} onChange={(e) => patch({ priority: e.target.value })} className={selectCls} aria-label="Priority">{Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                        </Prop>
                        <Prop k="Sector">
                            <input key={item.sector ?? ''} defaultValue={item.sector ?? ''} onBlur={(e) => e.target.value !== (item.sector ?? '') && patch({ sector: e.target.value || null })} aria-label="Sector" className={`${selectCls} w-32 text-right`} />
                        </Prop>
                        <Prop k="Deadline">
                            <input type="date" defaultValue={item.deadline ?? ''} key={item.deadline ?? 'none'} onChange={(e) => patch({ deadline: e.target.value || null })} aria-label="Deadline" className={`${selectCls} font-mono`} />
                        </Prop>
                        <Prop k="Received"><span className="font-mono text-[13px]">{longDay(item.received_at)}</span></Prop>
                        {fields.map((f) => (
                            <Prop key={f.id} k={f.name}>
                                <CustomInput field={f} value={(item.custom ?? {})[String(f.id)]} onSave={(v) => patch({ custom_values: { [f.id]: v } })} />
                            </Prop>
                        ))}
                    </Card>

                    <Card rise className="flex flex-col gap-3 !p-4">
                        <h2 className="text-[15px] font-bold">Linked</h2>
                        <CaseLink record={item.master_record ?? null} cases={cases} onPick={(id) => patch({ master_record_id: id })} />
                        {linked.map((l) => (
                            <div key={l.id} className="flex items-center gap-2 rounded-[10px] border-2 border-paper-3 px-3 py-2 text-sm">
                                <Link href={`/items/${l.id}`} className="grow truncate font-semibold text-ink no-underline"><span className="mr-1.5 font-mono text-xs text-ink-3">#{l.number}</span>{l.title}</Link>
                                <button type="button" aria-label={`Unlink #${l.number}`} onClick={() => unlink(l.id)} className="text-ink-4 hover:text-pink">✕</button>
                            </div>
                        ))}
                        <select aria-label="Link an item" value="" onChange={(e) => e.target.value && link(+e.target.value)} className="min-h-[38px] rounded-lg border-2 border-dashed border-ink bg-transparent px-2 text-sm font-semibold">
                            <option value="">+ Link item</option>
                            {linkable.map((l) => <option key={l.id} value={l.id}>#{l.number} {l.title}</option>)}
                        </select>
                    </Card>
                </aside>
            </div>
        </>
    );
}

const selectCls = 'min-h-0 rounded-md border-0 bg-transparent p-0 pr-6 text-right text-sm font-semibold focus:ring-2 focus:ring-accent';

function CustomInput({ field, value, onSave }: { field: CustomFieldDto; value: string | number | boolean | undefined; onSave: (v: string | number | boolean | null) => void }) {
    const cls = `${selectCls} max-w-[11rem] text-right`;
    const label = field.name;
    if (field.type === 'checkbox') {
        return <input type="checkbox" aria-label={label} checked={value === true} onChange={(e) => onSave(e.target.checked)} className="h-5 w-5 rounded border-2 border-ink text-accent focus:ring-accent" />;
    }
    if (field.type === 'select') {
        return (
            <select aria-label={label} value={typeof value === 'string' ? value : ''} onChange={(e) => onSave(e.target.value || null)} className={cls}>
                <option value="">—</option>
                {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }
    const kind = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
    return (
        <input
            type={kind}
            step={kind === 'number' ? 'any' : undefined}
            aria-label={label}
            key={String(value ?? '')}
            defaultValue={value === undefined ? '' : String(value)}
            onBlur={(e) => { const v = e.target.value.trim(); if (v !== String(value ?? '')) onSave(v === '' ? null : v); }}
            className={`${cls} ${kind !== 'text' ? 'font-mono' : ''}`}
        />
    );
}

function Prop({ k, children }: { k: string; children: ReactNode }) {
    return <div className="flex items-center justify-between gap-3 border-b border-paper-3 pb-2 text-[13px] last:border-b-0 last:pb-0"><span className="text-ink-3">{k}</span>{children}</div>;
}

function CaseLink({ record, cases, onPick }: { record: MasterRecordRef | null; cases: { id: number; code: string; title: string }[]; onPick: (id: number | null) => void }) {
    if (record) {
        return (
            <div className="flex flex-col gap-0.5 rounded-xl border-2 border-ink bg-sun-soft p-3">
                <span className="font-mono text-[11px] tracking-wider">MASTER RECORD · CASE</span>
                <Link href={`/master-records/${record.id}`} className="text-sm font-bold text-ink no-underline">{record.code} · {record.title}</Link>
                <span className="text-xs text-ink-3">{record.session_date ? `Exam session ${shortDay(record.session_date)}` : 'No session date'}{record.student_count != null ? ` · ${record.student_count} students` : ''}</span>
                <button type="button" onClick={() => onPick(null)} className="self-start text-xs font-semibold text-accent-ink">Unlink case</button>
            </div>
        );
    }
    return (
        <select aria-label="Link a master record case" value="" onChange={(e) => e.target.value && onPick(+e.target.value)} className="min-h-[38px] rounded-lg border-2 border-dashed border-ink bg-transparent px-2 text-sm font-semibold">
            <option value="">+ Link case</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
        </select>
    );
}

Show.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;