/** QuizRunner dùng chung cho Quizzes, Listening, Mistakes, Daily: chạy bộ câu hỏi, chấm điểm thật, lưu qua store.recordQuiz. */
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Clock, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Laurel } from '../../components/illustrations'
import { Button } from '../../components/ui/Button'
import { ProgressBar, Ring } from '../../components/ui/Progress'
import type { Question } from '../../domain/quiz'
import type { QuizResult, QuizType, StudyModule } from '../../domain/types'
import { formatDuration, pct, uid } from '../../domain/util'
import { useCountdown } from '../../hooks'
import { stopSpeaking } from '../../services/speech'
import { useHub, type MistakeInput } from '../../store/useHub'
import { MatchView, McqView, OrderView, PassageView, TypeView, type Unit } from './QuestionViews'

const MODULE_MAP: Record<QuizResult['module'], StudyModule> = { quiz: 'quiz', listening: 'listening', mistakes: 'mistakes', daily: 'daily' }

function unitCount(q: Question): number {
  return q.kind === 'match' ? q.pairs.length : q.kind === 'passage' ? q.questions.length : 1
}

export interface RunnerProps {
  questions: Question[]
  module: QuizResult['module']
  title: string
  kicker?: string
  timeLimitSec?: number | null
  onExit: () => void
  onRestart?: () => void
  restartLabel?: string
  /** Nút / gợi ý bổ sung trên trang kết quả. */
  resultExtra?: (r: { correct: number; total: number; wrong: Unit[] }) => ReactNode
  /** Gọi sau khi kết quả được lưu. */
  onSaved?: (r: QuizResult) => void
}

