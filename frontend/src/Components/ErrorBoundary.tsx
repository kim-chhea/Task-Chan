import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Partner } from '@/Components/characters';

interface State {
    failed: boolean;
}

/** Keeps one broken screen from blanking the whole app shell. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
    state: State = { failed: false };

    static getDerivedStateFromError(): State {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Screen crashed', error, info.componentStack);
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border-2.5 border-dashed border-ink p-10 text-center">
                <Partner partner="ember" size={96} />
                <p className="font-semibold">This screen hit a snag.</p>
                <button type="button" onClick={() => location.reload()} className="rounded-[11px] border-2 border-ink bg-accent px-4 py-2 text-sm font-bold text-white">
                    Reload
                </button>
            </div>
        );
    }
}
