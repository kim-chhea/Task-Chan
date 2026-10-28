import { useState } from 'react';
import { focusBonusPreview } from '@/lib/focus';
import type { FocusRules } from '@/types';

interface Props {
    itemTitle: string;
    rules: FocusRules;
    disabled?: boolean;
    onPick: (minutes: number) => void;
}

/** Preset lengths for one open item. The +N label is `rules.focus.bonuses["25"]` / `["50"]`. */
export default function FocusPresetPicker({ itemTitle, rules, disabled = false, onPick }: Props) {
    const [open, setOpen] = useState(false);
    const presets = (rules.presets ?? []).filter((minutes): minutes is number => typeof minutes === 'number' && Number.isFinite(minutes));
    if (presets.length === 0) return null;

    if (!open) {
        return (
            <button
                type="button"
                aria-label={`Focus ${itemTitle}`}
                aria-expanded={false}
                aria-haspopup="true"
                disabled={disabled}
                onClick={() => setOpen(true)}
                className="min-h-8 whitespace-nowrap rounded-lg border-2 border-ink bg-white px-2.5 text-[13px] font-bold text-ink hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
                Focus
            </button>
        );
    }

    return (
        <span role="group" aria-label={`Focus length for ${itemTitle}`} className="inline-flex flex-wrap items-center gap-1.5">
            {presets.map((minutes) => {
                const bonus = focusBonusPreview(rules, minutes);
                return (
                    <button
                        key={minutes}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                            setOpen(false);
                            onPick(minutes);
                        }}
                        className="min-h-8 whitespace-nowrap rounded-lg border-2 border-ink bg-sun px-2.5 text-[13px] font-bold text-ink disabled:opacity-60"
                    >
                        {minutes} min +{bonus}
                    </button>
                );
            })}
            <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={`Close focus choices for ${itemTitle}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-white text-sm font-bold text-ink-3"
            >
                <span aria-hidden="true">✕</span>
            </button>
        </span>
    );
}
