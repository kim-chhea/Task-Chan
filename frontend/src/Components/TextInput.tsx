import { forwardRef, InputHTMLAttributes, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({ focus: () => localRef.current?.focus() }));
    useEffect(() => { if (isFocused) localRef.current?.focus(); }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={`min-h-[42px] rounded-[10px] border-2 border-ink bg-white px-3 text-sm focus:border-ink focus:ring-2 focus:ring-accent ${className}`}
            ref={localRef}
        />
    );
});