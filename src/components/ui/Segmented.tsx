import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useId } from 'react'

export function Segmented<T extends string | number>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string; size?: 'sm' | 'md' }) {
  const id = useId()
  return (
    <div role="radiogroup" className={clsx('inline-flex flex-wrap rounded-md border border-rule-strong bg-surface/60 p-0.5', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={String(o.value)} role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={clsx('relative rounded-[4px] font-medium transition-colors', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm', on ? 'text-on-dark' : 'text-ink-2 hover:text-ink')}>
            {on && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[4px] bg-forest" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={clsx('rounded-full border px-3 py-1 text-xs font-medium transition-all', on ? 'border-burgundy bg-burgundy text-on-dark shadow-sm' : 'border-rule-strong text-ink-2 hover:border-gold hover:text-gold-ink')}>
      {children}
    </button>
  )
}
