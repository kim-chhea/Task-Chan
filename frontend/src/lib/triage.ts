import type { ItemDto } from '@/types';

export interface TriageFields {
    deadline: string | null;
    someday: boolean;
}

export type SchedulePatch = { deadline: string };
export type ParkPatch = { someday: true };
export type InboxPatch = { someday: false };
export type TriagePatch = SchedulePatch | ParkPatch | InboxPatch;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Body for PATCH /api/items/{id}. There is no triage endpoint.
 * A date leaves Someday (the server clears it). Parking sends someday true and the server clears the date.
 * Sending a date and someday together is not used: a non-null deadline wins.
 */
export function triagePatch(action: 'schedule', deadline: string): SchedulePatch;
export function triagePatch(action: 'park'): ParkPatch;
export function triagePatch(action: 'inbox'): InboxPatch;
export function triagePatch(action: 'schedule' | 'park' | 'inbox', deadline?: string): TriagePatch {
    if (action === 'park') return { someday: true };
    if (action === 'inbox') return { someday: false };
    if (!deadline || !ISO_DAY.test(deadline)) throw new Error('A yyyy-mm-dd deadline is required to schedule an item.');
    return { deadline };
}

/**
 * Fields stored after a triage patch. Mirrors ItemApiController::normalizeSomeday:
 * a non-null deadline clears someday; someday true clears the deadline.
 */
export function fieldsAfterTriage(current: TriageFields, patch: Partial<TriageFields>): TriageFields {
    if ('deadline' in patch && patch.deadline != null && patch.deadline !== '') {
        return { deadline: patch.deadline, someday: false };
    }
    if ('someday' in patch && patch.someday === true) return { someday: true, deadline: null };
    return {
        someday: 'someday' in patch ? patch.someday === true : current.someday,
        deadline: 'deadline' in patch ? (patch.deadline ?? null) : current.deadline,
    };
}

/** Which triage list an open item belongs on. Null means it is scheduled, so Today may show it. */
export function placedOn(item: TriageFields & { status?: ItemDto['status']; done?: boolean }): 'inbox' | 'someday' | null {
    if (item.done === true || item.status === 'done') return null;
    if (item.someday) return 'someday';
    if (item.deadline === null) return 'inbox';
    return null;
}

/** yyyy-mm-dd in Bangkok, `days` after `today`. */
export function daysFromToday(days: number, today: string): string {
    const d = new Date(`${today}T12:00:00+07:00`);
    d.setDate(d.getDate() + days);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
}

export function inboxLinkLabel(count: number): string {
    if (count === 0) return 'Inbox is clear';
    if (count === 1) return '1 item waiting in Inbox';
    return `${count} items waiting in Inbox`;
}

/** Accessible name for the Inbox nav link. A positive count is the badge. */
export function inboxNavName(count: number | null): string {
    if (count === null || count <= 0) return 'Inbox';
    return `Inbox, ${count} in Inbox`;
}
