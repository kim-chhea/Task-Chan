/**
 * App runtime: the small router/page-host layer every screen builds on.
 *
 * Provides usePage, router, useForm, Link, Head and route() on top of react-router and `lib/api.ts`:
 * it maps each URL to a screen, loads that screen's data from the JSON API, guards login, and
 * keeps the shared shell data (user, balance, catalog) fresh after every mutation.
 */
import {
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type AnchorHTMLAttributes,
    type ComponentType,
    type ReactElement,
    type ReactNode,
} from 'react';
import { Link as RouterLink, Navigate, matchPath, useLocation, type NavigateFunction } from 'react-router-dom';
import { ApiError, UNAUTHENTICATED_EVENT, api, apiProblem, type ApiProblem } from '@/lib/api';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Props = Record<string, any>;
type PageModule = { default: ComponentType<any> & { layout?: (page: ReactElement) => ReactNode } };

// ---------------------------------------------------------------------------------------------
// Screens: which component renders at which URL, and where its data comes from.
// ---------------------------------------------------------------------------------------------

interface RouteCtx {
    params: Record<string, string | undefined>;
    search: URLSearchParams;
    shared: Props;
}

/**
 * Email on `{FRONTEND_URL}/reset-password/{token}?email={rawurlencoded}`.
 * `URLSearchParams` decodes `%40` and `%20` from PHP's `rawurlencode` once.
 */
export function resetEmail(search: URLSearchParams): string {
    return search.get('email') ?? '';
}

interface ScreenDef {
    path: string;
    component: string;
    /** API endpoint (without /api); omit for screens that need no server data. */
    endpoint?: (params: Record<string, string | undefined>) => string;
    /** 'auth' needs a logged-in user, 'guest' is only for logged-out users. */
    access: 'auth' | 'guest' | 'any';
    props?: (ctx: RouteCtx) => Props;
}

const SCREENS: ScreenDef[] = [
    { path: '/today', component: 'Today', endpoint: () => '/today', access: 'auth' },
    { path: '/items', component: 'Items/Index', endpoint: () => '/items', access: 'auth' },
    { path: '/items/:id', component: 'Items/Show', endpoint: (p) => `/items/${p.id}`, access: 'auth' },
    { path: '/calendar', component: 'Calendar', endpoint: () => '/calendar', access: 'auth' },
    { path: '/review', component: 'Review', endpoint: () => '/review', access: 'auth' },
    { path: '/locker', component: 'Locker', endpoint: () => '/locker', access: 'auth' },
    { path: '/master-records', component: 'MasterRecords/Index', endpoint: () => '/master-records', access: 'auth' },
    { path: '/master-records/:id', component: 'MasterRecords/Show', endpoint: (p) => `/master-records/${p.id}`, access: 'auth' },
    { path: '/profile', component: 'Profile/Edit', endpoint: () => '/profile', access: 'auth' },
    { path: '/verify-email', component: 'Auth/VerifyEmail', access: 'auth' },
    { path: '/confirm-password', component: 'Auth/ConfirmPassword', access: 'auth' },
    {
        path: '/login',
        component: 'Auth/Login',
        access: 'guest',
        props: (c) => ({ canResetPassword: true, canRegister: !!c.shared.canRegister }),
    },
    { path: '/register', component: 'Auth/Register', access: 'guest' },
    { path: '/forgot-password', component: 'Auth/ForgotPassword', access: 'guest' },
    {
        path: '/reset-password/:token',
        component: 'Auth/ResetPassword',
        access: 'guest',
        props: (c) => ({ token: c.params.token ?? '', email: resetEmail(c.search) }),
    },
];

const pageModules = import.meta.glob<PageModule>(['../Pages/**/*.tsx', '!../Pages/**/*.test.tsx']);

/** Ziggy replacement: route names used by the auth/profile pages mapped to URL paths (also the API paths). */
const ROUTE_PATHS: Record<string, string> = {
    login: '/login',
    register: '/register',
    logout: '/logout',
    dashboard: '/today',
    'password.request': '/forgot-password',
    'password.email': '/forgot-password',
    'password.store': '/reset-password',
    'password.update': '/password',
    'password.confirm': '/confirm-password',
    'verification.notice': '/verify-email',
    'verification.send': '/email/verification-notification',
    'profile.edit': '/profile',
    'profile.update': '/profile',
    'profile.destroy': '/profile',
};

export function route(name: string): string {
    const path = ROUTE_PATHS[name];
    if (!path) throw new Error(`Unknown route "${name}"`);
    return path;
}

