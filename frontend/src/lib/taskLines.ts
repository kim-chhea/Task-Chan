import { api } from '@/lib/api';
import type { FollowUpsResponse, SpawnResponse, TaskLine, TaskLineDraft, TaskLinePayload } from '@/types';

/** Both batch routes reject more than this. The editor stops at the same number. */
export const TASK_LINE_LIMIT = 20;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A line the user can still fix. Not an HTTP failure. */
export class TaskLineError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TaskLineError';
    }
}

/**
 * Build the shared follow-up / spawn body.
 * Blank titles are dropped. A blank date is omitted so the task lands in the Inbox.
 * A `yyyy-mm-dd` date is sent as-is so Today and the calendar can show it.
 * `someday: true` is passed through; a date still wins on the server.
 */
export function taskLinePayload(lines: readonly TaskLineDraft[]): TaskLinePayload {
    const items: TaskLine[] = [];

    for (const line of lines) {
        const title = line.title.trim();
        if (!title) continue;
        if (title.length > 255) throw new TaskLineError('Keep each title under 255 characters.');

        const item: TaskLine = { title };

        if (line.deadline != null && line.deadline !== '') {
            const deadline = line.deadline.trim();
            if (!ISO_DAY.test(deadline)) throw new TaskLineError('Use a date like 2026-11-01, or leave it blank.');
            item.deadline = deadline;
        }

        if (line.priority) item.priority = line.priority;

        if (typeof line.sector === 'string') {
            const sector = line.sector.trim();
            if (sector.length > 80) throw new TaskLineError('Keep the sector under 80 characters.');
            if (sector) item.sector = sector;
        }

        if (typeof line.someday === 'boolean') item.someday = line.someday;

        items.push(item);
    }

    if (items.length === 0) throw new TaskLineError('Add a title on at least one line.');
    if (items.length > TASK_LINE_LIMIT) throw new TaskLineError('You can add up to 20 lines at a time.');

    return { items };
}

/** POST /api/items/{item}/follow-ups. Meeting items only; other types are a 422 from the API. */
export function postFollowUps(itemId: number, lines: readonly TaskLineDraft[] | TaskLinePayload): Promise<FollowUpsResponse> {
    const body = Array.isArray(lines) ? taskLinePayload(lines) : lines;
    return api<FollowUpsResponse>('POST', `/items/${itemId}/follow-ups`, body);
}

/** POST /api/master-records/{masterRecord}/spawn. Children belong to that case. */
export function postSpawn(masterRecordId: number, lines: readonly TaskLineDraft[] | TaskLinePayload): Promise<SpawnResponse> {
    const body = Array.isArray(lines) ? taskLinePayload(lines) : lines;
    return api<SpawnResponse>('POST', `/master-records/${masterRecordId}/spawn`, body);
}
