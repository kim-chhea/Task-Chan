/**
 * Page-prop shim for item search.
 *
 * The items API will echo `filters.q` (trimmed, max 100) and apply it with the
 * other filters. Until that field is present, copy `q` off the query string and
 * narrow the rows already loaded so the search box round-trips. When `filters.q`
 * is a string, the payload is the API's and is left alone.
 */
const MAX_QUERY = 100;

export function itemQuery(raw: string | null | undefined): string {
    return (raw ?? '').trim().slice(0, MAX_QUERY);
}

export function withItemQuery<T extends { items?: unknown; filters?: unknown; matched?: number }>(data: T, search: URLSearchParams): T {
    const filters = data.filters;
    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) return data;
    const current = filters as Record<string, unknown>;
    if (typeof current.q === 'string') return data;

    const q = itemQuery(search.get('q'));
    const nextFilters = { ...current, q };
    if (!q || !Array.isArray(data.items)) return { ...data, filters: nextFilters };

    const needle = q.toLowerCase();
    const items = data.items.filter((item) => haystack(item).includes(needle));
    return { ...data, items, matched: items.length, filters: nextFilters };
}

function haystack(item: unknown): string {
    if (!item || typeof item !== 'object') return '';
    const row = item as { title?: unknown; number?: unknown; sector?: unknown };
    return [row.title, row.number, row.sector]
        .filter((part) => part != null && part !== '')
        .join(' ')
        .toLowerCase();
}
