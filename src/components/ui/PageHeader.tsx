import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/** Đầu trang kiểu bảng điều khiển: mã mô-đun, tiêu đề lớn có điểm nhấn gradient, dòng mô tả, đường kẻ phát sáng. */
export function PageHeader({ no, kicker, title, italic, lead, actions }: { no: string; kicker: string; title: string; italic?: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
      <div className="flex items-center gap-3">
        <span className="rounded-md border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[0.68rem] text-gold-ink">{no}</span>
        <span className="kicker">{kicker}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[2.2rem] text-ink sm:text-[2.9rem]">
          {title}
          {italic && <span className="grad-text"> {italic}</span>}
        </h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {lead && <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted">{lead}</p>}
      <div className="rule-gold mt-6" />
    </motion.header>
  )
}

const ROMAN: Record<string, string> = { i: '01', ii: '02', iii: '03', iv: '04', v: '05', vi: '06', vii: '07', viii: '08', ix: '09', x: '10' }

export function SectionTitle({ children, aside, numeral }: { children: ReactNode; aside?: ReactNode; numeral?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="display flex items-center gap-2.5 text-[1.2rem] text-ink">
        {numeral && <span className="rounded-md bg-gold/12 px-1.5 py-0.5 font-mono text-[0.68rem] font-medium text-gold-ink">{ROMAN[numeral.toLowerCase()] ?? numeral}</span>}
        {children}
      </h2>
      {aside}
    </div>
  )
}
