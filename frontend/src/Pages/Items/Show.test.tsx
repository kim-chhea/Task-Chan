import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Show from './Show';

vi.mock('@/Components/NotesEditor', () => ({ default: () => <div>notes</div> }));

vi.mock('@/runtime', async () => {
    const actual = await vi.importActual<typeof import('@/runtime')>('@/runtime');
    return {
        ...actual,
        usePage: () => ({
            props: {
                auth: { user: { id: 1, name: 'Ada', email: 'ada@example.com' } },
                rules: { rewards: { low: 5, medium: 10, high: 15 }, early_bonus: 5 },
                game: {
                    balance: 10,
                    mascot: 'kai',
                    equipped: { hair: 'teal', outfit: 'black', gear: 'headphones', partner: 'ember', stage: 'paper' },
                    streak: 0,
                },
                catalog: {
                    hair: { teal: { name: 'Teal', price: 0, color: '#1E5F5B', hi: '#5FC8BE' } },
                    outfit: { black: { name: 'Black', price: 0, color: '#1C1D26', trim: '#FFD23F' } },
                    gear: {},
                    partner: {},
                    stage: {},
                },
            },
            url: '/items/1',
            component: 'Items/Show',
        }),
    };
});

const item = {
    id: 1,
    number: '0007',
    title: 'Write the spec',
    type: 'task' as const,
    status: 'not_started' as const,
    priority: 'medium' as const,
    sector: null,
    deadline: '2026-10-25',
    someday: false,
    received_at: '2026-10-20',
    completed_at: null,
    done: false,
    reward: 10,
    notes: null,
    sub_tasks: [{ id: 3, title: 'Outline the sections', done: false }],
    attachments: [{ id: 9, name: 'brief.pdf', size: 1200, mime: 'application/pdf', url: '/api/attachments/9' }],
    master_record: null,
    custom: {},
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function renderShow() {
    return render(
        <MemoryRouter>
            <Show item={item} linked={[]} linkable={[]} cases={[]} fields={[]} />
        </MemoryRouter>,
    );
}

describe('item attachments', () => {
    beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

    function rejectFile(messages: string[]) {
        fetchMock().mockImplementation((input: RequestInfo, init?: RequestInit) => {
            const url = String(input);
            const method = (init?.method ?? 'GET').toUpperCase();
            if (url.includes('csrf')) return Promise.resolve(new Response(null, { status: 204 }));
            if (method === 'POST' && url.includes('/attachments')) {
                return Promise.resolve(json({ message: 'The given data was invalid.', errors: { file: messages } }, 422));
            }
            return Promise.resolve(json({}));
        });
    }

    async function upload(name: string) {
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['hello'], name, { type: 'application/octet-stream' });
        Object.defineProperty(input, 'files', { configurable: true, value: [file] });
        fireEvent.change(input);
        return input;
    }

    it('hides the sub-task delete control only on devices that can hover', () => {
        renderShow();
        const button = screen.getByRole('button', { name: 'Delete sub-task Outline the sections' });
        expect(button.className).toContain('[@media(hover:hover)]:opacity-0');
        expect(button.className).toContain('[@media(hover:hover)]:group-hover:opacity-100');
        expect(button.className).toContain('focus-visible:opacity-100');
        expect(button.className).not.toContain('md:opacity-0');
    });

    it('gives the file delete control a 32px hit area', () => {
        renderShow();
        const button = screen.getByRole('button', { name: 'Delete brief.pdf' });
        expect(button.className).toContain('h-8');
        expect(button.className).toContain('w-8');
        expect(button.className).toContain('text-ink-3');
    });

    it('advertises the extensions the server allows', () => {
        renderShow();
        const accept = (document.querySelector('input[type="file"]') as HTMLInputElement).accept;
        for (const ext of ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.md', '.csv', '.docx', '.xlsx', '.zip']) {
            expect(accept).toContain(ext);
        }
    });

    it('blocks a disallowed type and an oversized file before the request', async () => {
        renderShow();
        await upload('notes.exe');
        expect((await screen.findByRole('alert')).textContent).toContain('This file type is not allowed.');
        expect(fetchMock()).not.toHaveBeenCalled();

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const big = new File(['x'], 'big.pdf', { type: 'application/pdf' });
        Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 });
        Object.defineProperty(input, 'files', { configurable: true, value: [big] });
        fireEvent.change(input);
        expect((await screen.findByRole('alert')).textContent).toContain('The file must be 10 MB or smaller.');
        expect(fetchMock()).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Drop files or browse' })).toBeTruthy();
    });

    it.each([
        'The file field is required.',
        'The file must be 10 MB or smaller.',
        'This file type is not allowed.',
    ])('shows the server file error %s and leaves the picker usable', async (message) => {
        rejectFile([message]);
        renderShow();
        await upload('notes.pdf');

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(message);
        expect(alert.textContent).not.toContain('{');
        expect(alert.textContent).not.toContain('Request failed');
        expect(screen.getByRole('button', { name: 'Drop files or browse' })).toBeTruthy();
    });

    it('explains when the file belongs to someone else', async () => {
        fetchMock().mockImplementation((input: RequestInfo, init?: RequestInit) => {
            const url = String(input);
            const method = (init?.method ?? 'GET').toUpperCase();
            if (url.includes('csrf')) return Promise.resolve(new Response(null, { status: 204 }));
            if (method === 'POST' && url.includes('/attachments')) {
                return Promise.resolve(json({ message: 'This action is unauthorized.' }, 403));
            }
            return Promise.resolve(json({}));
        });
        renderShow();
        await upload('notes.pdf');
        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain("You can't add files to this item.");
        expect(alert.textContent).not.toContain('unauthorized');
        expect(screen.getByRole('button', { name: 'Drop files or browse' })).toBeTruthy();
    });
});
