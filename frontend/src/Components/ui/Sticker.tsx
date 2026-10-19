import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLSpanElement> {
    color?: 'yellow' | 'pink' | 'mint' | 'accent' | 'white' | 'ink';
    rotate?: number;
}

const COLORS = {
    yellow: 'bg-sun text-ink',
    pink: 'bg-pink text-ink',
    mint: 'bg-mint text-ink',
    accent: 'bg-accent text-white',
    white: 'bg-white text-ink',
    ink: 'bg-ink text-white',
};

/** Slightly rotated sticker badge. */
export default function Sticker({ color = 'yellow', rotate = -2, className = '', style, ...rest }: Props) {
    return (
        <span
            {...rest}
            style={{ rotate: `${rotate}deg`, ...style }}
            className={`inline-flex items-center rounded-lg border-2 border-ink px-2.5 py-1 text-[13px] font-bold ${COLORS[color]} ${className}`}
        />
    );
}