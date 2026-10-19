import type { Priority } from '@/types';

/** Pure token/UI logic. The server is the source of truth; these only drive previews and optimistic UI. */

export interface Rules {
    rewards: Record<Priority, number>;
    early_bonus: number;
}

export interface RewardPreview {
    base: number;
    early: number;
    total: number;
}

/** What an open item pays if completed on `today`. No deadline means no on-time bonus. */
export function rewardPreview(rules: Rules, priority: Priority, deadline: string | null, today: string): RewardPreview {
    const base = rules.rewards[priority];
    const early = deadline !== null && today <= deadline ? rules.early_bonus : 0;
    return { base, early, total: base + early };
}

export type LockerButton =
    | { kind: 'equipped' }
    | { kind: 'equip' }
    | { kind: 'buy'; price: number }
    | { kind: 'need'; needed: number };

/** Which button a Locker card shows. Free items count as owned. */
export function lockerButton(args: { owned: boolean; equipped: boolean; price: number; balance: number }): LockerButton {
    const { owned, equipped, price, balance } = args;
    if (equipped) return { kind: 'equipped' };
    if (owned || price === 0) return { kind: 'equip' };
    if (balance >= price) return { kind: 'buy', price };
    return { kind: 'need', needed: price - balance };
}

/** "Done this week" counter including optimistic checkbox flips that the server has not confirmed yet. */
export function weekDoneAdjusted(serverCount: number, items: { id: number; done: boolean }[], override: Record<number, boolean>): number {
    let n = serverCount;
    for (const it of items) {
        const o = override[it.id];
        if (o === undefined || o === it.done) continue;
        n += o ? 1 : -1;
    }
    return Math.max(0, n);
}

/** Days still needed for the streak bonus. */
export function streakLeft(current: number, length: number): number {
    return Math.max(0, length - current);
}