// ---------------------------------------------------------------------------------------------
// Store: shared props (bootstrap), current page, flash status.
// ---------------------------------------------------------------------------------------------

interface PageState {
    component: string;
    props: Props;
    url: string;
}

interface Store {
    shared: Props | null;
    page: PageState | null;
    /** One-shot message (e.g. "password reset") shown by the screen that follows a mutation. */
    status: string | null;
    /** Keep `status` through the next navigation (it was set for the screen we are about to open). */
    carry: boolean;
    /** A failure that no form field can show (offline, 429, 500): displayed once as an alert. */
    error: string | null;
}

let store: Store = { shared: null, page: null, status: null, carry: false, error: null };
const subs = new Set<() => void>();
const set = (patch: Partial<Store>) => {
    store = { ...store, ...patch };
    subs.forEach((f) => f());
};
const useStore = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => store);

async function refreshShared(): Promise<Props> {
    const shared = await api<Props>('GET', '/bootstrap');
    set({ shared });
    return shared;
}

// ---------------------------------------------------------------------------------------------
// router
// ---------------------------------------------------------------------------------------------

let navigateFn: NavigateFunction | null = null;
let reloadFn: ((only?: string[]) => Promise<void>) | null = null;
const events: Record<string, Set<() => void>> = { start: new Set(), finish: new Set() };
const emit = (name: 'start' | 'finish') => events[name].forEach((f) => f());

export interface VisitOptions {
    only?: string[];
    preserveState?: boolean;
    preserveScroll?: boolean;
    replace?: boolean;
    headers?: Record<string, string>;
    onSuccess?: (page?: unknown) => void;
    onError?: (errors: Record<string, string>, problem?: ApiProblem) => void;
    onFinish?: () => void;
}

const toQuery = (data?: Record<string, unknown>) => {
    const q = new URLSearchParams();
    Object.entries(data ?? {}).forEach(([k, v]) => v !== undefined && v !== null && q.set(k, String(v)));
    const s = q.toString();
    return s ? `?${s}` : '';
};

/** What used to be a server redirect after a mutation. */
async function afterMutation(method: Method, url: string, res: any) {
    const go = (to: string) => navigateFn?.(to);
    const path = url.split('?')[0];

    if (path === '/login' || path === '/register') {
        await refreshShared();
        return go('/today');
    }
    if (path === '/logout' || (path === '/profile' && method === 'delete')) {
        await refreshShared();
        return go('/login');
    }
    if (path === '/forgot-password' || path === '/email/verification-notification') return set({ status: res?.status ?? null });
    if (path === '/reset-password') {
        const message = typeof res?.status === 'string' ? res.status : null;
        set({ status: message, carry: true });
        // History state keeps the sentence if the one-shot store flag is cleared on the way to /login.
        return navigateFn?.('/login', message ? { state: { status: message } } : undefined);
    }
    if (path === '/confirm-password') return go('/today');
    if (path === '/master-records' && method === 'post') return go(`/master-records/${res.id}`);
    if (/^\/master-records\/\d+$/.test(path) && method === 'delete') return go('/master-records');
    if (path === '/profile' && method === 'patch') await refreshShared();

    await reloadFn?.();
}

async function submit(method: Method, url: string, data: unknown, opts: VisitOptions = {}) {
    emit('start');
    try {
        const res = await api(method.toUpperCase() as 'POST', url, data);
        await afterMutation(method, url, res);
        opts.onSuccess?.(res);
    } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        if (e.status === 401) {
            await refreshShared().catch(() => undefined);
            navigateFn?.('/login');
        }
        const problem = apiProblem(e);
        if (Object.keys(problem.fields).length === 0) set({ error: problem.message });
        opts.onError?.(Object.keys(problem.fields).length ? problem.fields : { form: problem.message }, problem);
    } finally {
        opts.onFinish?.();
        emit('finish');
    }
}

export const router = {
    get(url: string, data?: Record<string, unknown>, opts: VisitOptions = {}) {
        navigateFn?.(`${url}${toQuery(data)}`, { replace: opts.replace, preventScrollReset: opts.preserveScroll });
    },
    post: (url: string, data?: unknown, opts?: VisitOptions) => submit('post', url, data, opts),
    put: (url: string, data?: unknown, opts?: VisitOptions) => submit('put', url, data, opts),
    patch: (url: string, data?: unknown, opts?: VisitOptions) => submit('patch', url, data, opts),
    delete: (url: string, opts?: VisitOptions) => submit('delete', url, undefined, opts),
    reload: (opts: { only?: string[] } = {}) => reloadFn?.(opts.only) ?? Promise.resolve(),
    on(event: 'start' | 'finish', cb: () => void) {
        events[event].add(cb);
        return () => events[event].delete(cb);
    },
};

