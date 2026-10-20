export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data: Record<string, unknown> = {},
    ) {
        super(message);
    }
}

/** A server failure turned into plain strings. Nothing here is raw JSON or HTML. */
export interface ApiProblem {
    status: number;
    /** Sentence to show. The body message when it has text, otherwise a fallback. */
    message: string;
    /** Trimmed top-level `message`, or null when the server left it blank. */
    stated: string | null;
    /** First message for each key under `errors`. */
    fields: Record<string, string>;
    /** Every message for each key under `errors`, in order. */
    details: Record<string, string[]>;
}

function errorStrings(value: unknown): string[] {
    if (typeof value === 'string') return value.trim() ? [value] : [];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

const EMPTY_PROBLEM = (message: string): ApiProblem => ({ status: 0, message, stated: null, fields: {}, details: {} });

/** Used when the JSON `message` is missing or `""` (the register lock race sends that). */
export function fallbackMessage(status: number): string {
    if (status === 429) return 'Please wait a moment and try again.';
    if (status === 403) return "You don't have permission to do that.";
    if (status === 413) return 'The file must be 10 MB or smaller.';
    return 'Something went wrong.';
}

export function statedMessage(data: Record<string, unknown> | undefined): string | null {
    const raw = data && typeof data.message === 'string' ? data.message.trim() : '';
    return raw || null;
}

/**
 * Read a failed `api()` call. Validation bags (`errors.file`, `errors.email`, …)
 * stay as text the UI can render. A blank `message` does not become the text shown.
 */
export function apiProblem(error: unknown, fallback = 'Something went wrong.'): ApiProblem {
    if (!(error instanceof ApiError)) return EMPTY_PROBLEM(fallback);
    const details: Record<string, string[]> = {};
    const bag = error.data.errors;
    if (bag && typeof bag === 'object') {
        for (const [key, value] of Object.entries(bag as Record<string, unknown>)) {
            const messages = errorStrings(value);
            if (messages.length) details[key] = messages;
        }
    }
    const fields = Object.fromEntries(Object.entries(details).map(([key, messages]) => [key, messages[0]]));
    const stated = statedMessage(error.data);
    const own = error.message.trim();
    const message = stated ?? (own || fallbackMessage(error.status) || fallback);
    return { status: error.status, message, stated, fields, details };
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
        const first = data?.errors ? Object.values<string[]>(data.errors).flat().find((item) => typeof item === 'string' && item.trim()) : undefined;
        const stated = statedMessage(data);
        // An empty string is not a message: `message: ""` must not hide the fallback.
        throw new ApiError(res.status, (typeof first === 'string' ? first : '') || stated || fallbackMessage(res.status), data);
    }

    return data as T;
}
