import { Link } from '@/runtime';
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';

interface Props {
    name: string;
    onLogout: () => void;
}

const itemClass =
    'flex min-h-[44px] w-full items-center rounded-[10px] px-3 text-left text-sm font-semibold text-ink no-underline hover:bg-paper-2';

/** A click here will focus this element, or a focusable parent such as a button around a label. */
function clickMovesFocus(target: EventTarget | null): boolean {
    let node: Node | null = target instanceof Node ? target : null;
    while (node) {
        if (node instanceof HTMLElement && takesClickFocus(node)) return true;
        node = node.parentElement;
    }
    return false;
}

function takesClickFocus(el: HTMLElement): boolean {
    if (el.hasAttribute('disabled')) return false;
    if (el.isContentEditable) return true;
    // tabIndex is 0 for links, buttons, and inputs; -1 for plain divs.
    // An explicit tabindex, including -1, is still focused by a click.
    if (el.tabIndex >= 0) return true;
    return el.hasAttribute('tabindex');
}

/** Account control for the mobile header: Profile and Log out. */
export default function AccountMenu({ name, onLogout }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    /** Set on pointerdown. Restored on pointerup, after mousedown has moved focus. */
    const restoreFocus = useRef(false);
    const menuId = useId();
    const { pathname } = useLocation();
    const pathRef = useRef(pathname);
    const initial = name.trim().charAt(0).toUpperCase() || '?';

    useEffect(() => {
        if (pathRef.current === pathname) return;
        pathRef.current = pathname;
        setOpen(false);
    }, [pathname]);

    // pointerup is after mousedown. A non-focusable mousedown moves focus to the body,
    // so focusing the button on pointerdown does not stick.
    useEffect(() => {
        const onUp = () => {
            if (!restoreFocus.current) return;
            restoreFocus.current = false;
            const active = document.activeElement;
            const landedOnControl = active instanceof HTMLElement
                && active !== document.body
                && active !== document.documentElement
                && !rootRef.current?.contains(active)
                && clickMovesFocus(active);
            if (!landedOnControl) buttonRef.current?.focus();
        };
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
        return () => {
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            setOpen(false);
            restoreFocus.current = false;
            buttonRef.current?.focus();
        };
        const onPointer = (e: PointerEvent) => {
            if (rootRef.current?.contains(e.target as Node)) return;
            setOpen(false);
            // A click on another control focuses that control. Don't pull focus back.
            restoreFocus.current = !clickMovesFocus(e.target);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointer);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onPointer);
        };
    }, [open]);

    const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        if (items.length === 0) return;
        e.preventDefault();
        const current = items.indexOf(document.activeElement as HTMLElement);
        const next =
            e.key === 'Home' ? 0
            : e.key === 'End' ? items.length - 1
            : e.key === 'ArrowDown' ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length;
        items[next]?.focus();
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                aria-expanded={open}
                aria-controls={menuId}
                aria-haspopup="menu"
                aria-label={`Account menu for ${name}`}
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border-2 border-ink font-display text-sm ${open ? 'bg-ink text-white' : 'bg-sun text-ink'}`}
            >
                {initial}
            </button>
            <div
                ref={menuRef}
                id={menuId}
                role="menu"
                aria-label="Account"
                hidden={!open}
                onKeyDown={onMenuKeyDown}
                className={`${open ? '' : 'hidden'} absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-[14px] border-2.5 border-ink bg-white p-1.5 shadow-hard`}
            >
                <p className="truncate px-3 pb-1 pt-1.5 text-xs font-bold text-ink-3">{name}</p>
                <Link href="/profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
                    Profile
                </Link>
                <button
                    type="button"
                    role="menuitem"
                    className={itemClass}
                    onClick={() => {
                        setOpen(false);
                        onLogout();
                    }}
                >
                    Log out
                </button>
            </div>
        </div>
    );
}