// ---------------------------------------------------------------------------------------------
// Components and hooks used by pages
// ---------------------------------------------------------------------------------------------

const PageContext = createContext<{ props: Props; url: string; component: string } | null>(null);

export function usePage<T extends Props = Props>() {
    const ctx = useContext(PageContext);
    if (!ctx) throw new Error('usePage must be used inside a page');
    return ctx as { props: T; url: string; component: string };
}

export function Head({ title }: { title?: string }) {
    useEffect(() => {
        const app = import.meta.env.VITE_APP_NAME || 'Task-Chan';
        document.title = title ? `${title} · ${app}` : app;
    }, [title]);
    return null;
}

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string;
    method?: Method | Uppercase<Method>;
    as?: string;
    data?: unknown;
    replace?: boolean;
    preserveScroll?: boolean;
    preserveState?: boolean;
    only?: string[];
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
    { href, method = 'get', as, data, replace, preserveScroll, preserveState, only, ...rest },
    ref,
) {
    const m = method.toLowerCase() as Method;
    if (m !== 'get') {
        const Tag = (as ?? 'button') as any;
        return (
            <Tag
                type="button"
                {...rest}
                onClick={(e: any) => {
                    rest.onClick?.(e);
                    void submit(m, href, data);
                }}
            />
        );
    }
    return <RouterLink ref={ref} to={href} replace={replace} preventScrollReset={preserveScroll} {...rest} />;
});

export function useForm<T extends Record<string, any>>(initial: T) {
    const initialRef = useRef(initial);
    const [data, setDataState] = useState<T>(initial);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [processing, setProcessing] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    const [wasSuccessful, setWasSuccessful] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);

    const setData = useCallback((key: keyof T | Partial<T> | ((d: T) => T), value?: unknown) => {
        setDataState((d) => (typeof key === 'function' ? key(d) : typeof key === 'object' ? { ...d, ...key } : { ...d, [key]: value }));
    }, []);

    const send = (method: Method) => (url: string, opts: VisitOptions = {}) => {
        setProcessing(true);
        setErrors({});
        setRecentlySuccessful(false);
        setWasSuccessful(false);
        return submit(method, url, data, {
            ...opts,
            onSuccess: (p) => {
                setWasSuccessful(true);
                setRecentlySuccessful(true);
                clearTimeout(timer.current);
                timer.current = setTimeout(() => setRecentlySuccessful(false), 2000);
                opts.onSuccess?.(p);
            },
            onError: (e, problem) => {
                setErrors(e as Partial<Record<keyof T, string>>);
                opts.onError?.(e, problem);
            },
            onFinish: () => {
                setProcessing(false);
                opts.onFinish?.();
            },
        });
    };

    return {
        data,
        setData,
        errors,
        processing,
        recentlySuccessful,
        wasSuccessful,
        isDirty: JSON.stringify(data) !== JSON.stringify(initialRef.current),
        hasErrors: Object.keys(errors).length > 0,
        setError: (key: keyof T | Partial<Record<keyof T, string>>, value?: string) =>
            setErrors((e) => (typeof key === 'object' ? { ...e, ...key } : { ...e, [key]: value })),
        clearErrors: (...fields: (keyof T)[]) => setErrors((e) => (fields.length ? (Object.fromEntries(Object.entries(e).filter(([k]) => !fields.includes(k as keyof T))) as typeof e) : {})),
        reset: (...fields: (keyof T)[]) =>
            setDataState((d) => (fields.length ? { ...d, ...Object.fromEntries(fields.map((f) => [f, initialRef.current[f]])) } : initialRef.current)),
        post: send('post'),
        put: send('put'),
        patch: send('patch'),
        delete: send('delete'),
    };
}

// ---------------------------------------------------------------------------------------------
// App host: loads shared props + the page for the current URL, guards auth, renders layout + page.
// ---------------------------------------------------------------------------------------------

function Fallback({ status }: { status: number }) {
    const [Err, setErr] = useState<ComponentType<{ status: number }> | null>(null);
    useEffect(() => {
        void pageModules['../Pages/Error.tsx']().then((m) => setErr(() => m.default));
    }, []);
    return Err ? <Err status={status} /> : null;
}

