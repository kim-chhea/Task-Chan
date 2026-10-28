import { describe, expect, it } from 'vitest';
import { honesty, reviewDraft, type ReviewDraftInput } from './reviewDraft';

describe('honesty', () => {
    it('does not show 0% when nothing dated was finished', () => {
        expect(honesty([])).toEqual({ kind: 'empty', label: 'No deadlines to score yet.' });
        expect(honesty([{ status: 'done', deadline: null, completed: '2026-10-09' }]).kind).toBe('empty');
        expect(honesty([{ status: 'in_progress', deadline: '2026-10-09', completed: '2026-10-09' }]).kind).toBe('empty');
    });

    it('counts a done item on time only when the completed day is on or before the deadline', () => {
        expect(honesty([{ status: 'done', deadline: '2026-10-09', completed: '2026-10-09T18:00:00' }])).toMatchObject({
            kind: 'percent',
            percent: 100,
            onTime: 1,
            dated: 1,
        });
        expect(honesty([{ deadline: '2026-10-09', day: '2026-10-10' }])).toMatchObject({ kind: 'percent', percent: 0, onTime: 0, dated: 1 });
        expect(honesty([
            { deadline: '2026-10-09', day: '2026-10-09' },
            { deadline: '2026-10-01', day: '2026-10-02' },
        ])).toMatchObject({ percent: 50, onTime: 1, dated: 2 });
        expect(honesty([
            { deadline: '2026-10-03', day: '2026-10-01' },
            { deadline: '2026-10-03', day: '2026-10-02' },
            { deadline: '2026-10-03', day: '2026-10-04' },
        ])).toMatchObject({ percent: 67 });
    });

    it('treats a dated done with no completion day as late, not as "no deadlines"', () => {
        expect(honesty([{ status: 'done', deadline: '2026-10-09', completed: null }])).toMatchObject({
            kind: 'percent',
            percent: 0,
            dated: 1,
        });
    });
});

function draft(patch: Partial<ReviewDraftInput> = {}): string {
    return reviewDraft({
        range: '20 Oct – 26 Oct 2026',
        finished: 0,
        earned: 0,
        openCount: 2,
        streakCurrent: 0,
        streakLength: 5,
        streakBonus: 50,
        done: [],
        carry: [{ title: 'Write the spec', deadline: '2026-10-30' }],
        honesty: { kind: 'empty', label: 'No deadlines to score yet.' },
        ...patch,
    });
}

describe('reviewDraft', () => {
    it('describes an empty week without calling it cleared', () => {
        const text = draft();
        expect(text).toContain('Weekly review · 20 Oct – 26 Oct 2026');
        expect(text).toContain('Nothing finished yet. 2 still open.');
        expect(text).toContain('No deadlines to score yet.');
        expect(text).toContain('- None yet');
        expect(text).toContain('- Write the spec (due 2026-10-30)');
        expect(text).not.toContain('Week cleared');
    });

    it('celebrates a cleared week and spells out streak, honesty, and finished titles', () => {
        const text = draft({
            finished: 2,
            earned: 30,
            openCount: 0,
            streakCurrent: 5,
            streakBonus: 80,
            done: [{ title: 'File the ticket', tokens: 20 }, { title: 'Send notes', tokens: 10 }],
            carry: [],
            honesty: { kind: 'percent', percent: 50, onTime: 1, dated: 2 },
        });
        expect(text).toContain('Week cleared! Finished 2 items and earned 30 tokens.');
        expect(text).toContain('Streak 5/5. Streak bonus unlocked (+80).');
        expect(text).toContain('Honesty: 50% (1 of 2 dated dones on time).');
        expect(text).toContain('- File the ticket (+20)');
        expect(text).toContain('- Nothing to carry');
    });

    it('counts the days left on a mid streak', () => {
        const text = draft({ finished: 1, earned: 10, openCount: 1, streakCurrent: 4, streakLength: 5, streakBonus: 50 });
        expect(text).toContain('Finished 1 item and earned 10 tokens. 1 still open.');
        expect(text).toContain('Streak 4/5. 1 more working day until the +50 bonus.');
        expect(text).not.toContain('Week cleared');
    });
});
