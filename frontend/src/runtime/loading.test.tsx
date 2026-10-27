import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';

const user = { id: 1, name: 'Mina Sato', email: 'mina@example.com', email_verified_at: null };

function bootstrap(loggedIn: boolean) {
    return {
        auth: { user: loggedIn ? user : null },
        canRegister: false,
        game: loggedIn
            ? {
                  balance: 42,
                  mascot: 'kai',
                  equipped: { hair: 'teal', outfit: 'black', gear: 'headphones', partner: 'ember', stage: 'paper' },
                  streak: 1,
              }
            : null,
        catalog: {
            hair: { teal: { name: 'Teal', price: 0, color: '#1E5F5B', hi: '#5FC8BE' } },
            outfit: { black: { name: 'Black hoodie', price: 0, color: '#1C1D26', trim: '#FFD23F' } },
            gear: { headphones: { name: 'Headphones', price: 0 } },
            partner: { ember: { name: 'Ember', price: 0 } },
            stage: { paper: { name: 'Paper', price: 0, color: '#EEF0F6', lines: 'rgba(0,0,0,0.08)' } },
        },
        rules: { rewards: { low: 5, medium: 10, high: 15 }, early_bonus: 5 },
    };
}

const todayBody = {
    today: '2026-10-27',
    groups: { due: [], in_progress: [], coming_up: [] },
    progress: { done: 0, total: 0 },
    week: [],
    weekRange: 'Oct 27',
    weekDone: 0,
};

const reviewBody = {
    range: 'Oct 27',
    finished: 1,
    earned: 5,
    openCount: 2,
    streak: { current: 1, length: 5 },
    done: [],
    carry: [],
    openTokens: 0,
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('route loading', () => {
    let todayHolds = 0;
    let reviewHolds = 0;
    let bootstrapHolds = 0;
    const todayWaiters: Array<(response: Response) => void> = [];
    const reviewWaiters: Array<(response: Response) => void> = [];
    const bootstrapWaiters: Array<(response: Response) => void> = [];

    beforeEach(() => {
        todayHolds = 0;
        reviewHolds = 0;
        bootstrapHolds = 0;
        todayWaiters.length = 0;
        reviewWaiters.length = 0;
        bootstrapWaiters.length = 0;
        vi.resetModules();
        vi.stubGlobal(
            'fetch',
            vi.fn(async (input: RequestInfo | URL) => {
                const path = new URL(String(input), 'http://localhost').pathname;
                if (path === '/sanctum/csrf-cookie') return new Response(null, { status: 204 });
                if (path === '/api/bootstrap') {
                    if (bootstrapHolds > 0) {
                        bootstrapHolds -= 1;
                        return new Promise<Response>((resolve) => bootstrapWaiters.push(resolve));
                    }
                    return json(bootstrap(true));
                }
                if (path === '/api/today') {
                    if (todayHolds > 0) {
                        todayHolds -= 1;
                        return new Promise<Response>((resolve) => todayWaiters.push(resolve));
                    }
                    return json(todayBody);
                }
                if (path === '/api/review') {
                    if (reviewHolds > 0) {
                        reviewHolds -= 1;
                        return new Promise<Response>((resolve) => reviewWaiters.push(resolve));
                    }
                    return json(reviewBody);
                }
                return json({ message: `unmocked ${path}` }, 500);
            }),
        );
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    async function mount(path = '/today') {
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

    function release(waiters: Array<(response: Response) => void>, body: unknown) {
        const resolve = waiters.shift();
        if (!resolve) throw new Error('nothing waiting to release');
        resolve(json(body));
    }

    it('shows the splash while bootstrap is still in flight', async () => {
        bootstrapHolds = 1;
        await mount();

        expect(await screen.findByRole('status', { name: 'Loading' })).toBeTruthy();
        expect(screen.getByText('Task-Chan')).toBeTruthy();
        expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
        expect(screen.queryByRole('heading', { name: /Today/ })).toBeNull();
    });

    it('keeps the shell visible after login while the first screen loads', async () => {
        todayHolds = 1;
        await mount();

        expect(await screen.findByRole('navigation', { name: 'Main' })).toBeTruthy();
        expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
        expect(screen.queryByRole('heading', { name: /Today/ })).toBeNull();

        release(todayWaiters, todayBody);
        expect(await screen.findByRole('heading', { name: /Today/ })).toBeTruthy();
        expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull();
    });

    it('shows the shell loader again when navigating to another screen', async () => {
        reviewHolds = 1;
        await mount();
        fireEvent.click(await screen.findByRole('link', { name: /Open weekly review/ }));

        expect(await screen.findByRole('status', { name: 'Loading' })).toBeTruthy();
        expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
        expect(screen.queryByLabelText('Quick add')).toBeNull();

        release(reviewWaiters, reviewBody);
        expect(await screen.findByRole('heading', { name: 'This week!' })).toBeTruthy();
        expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull();
    });

    it('shows a badge when a fetch keeps the current screen on screen', async () => {
        await mount();
        expect(await screen.findByRole('heading', { name: /Today/ })).toBeTruthy();

        todayHolds = 1;
        const { router } = await import('@/runtime');
        await act(async () => {
            router.get('/today', { x: '1' });
        });

        expect(await screen.findByRole('status', { name: 'Loading' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: /Today/ })).toBeTruthy();

        await act(async () => {
            release(todayWaiters, todayBody);
        });
        await waitFor(() => {
            expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull();
        });
        expect(screen.getByRole('heading', { name: /Today/ })).toBeTruthy();
    });
});
