import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, UNAUTHENTICATED_EVENT, api, apiUrl } from './api';

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
});
