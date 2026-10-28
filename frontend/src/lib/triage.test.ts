import { describe, expect, it } from 'vitest';
import { daysFromToday, fieldsAfterTriage, inboxLinkLabel, inboxNavName, placedOn, triagePatch } from './triage';

describe('triage patches', () => {
    it('parks with someday true and does not send a deadline', () => {
        expect(triagePatch('park')).toEqual({ someday: true });
        expect(triagePatch('park')).not.toHaveProperty('deadline');
    });

    it('schedules with a deadline and lets the server clear someday', () => {
        expect(triagePatch('schedule', '2026-11-02')).toEqual({ deadline: '2026-11-02' });
        expect(triagePatch('schedule', '2026-11-02')).not.toHaveProperty('someday');
    });

    it('sends someday false to put an undated item back in the inbox', () => {
        expect(triagePatch('inbox')).toEqual({ someday: false });
    });

    it('refuses to schedule without a real day', () => {
        expect(() => triagePatch('schedule', '')).toThrow(/deadline/);
        expect(() => triagePatch('schedule', 'Friday')).toThrow(/deadline/);
    });
});

describe('fields after triage', () => {
    const note = { deadline: null as string | null, someday: false };

    it('parks an inbox note and clears any date', () => {
        const parked = fieldsAfterTriage({ deadline: '2026-11-01', someday: false }, triagePatch('park'));
        expect(parked).toEqual({ deadline: null, someday: true });
        expect(placedOn(parked)).toBe('someday');
    });

    it('gives a parked note a day and clears someday', () => {
        const parked = fieldsAfterTriage(note, triagePatch('park'));
        const scheduled = fieldsAfterTriage(parked, triagePatch('schedule', '2026-11-02'));
        expect(scheduled).toEqual({ deadline: '2026-11-02', someday: false });
        expect(placedOn(scheduled)).toBeNull();
    });

    it('lets a deadline win when someday is sent in the same patch', () => {
        expect(fieldsAfterTriage({ deadline: null, someday: true }, { someday: true, deadline: '2026-11-02' })).toEqual({
            deadline: '2026-11-02',
            someday: false,
        });
    });

    it('keeps a dated someday item on the someday list until a date is confirmed', () => {
        const dated = { deadline: '2026-11-01', someday: true };
        expect(placedOn(dated)).toBe('someday');
        expect(placedOn(fieldsAfterTriage(dated, triagePatch('schedule', dated.deadline)))).toBeNull();
    });

    it('returns an undated parked item to the inbox', () => {
        const back = fieldsAfterTriage({ deadline: null, someday: true }, triagePatch('inbox'));
        expect(back).toEqual({ deadline: null, someday: false });
        expect(placedOn(back)).toBe('inbox');
    });

    it('keeps done items off both lists', () => {
        expect(placedOn({ deadline: null, someday: false, status: 'done' })).toBeNull();
        expect(placedOn({ deadline: null, someday: true, done: true })).toBeNull();
    });
});

describe('inbox labels', () => {
    it('names the Today chip from the inbox count', () => {
        expect(inboxLinkLabel(0)).toBe('Inbox is clear');
        expect(inboxLinkLabel(1)).toBe('1 item waiting in Inbox');
        expect(inboxLinkLabel(4)).toBe('4 items waiting in Inbox');
    });

    it('names the nav link with a badge only when the inbox has items', () => {
        expect(inboxNavName(null)).toBe('Inbox');
        expect(inboxNavName(0)).toBe('Inbox');
        expect(inboxNavName(3)).toBe('Inbox, 3 in Inbox');
    });

    it('shifts a Bangkok day without crossing the wrong date', () => {
        expect(daysFromToday(0, '2026-10-28')).toBe('2026-10-28');
        expect(daysFromToday(1, '2026-10-28')).toBe('2026-10-29');
        expect(daysFromToday(7, '2026-10-28')).toBe('2026-11-04');
    });
});
