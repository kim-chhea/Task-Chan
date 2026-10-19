interface Props {
    checked: boolean;
    onChange: () => void;
    label: string;
    disabled?: boolean;
    color?: string;
}

/** Big manga checkbox. Animated tick uses the `.tick` keyframes. */
export default function Checkbox({ checked, onChange, label, disabled, color = '#4F63F0' }: Props) {
    return (
        <button
            type="button"
            aria-pressed={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg border-2 border-ink p-0 transition hover:scale-110 disabled:opacity-60"
            style={{ background: checked ? color : '#FFFFFF' }}
        >
            {checked && (
                <svg className="tick" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5L20 7" />
                </svg>
            )}
        </button>
    );
}