export function AppHost({ navigate }: { navigate: NavigateFunction }) {
    navigateFn = navigate;
    const { shared, page, status, error } = useStore();
    const location = useLocation();
    const [errorStatus, setErrorStatus] = useState<number | null>(null);

    const hit = SCREENS.map((s) => ({ s, m: matchPath(s.path, location.pathname) })).find((x) => x.m);
    const screen = hit?.s;
    const params = hit?.m?.params ?? {};
    const authed = !!shared?.auth?.user;

    // Shared props (user, balance, catalog) load once, and again after login/logout.
    useEffect(() => {
        void refreshShared().catch(() => set({ shared: { auth: { user: null } } }));
    }, []);

    const load = useCallback(
        async (only?: string[], quiet = false) => {
            if (!screen) return;
            const search = new URLSearchParams(location.search);
            const sharedKeys = ['auth', 'game', 'catalog', 'rules', 'canRegister'];
            const wantsShared = !only || only.some((k) => sharedKeys.includes(k));
            const wantsPage = !only || only.some((k) => !sharedKeys.includes(k));
            if (!quiet) emit('start');
            try {
                const [sh, data] = await Promise.all([
                    wantsShared && store.shared?.auth?.user ? refreshShared() : Promise.resolve(store.shared),
                    wantsPage && screen.endpoint ? api<Props>('GET', `${screen.endpoint(params)}${location.search}`) : Promise.resolve(null),
                ]);
                const prev = store.page?.component === screen.component ? store.page.props : {};
                const merged = data ? (only ? { ...prev, ...Object.fromEntries(only.filter((k) => k in data).map((k) => [k, data[k]])) } : data) : prev;
                const extra = screen.props?.({ params, search, shared: sh ?? {} }) ?? {};
                setErrorStatus(null);
                set({ page: { component: screen.component, props: { ...merged, ...extra }, url: location.pathname + location.search } });
            } catch (e) {
                if (e instanceof ApiError && e.status === 401) await refreshShared().catch(() => undefined);
                else setErrorStatus(e instanceof ApiError ? e.status || 503 : 500); // status 0 = server unreachable
            } finally {
                if (!quiet) emit('finish');
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [screen, location.pathname, location.search],
    );

    useEffect(() => {
        reloadFn = (only) => load(only, true);
    }, [load]);

    // Fetch page data whenever the URL changes (after we know who the user is).
    useEffect(() => {
        if (shared && screen && (screen.access !== 'auth' || authed)) void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shared === null, authed, location.pathname, location.search]);

    // The session ended while the page was open (another tab logged out, or it expired): go back to the login screen.
    useEffect(() => {
        const onGone = () => void refreshShared().catch(() => set({ shared: { auth: { user: null } } }));
        window.addEventListener(UNAUTHENTICATED_EVENT, onGone);
        return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onGone);
    }, []);

    useEffect(() => {
        if (!error) return;
        const t = window.setTimeout(() => set({ error: null }), 6000);
        return () => window.clearTimeout(t);
    }, [error]);

    // A flash message belongs to one screen: drop it on the next navigation unless it was set for the screen we just opened.
    useEffect(() => {
        if (store.carry) set({ carry: false });
        else if (store.status) set({ status: null });
    }, [location.pathname]);

    const [Module, setModule] = useState<{ name: string; Comp: PageModule['default'] } | null>(null);
    useEffect(() => {
        if (!page || Module?.name === page.component) return;
        void pageModules[`../Pages/${page.component}.tsx`]().then((m) => setModule({ name: page.component, Comp: m.default }));
    }, [page, Module?.name]);

    if (!shared) return null;
    if (location.pathname === '/') return <Navigate to="/today" replace />;
    if (!screen) return <Fallback status={404} />;
    if (screen.access === 'auth' && !authed) return <Navigate to="/login" replace />;
    if (screen.access === 'guest' && authed) return <Navigate to="/today" replace />;
    if (errorStatus) return <Fallback status={errorStatus} />;
    if (!page || !Module || Module.name !== page.component || page.component !== screen.component) return null;

    const stateStatus = location.state && typeof location.state === 'object' ? (location.state as { status?: unknown }).status : undefined;
    const flash = status || (typeof stateStatus === 'string' ? stateStatus : null);
    const props = { ...shared, ...page.props, ...(flash ? { status: flash } : {}) };
    const { Comp } = Module;
    const el = <Comp key={location.pathname} {...props} />;

    return (
        <PageContext.Provider value={{ props, url: page.url, component: page.component }}>
            {Comp.layout ? Comp.layout(el) : el}
            {error && (
                <div role="alert" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border-2.5 border-ink bg-pink px-4 py-3 text-sm font-semibold text-ink shadow-hard-sm">
                    {error}
                </div>
            )}
        </PageContext.Provider>
    );
}
