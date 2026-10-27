import { describe, expect, it } from 'vitest';
import { itemQuery, withItemQuery } from './itemSearch';

const rows = [
    { title: 'Ticket from DGB', number: '0012', sector: 'Banking' },
    { title: 'Order stationery', number: '0004', sector: 'Admin' },
];

const payload = {
    items: rows,
    filters: { status: 'all', type: 'all', sector: 'all', range: 'all' },
    matched: 2,
    total: 2,
};

describe('item search page props', () => {
    it('trims q and caps it at 100 characters', () => {
        expect(itemQuery('  DGB  ')).toBe('DGB');
        expect(itemQuery(null)).toBe('');
        expect(itemQuery('x'.repeat(120))).toHaveLength(100);
    });

    it('defaults filters.q to an empty string when the API omits it', () => {
        const next = withItemQuery(payload, new URLSearchParams());
        expect(next.filters).toEqual({ ...payload.filters, q: '' });
        expect(next.items).toEqual(rows);
        expect(next.matched).toBe(2);
    });

    it('copies q from the query string and narrows the loaded rows', () => {
        const next = withItemQuery(payload, new URLSearchParams('q=%20dgb%20'));
        expect(next.filters).toMatchObject({ q: 'dgb' });
        expect(next.items).toEqual([rows[0]]);
        expect(next.matched).toBe(1);
        expect(next.total).toBe(2);
    });

    it('matches a number or sector as well as a title', () => {
        expect(withItemQuery(payload, new URLSearchParams('q=0004')).items).toEqual([rows[1]]);
        expect(withItemQuery(payload, new URLSearchParams('q=admin')).items).toEqual([rows[1]]);
    });

    it('reports no matches when nothing in the loaded rows fits', () => {
        const next = withItemQuery(payload, new URLSearchParams('q=zzzz'));
        expect(next.items).toEqual([]);
        expect(next.matched).toBe(0);
        expect(next.filters).toMatchObject({ q: 'zzzz' });
    });

    it('leaves the API payload alone once filters.q is a string', () => {
        const api = { ...payload, filters: { ...payload.filters, q: 'stationery' }, items: [rows[0]], matched: 40 };
        const next = withItemQuery(api, new URLSearchParams('q=dgb'));
        expect(next).toBe(api);
    });
});
