import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/Components/ui/Toast';
import { ApiError, api } from '@/lib/api';
import { todayIso } from '@/lib/format';
import { daysFromToday } from '@/lib/triage';
import { router } from '@/runtime';
import type { InboxResponse, ItemDto } from '@/types';
import Inbox from './Inbox';

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, api: vi.fn() };
});

function item(partial: Partial<ItemDto> & Pick<ItemDto, 'id' | 'title' | 'someday'>): ItemDto {
    return {
        number: String(partial.id).padStart(4, '0'),
        type: 'task',
        status: 'not_started',
        priority: 'medium',
        sector: null,
        deadline: null,
        received_at: null,
        completed_at: null,
        done: false,
        reward: 10,
        ...partial,
    };
}

const loose = item({ id: 1, title: 'Loose note', someday: false });
const later = item({ id: 2, title: 'Later', someday: true });
const dated = item({ id: 3, title: 'Dated park', someday: true, deadline: '2026-11-01' });

const data: InboxResponse = {
    inbox: [loose],
    someday: [later, dated],
    counts: { inbox: 1, someday: 2 },
};

function renderInbox(props: InboxResponse = data) {
    return render(
        <MemoryRouter>
            <ToastProvider>
                <Inbox {...props} />
            </ToastProvider>
        </MemoryRouter>,
    );
}

describe('Inbox triage', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('opens on the Inbox tab and keeps Someday items off that list', () => {
        renderInbox();
        expect(screen.getByRole('button', { name: 'Inbox 1' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Someday 2' }).getAttribute('aria-pressed')).toBe('false');
        expect(screen.getByRole('link', { name: 'Loose note' }).getAttribute('href')).toBe('/items/1');
        expect(screen.queryByText('Later')).toBeNull();
        expect(screen.queryByText('Dated park')).toBeNull();
        expect(screen.getByRole('button', { name: 'Park Loose note for someday' })).toBeTruthy();
    });

    it('switches to Someday and offers a date or a return to the Inbox', () => {
        renderInbox();
        fireEvent.click(screen.getByRole('button', { name: 'Someday 2' }));
        expect(screen.getByRole('button', { name: 'Someday 2' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.queryByText('Loose note')).toBeNull();
        expect(screen.getByText('Later')).toBeTruthy();
        expect(screen.getByText('Dated park')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Send Later back to Inbox' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Schedule Dated park on 2026-11-01' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Park / })).toBeNull();
    });

    it('parks an inbox item with someday true and reloads both lists', async () => {
        vi.mocked(api).mockResolvedValue({});
        const reload = vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderInbox();
        fireEvent.click(screen.getByRole('button', { name: 'Park Loose note for someday' }));
        expect(await screen.findByText('Parked “Loose note” for someday.')).toBeTruthy();
        expect(api).toHaveBeenCalledWith('PATCH', '/items/1', { someday: true });
        expect(reload).toHaveBeenCalledWith({ only: ['inbox', 'someday', 'counts'] });
    });

    it('sets a deadline without sending someday', async () => {
        vi.mocked(api).mockResolvedValue({});
        vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderInbox();
        fireEvent.click(screen.getByRole('button', { name: 'Tomorrow for Loose note' }));
        expect(await screen.findByText(/Loose note/)).toBeTruthy();
        expect(api).toHaveBeenCalledWith('PATCH', '/items/1', { deadline: daysFromToday(1, todayIso()) });
        expect(vi.mocked(api).mock.calls[0][2]).not.toHaveProperty('someday');
    });

    it('sets a typed date from the date field', async () => {
        vi.mocked(api).mockResolvedValue({});
        vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderInbox();
        fireEvent.change(screen.getByLabelText('Due date for Loose note'), { target: { value: '2026-12-01' } });
        fireEvent.click(screen.getByRole('button', { name: 'Set date for Loose note' }));
        expect(await screen.findByText(/is due/)).toBeTruthy();
        expect(api).toHaveBeenCalledWith('PATCH', '/items/1', { deadline: '2026-12-01' });
    });

    it('schedules a dated someday item on the date it already has', async () => {
        vi.mocked(api).mockResolvedValue({});
        vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderInbox();
        fireEvent.click(screen.getByRole('button', { name: 'Someday 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Schedule Dated park on 2026-11-01' }));
        expect(await screen.findByText(/Dated park/)).toBeTruthy();
        expect(api).toHaveBeenCalledWith('PATCH', '/items/3', { deadline: '2026-11-01' });
    });

    it('sends an undated someday item back to the inbox', async () => {
        vi.mocked(api).mockResolvedValue({});
        const reload = vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderInbox();
        fireEvent.click(screen.getByRole('button', { name: 'Someday 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Send Later back to Inbox' }));
        expect(await screen.findByText('“Later” is back in the Inbox.')).toBeTruthy();
        expect(api).toHaveBeenCalledWith('PATCH', '/items/2', { someday: false });
        expect(reload).toHaveBeenCalledWith({ only: ['inbox', 'someday', 'counts'] });
    });

    it('shows the API error and does not reload', async () => {
        vi.mocked(api).mockRejectedValue(new ApiError(422, 'That date is not allowed.'));
        const reload = vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderInbox();
        fireEvent.click(screen.getByRole('button', { name: 'Today for Loose note' }));
        expect(await screen.findByText('That date is not allowed.')).toBeTruthy();
        expect(reload).not.toHaveBeenCalled();
    });

    it('ignores a second click while the first patch is in flight', async () => {
        let release: (value: unknown) => void = () => {};
        vi.mocked(api).mockImplementation(() => new Promise((resolve) => { release = resolve; }));
        vi.spyOn(router, 'reload').mockResolvedValue(undefined);
        renderInbox();
        const park = screen.getByRole('button', { name: 'Park Loose note for someday' });
        fireEvent.click(park);
        fireEvent.click(park);
        expect(api).toHaveBeenCalledTimes(1);
        release({});
        expect(await screen.findByText('Parked “Loose note” for someday.')).toBeTruthy();
    });

    it('explains an empty list', () => {
        renderInbox({ inbox: [], someday: [], counts: { inbox: 0, someday: 0 } });
        expect(screen.getByText('Inbox is clear. A new item with no date lands here.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Someday 0' }));
        expect(screen.getByText('Nothing is parked for someday.')).toBeTruthy();
    });
});
