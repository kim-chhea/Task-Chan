import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/Components/ui/Toast';
import { api } from '@/lib/api';
import type { FocusSession, ItemDto, PageProps, TodayResponse } from '@/types';
import Today from './Today';

const { reconcile } = vi.hoisted(() => ({ reconcile: vi.fn() }));

const pageProps: PageProps = {
    auth: { user: { id: 1, name: 'Mina Sato', email: 'mina@example.com' } },
    game: {
        balance: 10,
        mascot: 'kai',
        equipped: { hair: 'teal', outfit: 'black', gear: 'headphones', partner: 'ember', stage: 'paper' },
        streak: 1,
    },
    catalog: {
        hair: { teal: { name: 'Teal', price: 0, color: '#1E5F5B', hi: '#5FC8BE' } },
        outfit: { black: { name: 'Black hoodie', price: 0, color: '#1C1D26', trim: '#FFD23F' } },
        gear: { headphones: { name: 'Headphones', price: 0 } },
        partner: { ember: { name: 'Ember', price: 0 } },
        stage: { paper: { name: 'Paper', price: 0, color: '#EEF0F6', lines: 'rgba(0,0,0,0.08)' } },
    },
    rules: {
        rewards: { low: 5, medium: 10, high: 15 },
        early_bonus: 5,
        focus: { presets: [25, 50], bonuses: { '25': 10, '50': 20 }, daily_cap: 4 },
    },
};

vi.mock('@/runtime', async () => {
    const actual = await vi.importActual<typeof import('@/runtime')>('@/runtime');
    return {
        ...actual,
        usePage: () => ({ props: pageProps, url: '/today', component: 'Today' }),
    };
});

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, api: vi.fn() };
});

vi.mock('@/Components/GameContext', () => ({
    useGame: () => ({ balance: 10, gain: null, optimistic: vi.fn(), reconcile }),
}));

function item(overrides: Partial<ItemDto>): ItemDto {
    return {
        id: 8,
        number: '0008',
        title: 'Write the brief',
        type: 'task',
        status: 'not_started',
        priority: 'medium',
        sector: null,
        deadline: '2026-10-28',
        someday: false,
        received_at: null,
        completed_at: null,
        done: false,
        reward: 10,
        ...overrides,
    };
}

const openItem = item({ id: 8, title: 'Write the brief', done: false, status: 'not_started' });
const doneItem = item({ id: 9, number: '0009', title: 'Filed the form', done: true, status: 'done' });

const base: TodayResponse = {
    today: '2026-10-28',
    groups: { due: [doneItem], in_progress: [], coming_up: [openItem] },
    progress: { done: 1, total: 1 },
    week: [],
    weekRange: '27 Oct – 2 Nov',
    weekDone: 1,
    counts: { inbox: 0 },
};

function running(endsAt: string): FocusSession {
    return {
        id: 9,
        item_id: openItem.id,
        item: { id: openItem.id, number: openItem.number, title: openItem.title, type: 'task' },
        planned_minutes: 25,
        started_at: new Date().toISOString(),
        ends_at: endsAt,
        status: 'running',
        awarded_tokens: 0,
        bonus: 10,
    };
}

function renderToday() {
    return render(
        <MemoryRouter>
            <ToastProvider>
                <Today {...base} />
            </ToastProvider>
        </MemoryRouter>,
    );
}

describe('Today focus', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('offers preset bonuses from rules.focus.bonuses on open rows only', async () => {
        vi.mocked(api).mockImplementation(async (method: string, url: string) => {
            if (method === 'GET' && url === '/focus/active') return { session: null };
            if (method === 'POST' && url === '/focus/start') {
                return { session: running(new Date(Date.now() + 25 * 60 * 1000).toISOString()), balance: 10, streak: 1 };
            }
            return {};
        });

        renderToday();
        expect(screen.queryByRole('button', { name: 'Focus Filed the form' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Focus Write the brief' }));
        expect(screen.getByRole('button', { name: '25 min +10' })).toBeTruthy();
        expect(screen.getByRole('button', { name: '50 min +20' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: '25 min +10' }));
        await waitFor(() => {
            expect(api).toHaveBeenCalledWith('POST', '/focus/start', { item_id: 8, minutes: 25 });
        });
        expect(reconcile).toHaveBeenCalledWith(10);
        expect(reconcile.mock.calls.every((call) => call.length === 1)).toBe(true);
        expect(await screen.findByRole('dialog')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
        expect(api).not.toHaveBeenCalledWith('PATCH', expect.stringContaining('/status'), expect.anything());
    });

    it('restores a finished timer and claims without marking the item done', async () => {
        const session = running(new Date(Date.now() - 1000).toISOString());
        vi.mocked(api).mockImplementation(async (method: string, url: string) => {
            if (method === 'GET' && url === '/focus/active') return { session };
            if (method === 'POST' && url === '/focus/9/complete') {
                return { session: { ...session, status: 'completed', awarded_tokens: 10 }, balance: 30, awarded: 10, streak: 1 };
            }
            return {};
        });

        renderToday();
        fireEvent.click(await screen.findByRole('button', { name: 'Claim +10' }));
        await waitFor(() => {
            expect(api).toHaveBeenCalledWith('POST', '/focus/9/complete');
        });
        expect(reconcile).toHaveBeenCalledWith(30, 10);
        expect(await screen.findByText('+10 tokens for Focus.')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Mark done: Write the brief' })).toBeTruthy();
        expect(api).not.toHaveBeenCalledWith('PATCH', expect.stringContaining('/status'), expect.anything());
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });

    it('cancels a restored timer without a token gain', async () => {
        const session = running(new Date(Date.now() + 60_000).toISOString());
        vi.mocked(api).mockImplementation(async (method: string, url: string) => {
            if (method === 'GET' && url === '/focus/active') return { session };
            if (method === 'POST' && url === '/focus/9/cancel') {
                return { session: { ...session, status: 'canceled', awarded_tokens: 0 }, balance: 10, streak: 1 };
            }
            return {};
        });

        renderToday();
        expect(await screen.findByRole('dialog')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Claim/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => {
            expect(api).toHaveBeenCalledWith('POST', '/focus/9/cancel');
        });
        expect(reconcile).toHaveBeenCalledWith(10);
        expect(reconcile.mock.calls.some((call) => call.length > 1)).toBe(false);
        expect(await screen.findByText('Focus canceled. No tokens.')).toBeTruthy();
        expect(api).not.toHaveBeenCalledWith('POST', '/focus/9/complete');
    });
});
