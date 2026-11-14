import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { formatVietnameseDate } from '../../domain/util'

export const CHART = {
  burgundy: 'var(--burgundy)',
  forest: 'var(--forest)',
  gold: 'var(--gold)',
  olive: 'var(--olive)',
  grid: 'var(--rule)',
  axis: 'var(--muted)',
  font: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fill: 'var(--muted)' },
}

export function ChartTooltip({ active, payload, label, unit = '' }: { active?: boolean; payload?: { name?: string; value?: number | string; color?: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="leather min-w-36 px-3 py-2 text-xs">
      {label && <div className="mb-1 font-mono text-[0.68rem] tracking-wider text-gold uppercase">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-on-dark/80"><i className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="font-mono text-on-dark">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  )
}

/** Lịch nhiệt hoạt động (kiểu sổ điểm danh), 7 hàng × N tuần. */
export function CalendarHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<{ date: string; count: number } | null>(null)
  const max = Math.max(1, ...data.map((d) => d.count))
  const first = new Date(data[0].date + 'T12:00:00')
  const pad = (first.getDay() + 6) % 7
  const cells = [...Array(pad).fill(null), ...data] as ({ date: string; count: number } | null)[]
  const weeks: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const level = (c: number) => (c === 0 ? 0 : c / max < 0.25 ? 1 : c / max < 0.5 ? 2 : c / max < 0.8 ? 3 : 4)
  const colors = ['color-mix(in srgb, var(--ink) 7%, transparent)', 'color-mix(in srgb, var(--forest) 30%, transparent)', 'color-mix(in srgb, var(--forest) 55%, transparent)', 'var(--forest)', 'var(--gold)']
  const months: { i: number; label: string }[] = []
  weeks.forEach((w, i) => { const d = w.find(Boolean); if (d && new Date(d.date).getDate() <= 7) months.push({ i, label: `Th${new Date(d.date).getMonth() + 1}` }) })
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          <div className="relative mb-1 ml-7 h-4">
            {months.map((m) => <span key={m.i} className="absolute font-mono text-[0.62rem] text-muted" style={{ left: m.i * 15 }}>{m.label}</span>)}
          </div>
          <div className="flex gap-[3px]">
            <div className="mr-1 flex flex-col gap-[3px] font-mono text-[0.58rem] text-muted">
              {['T2', '', 'T4', '', 'T6', '', 'CN'].map((l, i) => <span key={i} className="h-3 leading-3">{l}</span>)}
            </div>
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, di) => {
                  const c = w[di]
                  if (!c) return <span key={di} className="h-3 w-3" />
                  return (
                    <motion.span key={di} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: wi * 0.012 }}
                      onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}
                      className={clsx('h-3 w-3 rounded-[2px] ring-gold/0 transition hover:ring-2 hover:ring-gold/70')} style={{ background: colors[level(c.count)] }} />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className="min-h-4">{hover ? `${formatVietnameseDate(new Date(hover.date + 'T12:00:00'))} — ${hover.count} hoạt động` : 'Di chuột lên một ô để xem chi tiết'}</span>
        <span className="flex items-center gap-1">Ít {colors.map((c, i) => <i key={i} className="h-3 w-3 rounded-[2px]" style={{ background: c }} />)} Nhiều</span>
      </div>
    </div>
  )
}
