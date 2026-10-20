import { router, usePage } from '@/runtime';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/ui/Button';
import { useToast } from '@/Components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { PRIORITY_LABEL, TYPE_LABEL, longDay, todayIso } from '@/lib/format';
import { rewardPreview } from '@/lib/tokens';
import type { ItemType, PageProps, Priority } from '@/types';

const TYPES: ItemType[] = ['task', 'ticket', 'request', 'meeting'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

/** yyyy-mm-dd, `days` after today (Bangkok). */
function inDays(days: number): string {
    const d = new Date(`${todayIso()}T12:00:00+07:00`);
    d.setDate(d.getDate() + days);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
}

const QUICK_DATES: { label: string; days: number | null }[] = [
    { label: 'Today', days: 0 },
    { label: 'Tomorrow', days: 1 },
    { label: 'In 3 days', days: 3 },
    { label: 'Next week', days: 7 },
    { label: 'No date', days: null },
];

const field = 'min-h-[46px] w-full rounded-[11px] border-2 border-ink bg-white px-3.5 text-base text-ink focus:border-accent focus:outline-hidden focus:ring-0';
const choice = (on: boolean) =>
    `min-h-[42px] rounded-[10px] border-2 border-ink px-3.5 text-sm font-bold transition ${on ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-paper-2'}`;

export default function NewItemModal({ show, onClose }: { show: boolean; onClose: () => void }) {
    const toast = useToast();
    const { rules } = usePage<PageProps>().props;
    const [title, setTitle] = useState('');
    const [type, setType] = useState<ItemType>('task');
    const [priority, setPriority] = useState<Priority>('medium');
    const [deadline, setDeadline] = useState<string>('');
    const [sector, setSector] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (show) {
            setError(null);
            window.setTimeout(() => titleRef.current?.focus(), 50);
        }
    }, [show]);

    const reward = rewardPreview(rules, priority, deadline || null, todayIso());

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!title.trim()) return setError('Give the item a title.');
        setBusy(true);
        setError(null);
        try {
            await api('POST', '/items', {
                title: title.trim(),
                type,
                priority,
                deadline: deadline || null,
                sector: sector.trim() || null,
            });
            toast(`Added “${title.trim()}”${deadline ? `, due ${longDay(deadline)}` : ''}.`);
            setTitle('');
            setSector('');
            setDeadline('');
            onClose();
            void router.reload();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not add the item. Try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={submit} className="flex flex-col gap-5 p-6">
                <div className="flex items-start justify-between gap-4">
                    <h2 className="font-display text-2xl">New item</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="min-h-9 min-w-9 rounded-lg text-xl font-bold text-ink-3 hover:bg-paper-2">×</button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="ni-title" className="text-sm font-bold">What needs doing?</label>
                    <input id="ni-title" ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reply to the DGB ticket" maxLength={255} autoComplete="off" className={field} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Type</span>
                    <div role="group" aria-label="Type" className="flex flex-wrap gap-2">
                        {TYPES.map((t) => (
                            <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={choice(type === t)}>{TYPE_LABEL[t]}</button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Priority</span>
                    <div role="group" aria-label="Priority" className="flex flex-wrap gap-2">
                        {PRIORITIES.map((p) => (
                            <button key={p} type="button" aria-pressed={priority === p} onClick={() => setPriority(p)} className={choice(priority === p)}>
                                {PRIORITY_LABEL[p]} <span className="font-mono text-xs opacity-70">+{rules.rewards[p]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor="ni-due" className="text-sm font-bold">Due date <span className="font-normal text-ink-3">(optional)</span></label>
                    <input id="ni-due" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${field} font-mono`} />
                    <div className="flex flex-wrap gap-2" aria-label="Quick dates">
                        {QUICK_DATES.map((q) => {
                            const value = q.days === null ? '' : inDays(q.days);
                            return (
                                <button key={q.label} type="button" onClick={() => setDeadline(value)} aria-pressed={deadline === value} className={`${choice(deadline === value)} !min-h-[36px] !px-3 !text-[13px]`}>
                                    {q.label}
                                </button>
                            );
                        })}
                    </div>
                    {deadline && <p className="text-[13px] text-ink-3">Due {longDay(deadline)}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="ni-sector" className="text-sm font-bold">Sector <span className="font-normal text-ink-3">(optional)</span></label>
                    <input id="ni-sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. DGB" maxLength={80} className={field} />
                </div>

                <p className="rounded-xl bg-sun-soft px-3.5 py-2.5 text-[13px] font-semibold">
                    Finish it{deadline ? ' on time' : ''} and earn <span className="font-mono">+{reward.total}</span> tokens
                    {!deadline && ' (add a due date for +' + rules.early_bonus + ' bonus)'}.
                </p>

                {error && <p role="alert" className="text-sm font-semibold text-[#C2185B]">{error}</p>}

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add item'}</Button>
                </div>
            </form>
        </Modal>
    );
}
