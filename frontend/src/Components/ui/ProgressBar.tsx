interface Props {
    value: number; // 0..100
    color?: string;
    label?: string;
    className?: string;
}

export default function ProgressBar({ value, color = '#4F63F0', label, className = '' }: Props) {
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
            className={`h-3.5 overflow-hidden rounded-full border-2 border-ink bg-paper-2 ${className}`}
        >
            <div className="bar h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
    );
}