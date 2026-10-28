import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import type { ItemStatus } from '@/types';
import Show from './Show';

vi.mock('@/Components/NotesEditor', () => ({ default: () => <div>notes</div> }));

vi.mock('@/runtime', async () => {
    const actual = await vi.importActual<typeof import('@/runtime')>('@/runtime');
    return {
        ...actual,
        usePage: () => ({
            props: {
                auth: { user: { id: 1, name: 'Ada', email: 'ada@example.com' } },
                rules: {
                    rewards: { low: 5, medium: 10, high: 15 },
                    early_bonus: 5,
                    focus: { presets: [25, 50], bonuses: { '25': 10, '50': 20 }, daily_cap: 4 },
                },
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
    title: 'Write the spec',
    type: 'task' as const,
    status: 'in_progress' as const,
    priority: 'medium' as const,
    sector: null,
    deadline: '2026-10-25',
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

function renderShow(status: ItemStatus = 'in_progress') {
    const done = status === 'done';
    return render(
        <MemoryRouter>
            <Show
                item={{ ...item, status, done, completed_at: done ? '2026-10-25' : null }}
                linked={[]}
                linkable={[]}
                cases={[]}
                fields={[]}
            />
        </MemoryRouter>,
    );
}

describe('item show focus', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('starts a preset on an open item and previews bonuses from string keys', async () => {
        vi.mocked(api).mockImplementation(async (method: string, url: string) => {
            if (method === 'GET' && url === '/focus/active') return { session: null };
            if (method === 'POST' && url === '/focus/start') {
                return {
                    session: {
                        id: 3,
                        item_id: 1,
                        item: { id: 1, number: '0007', title: 'Write the spec', type: 'task' },
                        planned_minutes: 50,
                        started_at: new Date().toISOString(),
                        ends_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
                        status: 'running',
                        awarded_tokens: 0,
                        bonus: 20,
                    },
                    balance: 10,
                    streak: 0,
                };
            }
            return {};
        });

        renderShow('in_progress');
        fireEvent.click(screen.getByRole('button', { name: 'Focus Write the spec' }));
        expect(screen.getByRole('button', { name: '25 min +10' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: '50 min +20' }));
        await waitFor(() => {
            expect(api).toHaveBeenCalledWith('POST', '/focus/start', { item_id: 1, minutes: 50 });
        });
        expect(await screen.findByRole('dialog')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
        expect(api).not.toHaveBeenCalledWith('PATCH', expect.stringContaining('/status'), expect.anything());
    });

    it('hides the focus control when the item is done', async () => {
        vi.mocked(api).mockResolvedValue({ session: null });
        renderShow('done');
        await waitFor(() => {
            expect(api).toHaveBeenCalledWith('GET', '/focus/active');
        });
        expect(screen.queryByRole('button', { name: /Focus/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
    });

    it('restores the running session on mount', async () => {
        vi.mocked(api).mockResolvedValue({
            session: {
                id: 3,
                item_id: 1,
                item: { id: 1, number: '0007', title: 'Write the spec', type: 'task' },
                planned_minutes: 25,
                started_at: new Date().toISOString(),
                ends_at: new Date(Date.now() + 60_000).toISOString(),
                status: 'running',
                awarded_tokens: 0,
                bonus: 10,
            },
        });
        renderShow('in_progress');
        expect(await screen.findByRole('heading', { name: '#0007 Write the spec' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    });
});
