import clsx from 'clsx'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Headphones, Pause, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Laurel } from '../../components/illustrations'
import { Button } from '../../components/ui/Button'
import { ProgressBar, Ring } from '../../components/ui/Progress'
import { TOEIC_TOPICS, type Conversation } from '../../data/toeic'
import type { QuizResult } from '../../domain/types'
import { formatDuration, pct, uid } from '../../domain/util'
import { speak, stopSpeaking } from '../../services/speech'
import { useHub } from '../../store/useHub'

/** Hội thoại hai người (mô phỏng Part 3): người A giọng Mỹ, người B giọng Anh; nghe xong trả lời câu hỏi trắc nghiệm. */
export function ConversationRunner({ convs, rate, onExit }: { convs: Conversation[]; rate: number; onExit: () => void }) {
  const recordQuiz = useHub((s) => s.recordQuiz)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [heard, setHeard] = useState(false)
  const [picked, setPicked] = useState<number[]>([])
  const [checked, setChecked] = useState(false)
  const [done, setDone] = useState<null | { correct: number; total: number; ms: number }>(null)
  const stats = useRef({ correct: 0, total: 0 })
  const t0 = useRef(Date.now())
  const token = useRef(0)
  const saved = useRef(false)
  const c = convs[i]

  const stop = () => { token.current++; stopSpeaking(); setPlaying(false) }
  const play = async () => {
    stop()
    const my = ++token.current
    setPlaying(true)
    for (const ln of c.lines) {
      if (token.current !== my) return
      await speak(ln.text, ln.who === 'A' ? 'us' : 'uk', rate)
      await new Promise((r) => setTimeout(r, 250))
    }
    if (token.current === my) { setPlaying(false); setHeard(true) }
  }
  useEffect(() => { setPicked(c.questions.map(() => -1)); setChecked(false); setHeard(false); const id = setTimeout(play, 400); return () => { clearTimeout(id); stop() } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [i])
  useEffect(() => () => stopSpeaking(), [])

  const finish = () => {
    if (saved.current) return
    saved.current = true
    stop()
    const ms = Date.now() - t0.current
    const { correct, total } = stats.current
    if (total) {
      const r: QuizResult = { id: uid('qz'), at: new Date().toISOString(), module: 'listening', type: 'listening_meaning', total, correct, durationMs: ms, items: Array.from({ length: total }, (_, k) => ({ wordId: null, correct: k < correct })) }
      recordQuiz(r, [])
    }
    setDone({ correct, total, ms })
  }
  const check = () => {
    stop()
    c.questions.forEach((q, k) => { stats.current.total++; if (picked[k] === q.answer) stats.current.correct++ })
    setChecked(true)
  }
  const next = () => (i + 1 >= convs.length ? finish() : setI(i + 1))

  if (done) {
    const p = pct(done.correct, done.total)
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <div className="leather p-8 text-center sm:p-10">
          <Laurel className="mx-auto h-12 w-28 text-gold" />
          <h2 className="display mt-3 text-3xl text-on-dark">{p >= 80 ? 'Nghe hiểu rất tốt!' : p >= 50 ? 'Khá ổn, nghe thêm nhé' : 'Hãy nghe lại chậm hơn'}</h2>
          <div className="my-6 flex justify-center"><Ring value={p} size={130} stroke={9} tone="var(--gold)" track="rgba(232,236,250,.15)" label={<span className="display text-3xl">{p}%</span>} /></div>
          <p className="text-sm text-on-dark/75">{done.correct}/{done.total} câu đúng · {formatDuration(done.ms)}</p>
          <div className="mt-7"><Button variant="gold" onClick={onExit}>Về trang luyện nghe</Button></div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><div className="folio">Listening · Conversation</div><div className="display text-xl text-ink">Hội thoại {i + 1}/{convs.length} · {TOEIC_TOPICS[c.topic]}</div></div>
        <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => { if (!stats.current.total || confirm('Kết thúc phiên? Các câu đã làm sẽ được lưu.')) finish() }}>Kết thúc</Button>
      </div>
      <div className="mb-6"><ProgressBar value={i + (checked ? 1 : 0)} max={convs.length} tone="forest" height={5} /></div>

      <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="sheet frame-ornate p-7 sm:p-9">
        <div className="flex items-center gap-4">
          <button onClick={playing ? stop : play} aria-label={playing ? 'Dừng' : 'Nghe hội thoại'}
            className={clsx('grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-gold bg-gold/10 text-gold-ink transition-transform hover:scale-105', playing && 'animate-pulse bg-gold/25')}>
            {playing ? <Pause size={26} /> : <Headphones size={28} />}
          </button>
          <p className="text-sm text-muted">{playing ? 'Đang phát hội thoại…' : heard ? 'Bấm để nghe lại. Rồi trả lời các câu hỏi bên dưới.' : 'Bấm để nghe hội thoại giữa hai người (A: giọng Mỹ, B: giọng Anh).'}</p>
        </div>

        <ol className="mt-6 space-y-6">
          {c.questions.map((q, k) => (
            <li key={k}>
              <p className="font-display text-lg text-ink">{k + 1}. {q.q}</p>
              <ul className="mt-2 grid gap-2">
                {q.options.map((o, n) => {
                  const on = picked[k] === n
                  const right = checked && n === q.answer
                  const wrong = checked && on && n !== q.answer
                  return (
                    <li key={n}>
                      <button disabled={checked} onClick={() => setPicked((p) => p.map((x, m) => (m === k ? n : x)))} aria-pressed={on}
                        className={clsx('flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors', right ? 'border-ok bg-ok/10 text-ink' : wrong ? 'border-bad bg-bad/10 text-ink' : on ? 'border-gold bg-gold/10 text-ink' : 'border-rule-strong text-ink-2 hover:border-gold')}>
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-current font-mono text-xs">{'ABCD'[n]}</span>
                        <span className="flex-1">{o}</span>
                        {right && <Check size={16} className="text-ok" />}{wrong && <X size={16} className="text-bad" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ol>

        {checked && (
          <div className="mt-6 rounded-xl border border-rule bg-surface-2/50 p-4 text-sm">
            <div className="font-mono text-[0.66rem] tracking-[0.2em] text-muted uppercase">Nội dung hội thoại</div>
            <ul className="mt-2 space-y-1.5">{c.lines.map((l, k) => <li key={k}><b className="mr-2 font-mono text-gold-ink">{l.who}:</b><span className="text-ink-2">{l.text}</span></li>)}</ul>
          </div>
        )}

        <div className="mt-6 text-center">
          {checked
            ? <Button onClick={next} className="flex-row-reverse" icon={<ArrowRight size={16} />}>{i + 1 >= convs.length ? 'Xem kết quả' : 'Hội thoại tiếp theo'}</Button>
            : <Button onClick={check} disabled={picked.some((p) => p < 0)} icon={<Check size={16} />}>Kiểm tra đáp án</Button>}
        </div>
      </motion.div>
    </div>
  )
}
