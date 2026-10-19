import { shortDay } from '@/lib/format';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

export interface CustomFieldDto {
    id: number;
    name: string;
    type: FieldType;
    options: string[];
}

export interface ColumnDef {
    key: string;
    label: string;
    /** CSS grid track, e.g. "100px" */
    width: string;
    /** The title is always shown: it is the link into the item. */
    locked?: boolean;
    custom?: CustomFieldDto;
}

export const BUILTIN_COLUMNS: ColumnDef[] = [
    { key: 'number', label: 'No.', width: '70px' },
    { key: 'title', label: 'Title', width: 'minmax(180px,1fr)', locked: true },
    { key: 'type', label: 'Type', width: '100px' },
    { key: 'status', label: 'Status', width: '120px' },
    { key: 'priority', label: 'Priority', width: '100px' },
    { key: 'sector', label: 'Sector', width: '110px' },
    { key: 'deadline', label: 'Deadline', width: '110px' },
    { key: 'received_at', label: 'Received', width: '110px' },
    { key: 'reward', label: 'Reward', width: '80px' },
];

const CUSTOM_WIDTH: Record<FieldType, string> = { text: '150px', number: '100px', date: '110px', select: '120px', checkbox: '80px' };

export const TYPE_LABELS: Record<FieldType, string> = { text: 'Text', number: 'Number', date: 'Date', select: 'Dropdown', checkbox: 'Checkbox' };

export const customKey = (id: number) => `cf:${id}`;

/** Every column that could be shown: built-ins plus one per custom field. */
export function allColumns(fields: CustomFieldDto[]): ColumnDef[] {
    return [
        ...BUILTIN_COLUMNS,
        ...fields.map((f) => ({ key: customKey(f.id), label: f.name, width: CUSTOM_WIDTH[f.type], custom: f })),
    ];
}

/** The visible columns, in the saved order. Unknown keys are dropped; the title is forced in. */
export function resolveColumns(selected: string[], fields: CustomFieldDto[]): ColumnDef[] {
    const byKey = new Map(allColumns(fields).map((c) => [c.key, c]));
    const out: ColumnDef[] = [];
    for (const k of selected) {
        const c = byKey.get(k);
        if (c && !out.includes(c)) out.push(c);
    }
    if (!out.some((c) => c.key === 'title')) out.unshift(byKey.get('title')!);
    return out;
}

export const gridTemplate = (cols: ColumnDef[]) => cols.map((c) => c.width).join(' ');

/** Rough minimum table width so the table scrolls sideways instead of squashing. */
export function minTableWidth(cols: ColumnDef[]): number {
    return cols.reduce((sum, c) => sum + (parseInt(c.width.match(/\d+/)?.[0] ?? '120', 10) + 12), 32);
}

export function toggleColumn(selected: string[], key: string): string[] {
    if (key === 'title') return selected;
    return selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
}

export function moveColumn(selected: string[], key: string, dir: -1 | 1): string[] {
    const i = selected.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= selected.length) return selected;
    const next = [...selected];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
}

export type CustomValue = string | number | boolean | null | undefined;

export function formatCustom(field: CustomFieldDto, value: CustomValue): string {
    if (value === null || value === undefined || value === '') return field.type === 'checkbox' ? '—' : '—';
    switch (field.type) {
        case 'checkbox':
            return value === true ? '✓' : '—';
        case 'date':
            return shortDay(String(value));
        case 'number':
            return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 6 }).format(Number(value));
        default:
            return String(value);
    }
}

/** Turn the text typed in the "options" box into a clean list. */
export function parseOptions(raw: string): string[] {
    return [...new Set(raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))];
}
