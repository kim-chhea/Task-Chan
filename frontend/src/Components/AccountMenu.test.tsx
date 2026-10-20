import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AccountMenu from './AccountMenu';

afterEach(() => cleanup());

function Location() {
    const { pathname } = useLocation();
    return <div data-testid="location">{pathname}</div>;
}

function renderMenu(onLogout = vi.fn(), path = '/today') {
    render(
        <MemoryRouter initialEntries={[path]}>
            <AccountMenu name="Mina Sato" onLogout={onLogout} />
            <Location />
            <Routes>
                <Route path="/profile" element={<p>Profile page</p>} />
                <Route path="*" element={null} />
            </Routes>
        </MemoryRouter>,
    );
    return onLogout;
}

function button() {
    return screen.getByRole('button', { name: 'Account menu for Mina Sato' });
}

function menu() {
    return document.getElementById(button().getAttribute('aria-controls') ?? '') as HTMLElement;
}

describe('AccountMenu', () => {
    it('uses a button that controls a closed menu', () => {
        renderMenu();
        const trigger = button();
        expect(trigger.tagName).toBe('BUTTON');
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
        expect(trigger.className).toContain('h-11');
        expect(trigger.className).toContain('w-11');
        const panel = menu();
        expect(panel.hasAttribute('hidden')).toBe(true);
        expect(panel.getAttribute('role')).toBe('menu');
    });

    it('opens Profile and Log out, both at least 44px tall', () => {
        renderMenu();
        fireEvent.click(button());
        expect(button().getAttribute('aria-expanded')).toBe('true');
        expect(menu().hasAttribute('hidden')).toBe(false);

        const profile = screen.getByRole('menuitem', { name: 'Profile' });
        const logout = screen.getByRole('menuitem', { name: 'Log out' });
        expect(profile.getAttribute('href')).toBe('/profile');
        expect(profile.className).toContain('min-h-[44px]');
        expect(logout.className).toContain('min-h-[44px]');
        expect(document.activeElement).toBe(profile);
    });

    it('logs out with the provided handler and closes', () => {
        const onLogout = renderMenu();
        fireEvent.click(button());
        fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }));
        expect(onLogout).toHaveBeenCalledOnce();
        expect(button().getAttribute('aria-expanded')).toBe('false');
    });

    it('closes on Escape and returns focus to the button', () => {
        renderMenu();
        const trigger = button();
        fireEvent.click(trigger);
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Profile' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(trigger);
    });

    it('closes when clicking outside and returns focus when that spot is not a control', () => {
        render(
            <MemoryRouter>
                <AccountMenu name="Mina Sato" onLogout={vi.fn()} />
                <div data-testid="blank">Notes</div>
            </MemoryRouter>,
        );
        const trigger = button();
        fireEvent.click(trigger);
        fireEvent.pointerDown(screen.getByTestId('blank'));
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(trigger);
    });

    it('does not steal focus when the outside click lands on another control', () => {
        render(
            <MemoryRouter>
                <AccountMenu name="Mina Sato" onLogout={vi.fn()} />
                <button type="button">
                    Next <span data-testid="next-label">page</span>
                </button>
            </MemoryRouter>,
        );
        fireEvent.click(button());
        const next = screen.getByRole('button', { name: 'Next page' });
        next.focus();
        fireEvent.pointerDown(screen.getByTestId('next-label'));
        expect(button().getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(next);
    });

    it('moves between items with the arrow keys', () => {
        renderMenu();
        fireEvent.click(button());
        const profile = screen.getByRole('menuitem', { name: 'Profile' });
        const logout = screen.getByRole('menuitem', { name: 'Log out' });
        fireEvent.keyDown(menu(), { key: 'ArrowDown' });
        expect(document.activeElement).toBe(logout);
        fireEvent.keyDown(menu(), { key: 'ArrowUp' });
        expect(document.activeElement).toBe(profile);
    });

    it('closes when navigating to Profile', () => {
        renderMenu();
        fireEvent.click(button());
        fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));
        expect(screen.getByTestId('location').textContent).toBe('/profile');
        expect(button().getAttribute('aria-expanded')).toBe('false');
    });
});
