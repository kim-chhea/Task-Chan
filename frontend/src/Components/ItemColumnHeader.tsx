import type { ColumnDef } from '@/lib/columns';
import { isSortableColumn, type SortDir } from '@/lib/itemSort';

function SortMark({ dir }: { dir: SortDir }) {
    return (
        <span
            aria-hidden="true"
            data-sort-dir={dir}
            className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border-2 border-ink bg-sun text-ink"
        >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                {dir === 'asc' ? <path d="M4 1.1 7.2 6.4H.8L4 1.1Z" /> : <path d="M4 6.9.8 1.6h6.4L4 6.9Z" />}
            </svg>
        </span>
    );
}

/** One All-items column heading. Sortable columns cycle asc → desc → default. */
export default function ItemColumnHeader({
    col,
    sort,
    dir,
    onSort,
}: {
    col: ColumnDef;
    sort: string | null;
    dir: SortDir | null;
    onSort: (key: string) => void;
}) {
    if (col.custom || !isSortableColumn(col.key)) {
        return (
            <span role="columnheader" className="min-w-0 truncate">
                {col.label}
            </span>
        );
    }

    const direction: SortDir | null = sort === col.key ? (dir === 'desc' ? 'desc' : 'asc') : null;
    const ariaSort = direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';

    return (
        <button
            type="button"
            role="columnheader"
            aria-sort={ariaSort}
            onClick={() => onSort(col.key)}
            className={`flex h-full min-w-0 items-center gap-1.5 whitespace-nowrap border-0 bg-transparent p-0 text-left font-mono text-[11px] uppercase tracking-wider appearance-none ${
                direction ? 'font-bold text-ink' : 'text-ink-3 hover:text-ink'
            }`}
        >
            <span className="min-w-0 truncate">{col.label}</span>
            {direction && <SortMark dir={direction} />}
        </button>
    );
}
