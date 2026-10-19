import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
    tone?: 'white' | 'yellow' | 'soft-yellow' | 'pink' | 'mint' | 'accent';
    hover?: boolean;
    rise?: boolean;
}

const TONES = {
    white: 'bg-white',
    yellow: 'bg-sun',
    'soft-yellow': 'bg-sun-soft',
    pink: 'bg-pink',
    mint: 'bg-mint',
    accent: 'bg-accent text-white',
};

/** The manga card: 2.5px ink border, hard offset shadow. */
export default function Card({ tone = 'white', hover = false, rise = false, className = '', ...rest }: Props) {
    return (
        <div
            {...rest}
            className={`relative rounded-[18px] border-2.5 border-ink p-[18px] shadow-hard ${TONES[tone]} ${hover ? 'card-hover' : ''} ${rise ? 'rise' : ''} ${className}`}
        />
    );
}