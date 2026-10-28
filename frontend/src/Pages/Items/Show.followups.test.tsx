import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/Components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { daysFromToday } from '@/lib/triage';
import { shortDay, todayIso } from '@/lib/format';
import { router } from '@/runtime';
import type { ItemType } from '@/types';
import Show from './Show';

vi.mock('@/Components/NotesEditor', () => ({ default: () => <div>notes</div> }));

vi.mock('@/runtime', async () => {
    const actual = await vi.importActual<typeof import('@/runtime')>('@/runtime');
    return {
        ...actual,
        usePage: () => ({
            props: {
                auth: { user: { id: 1, name: 'Ada', email: 'ada@example.com' } },
                rules: { rewards: { low: 5, medium: 10, high: 15 }, early_bonus: 5 },
                game: {
                    balance: 10,
                    mascot: 'kai',
                    equipped: { hair: 'teal', outfit: 'black', gear: 'headphones', partner: 'ember', stage: 'paper' },
                    streak: 0,
                },
                catalog: {
                    hair: { teal: { name: 'Teal', price: 0, color: '#1E5F5B', hi: '#5FC8BE' } },
                    outfit: { black: { name: 'Black', price: 0, color: '#1C1D26', trim: '#FFD23F' } },
                    gear: {},
                    partner: {},
                    stage: {},
                },
            },
            url: '/items/1',
            component: 'Items/Show',
        }),
    };
});

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, api: vi.fn() };
});

const item = {
    id: 1,
    number: '0007',
    title: 'Lecture recap',
    type: 'meeting' as const,
    status: 'not_started' as const,
    priority: 'medium' as const,
    sector: null,
    deadline: '2026-10-20',
    someday: false,
    received_at: '2026-10-20',
    completed_at: null,
    done: false,
    reward: 10,
    notes: null,
    sub_tasks: [],
    attachments: [],
    master_record: null,
    custom: {},
};

function renderShow(type: ItemType = 'meeting') {
    return render(
        <MemoryRouter>
            <ToastProvider>
                <Show item={{ ...item, type }} linked={[]} linkable={[]} cases={[]} fields={[]} />
            </ToastProvider>
        </MemoryRouter>,
    );
}

describe('meeting follow-ups', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it.each(['task', 'ticket', 'request'] as const)('hides the follow-ups card on a %s', (type) => {
        renderShow(type);
        expect(screen.queryByRole('region', { name: 'Follow-ups' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Add follow-ups' })).toBeNull();
    });

    it('stacks the card and shows an undated line as Inbox', () => {
        renderShow();
        const card = screen.getByRole('region', { name: 'Follow-ups' });
        expect(card.className).toContain('flex-col');
        expect(screen.getByLabelText('Follow-up 1 title').closest('[data-line]')?.className).toContain('flex-col');
        expect(screen.getAllByText('No date · Inbox')).toHaveLength(2);
        const page = [...document.querySelectorAll('div')].find((el) => el.className.includes('lg:grid-cols-[minmax(0,1fr)_340px]'));
        expect(page?.className).toContain('grid-cols-1');
    });

    it('posts two follow-ups, keeps a blank date out of the body, and reloads linked items', async () => {
        vi.mocked(api).mockResolvedValue({
            items: [{ id: 2 }, { id: 3 }],
            linked_to: { id: 1, number: '0007', title: 'Lecture recap', type: 'meeting' },
            balance: 10,
            streak: 0,
        });
        const reload = vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderShow();

        fireEvent.change(screen.getByLabelText('Follow-up 1 title'), { target: { value: 'Send notes to class' } });
        fireEvent.change(screen.getByLabelText('Follow-up 1 date'), { target: { value: '2026-11-01' } });
        fireEvent.change(screen.getByLabelText('Follow-up 2 title'), { target: { value: 'Book the room' } });
        expect(screen.getByText(`Due ${shortDay('2026-11-01')} · Today and the calendar`)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Add follow-ups' }));

        expect(await screen.findByText('Added 2 follow-ups, linked to this meeting.')).toBeTruthy();
        expect(api).toHaveBeenCalledWith('POST', '/items/1/follow-ups', {
            items: [
                { title: 'Send notes to class', deadline: '2026-11-01' },
                { title: 'Book the room' },
            ],
        });
        expect(reload).toHaveBeenCalledWith({ only: ['linked'] });
        expect((screen.getByLabelText('Follow-up 1 title') as HTMLInputElement).value).toBe('');
    });

    it('uses a date preset and can clear it back to Inbox', () => {
        renderShow();
        fireEvent.click(screen.getByRole('button', { name: 'Tomorrow for follow-up 1' }));
        const date = screen.getByLabelText('Follow-up 1 date') as HTMLInputElement;
        expect(date.value).toBe(daysFromToday(1, todayIso()));
        fireEvent.click(screen.getByRole('button', { name: 'No date for follow-up 1' }));
        expect(date.value).toBe('');
    });

    it('keeps the lines when the meeting request fails', async () => {
        vi.mocked(api).mockRejectedValue(new ApiError(422, 'Follow-ups only work on Meeting items.'));
        renderShow();
        fireEvent.change(screen.getByLabelText('Follow-up 1 title'), { target: { value: 'Send notes to class' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add follow-ups' }));
        expect(await screen.findByText('Follow-ups only work on Meeting items.')).toBeTruthy();
        expect((screen.getByLabelText('Follow-up 1 title') as HTMLInputElement).value).toBe('Send notes to class');
    });
});
