import { Head, Link, router, useForm } from '@/runtime';
import type { FormEvent, ReactNode } from 'react';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import { TypeChip } from '@/Components/ui/Chip';
import AppLayout from '@/Layouts/AppLayout';
import { shortDay, STATUS_LABEL } from '@/lib/format';
import type { ItemDto } from '@/types';
import { Field, inp } from './Index';

interface Rec { id: number; code: string; title: string; session_date: string | null; student_count: number | null; notes: string | null }

export default function Show({ record, items }: { record: Rec; items: ItemDto[] }) {
    const f = useForm({ code: record.code, title: record.title, session_date: record.session_date ?? '', student_count: record.student_count?.toString() ?? '', notes: record.notes ?? '' });
    const save = (e: FormEvent) => { e.preventDefault(); f.patch(`/master-records/${record.id}`, { preserveScroll: true }); };

    return (
        <>
            <Head title={`${record.code} ${record.title}`} />
            <nav aria-label="Breadcrumb" className="rise flex items-center gap-2 text-[13px] font-semibold text-ink-3">
                <Link href="/master-records" className="text-accent-ink">Master record</Link><span aria-hidden="true">/</span><span className="font-mono">{record.code}</span>
            </nav>
            <h1 className="font-display text-[32px] font-normal leading-tight md:text-[44px]">{record.code} · {record.title}</h1>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <Card rise className="flex flex-col gap-3">
                    <h2 className="text-[15px] font-bold">Linked items ×{items.length}</h2>
                    {items.length === 0 && <p className="text-sm text-ink-3">No items linked yet. Link one from an item page.</p>}
                    {items.map((i) => (
                        <Link key={i.id} href={`/items/${i.id}`} className="row-hover grid grid-cols-[48px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border-2 border-paper-3 bg-white px-3 py-2.5 text-ink no-underline">
                            <span className="font-mono text-xs text-ink-3">#{i.number}</span>
                            <span className={`truncate font-semibold ${i.done ? 'text-ink-4 line-through' : ''}`}>{i.title}</span>
                            <TypeChip type={i.type} />
                            <span className="text-xs font-bold text-ink-3">{i.done ? STATUS_LABEL.done : shortDay(i.deadline)}</span>
                        </Link>
                    ))}
                </Card>

                <Card rise tone="soft-yellow">
                    <form onSubmit={save} className="flex flex-col gap-3">
                        <h2 className="text-[15px] font-bold">Details</h2>
                        <Field label="Code" error={f.errors.code}><input value={f.data.code} onChange={(e) => f.setData('code', e.target.value)} className={inp} /></Field>
                        <Field label="Title" error={f.errors.title}><input value={f.data.title} onChange={(e) => f.setData('title', e.target.value)} className={inp} /></Field>
                        <Field label="Session date" error={f.errors.session_date}><input type="date" value={f.data.session_date} onChange={(e) => f.setData('session_date', e.target.value)} className={inp} /></Field>
                        <Field label="Students" error={f.errors.student_count}><input type="number" min={0} value={f.data.student_count} onChange={(e) => f.setData('student_count', e.target.value)} className={inp} /></Field>
                        <Field label="Notes" error={f.errors.notes}><textarea rows={4} value={f.data.notes} onChange={(e) => f.setData('notes', e.target.value)} className={`${inp} py-2`} /></Field>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={f.processing}>Save</Button>
                            <ConfirmDialog
                                trigger={<Button variant="dashed">Delete</Button>}
                                title={`Delete ${record.code}?`}
                                body="The case is removed. Items linked to it stay, just unlinked."
                                confirmLabel="Delete case"
                                onConfirm={() => router.delete(`/master-records/${record.id}`)}
                            />
                        </div>
                    </form>
                </Card>
            </div>
        </>
    );
}

Show.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;