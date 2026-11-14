import clsx from 'clsx'
import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'forest' | 'gold' | 'ghost' | 'outline' | 'danger' | 'onDark'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-burgundy text-on-dark border border-burgundy hover:brightness-110 shadow-[0_8px_20px_-12px_rgba(90,73,245,.75)]',
  forest: 'bg-forest text-on-dark border border-forest hover:brightness-115 shadow-[0_8px_20px_-12px_rgba(12,138,122,.7)]',
  gold: 'bg-gold text-charcoal border border-gold hover:brightness-105 shadow-[0_8px_20px_-12px_rgba(6,182,212,.7)]',
  ghost: 'text-ink-2 hover:bg-surface-2/70 border border-transparent',
  outline: 'border border-rule-strong text-ink hover:border-gold hover:text-gold-ink bg-surface/40',
  danger: 'border border-bad/50 text-bad hover:bg-bad/10',
  onDark: 'border border-gold/50 text-on-dark hover:bg-white/10',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8rem] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[0.95rem] gap-2.5',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      className={clsx(
        'inline-flex select-none items-center justify-center rounded-[5px] font-medium tracking-[0.01em] transition-[filter,background,color,border] disabled:opacity-45',
        variants[variant], sizes[size], className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  )
}

export function IconButton({ label, className, children, active, ...rest }: Omit<HTMLMotionProps<'button'>, 'children'> & { label: string; active?: boolean; children: ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
        active ? 'border-gold bg-gold/15 text-gold-ink' : 'border-rule-strong text-ink-2 hover:border-gold hover:text-gold-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
