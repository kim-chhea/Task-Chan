import type { Gear, MascotKey, PartnerKey } from '@/Components/characters/palette';

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string | null;
}

export type ItemType = 'ticket' | 'request' | 'meeting' | 'task';
export type ItemStatus = 'not_started' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface MasterRecordRef {
    id: number;
    code: string;
    title: string;
    session_date: string | null;
    student_count: number | null;
}

export interface ItemDto {
    id: number;
    number: string;
    title: string;
    type: ItemType;
    status: ItemStatus;
    priority: Priority;
    sector: string | null;
    deadline: string | null;
    /** Parked for later. The API always sends this. A non-null deadline means it is false. */
    someday: boolean;
    received_at: string | null;
    completed_at: string | null;
    done: boolean;
    reward: number;
    master_record?: MasterRecordRef | null;
    custom?: Record<string, string | number | boolean>;
}

/**
 * One line on POST /api/items/{item}/follow-ups and POST /api/master-records/{id}/spawn.
 * Only `title` is required. Omit `deadline` (or leave it blank) and the task stays in the Inbox.
 * `someday: true` parks it. The server clears someday when a deadline is set.
 */
export interface TaskLine {
    title: string;
    deadline?: string;
    priority?: Priority;
    sector?: string;
    someday?: boolean;
}

/** Editor row before it is trimmed into a {@link TaskLine}. */
export interface TaskLineDraft {
    title: string;
    deadline?: string | null;
    priority?: Priority | null;
    sector?: string | null;
    someday?: boolean | null;
}

/** Shared `{ items: [1..20 lines] }` body. */
export interface TaskLinePayload {
    items: TaskLine[];
}

/** 201 from POST /api/items/{item}/follow-ups. */
export interface FollowUpsResponse {
    items: ItemDto[];
    linked_to: { id: number; number: string; title: string; type: ItemType };
    balance: number;
    streak: number;
}

/** 201 from POST /api/master-records/{masterRecord}/spawn. */
export interface SpawnResponse {
    items: ItemDto[];
    record: { id: number; code: string; title: string };
    balance: number;
    streak: number;
}

/** `stats` on GET /api/master-records/{masterRecord}. */
export interface CaseStats {
    total: number;
    open: number;
    done: number;
    next_deadline: string | null;
    open_tokens: number;
}

export interface InboxCounts {
    inbox: number;
    someday: number;
}

/** GET /api/inbox. Inbox is open, undated, and not parked. Someday is open and parked. */
export interface InboxResponse {
    inbox: ItemDto[];
    someday: ItemDto[];
    counts: InboxCounts;
}

export interface TodayCounts {
    inbox: number;
}

/** GET /api/today. `coming_up` is scheduled work only — Inbox and Someday stay off that list. */
export interface TodayResponse {
    today: string;
    groups: { due: ItemDto[]; in_progress: ItemDto[]; coming_up: ItemDto[] };
    progress: { done: number; total: number };
    week: { dow: string; n: number; date: string; count: number; today: boolean }[];
    weekRange: string;
    weekDone: number;
    counts: TodayCounts;
}

export type Category = 'hair' | 'outfit' | 'gear' | 'partner' | 'stage';

export interface CatalogEntry {
    name: string;
    price: number;
    note?: string;
    color?: string;
    hi?: string;
    trim?: string;
    mark?: string;
    lines?: string;
    light?: boolean;
    dark?: boolean;
}
export type Catalog = Record<Category, Record<string, CatalogEntry>>;

export interface GameState {
    balance: number;
    mascot: MascotKey;
    equipped: { hair: string; outfit: string; gear: Gear; partner: PartnerKey; stage: string };
    streak: number;
}

export type FocusSessionStatus = 'running' | 'completed' | 'canceled';

/** Item snippet on a Focus session. Null item means a free Focus. */
export interface FocusItemRef {
    id: number;
    number: string;
    title: string;
    type: ItemType;
}

/** Session resource from /api/focus. `bonus` is the preset payout, not tokens already paid. */
export interface FocusSession {
    id: number;
    item_id: number | null;
    item: FocusItemRef | null;
    planned_minutes: number;
    started_at: string;
    ends_at: string;
    status: FocusSessionStatus;
    awarded_tokens: number;
    bonus: number;
}

/** 201 from POST /api/focus/start and 200 from POST /api/focus/{session}/cancel. No tokens on either. */
export interface FocusStateResponse {
    session: FocusSession;
    balance: number;
    streak: number;
}

/** 200 from POST /api/focus/{session}/complete. `awarded` is the payout. The item stays open. */
export interface FocusCompleteResponse extends FocusStateResponse {
    awarded: number;
}

/** GET /api/focus/active. `session` is null when nothing is running. */
export interface FocusActiveResponse {
    session: FocusSession | null;
}

/**
 * Bootstrap `rules.focus`.
 * `bonuses` is a JSON object with string keys (`"25"`, `"50"`), not a nested `bonus_per_preset`.
 */
export interface FocusRules {
    presets: number[];
    bonuses: Record<string, number>;
    daily_cap: number;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: { user: User };
    game: GameState;
    catalog: Catalog;
    rules: {
        rewards: Record<Priority, number>;
        early_bonus: number;
        /** Present once bootstrap sends locker streak rules. Mood falls back to 5 / 50 without them. */
        streak_bonus?: number;
        streak_length?: number;
        /** Present once bootstrap sends Focus presets. Picker and preview read `bonuses` string keys. */
        focus?: FocusRules;
    };
};