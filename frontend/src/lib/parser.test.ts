import { describe, expect, it } from 'vitest';
import { bangkokDate, dueLabel, parseQuickAdd } from './parser';

// Fri 2 Oct 2026, 09:00 in Bangkok.
const NOW = new Date('2026-10-02T02:00:00Z');

describe('parseQuickAdd', () => {
    it('parses the headline example', () => {
        expect(parseQuickAdd('Ticket from DGB, due Friday', NOW)).toEqual({
            type: 'ticket',
            title: 'Ticket from DGB',
            deadline: '2026-10-09', // next Friday, never today when today is Friday
            priority: null,
        });
    });

    it('defaults the type to task', () => {
        expect(parseQuickAdd('Print attendance sheets', NOW).type).toBe('task');
    });

    it.each([
        ['Request room booking', 'request'],
        ['Weekly meeting with ops', 'meeting'],
        ['New ticket from bank', 'ticket'],
    ])('detects type in %s', (text, type) => {
        expect(parseQuickAdd(text, NOW).type).toBe(type);
    });

    it('understands today and tomorrow', () => {
        expect(parseQuickAdd('Call Somchai today', NOW).deadline).toBe('2026-10-02');
        expect(parseQuickAdd('Call Somchai tomorrow', NOW).deadline).toBe('2026-10-03');
    });

    it('understands weekday names and due/by lead-ins', () => {
        expect(parseQuickAdd('Send report by Monday', NOW)).toMatchObject({ title: 'Send report', deadline: '2026-10-05' });
        expect(parseQuickAdd('Send report due wednesday', NOW).deadline).toBe('2026-10-07');
    });

    it('understands explicit dates', () => {
        expect(parseQuickAdd('Renew licence due 15 Oct', NOW).deadline).toBe('2026-10-15');
        expect(parseQuickAdd('Renew licence 2026-11-03', NOW).deadline).toBe('2026-11-03');
    });

    it('returns no deadline when there is no date', () => {
        expect(parseQuickAdd('Tidy the archive', NOW).deadline).toBeNull();
    });

    it('detects priority words and strips them from the title', () => {
        expect(parseQuickAdd('urgent ticket from DGB due friday', NOW)).toMatchObject({ priority: 'high', type: 'ticket', title: 'ticket from DGB' });
        expect(parseQuickAdd('Archive old files low priority', NOW)).toMatchObject({ priority: 'low', title: 'Archive old files' });
    });

    it('falls back to Untitled for empty input', () => {
        expect(parseQuickAdd('   ', NOW).title).toBe('Untitled');
    });

    it('uses the Bangkok calendar date near UTC midnight', () => {
        // 18:30 UTC on 2 Oct is already 01:30 on 3 Oct in Bangkok.
        const late = new Date('2026-10-02T18:30:00Z');
        expect(bangkokDate(late)).toBe('2026-10-03');
        expect(parseQuickAdd('Ship it today', late).deadline).toBe('2026-10-03');
    });
});

describe('dueLabel', () => {
    it('formats labels', () => {
        expect(dueLabel(null, NOW)).toBe('No date');
        expect(dueLabel('2026-10-02', NOW)).toBe('Today');
        expect(dueLabel('2026-10-09', NOW)).toBe('Fri 9 Oct');
    });
});