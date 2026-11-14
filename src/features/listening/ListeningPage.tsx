import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Headphones, Info, Keyboard, Pause, Play, RotateCcw, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Laurel } from '../../components/illustrations'
import { Button } from '../../components/ui/Button'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { ProgressBar, Ring } from '../../components/ui/Progress'
import { Chip, Segmented } from '../../components/ui/Segmented'
import { toast } from '../../components/ui/Toast'
import { CONVERSATIONS, itemLevel, LEVEL_LABEL, TOEIC_ITEMS, TOEIC_TOPICS, type ToeicItem, type ToeicTopic } from '../../data/toeic'
import { diffWords, dictationScore, normWord, pickBlanks, tokenize, type WordOp } from '../../domain/dictation'
import { buildQuiz } from '../../domain/quiz'
import type { Question } from '../../domain/quiz'
import type { QuizResult } from '../../domain/types'
import { formatDuration, pct, shuffle, uid } from '../../domain/util'
import { useStudyTimer } from '../../hooks'
import { speak, speechSupported, stopSpeaking, type Accent } from '../../services/speech'
import { useAllWords, useData, useHub } from '../../store/useHub'
import { QuizRunner } from '../quiz/QuizRunner'
import { ConversationRunner } from './ConversationRunner'

type Mode = 'gap' | 'dictation' | 'conversation' | 'comprehension'
type AccentPref = Accent | 'mix'
type Level = 'all' | 'easy' | 'medium' | 'hard'

const MODES: { key: Mode; label: string; desc: string }[] = [
  { key: 'gap', label: 'Nghe – điền từ khuyết', desc: 'Nghe câu kiểu TOEIC, điền những từ còn thiếu trong câu (giống Part 5/6 nhưng bằng tai).' },
  { key: 'dictation', label: 'Nghe – chép cả câu', desc: 'Nghe rồi gõ lại nguyên câu. Hệ thống chấm từng từ và chỉ ra từ nghe sai, thiếu, thừa.' },
  { key: 'conversation', label: 'Nghe hội thoại + trả lời câu hỏi', desc: 'Nghe đoạn hội thoại hai người (giọng Mỹ và Anh) rồi chọn đáp án — giống Part 3 trong đề TOEIC.' },
  { key: 'comprehension', label: 'Nghe hiểu từ vựng', desc: 'Nghe từ hoặc câu rồi chọn nghĩa / từ đúng từ kho từ vựng của bạn.' },
]

interface RItem { item: ToeicItem; accent: Accent; blanks: number[] }
interface Outcome { r: RItem; correct: boolean; score: number; answer: string; ops?: WordOp[] }

