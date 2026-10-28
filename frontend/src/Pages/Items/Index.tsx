import { Head, Link, router } from '@/runtime';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ColumnsPanel from '@/Components/ColumnsPanel';
import EmptyState from '@/Components/EmberEmpty';
import ItemColumnHeader from '@/Components/ItemColumnHeader';
import { FilterChip, TypeChip } from '@/Components/ui/Chip';
import { Coin } from '@/Components/ui/TokenPill';
import AppLayout, { PageHeader } from '@/Layouts/AppLayout';
import { formatCustom, gridTemplate, minTableWidth, resolveColumns, type ColumnDef, type CustomFieldDto } from '@/lib/columns';
import { PRIORITY_LABEL, STATUS_LABEL, shortDay } from '@/lib/format';
import { isSortableColumn, nextHeaderSort, readItemSort, type SortDir } from '@/lib/itemSort';
import { openNewItem } from '@/lib/newItem';
import type { ItemDto } from '@/types';

export interface ItemFilters {
    status: string;
    type: string;
    sector: string;
    range: string;
    q: string;
    sort: string | null;
    dir: SortDir | null;
}

interface Props {
    items: ItemDto[];
    filters: {
        status: string;
        type: string;
        sector: string;
        range: string;
        q?: string | null;
        sort?: string | null;
        dir?: string | null;
    };
    total: number;
    matched: number;
    openTokens: number;
    sectors: string[];
    fields: CustomFieldDto[];
    columns: string[];
}

const STATUS_TABS: [string, string][] = [['all', 'All'], ['not_started', 'Not started'], ['in_progress', 'In progress'], ['done', 'Done']];
const TYPES: [string, string][] = [['all', 'All types'], ['ticket', 'Ticket'], ['request', 'Request'], ['meeting', 'Meeting'], ['task', 'Task']];

const STATUS_STYLE: Record<string, string> = {
    in_progress: 'bg-accent text-white',
    done: 'bg-mint text-ink',
    not_started: 'bg-white text-ink',
};
const PRIO_STYLE: Record<string, string> = {
    high: 'bg-pink text-ink -rotate-2',
    medium: 'bg-sun text-ink',
    low: 'bg-[#ECEDF3] text-ink-2',
};

