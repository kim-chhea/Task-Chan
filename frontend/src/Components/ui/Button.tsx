import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'yellow' | 'outline' | 'ghost' | 'mint' | 'dashed';
    size?: 'md' | 'lg' | 'sm';
}

const VARIANTS = {
    primary: 'bg-accent text-white border-2 border-ink',
    yellow: 'bg-sun text-ink border-2 border-ink shadow-hard-sm',
    mint: 'bg-mint text-ink border-2 border-ink',
    outline: 'bg-white text-ink border-2 border-ink shadow-hard-sm',
    ghost: 'bg-transparent text-ink-2 border-2 border-transparent',
    dashed: 'bg-transparent text-ink border-2 border-dashed border-ink',
};
const SIZES = { sm: 'min-h-[34px] px-3 text-[13px]', md: 'min-h-[42px] px-4 text-sm', lg: 'min-h-[46px] px-5 text-sm' };

const Button = forwardRef<HTMLButtonElement, Props>(function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }, ref) {
    return (
        <button
            ref={ref}
            type={type}
            {...rest}
            className={`inline-flex items-center justify-center gap-2 rounded-[11px] font-bold transition active:translate-x-px active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        />
    );
});
export default Button;