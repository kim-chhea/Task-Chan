import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastState {
    key: number;
    message: string;
}
const ToastCtx = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<ToastState | null>(null);
    const timer = useRef<number>(0);

    const show = useCallback((message: string) => {
        window.clearTimeout(timer.current);
        setToast((t) => ({ key: (t?.key ?? 0) + 1, message }));
        timer.current = window.setTimeout(() => setToast(null), 2600);
    }, []);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    return (
        <ToastCtx.Provider value={show}>
            {children}
            <div aria-live="polite" role="status" className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
                {toast && (
                    <div key={toast.key} className="toast rounded-xl border-2.5 border-ink bg-ink px-4 py-3 text-sm font-semibold text-white shadow-[4px_4px_0_#FFD23F]">
                        {toast.message}
                    </div>
                )}
            </div>
        </ToastCtx.Provider>
    );
}