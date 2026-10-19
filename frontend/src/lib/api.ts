export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data: Record<string, unknown> = {},
    ) {
        super(message);
    }
}

/** Empty in dev (Vite proxies /api and /sanctum to the Laravel backend). Set VITE_API_URL when the API lives on another origin. */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Fired when the server says the session is gone, so the app can send the user back to the login screen. */
export const UNAUTHENTICATED_EVENT = 'worktracker:unauthenticated';

/** Absolute-enough URL for a path the browser opens itself (downloads), e.g. `/api/attachments/3`. */
export function apiUrl(path: string): string {
    return `${BASE}${path}`;
}

function xsrf(): string {
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
}

let csrfReady: Promise<unknown> | null = null;

/** Sanctum SPA auth: fetch the XSRF cookie once before the first state-changing request. */
function ensureCsrf(force = false): Promise<unknown> {
    if (force || !csrfReady) {
        csrfReady = fetch(`${BASE}/sanctum/csrf-cookie`, { credentials: 'include' }).catch((e) => {
            csrfReady = null;
            throw e;
        });
    }
    return csrfReady;
}

const OFFLINE = 'Cannot reach the server. Check your connection and try again.';

/**
 * JSON call to the Laravel API using the session cookie (Sanctum stateful SPA mode).
 * Always resolves with the parsed body or throws ApiError (status 0 when the server cannot be reached).
 */
export async function api<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<T> {
    const isForm = body instanceof FormData;
    const mutating = method !== 'GET';

    const send = () =>
        fetch(`${BASE}/api${url}`, {
            method,
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': xsrf(),
                ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
            },
            body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
        });

    let res: Response;
    try {
        if (mutating) await ensureCsrf();
        res = await send();
        if (res.status === 419 && mutating) {
            await ensureCsrf(true); // CSRF token went stale (e.g. session expired): refresh once and retry
            res = await send();
        }
    } catch {
        throw new ApiError(0, OFFLINE);
    }

    const text = await res.text();
    let data: Record<string, any> = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            // A proxy or PHP limit answered with HTML instead of JSON (e.g. 413 on an oversized upload).
            if (res.ok) throw new ApiError(res.status, 'The server sent an unexpected response.');
        }
    }

    if (!res.ok) {
        // A failed login is a 422, so a 401 here always means "your session is gone".
        if (res.status === 401 && url !== '/bootstrap') window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
        const first = data?.errors ? Object.values<string[]>(data.errors)[0]?.[0] : undefined;
        const fallback = res.status === 413 ? 'That file is too large.' : `Request failed (${res.status})`;
        throw new ApiError(res.status, first ?? data?.message ?? fallback, data);
    }

    return data as T;
}
