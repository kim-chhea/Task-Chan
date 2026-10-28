import { useRef, useState, type FormEvent } from 'react';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import { shortDay, todayIso } from '@/lib/format';
import { TASK_LINE_LIMIT, TaskLineError, taskLinePayload } from '@/lib/taskLines';
import { daysFromToday } from '@/lib/triage';
import type { TaskLinePayload } from '@/types';

const PRESETS: { label: string; days: number | null }[] = [
    { label: 'Today', days: 0 },
    { label: 'Tomorrow', days: 1 },
    { label: 'Next week', days: 7 },
    { label: 'No date', days: null },
];

const field = 'min-h-[42px] w-full rounded-[10px] border-2 border-ink bg-white px-3 text-sm focus:border-ink focus:ring-2 focus:ring-accent';
const chip = (on: boolean) =>
    `min-h-[36px] rounded-lg border-2 border-ink px-3 text-[13px] font-bold ${on ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-sun-soft'}`;

interface Row {
    key: number;
    title: string;
    deadline: string;
}

interface Props {
    /** Accessible name for the card, e.g. "Follow-ups". */
    name: string;
    eyebrow: string;
    heading: string;
    hint: string;
    submitLabel: string;
    pendingLabel: string;
    /** Used in field labels: "follow-up" → "Follow-up 1 title". */
    lineNoun: string;
    onSubmit: (payload: TaskLinePayload) => Promise<void>;
}

function nounLabel(noun: string, index: number, fieldName: string) {
    return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${index + 1} ${fieldName}`;
}

/**
 * Shared title + optional date editor for meeting follow-ups and case spawn.
 * Lines stack on small screens. A blank date is Inbox; a date is scheduled.
 */
export default function TaskLinesForm({ name, eyebrow, heading, hint, submitLabel, pendingLabel, lineNoun, onSubmit }: Props) {
    const nextKey = useRef(2);
    const blank = (): Row => ({ key: ++nextKey.current, title: '', deadline: '' });
    const [rows, setRows] = useState<Row[]>([
        { key: 1, title: '', deadline: '' },
        { key: 2, title: '', deadline: '' },
    ]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const ready = rows.some((row) => row.title.trim() !== '');

    const patch = (key: number, next: Partial<Pick<Row, 'title' | 'deadline'>>) => {
        setRows((current) => current.map((row) => (row.key === key ? { ...row, ...next } : row)));
    };

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (busy) return;
        let payload: TaskLinePayload;
        try {
            payload = taskLinePayload(rows);
        } catch (err) {
            setError(err instanceof TaskLineError ? err.message : 'Check the lines and try again.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSubmit(payload);
            setRows([blank(), blank()]);
        } catch (err) {
            if (err instanceof TaskLineError) setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card rise role="region" aria-label={name} className="flex flex-col gap-3 !p-5">
            <form onSubmit={submit} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs uppercase tracking-wider text-ink-3">{eyebrow}</span>
                        <h2 className="text-base font-bold">{heading}</h2>
                    </div>
                    <span className="font-mono text-[13px] text-ink-3">{rows.length}/{TASK_LINE_LIMIT}</span>
                </div>
                <p className="text-[13px] font-medium text-ink-2">{hint}</p>

                <div className="flex flex-col gap-3">
                    {rows.map((row, index) => {
                        const landing = row.deadline ? `Due ${shortDay(row.deadline)} · Today and the calendar` : 'No date · Inbox';
                        return (
                            <div key={row.key} data-line="" className="flex flex-col gap-2 rounded-xl border-2 border-paper-3 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Line {index + 1}</span>
                                    <button
                                        type="button"
                                        aria-label={`Remove ${lineNoun} ${index + 1}`}
                                        disabled={rows.length === 1}
                                        onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-base text-ink-3 hover:text-pink disabled:opacity-40"
                                    >
                                        <span aria-hidden="true">✕</span>
                                    </button>
                                </div>
                                <input
                                    aria-label={nounLabel(lineNoun, index, 'title')}
                                    value={row.title}
                                    onChange={(e) => patch(row.key, { title: e.target.value })}
                                    placeholder={index === 0 ? 'e.g. Send notes to class' : 'Another task'}
                                    maxLength={255}
                                    autoComplete="off"
                                    className={field}
                                />
                                <input
                                    type="date"
                                    aria-label={nounLabel(lineNoun, index, 'date')}
                                    value={row.deadline}
                                    onChange={(e) => patch(row.key, { deadline: e.target.value })}
                                    className={`${field} font-mono sm:max-w-48`}
                                />
                                <div className="flex flex-wrap items-center gap-2" aria-label={`Dates for ${lineNoun} ${index + 1}`}>
                                    {PRESETS.map((preset) => {
                                        const value = preset.days === null ? '' : daysFromToday(preset.days, todayIso());
                                        return (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                aria-label={`${preset.label} for ${lineNoun} ${index + 1}`}
                                                aria-pressed={row.deadline === value}
                                                onClick={() => patch(row.key, { deadline: value })}
                                                className={chip(row.deadline === value)}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs font-semibold text-ink-3">{landing}</p>
                            </div>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => setRows((current) => (current.length >= TASK_LINE_LIMIT ? current : [...current, blank()]))}
                    disabled={rows.length >= TASK_LINE_LIMIT}
                    className="self-start text-sm font-bold text-accent-ink disabled:opacity-50"
                >
                    + Add line
                </button>

                {error && <p role="alert" className="text-sm font-semibold text-[#C2185B]">{error}</p>}

                <div className="flex justify-end">
                    <Button type="submit" disabled={busy || !ready}>{busy ? pendingLabel : submitLabel}</Button>
                </div>
            </form>
        </Card>
    );
}
