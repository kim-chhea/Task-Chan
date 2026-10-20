import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { MantineProvider } from '@mantine/core';
import { useEffect, useRef } from 'react';

interface Props {
    initial: unknown[] | null;
    onSave: (blocks: unknown[]) => void;
}

const CSP_NONCE_PLACEHOLDER = '__CSP_NONCE__';

/** Nonce the document CSP allows on style tags. Dev has no CSP, so this stays unset there. */
function readCspNonce(): string | undefined {
    if (import.meta.env.DEV) return undefined;
    const value = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content')?.trim();
    if (!value || value === CSP_NONCE_PLACEHOLDER) return undefined;
    return value;
}

/** BlockNote editor; saves (debounced) after the user stops typing, and immediately when leaving the page. */
export default function NotesEditor({ initial, onSave }: Props) {
    const nonce = readCspNonce();
    const editor = useCreateBlockNote({
        initialContent: Array.isArray(initial) && initial.length ? (initial as never) : undefined,
        placeholders: { default: 'Type / for headings, lists, tables…' } as never,
        ...(nonce ? { _tiptapOptions: { injectNonce: nonce } } : {}),
    });
    const t = useRef<number>(0);
    const dirty = useRef(false);
    const save = useRef(onSave);
    save.current = onSave;

    // Leaving within the debounce window must not drop the last edits.
    useEffect(
        () => () => {
            window.clearTimeout(t.current);
            if (dirty.current) save.current(editor.document as unknown[]);
        },
        [editor],
    );

    return (
        <MantineProvider
            withCssVariables={false}
            getRootElement={() => undefined}
            {...(nonce ? { getStyleNonce: () => nonce } : {})}
        >
            <BlockNoteView
                editor={editor}
                theme="light"
                onChange={() => {
                    dirty.current = true;
                    window.clearTimeout(t.current);
                    t.current = window.setTimeout(() => {
                        dirty.current = false;
                        save.current(editor.document as unknown[]);
                    }, 700);
                }}
            />
        </MantineProvider>
    );
}
