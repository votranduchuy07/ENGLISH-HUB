import clsx from 'clsx'
import { BadgeCheck, CircleDashed, PenLine } from 'lucide-react'
import type { Cefr, VerificationStatus } from '../../domain/types'

const CEFR_STYLE: Record<Cefr, string> = {
  A1: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300',
  A2: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/40 dark:text-cyan-300',
  B1: 'bg-blue-500/15 text-blue-700 border-blue-500/40 dark:text-blue-300',
  B2: 'bg-violet-500/15 text-violet-700 border-violet-500/40 dark:text-violet-300',
  C1: 'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/40 dark:text-fuchsia-300',
  C2: 'bg-amber-500/15 text-amber-700 border-amber-500/45 dark:text-amber-300',
}

export function CefrBadge({ level, size = 'sm', className }: { level: Cefr; size?: 'sm' | 'lg'; className?: string }) {
  return (
    <span
      title={`Cấp độ CEFR ${level}`}
      className={clsx(
        'inline-flex items-center justify-center border font-mono font-medium tracking-wider',
        size === 'sm' ? 'h-5 min-w-8 rounded-md px-1.5 text-[0.66rem]' : 'h-8 min-w-12 rounded-lg px-2.5 text-sm',
        CEFR_STYLE[level], className,
      )}
    >
      {level}
    </span>
  )
}

export function VerificationTag({ status, refText, compact }: { status: VerificationStatus; refText?: string; compact?: boolean }) {
  const map = {
    verified: { icon: BadgeCheck, label: 'CEFR đã xác minh', cls: 'text-ok border-ok/40 bg-ok/8' },
    suggested: { icon: CircleDashed, label: 'CEFR đề xuất', cls: 'text-gold-ink border-gold/45 bg-gold/8' },
    user: { icon: PenLine, label: 'Người dùng thêm', cls: 'text-olive border-olive/45 bg-olive/8' },
  }[status]
  const Icon = map.icon
  return (
    <span title={refText ? `${map.label} — ${refText}` : map.label} className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-medium', map.cls)}>
      <Icon size={12} strokeWidth={2} />
      {!compact && map.label}
    </span>
  )
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center rounded-full border border-rule-strong px-2.5 py-0.5 text-[0.72rem] text-ink-2', className)}>{children}</span>
}
