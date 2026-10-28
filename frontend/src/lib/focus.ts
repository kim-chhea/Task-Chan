import { api } from '@/lib/api';
import type { FocusActiveResponse, FocusCompleteResponse, FocusRules, FocusStateResponse } from '@/types';

/**
 * POST /api/focus/start.
 * `item_id` is omitted for a free Focus. The server pays nothing until complete.
 */
export async function startFocus(minutes: number, itemId?: number | null): Promise<FocusStateResponse> {
    const body: { minutes: number; item_id?: number } = { minutes };
    if (typeof itemId === 'number') body.item_id = itemId;
    return api<FocusStateResponse>('POST', '/focus/start', body);
}

/** GET /api/focus/active. Used to restore a running timer after reload. */
export async function getActiveFocus(): Promise<FocusActiveResponse> {
    return api<FocusActiveResponse>('GET', '/focus/active');
}

/**
 * POST /api/focus/{session}/complete.
 * Pays the bonus only. The linked item is not marked Done.
 */
export async function completeFocus(sessionId: number): Promise<FocusCompleteResponse> {
    return api<FocusCompleteResponse>('POST', `/focus/${sessionId}/complete`);
}

/** POST /api/focus/{session}/cancel. No tokens. */
export async function cancelFocus(sessionId: number): Promise<FocusStateResponse> {
    return api<FocusStateResponse>('POST', `/focus/${sessionId}/cancel`);
}

/**
 * Milliseconds until `endsAt`. Negative once that instant has passed.
 * An unreadable timestamp is NaN so the Claim control stays hidden.
 */
export function msLeft(endsAt: string, now: number): number {
    const end = Date.parse(endsAt);
    if (!Number.isFinite(end) || !Number.isFinite(now)) return Number.NaN;
    return end - now;
}

/** Claim is offered only when the countdown has reached the end. The server's grace window is not a client shortcut. */
export function canClaimFocus(ms: number): boolean {
    return Number.isFinite(ms) && ms <= 0;
}

/** `mm:ss` remaining. Partial seconds round up so the clock hits 00:00 only at the end. */
export function formatFocusClock(ms: number): string {
    if (!Number.isFinite(ms)) return '--:--';
    const total = Math.ceil(Math.max(0, ms) / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Tokens a preset would pay.
 * Looks up `rules.focus.bonuses` with a string key (`"25"`, `"50"`).
 */
export function focusBonusPreview(rules: Pick<FocusRules, 'bonuses'> | null | undefined, minutes: number): number {
    const raw = rules?.bonuses?.[String(minutes)];
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return 0;
    return Math.floor(raw);
}

/** One HOW TO EARN sentence. Numbers come from bootstrap `rules.focus`, including string-keyed bonuses. */
export function focusEarnLine(focus: FocusRules | null | undefined): string | null {
    if (!focus || !Array.isArray(focus.presets) || focus.presets.length === 0) return null;
    const parts = focus.presets
        .filter((minutes): minutes is number => typeof minutes === 'number' && Number.isFinite(minutes))
        .map((minutes) => `+${focusBonusPreview(focus, minutes)} for ${minutes} min`);
    if (parts.length === 0) return null;
    const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    const cap = focus.daily_cap;
    const capText = typeof cap === 'number' && Number.isFinite(cap) && cap > 0 ? `, up to ${cap} a day` : '';
    return `Focus pays ${list}${capText}. It does not mark the item Done.`;
}
