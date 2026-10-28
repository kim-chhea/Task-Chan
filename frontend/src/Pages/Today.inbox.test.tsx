import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { router } from '@/runtime';
import type { ItemDto, PageProps, TodayResponse } from '@/types';
import Today from './Today';

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
    rules: { rewards: { low: 5, medium: 10, high: 15 }, early_bonus: 5 },
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

const scheduled: ItemDto = {
    id: 8,
    number: '0008',
    title: 'Write the brief',
    type: 'task',
    status: 'not_started',
    priority: 'medium',
    sector: null,
    deadline: '2026-11-02',
    someday: false,
    received_at: null,
    completed_at: null,
    done: false,
    reward: 10,
};

const base: TodayResponse = {
    today: '2026-10-28',
    groups: { due: [], in_progress: [], coming_up: [scheduled] },
    progress: { done: 0, total: 0 },
    week: [],
    weekRange: '27 Oct – 2 Nov',
    weekDone: 0,
    counts: { inbox: 2 },
};

function renderToday(overrides: Partial<TodayResponse> = {}) {
    return render(
        <MemoryRouter>
            <Today {...base} {...overrides} />
        </MemoryRouter>,
    );
}

describe('Today inbox chip', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('links to Inbox with counts.inbox, not the length of coming up', () => {
        renderToday();
        const chip = screen.getByRole('link', { name: '2 items waiting in Inbox' });
        expect(chip.getAttribute('href')).toBe('/inbox');
        expect(screen.getByText('Write the brief')).toBeTruthy();
    });

    it('still links when the inbox is empty', () => {
        renderToday({ counts: { inbox: 0 } });
        expect(screen.getByRole('link', { name: 'Inbox is clear' }).getAttribute('href')).toBe('/inbox');
    });

    it('hides the chip when the payload has no inbox count', () => {
        renderToday({ counts: undefined as unknown as TodayResponse['counts'] });
        expect(screen.getByRole('heading', { name: /Today/ })).toBeTruthy();
        expect(screen.queryByRole('link', { name: /Inbox/ })).toBeNull();
    });

    it('reloads counts after a quick add so the chip can catch a new undated item', async () => {
        vi.mocked(api).mockResolvedValue({});
        const reload = vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderToday();
        fireEvent.change(screen.getByLabelText('Quick add'), { target: { value: 'Buy milk' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add ↵' }));
        await waitFor(() => {
            expect(reload).toHaveBeenCalledWith({ only: ['groups', 'progress', 'week', 'weekDone', 'game', 'counts'] });
        });
        expect(api).toHaveBeenCalledWith('POST', '/items', expect.objectContaining({ title: 'Buy milk', deadline: null }));
    });
});
