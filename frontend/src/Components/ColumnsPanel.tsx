import * as Dialog from '@radix-ui/react-dialog';
import { router } from '@/runtime';
import { useEffect, useState, type FormEvent } from 'react';
import Button from '@/Components/ui/Button';
import { useToast } from '@/Components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { allColumns, customKey, moveColumn, parseOptions, toggleColumn, TYPE_LABELS, type CustomFieldDto, type FieldType } from '@/lib/columns';

interface Props {
    selected: string[];
    fields: CustomFieldDto[];
}

const REFRESH = ['items', 'fields', 'columns'];

/** Side panel: choose which columns the table shows (and their order) and manage custom fields. */
export default function ColumnsPanel({ selected, fields }: Props) {
    const toast = useToast();
    const [sel, setSel] = useState(selected);
    const [name, setName] = useState('');
    const [type, setType] = useState<FieldType>('text');
    const [options, setOptions] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    useEffect(() => setSel(selected), [selected]);

    const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Something went wrong.');
    const defs = allColumns(fields);
    const label = (key: string) => defs.find((d) => d.key === key)?.label ?? key;
    const hidden = defs.filter((d) => !sel.includes(d.key));

    async function save(next: string[]) {
        const before = sel;
        setSel(next); // optimistic
        try {
            await api('PUT', '/preferences/items-columns', { columns: next });
            router.reload({ only: ['columns'] });
        } catch (e) {
            setSel(before);
            fail(e);
        }
    }

    async function addField(e: FormEvent) {
        e.preventDefault();
        try {
            await api('POST', '/custom-fields', { name: name.trim(), type, options: type === 'select' ? parseOptions(options) : null });
            setName(''); setOptions(''); setType('text');
            router.reload({ only: REFRESH });
            toast('Field added. It is now a column.');
        } catch (err) { fail(err); }
    }

    async function patchField(f: CustomFieldDto, data: Record<string, unknown>) {
        try { await api('PATCH', `/custom-fields/${f.id}`, data); router.reload({ only: REFRESH }); } catch (err) { fail(err); }
    }

    async function removeField(f: CustomFieldDto) {
        try { await api('DELETE', `/custom-fields/${f.id}`); setConfirmDelete(null); router.reload({ only: REFRESH }); toast(`"${f.name}" removed.`); } catch (err) { fail(err); }
    }

    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button type="button" className="inline-flex min-h-[42px] items-center gap-2 rounded-[10px] border-2 border-ink bg-white px-3.5 text-[13px] font-bold shadow-hard-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h6M18 14v8M14 18h8" /></svg>
                    Columns
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-5 overflow-y-auto border-l-2.5 border-ink bg-paper p-6 shadow-hard-lg">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <Dialog.Title className="font-display text-2xl">Columns</Dialog.Title>
                            <Dialog.Description className="mt-1 text-sm text-ink-3">Show, hide and reorder what the table displays. Saved for you.</Dialog.Description>
                        </div>
                        <Dialog.Close className="rounded-lg border-2 border-ink bg-white px-2.5 py-1 text-sm font-bold" aria-label="Close">✕</Dialog.Close>
                    </div>

                    <section aria-label="Visible columns" className="flex flex-col gap-1.5">
                        <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Shown, in order</h3>
                        {sel.map((key, i) => (
                            <div key={key} className="flex items-center gap-2 rounded-[10px] border-2 border-ink bg-white px-3 py-2">
                                <input type="checkbox" checked disabled={key === 'title'} onChange={() => save(toggleColumn(sel, key))} aria-label={`Show ${label(key)}`} className="h-4 w-4 rounded border-2 border-ink text-accent focus:ring-2 focus:ring-accent" />
                                <span className="grow text-sm font-semibold">{label(key)}{key === 'title' && <span className="ml-2 text-xs font-normal text-ink-3">always shown</span>}</span>
                                <button type="button" disabled={i === 0} onClick={() => save(moveColumn(sel, key, -1))} aria-label={`Move ${label(key)} up`} className="rounded px-1.5 text-ink-3 enabled:hover:text-ink disabled:opacity-30">↑</button>
                                <button type="button" disabled={i === sel.length - 1} onClick={() => save(moveColumn(sel, key, 1))} aria-label={`Move ${label(key)} down`} className="rounded px-1.5 text-ink-3 enabled:hover:text-ink disabled:opacity-30">↓</button>
                            </div>
                        ))}
                    </section>

                    {hidden.length > 0 && (
                        <section aria-label="Hidden columns" className="flex flex-col gap-1.5">
                            <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Hidden</h3>
                            {hidden.map((d) => (
                                <label key={d.key} className="flex cursor-pointer items-center gap-2 rounded-[10px] border-2 border-dashed border-ink px-3 py-2">
                                    <input type="checkbox" checked={false} onChange={() => save(toggleColumn(sel, d.key))} aria-label={`Show ${d.label}`} className="h-4 w-4 rounded border-2 border-ink text-accent focus:ring-accent" />
                                    <span className="grow text-sm font-semibold text-ink-2">{d.label}</span>
                                    {d.custom && <span className="text-xs text-ink-3">{TYPE_LABELS[d.custom.type]}</span>}
                                </label>
                            ))}
                        </section>
                    )}

                    <section aria-label="Custom fields" className="flex flex-col gap-2.5 rounded-2xl border-2.5 border-ink bg-white p-4 shadow-hard-md">
                        <h3 className="text-[15px] font-bold">Custom fields</h3>
                        {fields.length === 0 && <p className="text-sm text-ink-3">None yet. Add things like Client, Amount, Stage or Billed below.</p>}
                        {fields.map((f) => (
                            <div key={f.id} className="flex flex-col gap-1.5 rounded-xl border-2 border-paper-3 p-2.5">
                                <div className="flex items-center gap-2">
                                    <input defaultValue={f.name} aria-label={`Name of ${f.name}`} onBlur={(e) => e.target.value.trim() && e.target.value !== f.name && patchField(f, { name: e.target.value.trim(), options: f.options })} className="min-h-9 min-w-0 grow rounded-lg border-2 border-ink px-2 text-sm font-semibold focus:ring-accent" />
                                    <span className="rounded-md bg-paper-2 px-2 py-1 text-xs font-semibold">{TYPE_LABELS[f.type]}</span>
                                    {confirmDelete === f.id ? (
                                        <button type="button" onClick={() => removeField(f)} className="rounded-lg border-2 border-ink bg-pink px-2 py-1 text-xs font-bold">Delete?</button>
                                    ) : (
                                        <button type="button" onClick={() => setConfirmDelete(f.id)} aria-label={`Delete ${f.name}`} className="px-1 text-ink-4 hover:text-pink">✕</button>
                                    )}
                                </div>
                                {f.type === 'select' && (
                                    <input defaultValue={f.options.join(', ')} aria-label={`Options for ${f.name}`} placeholder="Options, comma separated" onBlur={(e) => { const o = parseOptions(e.target.value); if (o.length && o.join() !== f.options.join()) patchField(f, { name: f.name, options: o }); }} className="min-h-9 rounded-lg border-2 border-paper-3 px-2 text-sm focus:border-ink focus:ring-accent" />
                                )}
                            </div>
                        ))}

                        <form onSubmit={addField} className="mt-1 flex flex-col gap-2 border-t-2 border-dashed border-paper-3 pt-3">
                            <span className="text-[13px] font-bold">Add a field</span>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Client" aria-label="New field name" maxLength={60} required className="min-h-10 rounded-[10px] border-2 border-ink px-3 text-sm focus:ring-accent" />
                            <select value={type} onChange={(e) => setType(e.target.value as FieldType)} aria-label="New field type" className="min-h-10 rounded-[10px] border-2 border-ink bg-white px-3 text-sm font-semibold focus:ring-accent">
                                {(Object.keys(TYPE_LABELS) as FieldType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                            </select>
                            {type === 'select' && <input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Options, comma separated" aria-label="New field options" required className="min-h-10 rounded-[10px] border-2 border-ink px-3 text-sm focus:ring-accent" />}
                            <Button type="submit" disabled={!name.trim()}>Add field</Button>
                        </form>
                    </section>

                    <Button variant="outline" onClick={() => save(['number', 'title', 'type', 'status', 'priority', 'sector', 'deadline', 'reward', ...fields.map((f) => customKey(f.id))])}>Reset to default</Button>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
