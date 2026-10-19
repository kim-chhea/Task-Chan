import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { TYPE_BG, TYPE_LABEL } from '@/lib/format';
import type { ItemType } from '@/types';

export function TypeChip({ type, className = '' }: { type: ItemType; className?: string }) {
    return (
        <span className={`inline-flex rounded-[7px] border-[1.5px] border-ink px-[9px] py-[3px] text-xs font-semibold ${TYPE_BG[type]} ${className}`}>
            {TYPE_LABEL[type]}
        </span>
    );
}

/** Pressable filter chip (aria-pressed). */
export function FilterChip({ on, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
    return (
        <button
            type="button"
            aria-pressed={on}
            {...rest}
            className={`min-h-[42px] rounded-[10px] border-2 border-ink px-3.5 text-[13px] font-bold ${on ? 'bg-ink text-white shadow-[3px_3px_0_#4F63F0]' : 'bg-white text-ink'} ${className}`}
        />
    );
}

export function InfoChip({ label, children, className = '', ...rest }: HTMLAttributes<HTMLSpanElement> & { label: string }) {
    return (
        <span {...rest} className={`inline-flex gap-1.5 rounded-lg border-2 border-ink px-2.5 py-1 text-[13px] font-semibold ${className}`}>
            <span className="font-normal">{label}</span>
            {children}
        </span>
    );
}