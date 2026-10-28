export interface HonestyItem {
    status?: string;
    deadline: string | null;
    /** Completion day. Review sends this as `day`. */
    completed?: string | null;
    day?: string | null;
}

export type Honesty =
    | { kind: 'empty'; label: string }
    | { kind: 'percent'; percent: number; onTime: number; dated: number };

export interface ReviewDraftInput {
    range: string;
    finished: number;
    earned: number;
    openCount: number;
    streakCurrent: number;
    streakLength: number;
    streakBonus: number;
    done: { title: string; tokens: number }[];
    carry: { title: string; deadline: string | null }[];
    honesty: Honesty;
}

const EMPTY_HONESTY = 'No deadlines to score yet.';

function isoDay(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    return match ? match[1] : null;
}

function isDone(item: HonestyItem): boolean {
    return item.status === undefined || item.status === 'done';
}

/**
 * Among done items that have a deadline, the share finished on or before that day.
 * No dated dones → a sentence, not 0%.
 */
export function honesty(items: HonestyItem[]): Honesty {
    const dated = items.filter((item) => isDone(item) && item.deadline != null);
    if (dated.length === 0) return { kind: 'empty', label: EMPTY_HONESTY };

    let onTime = 0;
    for (const item of dated) {
        const deadline = isoDay(item.deadline);
        const completed = isoDay(item.completed ?? item.day);
        if (deadline && completed && completed <= deadline) onTime += 1;
    }

    return {
        kind: 'percent',
        percent: Math.round((onTime / dated.length) * 100),
        onTime,
        dated: dated.length,
    };
}

export function honestyLine(score: Honesty): string {
    if (score.kind === 'empty') return `Honesty: ${score.label}`;
    const dones = score.dated === 1 ? 'dated done' : 'dated dones';
    return `Honesty: ${score.percent}% (${score.onTime} of ${score.dated} ${dones} on time).`;
}

function headline(finished: number, earned: number, openCount: number): string {
    const items = finished === 1 ? 'item' : 'items';
    if (finished > 0 && openCount === 0) {
        return `Week cleared! Finished ${finished} ${items} and earned ${earned} tokens.`;
    }
    if (finished === 0) {
        return openCount === 0
            ? 'Nothing finished yet, and nothing left open.'
            : `Nothing finished yet. ${openCount} still open.`;
    }
    return `Finished ${finished} ${items} and earned ${earned} tokens. ${openCount} still open.`;
}

function streakLine(current: number, length: number, bonus: number): string {
    const left = Math.max(0, length - current);
    if (left === 0) return `Streak ${current}/${length}. Streak bonus unlocked (+${bonus}).`;
    const days = left === 1 ? 'day' : 'days';
    return `Streak ${current}/${length}. ${left} more working ${days} until the +${bonus} bonus.`;
}

/** Plain-text weekly note. Copy summary puts this on the clipboard. */
export function reviewDraft(input: ReviewDraftInput): string {
    const doneLines = input.done.length
        ? input.done.map((item) => `- ${item.title} (+${item.tokens})`).join('\n')
        : '- None yet';
    const carryLines = input.carry.length
        ? input.carry.map((item) => `- ${item.title}${item.deadline ? ` (due ${item.deadline})` : ''}`).join('\n')
        : '- Nothing to carry';

    return [
        `Weekly review · ${input.range}`,
        '',
        headline(input.finished, input.earned, input.openCount),
        streakLine(input.streakCurrent, input.streakLength, input.streakBonus),
        honestyLine(input.honesty),
        '',
        'Marked done:',
        doneLines,
        '',
        'Carry over:',
        carryLines,
    ].join('\n');
}