export default function ListeningPage() {
  useStudyTimer('listening')
  const words = useAllWords()
  const data = useData()
  const [mode, setMode] = useState<Mode>('gap')
  const [topics, setTopics] = useState<ToeicTopic[]>([])
  const [level, setLevel] = useState<Level>('all')
  const [count, setCount] = useState(10)
  const [rate, setRate] = useState(0.9)
  const [accent, setAccent] = useState<AccentPref>('mix')
  const [maxPlays, setMaxPlays] = useState<number>(0)
  const [blankCount, setBlankCount] = useState(3)
  const [run, setRun] = useState<{ key: number; items: RItem[]; mode: 'gap' | 'dictation' } | null>(null)
  const [conv, setConv] = useState<{ key: number; list: typeof CONVERSATIONS } | null>(null)
  const [quiz, setQuiz] = useState<{ key: number; qs: Question[] } | null>(null)
  const [result, setResult] = useState<{ mode: 'gap' | 'dictation'; outs: Outcome[]; ms: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const pool = useMemo(() => TOEIC_ITEMS.filter((it) => (!topics.length || topics.includes(it.topic)) && (level === 'all' || itemLevel(it.text) === level)), [topics, level])
  const listeningDone = data.quizResults.filter((q) => q.module === 'listening').length

  const make = (list: ToeicItem[], m: 'gap' | 'dictation'): RItem[] =>
    list.map((item, i) => ({
      item,
      accent: accent === 'mix' ? (i % 2 === 0 ? 'us' : 'uk') : accent,
      blanks: m === 'gap' ? pickBlanks(tokenize(item.text), Math.min(blankCount, Math.max(1, Math.floor(tokenize(item.text).length / 4))), item.id + ':' + blankCount) : [],
    }))
  const begin = (list: ToeicItem[], m: 'gap' | 'dictation') => { setResult(null); setRun({ key: Date.now(), items: make(list, m), mode: m }) }

  const start = () => {
    setErr(null)
    if (!speechSupported) toast.error('Trình duyệt này không hỗ trợ đọc văn bản. Hãy dùng Chrome hoặc Edge để nghe.')
    if (mode === 'conversation') {
      const src = CONVERSATIONS.filter((c) => !topics.length || topics.includes(c.topic))
      if (!src.length) return setErr('Không có hội thoại nào khớp chủ đề đã chọn.')
      return setConv({ key: Date.now(), list: shuffle(src).slice(0, Math.max(2, Math.round(count / 5) * 2)) })
    }
    if (mode === 'comprehension') {
      const qs = buildQuiz({ types: ['listening_meaning', 'listening_spelling', 'listening_gap'], words, pool: words, count, difficulty: 'normal' })
      if (!qs.length) return setErr('Chưa đủ dữ liệu từ vựng để tạo câu hỏi nghe.')
      return setQuiz({ key: Date.now(), qs })
    }
    if (!pool.length) return setErr('Không có câu nào khớp bộ lọc. Hãy nới lỏng chủ đề hoặc độ khó.')
    begin(shuffle(pool).slice(0, count), mode)
  }

  if (conv) return <ConversationRunner key={conv.key} convs={conv.list} rate={rate} onExit={() => setConv(null)} />
  if (quiz) {
    return <QuizRunner key={quiz.key} questions={quiz.qs} module="listening" title="Nghe hiểu từ vựng" kicker="Listening" onExit={() => setQuiz(null)} onRestart={start} restartLabel="Bộ nghe khác" />
  }
  if (run) {
    return <Runner key={run.key} items={run.items} mode={run.mode} rate={rate} maxPlays={maxPlays}
      onFinish={(outs, ms) => { setRun(null); setResult({ mode: run.mode, outs, ms }) }} />
  }
  if (result) {
    return <ResultView res={result} onBack={() => setResult(null)} onAgain={start} rate={rate}
      onRetry={() => begin(result.outs.filter((o) => !o.correct).map((o) => o.r.item), result.mode)} />
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="07" kicker="Listening" title="Luyện" italic="nghe"
        lead="Luyện tai với các câu và thông báo mô phỏng văn phong TOEIC: điền từ khuyết, chép lại cả câu. Nghe chậm trước, tăng tốc dần khi đã quen."
        actions={<span className="hidden items-center gap-1.5 font-mono text-xs text-muted sm:flex"><Keyboard size={14} /> Alt+R = nghe lại · Enter = kiểm tra / tiếp</span>} />

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        <section>
          <SectionTitle numeral="i" aside={<span className="font-mono text-xs text-muted">{listeningDone} bài nghe hiểu đã làm</span>}>Chọn dạng bài</SectionTitle>
          <ol className="sheet divide-y divide-rule">
            {MODES.map((m, i) => {
              const on = mode === m.key
              return (
                <motion.li key={m.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <button onClick={() => setMode(m.key)} aria-pressed={on} className={clsx('group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors', on ? 'bg-forest/8' : 'hover:bg-gold/6')}>
                    <span className="w-9 shrink-0 font-mono text-base text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg text-ink">{m.label}</span>
                      <span className="block text-sm text-muted">{m.desc}</span>
                    </span>
                    <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors', on ? 'border-forest bg-forest text-on-dark' : 'border-rule-strong text-transparent group-hover:border-gold')}><Check size={14} /></span>
                  </button>
                </motion.li>
              )
            })}
          </ol>
          <div className="mt-5 flex gap-3 rounded-md border border-gold/40 bg-gold/8 p-4 text-sm text-ink-2">
            <Info size={18} className="mt-0.5 shrink-0 text-gold-ink" />
            <p>Các câu trong phần này do English Hub tự biên soạn theo phong cách TOEIC (không phải đề thi thật, vì đề thi có bản quyền). Giọng đọc là giọng tổng hợp của trình duyệt — hãy dùng Chrome hoặc Edge để có giọng Anh/Mỹ tự nhiên nhất.</p>
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="leather p-6">
            <div className="flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase"><Headphones size={14} /> Thiết lập phiên</div>
            <div className="mt-5 space-y-5 text-sm">
              {mode !== 'comprehension' && (
                <div>
                  <div className="mb-2 text-on-dark/60">Chủ đề <span className="text-on-dark/40">(trống = tất cả)</span></div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(TOEIC_TOPICS) as ToeicTopic[]).map((t) => <Chip key={t} on={topics.includes(t)} onClick={() => setTopics((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))}>{TOEIC_TOPICS[t]}</Chip>)}
                  </div>
                </div>
              )}
              {(mode === 'gap' || mode === 'dictation') && (
                <div>
                  <div className="mb-2 text-on-dark/60">Độ dài câu</div>
                  <Segmented size="sm" value={level} onChange={setLevel} options={[{ value: 'all', label: 'Tất cả' }, { value: 'easy', label: 'Ngắn' }, { value: 'medium', label: 'Vừa' }, { value: 'hard', label: 'Dài' }]} />
                </div>
              )}
              {mode === 'gap' && (
                <div>
                  <div className="mb-2 text-on-dark/60">Số chỗ trống mỗi câu</div>
                  <Segmented size="sm" value={blankCount} onChange={setBlankCount} options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))} />
                </div>
              )}
              <div>
                <div className="mb-2 text-on-dark/60">Số câu</div>
                <Segmented size="sm" value={count} onChange={setCount} options={[5, 10, 15].map((n) => ({ value: n, label: String(n) }))} />
              </div>
              {mode !== 'comprehension' && (<>
                <div>
                  <div className="mb-2 text-on-dark/60">Tốc độ đọc</div>
                  <Segmented size="sm" value={rate} onChange={setRate} options={[{ value: 0.7, label: 'Chậm' }, { value: 0.9, label: 'Vừa' }, { value: 1.1, label: 'Nhanh' }]} />
                </div>
                <div>
                  <div className="mb-2 text-on-dark/60">Giọng đọc</div>
                  <Segmented size="sm" value={accent} onChange={setAccent} options={[{ value: 'mix', label: 'Xen kẽ' }, { value: 'us', label: 'Anh-Mỹ' }, { value: 'uk', label: 'Anh-Anh' }]} />
                </div>
                <div>
                  <div className="mb-2 text-on-dark/60">Số lần được nghe lại</div>
                  <Segmented size="sm" value={maxPlays} onChange={setMaxPlays} options={[{ value: 0, label: 'Không giới hạn' }, { value: 3, label: '3 lần' }, { value: 2, label: '2 lần' }]} />
                </div>
              </>)}
            </div>
            {(mode === 'gap' || mode === 'dictation') && <p className="mt-5 text-xs text-on-dark/60">{pool.length} câu phù hợp · phiên này {Math.min(count, pool.length)} câu</p>}
            <Button variant="gold" size="lg" className="mt-3 w-full" icon={<Play size={16} />} onClick={start}>Bắt đầu nghe</Button>
            {err && <p role="alert" className="mt-3 text-sm text-[#f0a0a8]">{err}</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ============================ PHIÊN NGHE ============================ */
function Runner({ items, mode, rate, maxPlays, onFinish }: { items: RItem[]; mode: 'gap' | 'dictation'; rate: number; maxPlays: number; onFinish: (o: Outcome[], ms: number) => void }) {
  const recordQuiz = useHub((s) => s.recordQuiz)
  const [i, setI] = useState(0)
  const [plays, setPlays] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [vals, setVals] = useState<string[]>([])
  const [text, setText] = useState('')
  const [out, setOut] = useState<Outcome | null>(null)
  const outs = useRef<Outcome[]>([])
  const t0 = useRef(Date.now())
  const finished = useRef(false)
  const r = items[i]
  const tokens = useMemo(() => tokenize(r.item.text), [r])

  const play = async () => {
    if (maxPlays && plays >= maxPlays && !out) return
    setPlays((p) => p + 1)
    setPlaying(true)
    await speak(r.item.text, r.accent, rate)
    setPlaying(false)
  }
  const playRef = useRef(play)
  playRef.current = play

  useEffect(() => {
    setPlays(0); setOut(null); setText(''); setVals(r.blanks.map(() => ''))
    const id = setTimeout(() => playRef.current(), 350)
    return () => { clearTimeout(id); stopSpeaking() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])
  useEffect(() => () => stopSpeaking(), [])

  const finish = () => {
    if (finished.current) return
    finished.current = true
    stopSpeaking()
    const list = outs.current
    const result: QuizResult = {
      id: uid('qz'), at: new Date().toISOString(), module: 'listening', type: mode === 'gap' ? 'listening_gap' : 'listening_spelling',
      total: list.length, correct: list.filter((o) => o.correct).length, durationMs: Date.now() - t0.current, items: list.map((o) => ({ wordId: null, correct: o.correct })),
    }
    if (list.length) recordQuiz(result, [])
    onFinish(list, result.durationMs)
  }

  const check = () => {
    if (out) return
    let o: Outcome
    if (mode === 'gap') {
      const ok = r.blanks.map((bi, k) => normWord(vals[k] ?? '') === normWord(tokens[bi].core))
      o = { r, correct: ok.every(Boolean), score: ok.filter(Boolean).length / Math.max(1, ok.length), answer: vals.join(' · ') }
    } else {
      const ops = diffWords(r.item.text, text)
      o = { r, correct: ops.every((x) => x.type === 'ok'), score: dictationScore(ops), answer: text.trim(), ops }
    }
    outs.current.push(o)
    setOut(o)
    stopSpeaking()
  }
  const next = () => (i + 1 >= items.length ? finish() : setI(i + 1))
  const canCheck = mode === 'gap' ? vals.some((v) => v.trim()) : !!text.trim()

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'r') { e.preventDefault(); playRef.current() }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const limitHit = !!maxPlays && plays >= maxPlays && !out
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><div className="folio">Listening · TOEIC-style</div><div className="display text-xl text-ink">{mode === 'gap' ? 'Nghe – điền từ khuyết' : 'Nghe – chép cả câu'}</div></div>
        <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => { if (!outs.current.length || confirm('Kết thúc phiên? Các câu đã làm sẽ được lưu.')) finish() }}>Kết thúc</Button>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <ProgressBar value={i + (out ? 1 : 0)} max={items.length} tone="forest" height={5} />
        <span className="shrink-0 font-mono text-xs text-muted">Câu {i + 1}/{items.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.form key={i} onSubmit={(e) => { e.preventDefault(); if (out) next(); else if (canCheck) check() }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="sheet frame-ornate p-7 sm:p-10">
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={play} disabled={limitHit} aria-label="Nghe câu này"
              className={clsx('grid h-20 w-20 place-items-center rounded-full border-2 border-gold bg-gold/10 text-gold-ink transition-transform hover:scale-105 disabled:opacity-40', playing && 'animate-pulse bg-gold/25')}>
              {playing ? <Pause size={30} /> : <Headphones size={32} />}
            </button>
            <div className="flex items-center gap-3 font-mono text-xs text-muted">
              <span>{r.accent === 'us' ? 'Giọng Anh-Mỹ' : 'Giọng Anh-Anh'}</span>
              <span>·</span>
              <span>Đã nghe {plays}{maxPlays ? `/${maxPlays}` : ''} lần</span>
              <span>·</span>
              <span>{TOEIC_TOPICS[r.item.topic]} · {LEVEL_LABEL[itemLevel(r.item.text)]}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { speak(r.item.text, r.accent, 0.6) }} disabled={limitHit} className="inline-flex items-center gap-1 rounded-full border border-rule-strong px-3 py-1 text-xs text-ink-2 hover:border-gold disabled:opacity-40"><Volume2 size={12} /> Nghe chậm</button>
            </div>
          </div>

          <div className="mt-7">
            {mode === 'gap' ? (
              <p className="font-serif text-[1.45rem] leading-[2.6rem] text-ink">
                {tokens.map((t, k) => {
                  const bi = r.blanks.indexOf(k)
                  if (bi < 0) return <span key={k}>{t.text}{' '}</span>
                  const right = out ? normWord(vals[bi] ?? '') === normWord(t.core) : null
                  return (
                    <span key={k}>
                      {t.pre}
                      <input value={vals[bi] ?? ''} onChange={(e) => setVals((v) => v.map((x, n) => (n === bi ? e.target.value : x)))} disabled={!!out} autoFocus={bi === 0} autoComplete="off" autoCapitalize="off" spellCheck={false}
                        aria-label={`Chỗ trống ${bi + 1}`} style={{ width: `${Math.max(4, t.core.length + 2)}ch` }}
                        className={clsx('mx-0.5 border-b-2 bg-transparent px-1 text-center font-mono text-lg outline-none transition-colors', right === null ? 'border-gold focus:border-burgundy' : right ? 'border-ok text-ok' : 'border-bad text-bad')} />
                      {out && !right && <span className="mx-0.5 rounded bg-ok/12 px-1 font-mono text-base text-ok">{t.core}</span>}
                      {t.post}{' '}
                    </span>
                  )
                })}
              </p>
            ) : (
              <div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!!out} rows={3} autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (out) next(); else if (canCheck) check() } }}
                  aria-label="Gõ lại câu bạn nghe được" placeholder="Gõ lại câu bạn nghe được… (Enter để kiểm tra)" className="field !text-lg" />
                <p className="mt-1 text-xs text-muted">Không cần viết hoa hay đúng dấu câu — hệ thống chỉ chấm từng từ.</p>
              </div>
            )}
          </div>

          {out ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <div className={clsx('flex items-center gap-2 font-display text-xl', out.correct ? 'text-ok' : 'text-bad')}>{out.correct ? <Check size={20} /> : <X size={20} />} {out.correct ? 'Chính xác!' : `Đúng ${Math.round(out.score * 100)}%`}</div>
              {mode === 'dictation' && out.ops && <WordDiff ops={out.ops} />}
              <div className="mt-3 rounded-md border border-rule bg-surface-2/50 p-4 text-sm">
                <div className="font-mono text-[0.66rem] tracking-[0.2em] text-muted uppercase">Nội dung câu</div>
                <p className="mt-1 font-serif text-lg text-ink">{r.item.text}</p>
                <button type="button" onClick={() => speak(r.item.text, r.accent, rate)} className="mt-2 inline-flex items-center gap-1 text-xs text-burgundy-ink underline"><Volume2 size={12} /> Nghe lại</button>
              </div>
              <div className="mt-5 text-center"><Button type="submit" className="flex-row-reverse" icon={<ArrowRight size={16} />}>{i + 1 >= items.length ? 'Xem kết quả' : 'Câu tiếp theo'}</Button></div>
            </motion.div>
          ) : (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button type="submit" disabled={!canCheck} icon={<Check size={16} />}>Kiểm tra</Button>
              <Button type="button" variant="ghost" onClick={() => { if (mode === 'gap') setVals(r.blanks.map(() => '')); else setText(''); setTimeout(check, 0) }}>Bỏ qua</Button>
            </div>
          )}
        </motion.form>
      </AnimatePresence>
    </div>
  )
}

