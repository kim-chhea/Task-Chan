import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from '@/runtime';
import Index from './Index';
import type { ItemDto } from '@/types';

vi.mock('@/Components/EmberEmpty', () => ({
    default: ({ children = 'Nothing here. Ember checked twice.' }: { children?: string }) => <div>{children}</div>,
}));

const VISIT = { preserveState: true, preserveScroll: true, replace: true, only: ['items', 'filters'] };

const item: ItemDto = {
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
};

const filters = { status: 'all', type: 'ticket', sector: 'all', range: 'all', q: '' };

function renderIndex(overrides: Partial<Parameters<typeof Index>[0]> = {}) {
    return render(
        <MemoryRouter>
            <Index
                items={[item]}
                filters={filters}
                total={10}
                matched={1}
                openTokens={40}
                sectors={['Banking']}
                fields={[]}
                columns={['number', 'title', 'type', 'status', 'sector']}
                {...overrides}
            />
        </MemoryRouter>,
    );
}

describe('All items search', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function searchBox() {
        return screen.getByRole('searchbox', { name: 'Search items' }) as HTMLInputElement;
    }

    it('shows filters.q in the field on load', () => {
        renderIndex({ filters: { ...filters, q: 'ledger' } });
        expect(searchBox().value).toBe('ledger');
        expect(screen.getByRole('button', { name: 'Clear search' })).toBeTruthy();
    });

    it('defaults a missing q to an empty field', () => {
        const get = vi.spyOn(router, 'get').mockImplementation(() => {});
        renderIndex({ filters: { ...filters, q: undefined as unknown as string } });
        expect(searchBox().value).toBe('');
        expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
        expect(get).not.toHaveBeenCalled();
    });

    it('debounces q into the same visit the other filters use', () => {
        vi.useFakeTimers();
        const get = vi.spyOn(router, 'get').mockImplementation(() => {});
        renderIndex();
        fireEvent.change(searchBox(), { target: { value: '  DGB  ' } });
        expect(get).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(299);
        });
        expect(get).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(get).toHaveBeenCalledTimes(1);
        expect(get).toHaveBeenCalledWith('/items', { ...filters, q: 'DGB' }, VISIT);
    });

    it('sends the draft q with the next filter and does not fire the debounce again', () => {
        vi.useFakeTimers();
        const get = vi.spyOn(router, 'get').mockImplementation(() => {});
        renderIndex({ filters: { ...filters, q: 'note' } });
        fireEvent.change(searchBox(), { target: { value: 'notebook' } });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        fireEvent.click(screen.getByRole('button', { name: 'In progress' }));
        expect(get).toHaveBeenCalledTimes(1);
        expect(get).toHaveBeenCalledWith('/items', { ...filters, status: 'in_progress', q: 'notebook' }, VISIT);
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('clears q immediately', () => {
        const get = vi.spyOn(router, 'get').mockImplementation(() => {});
        renderIndex({ filters: { ...filters, q: 'ledger' } });
        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
        expect(searchBox().value).toBe('');
        expect(get).toHaveBeenCalledWith('/items', { ...filters, q: '' }, VISIT);
    });

    it('says there are no matches for that search', () => {
        renderIndex({ items: [], matched: 0, filters: { ...filters, q: 'zzzz' } });
        expect(screen.getByText('No matches for “zzzz”.')).toBeTruthy();
    });

    it('keeps the usual empty copy when nothing is searched', () => {
        renderIndex({ items: [], matched: 0 });
        expect(screen.getByText('Nothing here. Ember checked twice.')).toBeTruthy();
    });

    it('keeps the newest-of-matched banner', () => {
        renderIndex({ matched: 8 });
        expect(screen.getByRole('status').textContent).toBe('Showing the newest 1 of 8. Use the filters to narrow the list.');
    });
});
