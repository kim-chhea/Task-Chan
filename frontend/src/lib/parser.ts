import * as chrono from 'chrono-node';

export type ItemType = 'ticket' | 'request' | 'meeting' | 'task';
export type Priority = 'low' | 'medium' | 'high';

export interface ParsedQuickAdd {
    type: ItemType;
    title: string;
    /** yyyy-mm-dd in Asia/Bangkok, or null */
    deadline: string | null;
    priority: Priority | null;
}

export const TIMEZONE = 'Asia/Bangkok';

const TYPE_WORDS: ItemType[] = ['ticket', 'request', 'meeting', 'task'];
const HIGH = /\b(urgent|asap|high(?:\s+priority)?)\b/i;
const LOW = /\blow(?:\s+priority)?\b/i;

/** yyyy-mm-dd of an instant as seen in Bangkok. */
export function bangkokDate(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/**
 * Parse one quick-add line, e.g. "Ticket from DGB, due Friday".
 * Pure function: pass `now` in tests. Defaults to Asia/Bangkok.
 */
export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
    let text = (input ?? '').trim();
    const lower = text.toLowerCase();

    let type: ItemType = 'task';
    for (const t of TYPE_WORDS) {
        if (new RegExp(`\\b${t}s?\\b`, 'i').test(lower)) {
            type = t;
            break;
        }
    }

    let priority: Priority | null = null;
    if (HIGH.test(text)) {
        priority = 'high';
        text = text.replace(HIGH, ' ');
    } else if (LOW.test(text)) {
        priority = 'low';
        text = text.replace(LOW, ' ');
    }

    // Anchor "today" to Bangkok midday so weekday maths cannot slip a day near midnight UTC.
    const [y, m, d] = bangkokDate(now).split('-').map(Number);
    const ref = new Date(Date.UTC(y, m - 1, d, 5, 0, 0)); // 12:00 in Bangkok (UTC+7)

    let deadline: string | null = null;
    const results = chrono.parse(text, { instant: ref, timezone: 'ICT' }, { forwardDate: true });
    if (results.length > 0) {
        const r = results[results.length - 1];
        const k = r.start;
        const yy = k.get('year')!;
        const mm = k.get('month')!;
        const dd = k.get('day')!;
        deadline = `${String(yy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

        // A bare weekday that is today ("due Friday" on a Friday) means next week, not now.
        if (deadline === bangkokDate(now) && /^(?:next\s+)?(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*$/i.test(r.text.trim())) {
            deadline = bangkokDate(new Date(Date.UTC(yy, mm - 1, dd + 7, 5, 0, 0)));
        }

        // Remove the date phrase plus its lead-in word ("due", "by", "on").
        const before = text.slice(0, r.index).replace(/[\s,;-]*\b(?:due|by|on|until|before)\s*$/i, '');
        const after = text.slice(r.index + r.text.length);
        text = `${before} ${after}`;
    } else {
        text = text.replace(/[\s,;-]*\b(?:due|by)\b\s*$/i, '');
    }

    const title = text
        .replace(/\s*,\s*,+/g, ',')
        .replace(/\s{2,}/g, ' ')
        .replace(/^[\s,;:-]+|[\s,;:-]+$/g, '')
        .trim();

    return { type, title: title || 'Untitled', deadline, priority };
}

/** "Fri 9 Oct" style label for a yyyy-mm-dd (rendered in Bangkok). */
export function dueLabel(deadline: string | null, now: Date = new Date()): string {
    if (!deadline) return 'No date';
    if (deadline === bangkokDate(now)) return 'Today';
    const d = new Date(`${deadline}T12:00:00+07:00`);
    return new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, weekday: 'short', day: 'numeric', month: 'short' }).format(d).replace(',', '');
}