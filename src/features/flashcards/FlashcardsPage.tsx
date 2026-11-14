import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Keyboard, Layers, Play, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Laurel } from '../../components/illustrations'
import { Button } from '../../components/ui/Button'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { ProgressBar, Ring } from '../../components/ui/Progress'
import { Chip, Segmented } from '../../components/ui/Segmented'
import { EmptyState } from '../../components/ui/States'
import { TOPICS } from '../../data/content'
import { advanceQueue, buildDeck, DECK_SOURCES, deckCounts, type DeckSource } from '../../domain/deck'
import { NEW_SRS, previewIntervals } from '../../domain/srs'
import { CEFR_LEVELS, type Cefr, type Rating, type Word } from '../../domain/types'
import { formatDuration, pct, relativeDay } from '../../domain/util'
import { useSpeak, useStudyTimer } from '../../hooks'
import { stopSpeaking } from '../../services/speech'
import { useAllWords, useData, useHub } from '../../store/useHub'
import { FlashCard, type Direction } from './FlashCard'

const RATINGS: { key: Rating; label: string; hint: string; cls: string }[] = [
  { key: 'again', label: 'Quên', hint: 'Chưa nhớ', cls: 'border-bad/60 text-bad hover:bg-bad/10' },
  { key: 'hard', label: 'Khó', hint: 'Nhớ khó khăn', cls: 'border-gold/70 text-gold-ink hover:bg-gold/12' },
  { key: 'good', label: 'Nhớ', hint: 'Nhớ được', cls: 'border-forest/70 text-forest hover:bg-forest/10 dark:text-[#8fd1a8] dark:border-[#8fd1a8]/50' },
  { key: 'easy', label: 'Dễ', hint: 'Quá dễ', cls: 'border-ok/70 text-ok hover:bg-ok/10' },
]

interface Summary { total: number; counts: Record<Rating, number>; durationMs: number; forgotten: Word[]; learnedNew: number; nextDue: string | null; deckSize: number }

