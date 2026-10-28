import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
    try {
        if (typeof window.matchMedia !== 'function') return false;
        return window.matchMedia(QUERY).matches;
    } catch {
        return false;
    }
}

/** True when the user asked the UI to skip decorative motion. The countdown text still updates. */
export function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(prefersReducedMotion);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        let mq: MediaQueryList;
        try {
            mq = window.matchMedia(QUERY);
        } catch {
            return;
        }
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return reduced;
}
