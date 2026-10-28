/** Columns GET /api/items accepts. Reward and custom fields are not sortable in v1. */
export const ITEM_SORTS = ['number', 'title', 'type', 'status', 'priority', 'sector', 'deadline', 'received_at'] as const;

export type ItemSort = (typeof ITEM_SORTS)[number];
export type SortDir = 'asc' | 'desc';

const SORTABLE = new Set<string>(ITEM_SORTS);

export function isSortableColumn(key: string): boolean {
    return SORTABLE.has(key);
}

/** `sort` / `dir` as the API echoes them. A set sort with no direction is ascending. */
export function readItemSort(sort?: string | null, dir?: string | null): { sort: string | null; dir: SortDir | null } {
    if (!sort || !isSortableColumn(sort)) return { sort: null, dir: null };
    return { sort, dir: dir === 'desc' ? 'desc' : 'asc' };
}

/**
 * Header click cycle. The first click on a column is always ascending,
 * the next flips direction, and the one after that clears back to the default order.
 */
export function nextHeaderSort(sort: string | null, dir: SortDir | null, key: string): { sort: string | null; dir: SortDir | null } {
    if (sort !== key) return { sort: key, dir: 'asc' };
    if (dir === 'desc') return { sort: null, dir: null };
    return { sort: key, dir: 'desc' };
}
