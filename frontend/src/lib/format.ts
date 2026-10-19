import type { ItemStatus, ItemType, Priority } from '@/types';

const TZ = 'Asia/Bangkok';

export const TYPE_LABEL: Record<ItemType, string> = { ticket: 'Ticket', request: 'Request', meeting: 'Meeting', task: 'Task' };
export const STATUS_LABEL: Record<ItemStatus, string> = { not_started: 'Not started', in_progress: 'In progress', done: 'Done' };
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export const TYPE_BG: Record<ItemType, string> = {
    ticket: 'bg-pink-soft',
    request: 'bg-accent-soft',
    meeting: 'bg-sun-soft',
    task: 'bg-mint-soft',
};

export function todayIso(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** "Fri 9 Oct" */
export function shortDay(iso: string | null | undefined): string {
    if (!iso) return 'No date';
    const d = new Date(`${iso}T12:00:00+07:00`);
    return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(d).replace(',', '').replace('Sept', 'Sep');
}

/** "Fri 9 Oct 2026" */
export function longDay(iso: string | null | undefined): string {
    if (!iso) return 'No date';
    return `${shortDay(iso)} ${iso.slice(0, 4)}`;
}

export function dueText(iso: string | null | undefined): string {
    if (!iso) return 'No date';
    return iso === todayIso() ? 'Today' : shortDay(iso);
}

export function isOverdue(iso: string | null | undefined, done: boolean): boolean {
    return !!iso && !done && iso < todayIso();
}

export function fileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}