function Cell({ col, r }: { col: ColumnDef; r: ItemDto }) {
    switch (col.key) {
        case 'number':
            return <span className="font-mono text-xs text-ink-3">#{r.number}</span>;
        case 'title':
            return <span className={`truncate font-semibold ${r.done ? 'text-ink-4 line-through' : ''}`}>{r.title}</span>;
        case 'type':
            return <span><TypeChip type={r.type} /></span>;
        case 'status':
            return <span><span className={`inline-block rounded-lg border-2 border-ink px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span></span>;
        case 'priority':
            return <span><span className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-bold ${PRIO_STYLE[r.priority]}`}>{PRIORITY_LABEL[r.priority]}</span></span>;
        case 'sector':
            return <span className="truncate text-ink-2">{r.sector ?? '—'}</span>;
        case 'deadline':
            return <span className="text-[13px] text-ink-2">{shortDay(r.deadline)}</span>;
        case 'received_at':
            return <span className="text-[13px] text-ink-2">{shortDay(r.received_at)}</span>;
        case 'reward':
            return <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${r.done ? 'text-mint-ink' : ''}`}><Coin size={14} />{r.done ? '✓ ' : '+'}{r.reward}</span>;
        default:
            return <span className="truncate text-[13px] text-ink-2">{col.custom ? formatCustom(col.custom, (r.custom ?? {})[String(col.custom.id)]) : ''}</span>;
    }
}

const VISIT = { preserveState: true, preserveScroll: true, replace: true, only: ['items', 'filters'] };

export default function Index({ items, filters: incoming, total, matched, openTokens, sectors, fields, columns }: Props) {
    const sortState = readItemSort(incoming.sort, incoming.dir);
    const filters: ItemFilters = {
        status: incoming.status,
        type: incoming.type,
        sector: incoming.sector,
        range: incoming.range,
        q: incoming.q ?? '',
        sort: sortState.sort,
        dir: sortState.dir,
    };
    const filtersRef = useRef(filters);
    filtersRef.current = filters;
    const applied = useRef(filters.q);
    const timer = useRef<number | undefined>(undefined);
    const [text, setText] = useState(filters.q);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const off = [router.on('start', () => setLoading(true)), router.on('finish', () => setLoading(false))];
        return () => off.forEach((f) => f());
    }, []);

    // Back/forward (or the API echoing q) wins over a draft the user already sent.
    useEffect(() => {
        if (filters.q === applied.current) return;
        window.clearTimeout(timer.current);
        applied.current = filters.q;
        setText(filters.q);
    }, [filters.q]);

    useEffect(() => {
        const next = text.trim().slice(0, 100);
        if (next === applied.current) return;
        timer.current = window.setTimeout(() => {
            applied.current = next;
            setText(next);
            router.get('/items', { ...filtersRef.current, q: next }, VISIT);
        }, 300);
        return () => window.clearTimeout(timer.current);
    }, [text]);

    const cols = useMemo(() => resolveColumns(columns, fields), [columns, fields]);
    const grid = gridTemplate(cols);
    const showSector = cols.some((c) => c.key === 'sector');

    const go = (patch: Partial<ItemFilters>) => {
        window.clearTimeout(timer.current);
        const q = (patch.q !== undefined ? patch.q : text).trim().slice(0, 100);
        applied.current = q;
        setText(q);
        router.get('/items', { ...filtersRef.current, ...patch, q }, VISIT);
    };

    const sortBy = (key: string) => {
        if (!isSortableColumn(key)) return;
        go(nextHeaderSort(filters.sort, filters.dir, key));
    };

    const clearSearch = () => go({ q: '' });

    return (
        <>
            <Head title="All items" />
            <PageHeader eyebrow={`Organize · ${items.length} of ${total} items · ${openTokens} tokens up for grabs`} title="All items">
                <div className="flex flex-wrap gap-3">
                    <ColumnsPanel selected={columns} fields={fields} />
                    <button type="button" onClick={openNewItem} className="inline-flex min-h-[46px] items-center rounded-[11px] border-2 border-ink bg-accent px-5 text-sm font-bold text-white shadow-hard-sm">+ New item</button>
                </div>
            </PageHeader>

            <div className="rise relative flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center" style={{ animationDelay: '0.1s' }}>
                <div role="group" aria-label="Status" className="inline-flex rounded-[11px] border-2 border-ink bg-white p-1">
                    {STATUS_TABS.map(([k, label]) => (
                        <button key={k} type="button" aria-pressed={filters.status === k} onClick={() => go({ status: k })} className={`min-h-9 rounded-lg px-3.5 text-[13px] font-bold ${filters.status === k ? 'bg-ink text-white' : 'text-ink-2'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-72">
                    <label htmlFor="item-search" className="sr-only">Search items</label>
                    <input
                        id="item-search"
                        type="search"
                        value={text}
                        maxLength={100}
                        autoComplete="off"
                        placeholder="Search items"
                        onChange={(e) => setText(e.target.value.slice(0, 100))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                go({ q: text });
                            }
                        }}
                        className={`min-h-[42px] w-full rounded-[10px] border-2 border-ink bg-white py-0 pl-3 text-[13px] font-bold text-ink placeholder:font-semibold placeholder:text-ink-3 focus:border-ink focus:ring-2 focus:ring-accent [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${text ? 'pr-12' : 'pr-3'}`}
                    />
                    {text !== '' && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={clearSearch}
                            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border-2 border-ink bg-paper text-sm font-bold leading-none text-ink"
                        >
                            ×
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
                    {TYPES.map(([k, label]) => (
                        <FilterChip key={k} on={filters.type === k} onClick={() => go({ type: k })}>{label}</FilterChip>
                    ))}
                </div>
                <div className="ml-auto flex gap-2">
                    {showSector && (
                        <>
                            <label className="sr-only" htmlFor="sector">Sector</label>
                            <select id="sector" value={filters.sector} onChange={(e) => go({ sector: e.target.value })} className="min-h-[42px] rounded-[10px] border-2 border-ink bg-white py-0 pl-3 pr-8 text-[13px] font-bold">
                                <option value="all">Sector: Any</option>
                                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </>
                    )}
                    <FilterChip on={filters.range === '30'} onClick={() => go({ range: filters.range === '30' ? 'all' : '30' })}>Next 30 days</FilterChip>
                </div>
            </div>

            <div aria-busy={loading} className={`rise relative overflow-x-auto rounded-[18px] border-2.5 border-ink bg-white shadow-hard transition-opacity ${loading ? 'opacity-60' : ''}`} style={{ animationDelay: '0.15s' }}>
                <div style={{ minWidth: minTableWidth(cols) }}>
                    <div role="row" className="grid items-center gap-3 border-b-2.5 border-ink bg-paper-2 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-3" style={{ gridTemplateColumns: grid }}>
                        {cols.map((c) => (
                            <ItemColumnHeader key={c.key} col={c} sort={filters.sort} dir={filters.dir} onSort={sortBy} />
                        ))}
                    </div>
                    {items.map((r, i) => (
                        <Link key={r.id} href={`/items/${r.id}`} className="row-hover rise grid min-h-[58px] items-center gap-3 border-b border-paper-3 px-4 text-sm text-ink no-underline last:border-b-0" style={{ gridTemplateColumns: grid, animationDelay: `${0.15 + Math.min(i, 12) * 0.04}s` }}>
                            {cols.map((c) => <Cell key={c.key} col={c} r={r} />)}
                        </Link>
                    ))}
                    {items.length === 0 && (
                        filters.q.trim()
                            ? <EmptyState>{`No matches for “${filters.q.trim()}”.`}</EmptyState>
                            : <EmptyState />
                    )}
                    {matched > items.length && <p className="border-t border-paper-3 px-4 py-3 text-[13px] font-semibold text-ink-3" role="status">Showing the newest {items.length} of {matched}. Use the filters to narrow the list.</p>}
                </div>
            </div>
        </>
    );
}

Index.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
