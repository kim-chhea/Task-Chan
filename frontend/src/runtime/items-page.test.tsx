import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bootstrap = {
    auth: { user: { id: 1, name: 'Mina Sato', email: 'mina@example.com', email_verified_at: null } },
    canRegister: false,
    game: {
        balance: 42,
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

const items = [
    {
        id: 1,
        number: '0012',
        title: 'Ticket from DGB',
        type: 'ticket',
        status: 'in_progress',
        priority: 'high',
        sector: 'Banking',
        deadline: '2026-11-07',
        received_at: '2026-10-20',
        completed_at: null,
        done: false,
        reward: 15,
    },
    {
        id: 2,
        number: '0004',
        title: 'Order stationery',
        type: 'task',
        status: 'not_started',
        priority: 'low',
        sector: 'Admin',
        deadline: null,
        received_at: null,
        completed_at: null,
        done: false,
        reward: 5,
    },
];

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('All items search round-trip', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubGlobal(
            'fetch',
            vi.fn(async (input: RequestInfo | URL) => {
                const url = new URL(String(input), 'http://localhost');
                if (url.pathname === '/sanctum/csrf-cookie') return new Response(null, { status: 204 });
                if (url.pathname === '/api/bootstrap') return json(bootstrap);
                if (url.pathname === '/api/items') {
                    return json({
                        items,
                        filters: { status: 'all', type: 'all', sector: 'all', range: 'all' },
                        matched: items.length,
                        total: items.length,
                        openTokens: 20,
                        fields: [],
                        columns: ['number', 'title'],
                        sectors: ['Banking', 'Admin'],
                    });
                }
                return json({ message: `unmocked ${url.pathname}` }, 500);
            }),
        );
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    async function mount(path: string) {
        const { AppHost } = await import('@/runtime');
        function Host() {
            return <AppHost navigate={useNavigate()} />;
        }
        render(
            <MemoryRouter initialEntries={[path]}>
                <Host />
            </MemoryRouter>,
        );
    }

    it('shows the query from the URL and the rows that match, before the API echoes q', async () => {
        await mount('/items?q=DGB');
        const box = (await screen.findByRole('searchbox', { name: 'Search items' })) as HTMLInputElement;
        expect(box.value).toBe('DGB');
        expect(screen.getByText('Ticket from DGB')).toBeTruthy();
        expect(screen.queryByText('Order stationery')).toBeNull();
    });

    it('shows the no-matches line when the query hits nothing', async () => {
        await mount('/items?q=zzzz');
        expect(await screen.findByText('No matches for “zzzz”.')).toBeTruthy();
        expect(screen.queryByText('Ticket from DGB')).toBeNull();
    });
});