function WordDiff({ ops }: { ops: WordOp[] }) {
  return (
    <p className="mt-3 font-serif text-lg leading-8" aria-label="So sánh từng từ">
      {ops.map((o, k) => {
        if (o.type === 'ok') return <span key={k} className="text-ok">{o.expected} </span>
        if (o.type === 'sub') return <span key={k}><span className="text-bad line-through">{o.got}</span> <span className="rounded bg-gold/20 px-0.5 text-gold-ink">{o.expected}</span> </span>
        if (o.type === 'del') return <span key={k} className="rounded bg-gold/20 px-0.5 text-gold-ink" title="Bạn bỏ sót từ này">{o.expected} </span>
        return <span key={k} className="text-bad line-through" title="Từ thừa">{o.got} </span>
      })}
    </p>
  )
}

/* ============================ KẾT QUẢ ============================ */
function ResultView({ res, onBack, onAgain, onRetry, rate }: { res: { mode: 'gap' | 'dictation'; outs: Outcome[]; ms: number }; onBack: () => void; onAgain: () => void; onRetry: () => void; rate: number }) {
  const { outs } = res
  const exact = outs.filter((o) => o.correct).length
  const avg = outs.length ? Math.round((outs.reduce((n, o) => n + o.score, 0) / outs.length) * 100) : 0
  const byTopic = (Object.keys(TOEIC_TOPICS) as ToeicTopic[]).map((t) => {
    const l = outs.filter((o) => o.r.item.topic === t)
    return { t, n: l.length, p: l.length ? Math.round((l.reduce((n, o) => n + o.score, 0) / l.length) * 100) : 0 }
  }).filter((x) => x.n > 0)
  const wrong = outs.filter((o) => !o.correct)
  const [spk, setSpk] = useState<string | null>(null)
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <div className="leather p-8 text-center sm:p-10">
        <Laurel className="mx-auto h-12 w-28 text-gold" />
        <h2 className="display mt-3 text-3xl text-on-dark">{outs.length === 0 ? 'Phiên trống' : avg >= 85 ? 'Tai nghe rất tốt!' : avg >= 60 ? 'Khá ổn, nghe thêm nhé' : 'Hãy nghe chậm lại và luyện thêm'}</h2>
        <div className="my-6 flex justify-center"><Ring value={avg} size={130} stroke={9} tone="var(--gold)" track="rgba(232,236,250,.15)" label={<span className="display text-3xl">{avg}%</span>} /></div>
        <p className="text-sm text-on-dark/75">{exact}/{outs.length} câu đúng hoàn toàn · {formatDuration(res.ms)} · độ chính xác trung bình {avg}%</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {wrong.length > 0 && <Button variant="gold" icon={<RotateCcw size={15} />} onClick={onRetry}>Nghe lại {wrong.length} câu sai</Button>}
          <Button variant="onDark" onClick={onAgain}>Phiên mới</Button>
          <Button variant="onDark" onClick={onBack}>Về trang luyện nghe</Button>
        </div>
      </div>
      {byTopic.length > 1 && (
        <section className="mt-8">
          <SectionTitle numeral="i">Theo chủ đề</SectionTitle>
          <ul className="sheet divide-y divide-rule">{byTopic.map((x) => (
            <li key={x.t} className="flex items-center gap-4 px-5 py-3 text-sm"><span className="w-44 shrink-0 text-ink">{TOEIC_TOPICS[x.t]}</span><ProgressBar value={x.p} tone={x.p >= 70 ? 'forest' : 'burgundy'} /><span className="w-20 shrink-0 text-right font-mono text-xs text-muted">{x.p}% · {x.n} câu</span></li>
          ))}</ul>
        </section>
      )}
      {wrong.length > 0 && (
        <section className="mt-8">
          <SectionTitle numeral="ii">Những câu nghe chưa đúng</SectionTitle>
          <ul className="sheet divide-y divide-rule">{wrong.map((o, k) => (
            <li key={k} className="px-5 py-4">
              <p className="font-serif text-lg text-ink">{o.r.item.text}</p>
              {o.answer && <p className="mt-1 text-sm text-muted">Bạn viết: <span className="font-mono text-bad">{o.answer}</span></p>}
              <button onClick={() => { setSpk(o.r.item.id); speak(o.r.item.text, o.r.accent, rate).then(() => setSpk(null)) }} className="mt-1 inline-flex items-center gap-1 text-xs text-burgundy-ink underline"><Volume2 size={12} className={clsx(spk === o.r.item.id && 'animate-pulse')} /> Nghe lại</button>
            </li>
          ))}</ul>
        </section>
      )}
      {pct(exact, outs.length) === 100 && outs.length > 0 && <p className="mt-6 text-center text-sm text-muted">Hoàn hảo! Hãy thử tăng tốc độ đọc hoặc giảm số lần được nghe lại.</p>}
    </div>
  )
}
