export function Coin({ size = 24 }: { size?: number }) {
    return (
        <svg className="coin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#FFD23F" stroke="#15161D" strokeWidth="2" />
            <path d="M12 6.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#15161D" />
        </svg>
    );
}

interface Props {
    amount: number | string;
    prefix?: string;
    tone?: 'sun' | 'mint' | 'white';
    className?: string;
}

/** "+15" style reward pill used in rows and cards. */
export default function TokenPill({ amount, prefix = '+', tone = 'sun', className = '' }: Props) {
    const bg = { sun: 'bg-sun-soft', mint: 'bg-mint-soft text-[#1F5C3E]', white: 'bg-white' }[tone];
    return (
        <span className={`inline-flex items-center gap-1 rounded-[7px] border-[1.5px] border-ink px-2 py-[3px] font-mono text-xs font-semibold ${bg} ${className}`}>
            {prefix}
            {amount}
        </span>
    );
}