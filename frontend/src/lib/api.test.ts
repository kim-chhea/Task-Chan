import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, UNAUTHENTICATED_EVENT, api, apiProblem, apiUrl } from './api';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('api client', () => {
    beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
    afterEach(() => vi.unstubAllGlobals());

    const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

    it('returns the parsed body', async () => {
        fetchMock().mockResolvedValueOnce(json({ hello: 'world' }));
        expect(await api('GET', '/today')).toEqual({ hello: 'world' });
    });

    it('turns a network failure into ApiError status 0', async () => {
        fetchMock().mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await expect(api('GET', '/today')).rejects.toMatchObject({ status: 0 });
    });

    it('does not crash on an HTML error page', async () => {
        fetchMock().mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }));
        const err = (await api('GET', '/today').catch((e: unknown) => e)) as ApiError;
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(502);
    });

    it('surfaces the first validation message', async () => {
        fetchMock().mockResolvedValueOnce(json({ errors: { title: ['Give it a title.'] } }, 422));
        await expect(api('GET', '/items')).rejects.toThrow('Give it a title.');
    });

    it('announces a lost session on 401', async () => {
        const seen = vi.fn();
        window.addEventListener(UNAUTHENTICATED_EVENT, seen);
        fetchMock().mockResolvedValueOnce(json({ message: 'Unauthenticated.' }, 401));
        await expect(api('GET', '/today')).rejects.toMatchObject({ status: 401 });
        window.removeEventListener(UNAUTHENTICATED_EVENT, seen);
        expect(seen).toHaveBeenCalledTimes(1);
    });

    it('prefixes download links with the API origin', () => {
        expect(apiUrl('/api/attachments/3')).toMatch(/\/api\/attachments\/3$/);
    });

    it('reads a closed-registration message without inventing one', async () => {
        fetchMock().mockResolvedValueOnce(json({ message: 'Registration is closed.' }, 403));
        const err = await api('GET', '/register').catch((e: unknown) => e);
        expect(apiProblem(err)).toMatchObject({
            status: 403,
            message: 'Registration is closed.',
            fields: {},
            details: {},
        });
    });

    it('keeps every validation string and the summary message', async () => {
        fetchMock().mockResolvedValueOnce(json({
            message: 'The given data was invalid.',
            errors: {
                file: ['The file must be 10 MB or smaller.', 'This file type is not allowed.'],
                email: ['The email field is required.'],
            },
        }, 422));
        const err = await api('GET', '/items/1/attachments').catch((e: unknown) => e);
        const problem = apiProblem(err);
        expect(problem.status).toBe(422);
        expect(problem.message).toBe('The given data was invalid.');
        expect(problem.fields.file).toBe('The file must be 10 MB or smaller.');
        expect(problem.details.file).toEqual([
            'The file must be 10 MB or smaller.',
            'This file type is not allowed.',
        ]);
        expect(problem.fields.email).toBe('The email field is required.');
        expect(problem.message).not.toContain('{');
    });

    it('does not surface a raw throw', () => {
        expect(apiProblem(new Error('<html>secret</html>')).message).toBe('Something went wrong.');
    });

    it('replaces a blank 429 message with a sentence', async () => {
        fetchMock()
            .mockResolvedValueOnce(new Response(null, { status: 204 }))
            .mockResolvedValueOnce(json({ message: '' }, 429));
        const err = await api('POST', '/register', {}).catch((e: unknown) => e);
        const problem = apiProblem(err);
        expect(problem.status).toBe(429);
        expect(problem.stated).toBeNull();
        expect(problem.message).toBe('Please wait a moment and try again.');
        expect(problem.message).not.toContain('Request failed');
    });
});
