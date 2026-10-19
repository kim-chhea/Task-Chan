import { describe, expect, it } from 'vitest';
import { allColumns, formatCustom, gridTemplate, minTableWidth, moveColumn, parseOptions, resolveColumns, toggleColumn, type CustomFieldDto } from './columns';

const client: CustomFieldDto = { id: 7, name: 'Client', type: 'text', options: [] };
const billed: CustomFieldDto = { id: 8, name: 'Billed', type: 'checkbox', options: [] };
const stage: CustomFieldDto = { id: 9, name: 'Stage', type: 'select', options: ['Draft', 'Final'] };

describe('resolveColumns', () => {
    it('keeps the saved order and includes custom fields', () => {
        const cols = resolveColumns(['title', 'cf:7', 'status'], [client]);
        expect(cols.map((c) => c.key)).toEqual(['title', 'cf:7', 'status']);
    });
    it('can hide the sector column', () => {
        const keys = resolveColumns(['number', 'title', 'status'], []).map((c) => c.key);
        expect(keys).not.toContain('sector');
    });
    it('drops unknown keys and fields that were deleted', () => {
        expect(resolveColumns(['title', 'bogus', 'cf:99'], []).map((c) => c.key)).toEqual(['title']);
    });
    it('always includes the title, first if it was missing', () => {
        expect(resolveColumns(['status'], []).map((c) => c.key)).toEqual(['title', 'status']);
    });
    it('ignores duplicates', () => {
        expect(resolveColumns(['title', 'status', 'status'], []).length).toBe(2);
    });
});

describe('toggleColumn and moveColumn', () => {
    it('adds and removes, but never removes the title', () => {
        expect(toggleColumn(['title'], 'sector')).toEqual(['title', 'sector']);
        expect(toggleColumn(['title', 'sector'], 'sector')).toEqual(['title']);
        expect(toggleColumn(['title', 'sector'], 'title')).toEqual(['title', 'sector']);
    });
    it('moves up and down and stops at the edges', () => {
        expect(moveColumn(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
        expect(moveColumn(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
        expect(moveColumn(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
        expect(moveColumn(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
    });
});

describe('layout helpers', () => {
    it('builds a grid template and a minimum width', () => {
        const cols = resolveColumns(['number', 'title', 'cf:7'], [client]);
        expect(gridTemplate(cols)).toBe('70px minmax(180px,1fr) 150px');
        expect(minTableWidth(cols)).toBeGreaterThan(400);
    });
    it('lists every possible column', () => {
        expect(allColumns([client, stage]).length).toBe(9 + 2);
    });
});

describe('formatCustom', () => {
    it('formats each type', () => {
        expect(formatCustom(client, 'DGB')).toBe('DGB');
        expect(formatCustom(billed, true)).toBe('✓');
        expect(formatCustom(billed, false)).toBe('—');
        expect(formatCustom({ ...client, type: 'number' }, 1234.5)).toBe('1,234.5');
        expect(formatCustom({ ...client, type: 'date' }, '2026-10-09')).toBe('Fri 9 Oct');
    });
    it('shows a dash when empty', () => {
        expect(formatCustom(client, null)).toBe('—');
        expect(formatCustom(client, undefined)).toBe('—');
        expect(formatCustom(client, '')).toBe('—');
    });
});

describe('parseOptions', () => {
    it('splits on commas and newlines, trims and de-duplicates', () => {
        expect(parseOptions('Draft, Final,\nFinal ,  ,Sent')).toEqual(['Draft', 'Final', 'Sent']);
    });
});
