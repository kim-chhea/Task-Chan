import { Head, Link, useForm } from '@/runtime';
import type { FormEvent, ReactNode } from 'react';
import EmptyState from '@/Components/EmberEmpty';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import AppLayout, { PageHeader } from '@/Layouts/AppLayout';
import { longDay } from '@/lib/format';

interface Rec { id: number; code: string; title: string; session_date: string | null; student_count: number | null; items_count: number }

export default function Index({ records }: { records: Rec[] }) {
    const f = useForm({ code: '', title: '', session_date: '', student_count: '', notes: '' });
    const submit = (e: FormEvent) => { e.preventDefault(); f.post('/master-records', { onSuccess: () => f.reset() }); };

    return (
        <>
            <Head title="Master record" />
            <PageHeader eyebrow="Cases · exam sessions" title="Master record" />
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="rise overflow-x-auto rounded-[18px] border-2.5 border-ink bg-white shadow-hard">
                    <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="border-b-2.5 border-ink bg-paper-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                            <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Session</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Items</th></tr>
                        </thead>
                        <tbody>
                            {records.map((r) => (
                                <tr key={r.id} className="border-b border-paper-3 last:border-0">
                                    <td className="px-4 py-3 font-mono"><Link href={`/master-records/${r.id}`} className="font-semibold">{r.code}</Link></td>
                                    <td className="px-4 py-3 font-semibold">{r.title}</td>
                                    <td className="px-4 py-3 text-ink-2">{longDay(r.session_date)}</td>
                                    <td className="px-4 py-3 font-mono">{r.student_count ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono">{r.items_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {records.length === 0 && <EmptyState>No cases yet. Add one on the right.</EmptyState>}
                </div>

                <Card rise>
                    <form onSubmit={submit} className="flex flex-col gap-3">
                        <h2 className="text-[15px] font-bold">New case</h2>
                        <Field label="Code" error={f.errors.code}><input value={f.data.code} onChange={(e) => f.setData('code', e.target.value)} placeholder="MR-032" className={inp} required /></Field>
                        <Field label="Title" error={f.errors.title}><input value={f.data.title} onChange={(e) => f.setData('title', e.target.value)} className={inp} required /></Field>
                        <Field label="Session date" error={f.errors.session_date}><input type="date" value={f.data.session_date} onChange={(e) => f.setData('session_date', e.target.value)} className={inp} /></Field>
                        <Field label="Students" error={f.errors.student_count}><input type="number" min={0} value={f.data.student_count} onChange={(e) => f.setData('student_count', e.target.value)} className={inp} /></Field>
                        <Button type="submit" disabled={f.processing}>Add case</Button>
                    </form>
                </Card>
            </div>
        </>
    );
}

export const inp = 'min-h-[42px] w-full rounded-[10px] border-2 border-ink bg-white px-3 text-sm focus:border-ink focus:ring-2 focus:ring-accent';

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
            {label}
            {children}
            {error && <span className="text-xs font-semibold text-[#C2185B]" role="alert">{error}</span>}
        </label>
    );
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;