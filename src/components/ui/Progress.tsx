import clsx from 'clsx'
import { motion } from 'framer-motion'

export function ProgressBar({ value, max = 100, tone = 'gold', className, height = 6 }: { value: number; max?: number; tone?: 'gold' | 'burgundy' | 'forest' | 'light'; className?: string; height?: number }) {
  const p = Math.max(0, Math.min(1, max ? value / max : 0))
  const color = { gold: 'bg-gold', burgundy: 'bg-burgundy', forest: 'bg-forest', light: 'bg-on-dark' }[tone]
  return (
    <div className={clsx('relative w-full overflow-hidden rounded-full bg-ink/10 dark:bg-white/10', className)} style={{ height }} role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={clsx('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${p * 100}%` }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  )
}

export function Ring({ value, size = 120, stroke = 9, label, sub, tone = 'var(--gold)', track = 'color-mix(in srgb, currentColor 14%, transparent)' }: { value: number; size?: number; stroke?: number; label?: React.ReactNode; sub?: React.ReactNode; tone?: string; track?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, value / 100))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p) }} transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        {label}
        {sub}
      </div>
    </div>
  )
}