export function QuizRunner({ questions, module, title, kicker, timeLimitSec = null, onExit, onRestart, restartLabel = 'Làm bộ mới', resultExtra, onSaved }: RunnerProps) {
  const recordQuiz = useHub((s) => s.recordQuiz)
  const [idx, setIdx] = useState(0)
  const [units, setUnits] = useState<Unit[]>([])
  const [resolved, setResolved] = useState<Unit[] | null>(null)
  const [finished, setFinished] = useState<null | { timedOut: boolean; durationMs: number }>(null)
  const start = useRef(Date.now())
  const saved = useRef(false)
  const total = useMemo(() => questions.reduce((s, q) => s + unitCount(q), 0), [questions])

  const finish = (all: Unit[], timedOut: boolean) => {
    if (saved.current) return
    saved.current = true
    stopSpeaking()
    const durationMs = Date.now() - start.current
    const types = Array.from(new Set(questions.map((q) => q.type)))
    const result: QuizResult = {
      id: uid('qz'), at: new Date().toISOString(), module, type: types.length === 1 ? (types[0] as QuizType) : 'mixed',
      total, correct: all.filter((u) => u.correct).length, durationMs, items: all.map((u) => ({ wordId: u.wordId, correct: u.correct })),
    }
    const mistakes: MistakeInput[] = all.filter((u) => !u.correct && u.wordId).map((u) => ({ wordId: u.wordId!, category: u.category, source: MODULE_MAP[module], wrongAnswer: u.yours }))
    recordQuiz(result, mistakes)
    setFinished({ timedOut, durationMs })
    onSaved?.(result)
  }

  // Đồng hồ: hết giờ → nộp phần đã làm. Ref giữ trạng thái mới nhất.
  const latest = useRef({ units, resolved })
  latest.current = { units, resolved }
  const left = useCountdown(timeLimitSec, !finished, () => finish([...latest.current.units, ...(latest.current.resolved ?? [])], true))

  const next = () => {
    if (!resolved) return
    const all = [...units, ...resolved]
    setUnits(all); setResolved(null)
    if (idx + 1 >= questions.length) finish(all, false)
    else setIdx(idx + 1)
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Enter' && resolved && (e.target as HTMLElement)?.tagName !== 'BUTTON') next() }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })
  useEffect(() => () => stopSpeaking(), [])

  if (finished) {
    const all = units
    return (
      <ResultCard title={title} module={module} total={total} correct={all.filter((u) => u.correct).length} durationMs={finished.durationMs} timedOut={finished.timedOut}
        units={all} onExit={onExit} onRestart={onRestart} restartLabel={restartLabel} extra={resultExtra} />
    )
  }

  const q = questions[idx]
  const answeredUnits = units.length + (resolved?.length ?? 0)
  const doneBefore = questions.slice(0, idx).reduce((s, x) => s + unitCount(x), 0)
  const confirmExit = () => { if (!units.length && !resolved) return onExit(); if (window.confirm('Thoát bài làm? Kết quả chưa nộp sẽ không được lưu.')) { stopSpeaking(); onExit() } }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          {kicker && <div className="folio">{kicker}</div>}
          <div className="display text-xl text-ink">{title}</div>
        </div>
        <div className="flex items-center gap-3">
          {timeLimitSec ? (
            <span className={clsx('flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm', left <= 15 ? 'animate-pulse border-bad text-bad' : 'border-rule-strong text-ink-2')}><Clock size={14} />{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={confirmExit} icon={<X size={14} />}>Thoát</Button>
        </div>
      </div>
      <div className="mb-8 flex items-center gap-3">
        <ProgressBar value={doneBefore + (resolved ? unitCount(q) : 0)} max={total} tone="forest" height={5} />
        <span className="shrink-0 font-mono text-xs text-muted">Câu {idx + 1}/{questions.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
          {q.kind === 'mcq' && <McqView q={q} onResolve={setResolved} />}
          {q.kind === 'type' && <TypeView q={q} onResolve={setResolved} />}
          {q.kind === 'order' && <OrderView q={q} onResolve={setResolved} />}
          {q.kind === 'match' && <MatchView q={q} onResolve={setResolved} />}
          {q.kind === 'passage' && <PassageView q={q} onResolve={setResolved} />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {resolved && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex items-center justify-between gap-3 border-t border-rule pt-5">
            <span className={clsx('flex items-center gap-1.5 text-sm font-medium', resolved.every((u) => u.correct) ? 'text-ok' : 'text-bad')}>
              {resolved.every((u) => u.correct) ? <><Check size={16} /> Đúng hết</> : <>{resolved.filter((u) => u.correct).length}/{resolved.length} đúng</>}
            </span>
            <Button onClick={next} icon={<ArrowRight size={16} />} className="flex-row-reverse">{idx + 1 >= questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}</Button>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">Đã trả lời {answeredUnits} / {total}</span>
    </div>
  )
}

/* ============================ KẾT QUẢ ============================ */
function verdict(p: number) {
  if (p >= 90) return { t: 'Xuất sắc', s: 'Vốn từ của bạn đang rất vững.' }
  if (p >= 75) return { t: 'Tốt', s: 'Kết quả tốt — ôn lại vài từ sai là bạn đã chắc.' }
  if (p >= 50) return { t: 'Khá', s: 'Còn một số điểm cần củng cố, hãy xem các từ sai bên dưới.' }
  return { t: 'Cần luyện thêm', s: 'Đừng nản — những từ sai đã được ghi vào Sổ lỗi sai để bạn luyện lại.' }
}

export function ResultCard({ title, module, total, correct, durationMs, timedOut, units, onExit, onRestart, restartLabel, extra }: {
  title: string; module: QuizResult['module']; total: number; correct: number; durationMs: number; timedOut: boolean; units: Unit[]
  onExit: () => void; onRestart?: () => void; restartLabel: string; extra?: RunnerProps['resultExtra']
}) {
  const p = pct(correct, total)
  const v = verdict(p)
  const wrong = units.filter((u) => !u.correct)
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="leather relative overflow-hidden p-8 text-center sm:p-10">
        <Laurel className="mx-auto h-10 w-24 text-gold" />
        <div className="folio mt-3 !text-gold">{title} · Phiếu kết quả</div>
        <div className="my-5 flex justify-center">
          <Ring value={p} size={150} stroke={9} tone="var(--gold)" track="rgba(232,236,250,.15)" label={<span className="display text-5xl text-on-dark">{p}<span className="text-2xl">%</span></span>} sub={<span className="font-mono text-[0.66rem] text-on-dark/60">{correct}/{total} đúng</span>} />
        </div>
        <h2 className="display text-3xl text-on-dark">{v.t}</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-on-dark/70">{timedOut ? 'Hết giờ — phần chưa làm được tính là chưa đúng. ' : ''}{v.s}</p>
        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded border border-gold/25 bg-gold/20 text-center text-on-dark">
          {[['Đúng', correct], ['Sai', total - correct], ['Thời gian', formatDuration(durationMs)]].map(([k, val]) => (
            <div key={String(k)} className="bg-deep px-3 py-3"><div className="font-mono text-[0.62rem] tracking-widest text-gold uppercase">{k}</div><div className="display mt-0.5 text-xl">{val}</div></div>
          ))}
        </div>
      </motion.div>

      <section className="sheet mt-6 p-6">
        <h3 className="display text-xl text-ink">{wrong.length ? `${wrong.length} mục cần xem lại` : 'Không có lỗi sai'}</h3>
        {wrong.length === 0 ? <p className="mt-2 text-sm text-muted">Bạn trả lời đúng mọi câu đã làm. Hãy thử mức khó cao hơn.</p> : (
          <ul className="mt-4 divide-y divide-rule">
            {wrong.map((u, i) => (
              <li key={i} className="py-3 text-sm">
                <div className="font-medium text-ink">{u.prompt}</div>
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                  <span className="text-bad">Bạn chọn: {u.yours || '—'}</span>
                  <span className="text-ok">Đáp án: {u.right}</span>
                </div>
                {u.explain && <div className="mt-1 text-xs text-muted">{u.explain}</div>}
              </li>
            ))}
          </ul>
        )}
        {wrong.some((u) => u.wordId) && <p className="mt-4 border-t border-dashed border-rule-strong pt-3 text-xs text-muted">Các từ sai đã được ghi tự động vào Sổ lỗi sai{module === 'mistakes' ? '' : ' để ôn lại'}.</p>}
      </section>

      {extra?.({ correct, total, wrong })}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onRestart && <Button onClick={onRestart} icon={<RotateCcw size={16} />}>{restartLabel}</Button>}
        <Button variant="outline" onClick={onExit}>Quay lại</Button>
      </div>
    </div>
  )
}
