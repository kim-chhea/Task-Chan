declare global {
    interface Window {
        route: (name: string) => string;
    }
    /** Ziggy replacement, see src/runtime/index.tsx */
    function route(name: string): string;
}

export {};
