import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { postFollowUps, postSpawn, taskLinePayload } from './taskLines';

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, api: vi.fn() };
});

describe('taskLinePayload', () => {
    it('keeps the shared line shape and drops blank titles', () => {
        expect(taskLinePayload([
            { title: ' Send notes to class ', deadline: '2026-11-01', priority: 'medium', sector: ' Banking ', someday: false },
            { title: '   ', deadline: '2026-12-01' },
            { title: 'Book the room' },
            { title: 'Later', deadline: null, someday: true },
            { title: 'Explicit inbox', deadline: '', someday: false, priority: null, sector: '  ' },
        ])).toEqual({
            items: [
                { title: 'Send notes to class', deadline: '2026-11-01', priority: 'medium', sector: 'Banking', someday: false },
                { title: 'Book the room' },
                { title: 'Later', someday: true },
                { title: 'Explicit inbox', someday: false },
            ],
        });
    });

    it('omits a blank date so the task stays in the Inbox', () => {
        expect(taskLinePayload([{ title: 'Loose note', deadline: null }])).toEqual({ items: [{ title: 'Loose note' }] });
        expect(taskLinePayload([{ title: 'Loose note', deadline: '' }]).items[0]).not.toHaveProperty('deadline');
    });

    it('rejects an empty list, a bad date, and more than 20 lines', () => {
        expect(() => taskLinePayload([])).toThrow(/at least one line/);
        expect(() => taskLinePayload([{ title: '  ' }])).toThrow(/at least one line/);
        expect(() => taskLinePayload([{ title: 'Friday?', deadline: 'Friday' }])).toThrow(/2026-11-01/);
        const twenty = Array.from({ length: 20 }, (_, i) => ({ title: `Line ${i + 1}` }));
        expect(taskLinePayload(twenty).items).toHaveLength(20);
        expect(() => taskLinePayload([...twenty, { title: 'One more' }])).toThrow(/20/);
    });
});

describe('postFollowUps and postSpawn', () => {
    beforeEach(() => vi.mocked(api).mockReset());

    it('posts follow-ups to the meeting and spawn to the case', async () => {
        vi.mocked(api).mockResolvedValue({ items: [], balance: 0, streak: 0 });
        const lines = [
            { title: 'Send notes to class', deadline: '2026-11-01' },
            { title: 'Book the room' },
        ];

        await postFollowUps(7, lines);
        await postSpawn(9, lines);

        expect(api).toHaveBeenNthCalledWith(1, 'POST', '/items/7/follow-ups', {
            items: [
                { title: 'Send notes to class', deadline: '2026-11-01' },
                { title: 'Book the room' },
            ],
        });
        expect(api).toHaveBeenNthCalledWith(2, 'POST', '/master-records/9/spawn', {
            items: [
                { title: 'Send notes to class', deadline: '2026-11-01' },
                { title: 'Book the room' },
            ],
        });
    });

    it('does not call the API when the lines are empty', () => {
        expect(() => postFollowUps(7, [{ title: ' ' }])).toThrow(/at least one line/);
        expect(() => postSpawn(9, [])).toThrow(/at least one line/);
        expect(api).not.toHaveBeenCalled();
    });
});
