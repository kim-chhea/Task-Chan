import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

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

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** 204 whose body is null, matching logout's empty response. */
function empty204() {
    return new Response(null, { status: 204 });
}

describe('logout', () => {
    let loggedIn = true;
    let logoutStatus: 204 | 401 = 204;
    const parsed: string[] = [];
    const calls: string[] = [];

    beforeEach(() => {
        loggedIn = true;
        logoutStatus = 204;
        parsed.length = 0;
        calls.length = 0;
        vi.resetModules();
        const parse = JSON.parse;
        vi.spyOn(JSON, 'parse').mockImplementation((text: string, ...rest) => {
            parsed.push(String(text));
            return parse(text, ...rest);
        });
        vi.stubGlobal(
            'fetch',
            vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
                const path = new URL(String(input), 'http://localhost').pathname;
                const method = (init?.method ?? 'GET').toUpperCase();
                calls.push(`${method} ${path}`);
                if (path === '/api/user' || path === '/api/me') return json({ message: 'no such route' }, 404);
                if (method === 'GET' && path === '/sanctum/csrf-cookie') return empty204();
                if (method === 'GET' && path === '/api/bootstrap') return json(bootstrap(loggedIn));
                if (method === 'GET' && path === '/api/profile') {
                    if (!loggedIn) return json({ message: 'Unauthenticated.' }, 401);
                    return json({ mustVerifyEmail: false });
                }
                if (method === 'POST' && path === '/api/logout') {
                    loggedIn = false;
                    if (logoutStatus === 204) return empty204();
                    return json({ message: 'Unauthenticated.' }, 401);
                }
                return json({ message: `unmocked ${method} ${path}` }, 500);
            }),
        );
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    async function mount() {
        const { AppHost, route } = await import('@/runtime');
        window.route = route;
        function Host() {
            const navigate = useNavigate();
            const { pathname } = useLocation();
            return (
                <>
                    <div data-testid="path">{pathname}</div>
                    <AppHost navigate={navigate} />
                </>
            );
        }
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Host />
            </MemoryRouter>,
        );
    }

    async function seeAccount() {
        const trigger = await screen.findByRole('button', { name: 'Account menu for Mina Sato' });
        expect(trigger.textContent).toBe('M');
        expect(screen.getByRole('button', { name: 'Log out · Mina Sato' })).toBeTruthy();
        expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Mina Sato');
        return trigger;
    }

    async function expectLoggedOut() {
        expect(await screen.findByLabelText('Email')).toBeTruthy();
        expect(screen.getByTestId('path').textContent).toBe('/login');
        expect(screen.queryByRole('button', { name: 'Account menu for Mina Sato' })).toBeNull();
        expect(screen.queryByDisplayValue('Mina Sato')).toBeNull();
        expect(calls.some((c) => c === '/api/user' || c === '/api/me' || c.endsWith('/api/user') || c.endsWith('/api/me'))).toBe(false);
    }

    it('logs out from the sidebar on 204 with an empty body', async () => {
        await mount();
        await seeAccount();
        fireEvent.click(screen.getByRole('button', { name: 'Log out · Mina Sato' }));
        await expectLoggedOut();
        expect(calls).toContain('POST /api/logout');
        expect(parsed.some((text) => text.trim() === '')).toBe(false);
    });

    it('logs out from the mobile account menu the same way', async () => {
        await mount();
        fireEvent.click(await seeAccount());
        fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
        await expectLoggedOut();
        expect(calls).toContain('POST /api/logout');
    });

    it('sends a guest 401 to /login with the user cleared', async () => {
        logoutStatus = 401;
        await mount();
        await seeAccount();
        fireEvent.click(screen.getByRole('button', { name: 'Log out · Mina Sato' }));
        await expectLoggedOut();
    });
});
