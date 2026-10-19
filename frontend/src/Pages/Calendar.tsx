import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Head, Link, router } from '@/runtime';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useToast } from '@/Components/ui/Toast';
import AppLayout, { PageHeader } from '@/Layouts/AppLayout';
import { api, ApiError } from '@/lib/api';
import { shortDay } from '@/lib/format';

type View = 'month' | 'week' | 'day';
interface CalItem { id: number; number: string; title: string; date: string; kind: 'item' | 'done' }
interface CalExam { id: number; code: string; title: string; date: string; students: number | null }
interface Props {
    view: View; date: string; month: string; title: string; subtitle: string;
    gridStart: string; dayCount: number; prev: string; next: string; today: string;
    items: CalItem[]; exams: CalExam[];
}

const DOWS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VIEWS: [View, string][] = [['month', 'Month'], ['week', 'Week'], ['day', 'Day']];

function addDays(iso: string, n: number) {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

export default function Calendar({ view, date, month, title, subtitle, gridStart, dayCount, prev, next, today, items, exams }: Props) {
    const toast = useToast();
    const [local, setLocal] = useState(items);
    const [landed, setLanded] = useState<number | null>(null);
    const [active, setActive] = useState<CalItem | null>(null);
    const [loading, setLoading] = useState(false);
    const timer = useRef<number>(0);
    useEffect(() => setLocal(items), [items]);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    useEffect(() => {
        const off = [router.on('start', () => setLoading(true)), router.on('finish', () => setLoading(false))];
        return () => off.forEach((f) => f());
    }, []);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
    const cells = useMemo(() => Array.from({ length: dayCount }, (_, i) => addDays(gridStart, i)), [gridStart, dayCount]);

    const go = (v: View, d: string) => router.get('/calendar', { view: v, date: d }, { preserveScroll: true });

    async function onDragEnd(e: DragEndEvent) {
        setActive(null);
        const item = local.find((i) => `item-${i.id}` === String(e.active.id));
        const target = e.over ? String(e.over.id).replace('day-', '') : null;
        if (!item || !target || item.date === target) return;

        const before = local;
        setLocal((l) => l.map((i) => (i.id === item.id ? { ...i, date: target } : i))); // optimistic
        setLanded(item.id);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setLanded(null), 2200);
        try {
            await api('PATCH', `/items/${item.id}`, { deadline: target });
            toast(`#${item.number} moved to ${shortDay(target)}. Ember approves!`);
        } catch (err) {
            setLocal(before);
            toast(err instanceof ApiError ? err.message : 'Could not move that item.');
        }
    }

    const cols = view === 'day' ? 'grid-cols-1' : 'grid-cols-7';
    const minH = view === 'month' ? 'min-h-[128px]' : view === 'week' ? 'min-h-[320px]' : 'min-h-[360px]';

    return (
        <>
            <Head title="Calendar" />
            <PageHeader eyebrow="Schedule · drag an item to another day" title={<>{title} <span className="text-accent">{subtitle}</span></>} accent="">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex gap-1 rounded-[11px] border-2 border-ink bg-white p-1">
                        <button type="button" aria-label={`Previous ${view}`} onClick={() => go(view, prev)} className="min-h-9 rounded-lg px-3 font-bold">‹</button>
                        <button type="button" onClick={() => go(view, today)} className="min-h-9 rounded-lg px-3 text-[13px] font-bold">Today</button>
                        <button type="button" aria-label={`Next ${view}`} onClick={() => go(view, next)} className="min-h-9 rounded-lg px-3 font-bold">›</button>
                    </div>
                    <div role="group" aria-label="View" className="inline-flex rounded-[11px] border-2 border-ink bg-white p-1">
                        {VIEWS.map(([v, label]) => (
                            <button key={v} type="button" aria-pressed={view === v} onClick={() => go(v, date)} className={`min-h-9 rounded-lg px-3.5 text-[13px] font-bold ${view === v ? 'bg-ink text-white' : 'text-ink-2'}`}>{label}</button>
                        ))}
                    </div>
                </div>
            </PageHeader>

            <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActive(local.find((i) => `item-${i.id}` === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
                <div aria-busy={loading} className={`rise overflow-x-auto rounded-[18px] border-2.5 border-ink bg-white shadow-hard transition-opacity ${loading ? 'opacity-60' : ''}`} style={{ animationDelay: '0.1s' }}>
                    <div className={view === 'day' ? '' : 'min-w-[760px]'}>
                        {view !== 'day' && (
                            <div className="grid grid-cols-7 border-b-2.5 border-ink bg-paper-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                                {DOWS.map((d) => <span key={d} className="px-3 py-2.5">{d}</span>)}
                            </div>
                        )}
                        <div className={`grid ${cols}`}>
                            {cells.map((d, i) => (
                                <Day key={d} date={d} index={i} cols={view === 'day' ? 1 : 7} minH={minH} showWeekday={view === 'day'}
                                    inMonth={view !== 'month' || d.slice(0, 7) === month} isToday={d === today} lastRow={i >= cells.length - (view === 'day' ? 1 : 7)}
                                    items={local.filter((x) => x.date === d)} exams={exams.filter((x) => x.date === d)} landed={landed} />
                            ))}
                        </div>
                    </div>
                </div>
                <DragOverlay>{active && <Chip item={active} overlay />}</DragOverlay>
            </DndContext>

            <div className="flex flex-wrap items-center gap-5 text-[13px] font-semibold">
                <Legend color="bg-accent-soft" label="Item deadline" />
                <Legend color="bg-sun-soft" label="Exam session (master record)" />
                <Legend color="bg-mint-soft" label="Done" />
            </div>
        </>
    );
}

function Legend({ color, label }: { color: string; label: string }) {
    return <span className="inline-flex items-center gap-2"><span className={`h-3.5 w-3.5 rounded border-2 border-ink ${color}`} />{label}</span>;
}

function Day({ date, index, cols, minH, showWeekday, inMonth, isToday, lastRow, items, exams, landed }: {
    date: string; index: number; cols: number; minH: string; showWeekday: boolean; inMonth: boolean; isToday: boolean; lastRow: boolean;
    items: CalItem[]; exams: CalExam[]; landed: number | null;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: `day-${date}` });
    const n = Number(date.slice(8));
    return (
        <div
            ref={setNodeRef}
            className={`flex ${minH} min-w-0 flex-col gap-1.5 p-2.5 transition-colors ${index % cols !== cols - 1 ? 'border-r-[1.5px] border-paper-3' : ''} ${!lastRow ? 'border-b-[1.5px] border-paper-3' : ''} ${isOver ? 'bg-accent-soft outline-dashed outline-[2.5px] -outline-offset-[5px] outline-accent' : !inMonth ? 'bg-[#F7F7FA]' : ''}`}
        >
            <span className={`inline-flex h-7 min-w-7 items-center justify-center self-start rounded-full px-1 text-[13px] font-bold ${isToday ? 'today-pulse border-2 border-ink bg-accent text-white' : inMonth ? '' : 'text-[#9A9DAD]'}`} aria-label={isToday ? `${n}, today` : undefined}>
                {showWeekday ? shortDay(date) : n}
            </span>
            {items.map((it) => <DraggableChip key={it.id} item={it} landed={landed === it.id} />)}
            {exams.map((x) => (
                <Link key={x.id} href={`/master-records/${x.id}`} className="-rotate-1 flex min-h-7 items-center gap-1.5 overflow-hidden rounded-[7px] border-2 border-ink bg-sun-soft px-2 text-xs font-semibold text-ink no-underline">
                    <span className="font-mono">{x.code}</span><span className="truncate">Exam{x.students != null ? ` · ${x.students} students` : ''}</span>
                </Link>
            ))}
        </div>
    );
}

function DraggableChip({ item, landed }: { item: CalItem; landed: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `item-${item.id}` });
    return (
        <div ref={setNodeRef} {...attributes} {...listeners} className={landed ? 'land' : ''} style={{ opacity: isDragging ? 0.35 : 1, touchAction: 'none' }}>
            <Chip item={item} />
        </div>
    );
}

function Chip({ item, overlay }: { item: CalItem; overlay?: boolean }) {
    return (
        <div className={`flex min-h-7 cursor-grab items-center gap-1.5 overflow-hidden rounded-[7px] border-2 border-ink px-2 text-xs font-semibold active:cursor-grabbing ${item.kind === 'done' ? 'bg-mint-soft text-ink-2 line-through' : 'bg-accent-soft text-ink'} ${overlay ? 'shadow-hard-sm' : ''}`}>
            <Link href={`/items/${item.id}`} onPointerDown={(e) => e.stopPropagation()} className="font-mono text-ink no-underline">#{item.number}</Link>
            <span className="truncate">{item.title}</span>
        </div>
    );
}

Calendar.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
