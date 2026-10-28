import { useEffect, useState } from 'react';
import { useGame } from '@/Components/GameContext';
import { useToast } from '@/Components/ui/Toast';
import { ApiError } from '@/lib/api';
import { cancelFocus, completeFocus, getActiveFocus, startFocus } from '@/lib/focus';
import { router } from '@/runtime';
import type { FocusSession } from '@/types';

function gone(error: unknown): boolean {
    return error instanceof ApiError && (error.status === 404 || error.message === 'This Focus is not running.');
}

/**
 * One running Focus for the signed-in user.
 * Restores it from GET /api/focus/active. Claim reconciles the balance and does not mark the item Done.
 */
export function useFocusDesk() {
    const toast = useToast();
    const { reconcile } = useGame();
    const [session, setSession] = useState<FocusSession | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getActiveFocus()
            .then((res) => {
                if (cancelled) return;
                const next = res?.session;
                setSession(next && next.status === 'running' ? next : null);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    async function start(minutes: number, itemId?: number) {
        if (busy || session) return;
        setBusy(true);
        try {
            const res = await startFocus(minutes, itemId);
            if (res?.session?.status === 'running') setSession(res.session);
            // Start pays nothing. Sync the balance without a gain flash.
            if (typeof res?.balance === 'number') reconcile(res.balance);
        } catch (e) {
            toast(e instanceof ApiError ? e.message : 'Could not start Focus.');
        } finally {
            setBusy(false);
        }
    }

    async function claim() {
        if (!session || busy) return;
        const id = session.id;
        setBusy(true);
        try {
            const res = await completeFocus(id);
            const awarded = typeof res?.awarded === 'number' ? res.awarded : 0;
            if (typeof res?.balance === 'number') reconcile(res.balance, awarded);
            toast(awarded > 0 ? `+${awarded} tokens for Focus.` : 'Focus finished.');
            setSession(null);
            // Refresh the shell balance only. The item's status is unchanged.
            void router.reload({ only: ['game'] });
        } catch (e) {
            toast(e instanceof ApiError ? e.message : 'Could not claim Focus.');
            if (gone(e)) setSession(null);
        } finally {
            setBusy(false);
        }
    }

    async function cancel() {
        if (!session || busy) return;
        const id = session.id;
        setBusy(true);
        try {
            const res = await cancelFocus(id);
            if (typeof res?.balance === 'number') reconcile(res.balance);
            toast('Focus canceled. No tokens.');
            setSession(null);
        } catch (e) {
            toast(e instanceof ApiError ? e.message : 'Could not cancel Focus.');
            if (gone(e)) setSession(null);
        } finally {
            setBusy(false);
        }
    }

    return { session, busy, start, claim, cancel };
}
