import { PropsWithChildren, ReactNode } from 'react';
import AppLayout from '@/Layouts/AppLayout';

/** Breeze pages (Profile) now render inside the app shell. */
export default function Authenticated({ header, children }: PropsWithChildren<{ header?: ReactNode }>) {
    return (
        <AppLayout>
            {header && <div className="font-display text-2xl">{header}</div>}
            <div className="max-w-3xl space-y-6">{children}</div>
        </AppLayout>
    );
}