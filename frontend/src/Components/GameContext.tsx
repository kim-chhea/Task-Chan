import { usePage } from '@/runtime';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '@/types';

interface Gain {
    key: number;
    amount: number;
}

interface GameCtx {
    /** What the header shows. May be optimistic; always reconciled to the server value. */
    balance: number;
    gain: Gain | null;
    /** Optimistic bump, shown immediately. */
    optimistic: (delta: number) => void;
    /** Authoritative balance from an API response. */
    reconcile: (serverBalance: number, shownGain?: number) => void;
}

const Ctx = createContext<GameCtx>({ balance: 0, gain: null, optimistic: () => {}, reconcile: () => {} });
export const useGame = () => useContext(Ctx);

export function GameProvider({ children }: { children: ReactNode }) {
    const { game } = usePage<PageProps>().props;
    const [balance, setBalance] = useState(game.balance);
    const [gain, setGain] = useState<Gain | null>(null);
    const timer = useRef<number>(0);

    // Page navigations deliver a fresh server balance.
    useEffect(() => setBalance(game.balance), [game.balance]);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    const flash = useCallback((amount: number) => {
        window.clearTimeout(timer.current);
        setGain((g) => ({ key: (g?.key ?? 0) + 1, amount }));
        timer.current = window.setTimeout(() => setGain(null), 1300);
    }, []);

    const optimistic = useCallback((delta: number) => {
        setBalance((b) => b + delta);
        if (delta !== 0) flash(delta);
    }, [flash]);

    const reconcile = useCallback((serverBalance: number, shownGain?: number) => {
        setBalance(serverBalance);
        if (shownGain) flash(shownGain);
    }, [flash]);

    return <Ctx.Provider value={{ balance, gain, optimistic, reconcile }}>{children}</Ctx.Provider>;
}