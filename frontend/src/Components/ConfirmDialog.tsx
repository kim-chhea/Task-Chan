import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import Button from '@/Components/ui/Button';

interface Props {
    trigger: ReactNode;
    title: string;
    body: string;
    confirmLabel: string;
    onConfirm: () => void;
}

/** Manga-styled replacement for window.confirm (keyboard and screen-reader friendly via Radix). */
export default function ConfirmDialog({ trigger, title, body, confirmLabel, onConfirm }: Props) {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
                <Dialog.Content className="rise fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[18px] border-2.5 border-ink bg-white p-6 shadow-hard-lg">
                    <Dialog.Title className="font-display text-xl">{title}</Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-ink-2">{body}</Dialog.Description>
                    <div className="mt-5 flex justify-end gap-2">
                        <Dialog.Close asChild>
                            <Button variant="outline">Cancel</Button>
                        </Dialog.Close>
                        <Dialog.Close asChild>
                            <Button variant="yellow" onClick={onConfirm}>
                                {confirmLabel}
                            </Button>
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
