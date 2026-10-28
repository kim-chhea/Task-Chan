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
    someday: false,
    received_at: '2026-10-20',
    completed_at: null,
    done: false,
    reward: 15,
};

const filters = { status: 'all', type: 'ticket', sector: 'all', range: 'all', q: '', sort: null, dir: null };

function page(overrides: Partial<Parameters<typeof Index>[0]> = {}) {
    return (
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
        </MemoryRouter>
    );
}

function renderIndex(overrides: Partial<Parameters<typeof Index>[0]> = {}) {
    return render(page(overrides));
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

    it('puts search on its own row until the screen is wide', () => {
        renderIndex();
        const row = searchBox().parentElement?.parentElement;
        expect(row?.className).toContain('flex-col');
        expect(row?.className).toContain('sm:flex-row');
        expect(searchBox().parentElement?.className).toContain('w-full');
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

describe('All items header sort', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function header(name: string) {
        return screen.getByRole('columnheader', { name });
    }

    it('cycles a column ascending, then descending, then back to the default order', () => {
        const get = vi.spyOn(router, 'get').mockImplementation(() => {});
        const view = renderIndex();

        expect(header('Title').getAttribute('aria-sort')).toBe('none');
        expect(header('Title').querySelector('[data-sort-dir]')).toBeNull();

        fireEvent.click(header('Title'));
        expect(get).toHaveBeenCalledTimes(1);
        expect(get).toHaveBeenCalledWith('/items', { ...filters, sort: 'title', dir: 'asc' }, VISIT);

        view.rerender(page({ filters: { ...filters, sort: 'title', dir: 'asc' } }));
        expect(header('Title').getAttribute('aria-sort')).toBe('ascending');
        expect(header('Title').querySelector('[data-sort-dir="asc"]')).toBeTruthy();
        expect(header('Status').getAttribute('aria-sort')).toBe('none');
        expect(header('No.').querySelector('[data-sort-dir]')).toBeNull();

        fireEvent.click(header('Title'));
        expect(get).toHaveBeenLastCalledWith('/items', { ...filters, sort: 'title', dir: 'desc' }, VISIT);

        view.rerender(page({ filters: { ...filters, sort: 'title', dir: 'desc' } }));
        expect(header('Title').getAttribute('aria-sort')).toBe('descending');
        expect(header('Title').querySelector('[data-sort-dir="desc"]')).toBeTruthy();

        fireEvent.click(header('Title'));
        expect(get).toHaveBeenLastCalledWith('/items', { ...filters, sort: null, dir: null }, VISIT);

        view.rerender(page({ filters }));
        expect(header('Title').getAttribute('aria-sort')).toBe('none');
        expect(header('Title').querySelector('[data-sort-dir]')).toBeNull();
    });

    it('starts the next column at ascending', () => {
        const get = vi.spyOn(router, 'get').mockImplementation(() => {});
        renderIndex({ filters: { ...filters, sort: 'title', dir: 'desc' } });
        fireEvent.click(header('No.'));
        expect(get).toHaveBeenCalledWith('/items', { ...filters, sort: 'number', dir: 'asc' }, VISIT);
    });

    it('keeps sort and dir when status, type, sector, range, or search change', () => {
        vi.useFakeTimers();
        const get = vi.spyOn(router, 'get').mockImplementation(() => {});
        const sorted = { ...filters, sort: 'deadline', dir: 'asc' as const };
        renderIndex({ filters: sorted, columns: ['number', 'title', 'type', 'status', 'sector', 'deadline'] });

        fireEvent.click(screen.getByRole('button', { name: 'Request' }));
        expect(get).toHaveBeenLastCalledWith('/items', { ...sorted, type: 'request' }, VISIT);

        fireEvent.click(screen.getByRole('button', { name: 'Next 30 days' }));
        expect(get).toHaveBeenLastCalledWith('/items', { ...sorted, range: '30' }, VISIT);

        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(get).toHaveBeenLastCalledWith('/items', { ...sorted, status: 'done' }, VISIT);

        fireEvent.change(screen.getByLabelText('Sector'), { target: { value: 'Banking' } });
        expect(get).toHaveBeenLastCalledWith('/items', { ...sorted, sector: 'Banking' }, VISIT);

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), { target: { value: 'ledger' } });
        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(get).toHaveBeenLastCalledWith('/items', { ...sorted, q: 'ledger' }, VISIT);
    });

    it('does not send sort from reward or custom headers', () => {
        const get = vi.spyOn(router, 'get').mockImplementation(() => {});
        renderIndex({
            columns: ['title', 'reward', 'cf:7'],
            fields: [{ id: 7, name: 'Client', type: 'text', options: [] }],
        });

        const reward = header('Reward');
        const client = header('Client');
        expect(reward.tagName).toBe('SPAN');
        expect(client.tagName).toBe('SPAN');
        expect(reward.hasAttribute('aria-sort')).toBe(false);
        expect(client.hasAttribute('aria-sort')).toBe(false);
        expect(header('Title').tagName).toBe('BUTTON');

        fireEvent.click(reward);
        fireEvent.click(client);
        expect(get).not.toHaveBeenCalled();
    });
});
