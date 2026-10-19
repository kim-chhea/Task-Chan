import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({ className = '', disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            disabled={disabled}
            className={`inline-flex min-h-[42px] items-center justify-center rounded-[11px] border-2 border-ink bg-accent px-5 text-sm font-bold text-white shadow-hard-sm transition active:translate-x-px active:translate-y-px ${disabled ? 'opacity-60' : ''} ${className}`}
        >
            {children}
        </button>
    );
}