export default function FlashcardsPage() {
  useStudyTimer('flashcards')
  const words = useAllWords()
  const data = useData()
  const defaultLevel = useHub((s) => s.settings.level)
  const goal = useHub((s) => s.settings.goals.flashcards)

  const [source, setSource] = useState<DeckSource>('due')
  const [levels, setLevels] = useState<Cefr[]>([])
  const [topic, setTopic] = useState('')
  const [size, setSize] = useState(20)
  const [direction, setDirection] = useState<Direction>('en_vi')
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [session, setSession] = useState<{ key: number; ids: string[] } | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const filter = useMemo(() => ({ levels, topic }), [levels, topic])
  const counts = useMemo(() => deckCounts(data, words, filter), [data, words, filter])

  const start = (src: DeckSource = source) => {
    setErr(null)
    const deck = buildDeck(src, data, words, filter, size)
    if (!deck.length) {
      setErr(src === 'due' ? 'Hiện không có thẻ nào đến hạn. Hãy học từ mới hoặc chọn một nguồn khác.' : 'Nguồn này chưa có từ nào khớp bộ lọc. Thử nới lỏng cấp độ hoặc chủ đề.')
      return
    }
    setSummary(null)
    setSession({ key: Date.now(), ids: deck.map((w) => w.id) })
  }

  if (session) {
    return <Runner key={session.key} ids={session.ids} words={words} direction={direction} autoSpeak={autoSpeak}
      onExit={() => setSession(null)} onFinish={(s) => { setSession(null); setSummary(s) }} />
  }
  if (summary) {
    return <SummaryView s={summary} onAgain={() => start()} onBack={() => setSummary(null)} />
  }

  const total = counts[source]
  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="04" kicker="Flashcards" title="Thẻ" italic="ghi nhớ"
        lead="Lặp lại ngắt quãng (SM-2): thẻ bạn nhớ tốt sẽ xuất hiện thưa dần, thẻ bạn quên sẽ quay lại đúng lúc sắp quên. Đánh giá trung thực để lịch ôn chính xác."
        actions={<span className="hidden items-center gap-1.5 font-mono text-xs text-muted sm:flex"><Keyboard size={14} /> Space = lật · 1–4 = chấm</span>} />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <SectionTitle numeral="i">Chọn bộ thẻ</SectionTitle>
          <ol className="sheet divide-y divide-rule">
            {DECK_SOURCES.map((s, i) => {
              const on = source === s.key
              const n = counts[s.key]
              return (
                <motion.li key={s.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <button onClick={() => setSource(s.key)} aria-pressed={on} disabled={n === 0 && !on}
                    className={clsx('group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors disabled:opacity-50', on ? 'bg-forest/8' : 'hover:bg-gold/6')}>
                    <span className="w-9 shrink-0 font-mono text-base text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg text-ink">{s.label}</span>
                      <span className="block text-sm text-muted">{s.desc}</span>
                    </span>
                    <span className={clsx('shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs', n > 0 && s.key === 'due' ? 'bg-gold text-charcoal' : 'border border-rule-strong text-muted')}>{n}</span>
                    <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors', on ? 'border-forest bg-forest text-on-dark' : 'border-rule-strong text-transparent group-hover:border-gold')}><Check size={14} /></span>
                  </button>
                </motion.li>
              )
            })}
          </ol>

          {counts.due === 0 && data.reviewLogs.length === 0 && Object.keys(data.progress).length === 0 && (
            <div className="sheet mt-6">
              <EmptyState title="Chưa có thẻ nào để ôn" illustration={<Layers className="h-20 w-20" strokeWidth={1} />}
                action={<div className="flex flex-wrap justify-center gap-2"><Button onClick={() => { setSource('new'); }}>Học từ mới bằng flashcard</Button><Link to="/daily"><Button variant="outline">Học mỗi ngày</Button></Link></div>}>
                Hãy bắt đầu với “Từ mới chưa học”. Mỗi thẻ bạn chấm sẽ được xếp lịch ôn tự động.
              </EmptyState>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="leather p-6">
            <div className="flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase"><Layers size={14} /> Thiết lập phiên</div>
            <div className="mt-5 space-y-5 text-sm">
              <div>
                <div className="mb-2 text-on-dark/60">Cấp độ <span className="text-on-dark/40">(trống = tất cả)</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {CEFR_LEVELS.map((l) => <Chip key={l} on={levels.includes(l)} onClick={() => setLevels((c) => (c.includes(l) ? c.filter((x) => x !== l) : [...c, l]))}>{l}</Chip>)}
                </div>
                {!levels.length && <button onClick={() => setLevels([defaultLevel])} className="mt-2 text-xs text-gold underline">Chỉ cấp hiện tại ({defaultLevel})</button>}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-on-dark/60">Chủ đề</span>
                <select value={topic} onChange={(e) => setTopic(e.target.value)} className="field !bg-black/25 !text-on-dark">
                  <option value="">Mọi chủ đề</option>
                  {Object.entries(TOPICS).map(([k, t]) => <option key={k} value={k}>{t.vi}</option>)}
                </select>
              </label>
              <div>
                <div className="mb-2 text-on-dark/60">Số thẻ trong phiên</div>
                <Segmented value={size} onChange={setSize} size="sm" className="!border-gold/40 !bg-black/20" options={[{ value: 10, label: '10' }, { value: 20, label: '20' }, { value: 30, label: '30' }, { value: 0, label: 'Tất cả' }]} />
                <p className="mt-1.5 text-xs text-on-dark/50">Mục tiêu hằng ngày của bạn: {goal} thẻ.</p>
              </div>
              <div>
                <div className="mb-2 text-on-dark/60">Hướng học</div>
                <Segmented value={direction} onChange={setDirection} size="sm" className="!border-gold/40 !bg-black/20" options={[{ value: 'en_vi', label: 'Anh → Việt' }, { value: 'vi_en', label: 'Việt → Anh' }]} />
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-on-dark/80">Tự đọc từ khi lật thẻ</span>
                <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="h-4 w-4 accent-[var(--gold)]" />
              </label>
            </div>
            <div className="mt-5 border-t border-gold/25 pt-4 font-mono text-xs text-on-dark/70">{total} thẻ khả dụng · phiên này tối đa {size === 0 ? total : Math.min(size, total)} thẻ</div>
            <Button variant="gold" size="lg" className="mt-4 w-full" icon={<Play size={17} />} disabled={total === 0} onClick={() => start()}>Bắt đầu ôn tập</Button>
          </div>
          {err && <p role="alert" className="mt-3 rounded-md border border-bad/35 bg-bad/6 p-3 text-sm text-ink-2">{err}</p>}
        </aside>
      </div>
    </div>
  )
}

/* ============================ PHIÊN ÔN ============================ */
function Runner({ ids, words, direction, autoSpeak, onExit, onFinish }: {
  ids: string[]; words: Word[]; direction: Direction; autoSpeak: boolean; onExit: () => void; onFinish: (s: Summary) => void
}) {
  const reviewCard = useHub((s) => s.reviewCard)
  const { say } = useSpeak()
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words])
  const [queue, setQueue] = useState(ids)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const reviewedRef = useRef(0)
  const stats = useRef({ counts: { again: 0, hard: 0, good: 0, easy: 0 } as Record<Rating, number>, forgotten: new Map<string, Word>(), startedAsNew: new Set<string>() })
  const start = useRef(Date.now())
  const lock = useRef(false)

  const cur = queue.length ? byId.get(queue[0]) : undefined
  const st = useHub((s) => (cur ? s.progress[cur.id] : undefined))
  const intervals = useMemo(() => previewIntervals(st?.srs ?? NEW_SRS), [st])

  // ghi nhớ thẻ nào là thẻ mới ngay khi hiện (để cuối phiên đếm số từ mới đã học)
  useEffect(() => { if (cur && !st?.srs.reps) stats.current.startedAsNew.add(cur.id) }, [cur, st])
  useEffect(() => () => stopSpeaking(), [])

  const flip = () => {
    if (!cur || flipped) return
    setFlipped(true)
    if (autoSpeak) say(cur.word, undefined, cur.id)
  }

  const finish = () => {
    stopSpeaking()
    const prog = useHub.getState().progress
    const dues = ids.map((id) => prog[id]?.srs.due).filter((d): d is string => !!d).sort()
    onFinish({
      total: reviewedRef.current, counts: stats.current.counts, durationMs: Date.now() - start.current,
      forgotten: [...stats.current.forgotten.values()], learnedNew: stats.current.startedAsNew.size,
      nextDue: dues[0] ?? null, deckSize: ids.length,
    })
  }

  const rate = (rating: Rating) => {
    if (!cur || !flipped || lock.current) return
    lock.current = true
    reviewCard(cur.id, rating, 'flashcards')
    stats.current.counts[rating]++
    if (rating === 'again') stats.current.forgotten.set(cur.id, cur)
    reviewedRef.current += 1
    setReviewed(reviewedRef.current)
    const next = advanceQueue(queue, rating)
    setFlipped(false)
    setTimeout(() => { lock.current = false }, 260)
    if (!next.length) { setQueue(next); setTimeout(finish, 0) } else setQueue(next)
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === ' ' || e.key === 'Enter') {
        if (tag === 'BUTTON') return
        e.preventDefault()
        if (!flipped) flip()
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) rate(RATINGS[Number(e.key) - 1].key)
      else if (e.key.toLowerCase() === 'p' && cur) say(cur.word, undefined, cur.id)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const confirmExit = () => {
    if (!reviewedRef.current) return onExit()
    if (window.confirm('Kết thúc phiên? Các thẻ bạn đã chấm vẫn được lưu và xếp lịch ôn.')) finish()
  }

  if (!cur) return null
  const done = ids.length - new Set(queue).size
  const remaining = new Set(queue).size

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div><div className="folio">Flashcards</div><div className="display text-xl text-ink">Phiên ôn tập</div></div>
        <Button variant="ghost" size="sm" onClick={confirmExit} icon={<X size={14} />}>Kết thúc</Button>
      </div>
      <div className="mb-8 flex items-center gap-3">
        <ProgressBar value={done} max={ids.length} tone="forest" height={5} />
        <span className="shrink-0 font-mono text-xs text-muted">Còn {remaining} thẻ</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={cur.id + ':' + reviewed} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
          <FlashCard word={cur} direction={direction} flipped={flipped} onFlip={flip} />
        </motion.div>
      </AnimatePresence>

      <div className="mx-auto mt-8 max-w-2xl">
        {!flipped ? (
          <Button size="lg" className="w-full" onClick={flip} icon={<RotateCcw size={16} />}>Lật thẻ xem đáp án</Button>
        ) : (
          <>
            <p className="mb-3 text-center text-sm text-muted">Bạn nhớ từ này đến mức nào?</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {RATINGS.map((r, i) => (
                <button key={r.key} onClick={() => rate(r.key)}
                  className={clsx('rounded-md border-2 bg-surface/60 px-3 py-3 text-center transition-colors', r.cls)}>
                  <span className="block font-display text-lg">{r.label}</span>
                  <span className="block font-mono text-[0.66rem] opacity-80">{intervals[r.key]}</span>
                  <span className="mt-1 block font-mono text-[0.6rem] opacity-50">phím {i + 1}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ============================ TỔNG KẾT ============================ */
function SummaryView({ s, onAgain, onBack }: { s: Summary; onAgain: () => void; onBack: () => void }) {
  const remembered = s.counts.hard + s.counts.good + s.counts.easy
  const p = pct(remembered, s.total)
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="leather relative overflow-hidden p-8 text-center sm:p-10">
        <Laurel className="mx-auto h-10 w-24 text-gold" />
        <div className="folio mt-3 !text-gold">Flashcards · Phiếu tổng kết</div>
        <div className="my-5 flex justify-center">
          <Ring value={p} size={150} stroke={9} tone="var(--gold)" track="rgba(232,236,250,.15)"
            label={<span className="display text-5xl text-on-dark">{p}<span className="text-2xl">%</span></span>} sub={<span className="font-mono text-[0.66rem] text-on-dark/60">nhớ được</span>} />
        </div>
        <h2 className="display text-3xl text-on-dark">{s.total === 0 ? 'Chưa chấm thẻ nào' : p >= 80 ? 'Phiên ôn tuyệt vời' : p >= 50 ? 'Một phiên chắc chắn' : 'Đừng nản — lặp lại sẽ giúp bạn nhớ'}</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-on-dark/70">
          Bạn đã chấm {s.total} lượt trên {s.deckSize} thẻ{s.learnedNew > 0 && <>, trong đó {s.learnedNew} từ mới</>}. {s.nextDue && <>Thẻ tiếp theo sẽ đến hạn {relativeDay(s.nextDue)}.</>}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded border border-gold/25 bg-gold/20 text-center text-on-dark sm:grid-cols-5">
          {([['Quên', s.counts.again], ['Khó', s.counts.hard], ['Nhớ', s.counts.good], ['Dễ', s.counts.easy], ['Thời gian', formatDuration(s.durationMs)]] as const).map(([k, v]) => (
            <div key={k} className="bg-deep px-3 py-3"><div className="font-mono text-[0.62rem] tracking-widest text-gold uppercase">{k}</div><div className="display mt-0.5 text-xl">{v}</div></div>
          ))}
        </div>
      </motion.div>

      {s.forgotten.length > 0 && (
        <section className="sheet mt-6 p-6">
          <h3 className="display text-xl text-ink">{s.forgotten.length} từ bạn đã quên trong phiên này</h3>
          <p className="mt-1 text-sm text-muted">Chúng đã được ghi vào Sổ lỗi sai và sẽ quay lại sớm.</p>
          <ul className="mt-3 divide-y divide-rule">
            {s.forgotten.map((w) => (
              <li key={w.id} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                <Link to={`/library/${w.id}`} className="font-display text-lg text-ink hover:text-burgundy-ink">{w.word}</Link>
                <span className="text-right text-muted">{w.meaningVi}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={onAgain} icon={<RotateCcw size={16} />}>Ôn bộ tiếp theo</Button>
        <Button variant="outline" onClick={onBack}>Chọn bộ thẻ khác</Button>
        <Link to="/"><Button variant="ghost" icon={<ArrowRight size={16} />} className="flex-row-reverse">Về tổng quan</Button></Link>
      </div>
    </div>
  )
}
