import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import type { PageProps } from '@/types';
import AppLayout from './AppLayout';

const shell: PageProps = {
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

let props: PageProps & { counts?: { inbox: number } } = shell;

vi.mock('@/Components/MoodMark', () => ({ default: () => <span data-testid="mood" /> }));

vi.mock('@/runtime', async () => {
    const actual = await vi.importActual<typeof import('@/runtime')>('@/runtime');
    return {
        ...actual,
        usePage: () => ({ props, url: '/items', component: 'Items/Index' }),
    };
});

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, api: vi.fn() };
});

function renderShell() {
    return render(
        <MemoryRouter>
            <AppLayout>
                <p>Page</p>
            </AppLayout>
        </MemoryRouter>,
    );
}

describe('Inbox nav badge', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('shows counts.inbox from the current screen on both navs', async () => {
        props = { ...shell, counts: { inbox: 4 } };
        renderShell();
        await waitFor(() => {
            expect(screen.getAllByRole('link', { name: 'Inbox, 4 in Inbox' })).toHaveLength(2);
        });
        for (const link of screen.getAllByRole('link', { name: 'Inbox, 4 in Inbox' })) {
            expect(link.getAttribute('href')).toBe('/inbox');
            expect(link.textContent).toContain('4');
        }
        expect(api).not.toHaveBeenCalled();
    });

    it('hides the badge when the inbox is empty', async () => {
        props = { ...shell, counts: { inbox: 0 } };
        renderShell();
        await waitFor(() => {
            expect(screen.getAllByRole('link', { name: 'Inbox' })).toHaveLength(2);
        });
        expect(screen.queryByRole('link', { name: /in Inbox/ })).toBeNull();
        expect(api).not.toHaveBeenCalled();
    });

    it('loads the badge from GET /api/inbox when the screen has no count', async () => {
        props = shell;
        vi.mocked(api).mockResolvedValue({ inbox: [], someday: [], counts: { inbox: 2, someday: 1 } });
        renderShell();
        expect(await screen.findAllByRole('link', { name: 'Inbox, 2 in Inbox' })).toHaveLength(2);
        expect(api).toHaveBeenCalledWith('GET', '/inbox');
    });
});
