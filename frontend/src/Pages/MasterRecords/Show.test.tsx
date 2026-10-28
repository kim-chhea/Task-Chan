import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/Components/ui/Toast';
import { api } from '@/lib/api';
import { shortDay } from '@/lib/format';
import { router } from '@/runtime';
import type { CaseStats, ItemDto } from '@/types';
import Show from './Show';

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, api: vi.fn() };
});

const record = {
    id: 9,
    code: 'MR-7',
    title: 'Midterm',
    session_date: '2026-11-03',
    student_count: 40,
    notes: null,
};

function item(partial: Partial<ItemDto> & Pick<ItemDto, 'id' | 'title' | 'done'>): ItemDto {
    return {
        number: String(partial.id).padStart(4, '0'),
        type: 'task',
        status: partial.done ? 'done' : 'not_started',
        priority: 'medium',
        sector: null,
        deadline: null,
        someday: false,
        received_at: null,
        completed_at: null,
        reward: 10,
        ...partial,
    };
}

const items: ItemDto[] = [
    item({ id: 1, title: 'Print attendance', done: false, deadline: '2026-11-03' }),
    item({ id: 2, title: 'Pack the papers', done: false }),
    item({ id: 3, title: 'Collect scripts', done: false, deadline: '2026-11-10' }),
    item({ id: 4, title: 'Finished early', done: true, deadline: '2026-09-01' }),
    item({ id: 5, title: 'Room booked', done: true }),
];

const stats: CaseStats = { total: 5, open: 3, done: 2, next_deadline: '2026-11-03', open_tokens: 35 };

function renderShow(next: { items?: ItemDto[]; stats?: CaseStats } = {}) {
    return render(
        <MemoryRouter>
            <ToastProvider>
                <Show record={record} items={next.items ?? items} stats={next.stats ?? stats} />
            </ToastProvider>
        </MemoryRouter>,
    );
}

function statText(label: string) {
    const bar = screen.getByRole('region', { name: 'Case stats' });
    return within(bar).getByText(label).parentElement?.textContent ?? '';
}

describe('case dashboard and spawn', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders open, done, next deadline, and open tokens above the list', () => {
        renderShow();
        const bar = screen.getByRole('region', { name: 'Case stats' });
        expect(bar.className).toContain('grid-cols-1');
        expect(bar.className).toContain('lg:grid-cols-4');
        expect(statText('Open')).toContain('3');
        expect(statText('Done')).toContain('2');
        expect(statText('Next deadline')).toContain(shortDay('2026-11-03'));
        expect(statText('Open tokens')).toContain('35');
        expect(screen.getByRole('heading', { name: 'Linked items ×5' })).toBeTruthy();
        expect(screen.getByRole('link', { name: /Print attendance/ })).toBeTruthy();
        expect(screen.getByRole('link', { name: /Finished early/ })).toBeTruthy();
        const heading = screen.getByRole('heading', { name: 'MR-7 · Midterm' });
        expect(heading.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(bar.compareDocumentPosition(screen.getByRole('heading', { name: 'Linked items ×5' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('shows no date when the next open deadline is empty', () => {
        renderShow({
            items: [],
            stats: { total: 0, open: 0, done: 0, next_deadline: null, open_tokens: 0 },
        });
        expect(statText('Open')).toContain('0');
        expect(statText('Done')).toContain('0');
        expect(statText('Next deadline')).toContain('No date');
        expect(statText('Open tokens')).toContain('0');
        expect(screen.getByText('No items on this case yet. Add tasks above, or link one from an item page.')).toBeTruthy();
    });

    it('posts the spawn body for this case and reloads items and stats', async () => {
        vi.mocked(api).mockResolvedValue({
            items: [{ id: 6 }, { id: 7 }],
            record: { id: 9, code: 'MR-7', title: 'Midterm' },
            balance: 0,
            streak: 0,
        });
        const reload = vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderShow();

        const card = screen.getByRole('region', { name: 'Spawn pack' });
        expect(card.className).toContain('flex-col');
        expect(card.parentElement?.className).toContain('flex-col');
        expect(screen.getByLabelText('Task 1 title').closest('[data-line]')?.className).toContain('flex-col');
        const link = screen.getByRole('link', { name: /Print attendance/ });
        expect(link.className).toContain('flex-col');
        expect(link.className).toContain('sm:grid');

        fireEvent.change(screen.getByLabelText('Task 1 title'), { target: { value: 'Print attendance sheets' } });
        fireEvent.change(screen.getByLabelText('Task 1 date'), { target: { value: '2026-11-03' } });
        fireEvent.change(screen.getByLabelText('Task 2 title'), { target: { value: 'Collect scripts' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add tasks' }));

        expect(await screen.findByText('Added 2 tasks to MR-7.')).toBeTruthy();
        expect(api).toHaveBeenCalledWith('POST', '/master-records/9/spawn', {
            items: [
                { title: 'Print attendance sheets', deadline: '2026-11-03' },
                { title: 'Collect scripts' },
            ],
        });
        expect(reload).toHaveBeenCalledWith({ only: ['items', 'stats'] });
    });
});
