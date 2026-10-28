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
    };
};