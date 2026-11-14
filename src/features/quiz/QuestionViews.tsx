/** Giao diện từng dạng câu hỏi: mcq · type · order · match · passage. Mỗi view tự chấm và gọi onResolve(units) đúng một lần. */
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { Check, Eye, EyeOff, Pause, Play, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { charDiff } from '../../domain/spelling'
import type { MatchQuestion, McqQuestion, OrderQuestion, PassageQuestion, TypeQuestion } from '../../domain/quiz'
import type { MistakeCategory } from '../../domain/types'
import { normalizeAnswer, shuffle } from '../../domain/util'
import { useSpeak } from '../../hooks'
import { stopSpeaking } from '../../services/speech'

/** Một "đơn vị chấm điểm" (câu mcq = 1, mỗi cặp ghép = 1, mỗi câu hỏi con của đoạn nghe = 1). */
export interface Unit {
  wordId: string | null
  correct: boolean
  category: MistakeCategory
  prompt: string
  yours: string
  right: string
  explain?: string
}

interface ViewProps<Q> { q: Q; onResolve: (u: Unit[]) => void }

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const isListening = (t: string) => t.startsWith('listening_')

/** Nút phát âm lớn dùng cho các câu nghe. Nếu trình duyệt không hỗ trợ thì hiện văn bản thay thế. */
function ListenBlock({ text, wordId, autoPlay, hidden }: { text: string; wordId?: string | null; autoPlay: boolean; hidden?: boolean }) {
  const { say, speaking, supported } = useSpeak()
  useEffect(() => {
    if (autoPlay && supported) say(text, undefined, wordId && !text.includes(' ') ? wordId : undefined)
    return () => stopSpeaking()
    // chỉ phát khi câu hỏi mới xuất hiện
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  const active = !!speaking
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button onClick={() => say(text, undefined, wordId && !text.includes(' ') ? wordId : undefined)} aria-label="Nghe lại"
        className={clsx('grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 transition-all', active ? 'border-gold bg-gold text-charcoal' : 'border-gold/60 bg-black/15 text-gold hover:bg-gold/15')}>
        <Volume2 size={26} className={clsx(active && 'animate-pulse')} />
      </button>
      <div className="text-sm text-on-dark/70">
        {supported ? 'Nhấn để nghe lại (có thể nghe nhiều lần).' : <>Trình duyệt không hỗ trợ giọng đọc — văn bản được hiển thị thay thế:<div className="mt-1 font-serif text-lg text-on-dark italic">“{text}”</div></>}
        {supported && hidden === false && <div className="mt-1 font-serif text-lg text-on-dark italic">“{text}”</div>}
      </div>
    </div>
  )
}

/* ============================ MCQ ============================ */
export function McqView({ q, onResolve }: ViewProps<McqQuestion>) {
  const [picked, setPicked] = useState<number | null>(null)
  const listening = isListening(q.type)
  const choose = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    onResolve([{ wordId: q.wordId, correct: i === q.answer, category: q.category, prompt: q.prompt, yours: q.options[i], right: q.options[q.answer], explain: q.explain }])
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length) choose(n - 1)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, q.id])

  return (
    <div>
      {listening ? (
        <div className="leather mb-6 p-6">
          <div className="folio mb-3 !text-gold">Nghe kỹ</div>
          <ListenBlock text={q.speak ?? ''} wordId={q.wordId} autoPlay hidden />
          <p className="mt-4 font-display text-xl text-on-dark">{q.prompt}</p>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="display text-[1.9rem] leading-tight text-ink sm:text-[2.3rem]">{q.prompt}</h2>
          {q.context && <p className="mt-2 font-serif text-lg text-muted italic">{q.context}</p>}
        </div>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {q.options.map((o, i) => {
          const showRight = picked !== null && i === q.answer
          const showWrong = picked === i && i !== q.answer
          return (
            <motion.button key={o + i} whileTap={picked === null ? { scale: 0.98 } : undefined} onClick={() => choose(i)} disabled={picked !== null && !showRight && !showWrong}
              className={clsx('flex items-center gap-3 rounded-md border px-4 py-3.5 text-left text-[0.98rem] transition-colors',
                picked === null && 'border-rule-strong bg-surface hover:border-gold hover:bg-gold/8',
                showRight && 'border-ok bg-ok/12 text-ink', showWrong && 'border-bad bg-bad/10 text-ink',
                picked !== null && !showRight && !showWrong && 'border-rule bg-surface opacity-55')}>
              <span className={clsx('grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs', showRight ? 'border-ok bg-ok text-white' : showWrong ? 'border-bad bg-bad text-white' : 'border-rule-strong text-muted')}>
                {showRight ? <Check size={14} /> : showWrong ? <X size={14} /> : LETTERS[i]}
              </span>
              <span className="flex-1">{o}</span>
            </motion.button>
          )
        })}
      </div>
      {picked !== null && q.explain && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 border-l-2 border-gold pl-3 text-sm text-ink-2">{q.explain}</motion.p>}
      {picked === null && <p className="mt-4 hidden font-mono text-[0.66rem] text-muted sm:block">Phím tắt: 1 – {q.options.length} để chọn đáp án</p>}
    </div>
  )
}

/* ============================ TYPE ============================ */
export function DiffLine({ expected, got }: { expected: string; got: string }) {
  const ops = charDiff(expected, got)
  return (
    <span className="font-mono text-lg tracking-wide">
      {ops.map((o, i) =>
        o.type === 'ok' ? <span key={i} className="text-ok">{o.expected}</span>
        : o.type === 'sub' ? <span key={i} className="rounded-sm bg-bad/15 text-bad underline decoration-wavy">{o.got}</span>
        : o.type === 'ins' ? <span key={i} className="text-bad line-through">{o.got}</span>
        : <span key={i} className="rounded-sm bg-gold/25 text-gold-ink">{o.expected}<sub className="text-[0.6em]">thiếu</sub></span>,
      )}
    </span>
  )
}

export function TypeView({ q, onResolve }: ViewProps<TypeQuestion>) {
  const [val, setVal] = useState('')
  const [done, setDone] = useState<null | boolean>(null)
  const ref = useRef<HTMLInputElement>(null)
  const listening = isListening(q.type)
  useEffect(() => { ref.current?.focus() }, [])
  const submit = () => {
    if (done !== null || !val.trim()) return
    const norm = normalizeAnswer(val)
    const ok = [q.answer, ...(q.accept ?? [])].some((a) => normalizeAnswer(a) === norm)
    setDone(ok)
    onResolve([{ wordId: q.wordId, correct: ok, category: q.category, prompt: q.context ?? q.prompt, yours: val.trim(), right: q.answer }])
  }
  return (
    <div>
      {listening && q.speak ? (
        <div className="leather mb-6 p-6">
          <div className="folio mb-3 !text-gold">Nghe kỹ</div>
          <ListenBlock text={q.speak} wordId={q.wordId} autoPlay hidden />
          <p className="mt-4 font-display text-xl text-on-dark">{q.prompt}</p>
          {q.context && <p className="mt-3 rounded bg-black/20 px-4 py-3 font-serif text-xl text-on-dark italic">{q.context}</p>}
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="display text-[1.9rem] text-ink">{q.prompt}</h2>
          {q.context && <p className="mt-2 font-serif text-xl text-ink-2 italic">{q.context}</p>}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input ref={ref} value={val} onChange={(e) => setVal(e.target.value)} disabled={done !== null} onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Gõ đáp án của bạn…" aria-label="Đáp án"
          className={clsx('field font-mono text-xl tracking-wide', done === true && '!border-ok', done === false && '!border-bad')} />
        <Button onClick={submit} disabled={done !== null || !val.trim()} className="sm:w-36">Kiểm tra</Button>
      </div>
      {done !== null && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={clsx('mt-4 rounded-md border p-4 text-sm', done ? 'border-ok/50 bg-ok/8' : 'border-bad/40 bg-bad/6')}>
          {done ? <span className="flex items-center gap-2 font-medium text-ok"><Check size={16} /> Chính xác!</span> : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-bad"><X size={16} /> Chưa đúng — đáp án là <b className="font-mono">{q.answer}</b></div>
              <div className="text-muted">Bạn viết: <DiffLine expected={q.answer} got={val.trim()} /></div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

/* ============================ ORDER ============================ */
export function OrderView({ q, onResolve }: ViewProps<OrderQuestion>) {
  const [chosen, setChosen] = useState<number[]>([])
  const [done, setDone] = useState<null | boolean>(null)
  const built = chosen.map((i) => q.tokens[i]).join(' ')
  const check = () => {
    if (done !== null) return
    const ok = normalizeAnswer(built) === normalizeAnswer(q.answer)
    setDone(ok)
    onResolve([{ wordId: q.wordId, correct: ok, category: 'context', prompt: `Sắp xếp: ${q.translation}`, yours: built, right: q.answer }])
  }
  return (
    <div>
      <h2 className="display text-[1.7rem] text-ink">Sắp xếp các từ thành câu đúng</h2>
      <p className="mt-1 font-serif text-lg text-muted italic">Nghĩa: {q.translation}</p>
      <div className={clsx('lined mt-5 flex min-h-[88px] flex-wrap content-start gap-2 rounded-md border bg-surface p-3',
        done === true ? 'border-ok' : done === false ? 'border-bad' : 'border-rule-strong')}>
        {chosen.length === 0 && <span className="px-1 pt-1 text-sm text-muted">Nhấn vào các từ bên dưới để xếp câu…</span>}
        {chosen.map((ti, pos) => (
          <motion.button layout key={ti} onClick={() => done === null && setChosen(chosen.filter((x) => x !== ti))}
            className="rounded border border-burgundy/50 bg-burgundy/10 px-3 py-1.5 font-serif text-lg text-ink" aria-label={`Bỏ từ ${q.tokens[ti]} ở vị trí ${pos + 1}`}>{q.tokens[ti]}</motion.button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {q.tokens.map((t, i) => (
          <button key={i} disabled={chosen.includes(i) || done !== null} onClick={() => setChosen([...chosen, i])}
            className={clsx('rounded border px-3 py-1.5 font-serif text-lg transition-all', chosen.includes(i) ? 'border-rule bg-transparent text-transparent' : 'border-rule-strong bg-surface text-ink hover:border-gold hover:bg-gold/10')}>{t}</button>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Button onClick={check} disabled={chosen.length !== q.tokens.length || done !== null}>Kiểm tra</Button>
        <Button variant="ghost" onClick={() => setChosen([])} disabled={done !== null || !chosen.length}>Xếp lại</Button>
      </div>
      {done !== null && <p className={clsx('mt-4 text-sm', done ? 'text-ok' : 'text-bad')}>{done ? 'Chính xác!' : <>Câu đúng: <b className="font-serif text-lg text-ink">{q.answer}.</b></>}</p>}
    </div>
  )
}

/* ============================ MATCH ============================ */
export function MatchView({ q, onResolve }: ViewProps<MatchQuestion>) {
  const order = useMemo(() => shuffle(q.pairs.map((_, i) => i)), [q.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [missed, setMissed] = useState<Set<number>>(new Set())
  const [flash, setFlash] = useState<number | null>(null)
  const pickRight = (ri: number) => {
    if (sel === null || matched.has(ri)) return
    if (sel === ri) {
      const next = new Set(matched).add(ri)
      setMatched(next); setSel(null)
      if (next.size === q.pairs.length)
        onResolve(q.pairs.map((p, i) => ({ wordId: p.wordId, correct: !missed.has(i), category: 'meaning' as const, prompt: p.left, yours: missed.has(i) ? 'nối sai ít nhất một lần' : p.right, right: p.right })))
    } else {
      setMissed(new Set(missed).add(sel)); setFlash(ri)
      setTimeout(() => setFlash(null), 450)
    }
  }
  return (
    <div>
      <h2 className="display text-[1.7rem] text-ink">Ghép từ với nghĩa</h2>
      <p className="mt-1 text-sm text-muted">Chọn một từ bên trái, rồi chọn nghĩa tương ứng bên phải.</p>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-8">
        <div className="space-y-2.5">
          {q.pairs.map((p, i) => (
            <button key={p.wordId} disabled={matched.has(i)} onClick={() => setSel(i)}
              className={clsx('w-full rounded-md border px-4 py-3 text-left font-display text-lg transition-all', matched.has(i) ? 'border-ok/40 bg-ok/10 text-muted line-through' : sel === i ? 'border-burgundy bg-burgundy text-on-dark shadow-md' : 'border-rule-strong bg-surface hover:border-gold')}>{p.left}</button>
          ))}
        </div>
        <div className="space-y-2.5">
          {order.map((ri) => (
            <motion.button key={ri} animate={flash === ri ? { x: [0, -6, 6, -4, 0] } : {}} disabled={matched.has(ri) || sel === null} onClick={() => pickRight(ri)}
              className={clsx('w-full rounded-md border px-4 py-3 text-left text-[0.95rem] transition-colors', matched.has(ri) ? 'border-ok/40 bg-ok/10 text-muted' : flash === ri ? 'border-bad bg-bad/10' : 'border-rule-strong bg-surface enabled:hover:border-gold enabled:hover:bg-gold/8 disabled:opacity-70')}>{q.pairs[ri].right}</motion.button>
          ))}
        </div>
      </div>
      <p className="mt-4 font-mono text-xs text-muted">{matched.size}/{q.pairs.length} cặp · {missed.size} cặp từng nối sai</p>
    </div>
  )
}

/* ============================ PASSAGE ============================ */
export function PassageView({ q, onResolve }: ViewProps<PassageQuestion>) {
  const { say, speaking, supported } = useSpeak()
  const [ans, setAns] = useState<(number | null)[]>(q.questions.map(() => null))
  const [done, setDone] = useState(false)
  const [showText, setShowText] = useState(!supported)
  useEffect(() => () => stopSpeaking(), [])
  const submit = () => {
    setDone(true); setShowText(true); stopSpeaking()
    onResolve(q.questions.map((s, i) => ({ wordId: null, correct: ans[i] === s.answer, category: 'context' as const, prompt: `${q.title}: ${s.q}`, yours: s.options[ans[i] ?? 0] ?? '—', right: s.options[s.answer] })))
  }
  return (
    <div>
      <div className="leather p-6">
        <div className="flex items-center justify-between"><span className="folio !text-gold">Đoạn nghe · {q.level}</span><span className="font-display italic text-on-dark/80">{q.title}</span></div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="gold" icon={speaking ? <Pause size={16} /> : <Play size={16} />} onClick={() => (speaking ? stopSpeaking() : say(q.text))} disabled={!supported}>{speaking ? 'Dừng' : 'Nghe đoạn văn'}</Button>
          <Button variant="onDark" icon={showText ? <EyeOff size={16} /> : <Eye size={16} />} onClick={() => setShowText(!showText)}>{showText ? 'Ẩn văn bản' : 'Xem văn bản'}</Button>
        </div>
        {!supported && <p className="mt-3 text-sm text-on-dark/70">Trình duyệt không hỗ trợ giọng đọc nên văn bản được hiển thị để bạn đọc thay thế.</p>}
        {showText && <p className="mt-4 border-l-2 border-gold/60 pl-4 font-serif text-lg leading-relaxed text-on-dark/90">{q.text}</p>}
      </div>
      <div className="mt-6 space-y-6">
        {q.questions.map((s, qi) => (
          <div key={qi}>
            <p className="font-display text-lg text-ink">{qi + 1}. {s.q}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {s.options.map((o, oi) => {
                const on = ans[qi] === oi
                const right = done && oi === s.answer
                const wrong = done && on && oi !== s.answer
                return (
                  <button key={oi} disabled={done} onClick={() => setAns(ans.map((a, k) => (k === qi ? oi : a)))}
                    className={clsx('rounded-md border px-4 py-2.5 text-left text-sm transition-colors', right ? 'border-ok bg-ok/12' : wrong ? 'border-bad bg-bad/10' : on ? 'border-burgundy bg-burgundy/10' : 'border-rule-strong bg-surface hover:border-gold')}>
                    <span className="mr-2 font-mono text-xs text-muted">{LETTERS[oi]}</span>{o}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {!done && <Button className="mt-6" onClick={submit} disabled={ans.some((a) => a === null)}>Nộp bài</Button>}
    </div>
  )
}
