import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Clock, Headphones, Keyboard, RotateCcw, SpellCheck, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Laurel } from '../../components/illustrations'
import { Button } from '../../components/ui/Button'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { ProgressBar, Ring } from '../../components/ui/Progress'
import { Chip, Segmented } from '../../components/ui/Segmented'
import { POS_ABBR } from '../../data/content'
import { poolFor, type DeckSource } from '../../domain/deck'
import { charDiff, describeDiff, maskWord, misspell, type DiffOp } from '../../domain/spelling'
import { CEFR_LEVELS, type Cefr, type SpellingAttempt, type SpellingMode, type SpellingSession, type Word } from '../../domain/types'
import { dayKey, formatDuration, pct, shuffle, uid } from '../../domain/util'
import { useSpeak, useCountdown, useStudyTimer } from '../../hooks'
import { stopSpeaking } from '../../services/speech'
import { useAllWords, useData, useHub, type MistakeInput } from '../../store/useHub'
import { PronounceButtons } from '../../components/vocab/Pronounce'

const MODES: { key: SpellingMode; label: string; desc: string }[] = [
  { key: 'vi_to_en', label: 'Nghĩa → từ', desc: 'Đọc nghĩa tiếng Việt, gõ từ tiếng Anh.' },
  { key: 'def_to_en', label: 'Định nghĩa → từ', desc: 'Đọc định nghĩa tiếng Anh, gõ từ được mô tả.' },
  { key: 'audio', label: 'Nghe → viết', desc: 'Nghe phát âm rồi viết lại đúng chính tả.' },
  { key: 'missing', label: 'Điền chữ thiếu', desc: 'Từ bị ẩn một số chữ cái, hãy viết cả từ.' },
  { key: 'correction', label: 'Sửa lỗi sai', desc: 'Từ bị viết sai, hãy gõ lại cho đúng.' },
]
const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.key, m.label])) as Record<SpellingMode, string>

type Source = DeckSource | 'all'
const SOURCES: { value: Source; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'new', label: 'Từ mới' },
  { value: 'learned', label: 'Đã học' },
  { value: 'mistakes', label: 'Hay sai' },
  { value: 'favorites', label: 'Yêu thích' },
]

interface Q { word: Word; mode: SpellingMode; shown: string }
interface Done { correct: boolean; answer: string; ops: DiffOp[] }
interface Result { session: SpellingSession; attempts: SpellingAttempt[]; wrong: { q: Q; answer: string; ops: DiffOp[] }[] }

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

function buildQuestions(words: Word[], modes: SpellingMode[]): Q[] {
  return words.map((word, i) => {
    const mode = modes[i % modes.length]
    let shown = ''
    if (mode === 'missing') shown = maskWord(word.word, i).masked
    if (mode === 'correction') shown = misspell(word.word, i)
    return { word, mode, shown }
  })
}

export default function SpellingPage() {
  useStudyTimer('spelling')
  const words = useAllWords()
  const data = useData()
  const defaultLevel = useHub((s) => s.settings.level)

  const [modes, setModes] = useState<SpellingMode[]>(['vi_to_en', 'audio', 'missing', 'correction'])
  const [levels, setLevels] = useState<Cefr[]>([])
  const [source, setSource] = useState<Source>('all')
  const [count, setCount] = useState(10)
  const [limit, setLimit] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [run, setRun] = useState<{ key: number; qs: Q[]; limit: number | null } | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const pool = useMemo(() => {
    const base = source === 'all' ? words : poolFor(source, data, words)
    return base.filter((w) => !levels.length || levels.includes(w.cefr))
  }, [source, words, data, levels])

  const begin = (list: Word[], m: SpellingMode[], lim: number | null) => {
    setResult(null)
    setRun({ key: Date.now(), qs: buildQuestions(list, m), limit: lim })
  }
  const start = () => {
    setErr(null)
    if (!modes.length) return setErr('Hãy chọn ít nhất một chế độ.')
    if (!pool.length) return setErr('Nguồn này chưa có từ nào khớp bộ lọc. Thử nới lỏng cấp độ hoặc đổi nguồn.')
    begin(shuffle(pool).slice(0, count), modes, limit)
  }

  if (run) {
    return <Runner key={run.key} qs={run.qs} modes={modes} levels={levels} limit={run.limit}
      onFinish={(r) => { setRun(null); setResult(r) }} />
  }
  if (result) {
    return <ResultView r={result} onAgain={start} onBack={() => setResult(null)}
      onRetryWrong={() => begin(result.wrong.map((w) => w.q.word), modes, null)} />
  }

  const goal = 10
  const doneToday = data.spellingSessions.filter((s) => dayKey(s.at) === dayKey()).reduce((n, s) => n + s.total, 0)
  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="05" kicker="Daily Spelling" title="Chính tả" italic="hằng ngày"
        lead="Viết đúng từ mới là nhớ thật sự. Chọn chế độ bạn muốn luyện; từ viết sai sẽ được ghi vào Sổ lỗi sai để ôn lại sau."
        actions={<span className="hidden items-center gap-1.5 font-mono text-xs text-muted sm:flex"><Keyboard size={14} /> Enter = kiểm tra / tiếp</span>} />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <SectionTitle numeral="i" aside={<span className="font-mono text-xs text-muted">Hôm nay: {doneToday}/{goal} từ</span>}>Chọn chế độ</SectionTitle>
          <ol className="sheet divide-y divide-rule">
            {MODES.map((m, i) => {
              const on = modes.includes(m.key)
              return (
                <motion.li key={m.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <button onClick={() => setModes((c) => (c.includes(m.key) ? c.filter((x) => x !== m.key) : [...c, m.key]))} aria-pressed={on}
                    className={clsx('group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors', on ? 'bg-forest/8' : 'hover:bg-gold/6')}>
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
          <p className="mt-3 text-xs text-muted">Chọn nhiều chế độ để xen kẽ trong cùng một phiên.</p>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="leather p-6">
            <div className="flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase"><SpellCheck size={14} /> Thiết lập phiên</div>
            <div className="mt-5 space-y-5 text-sm">
              <div>
                <div className="mb-2 text-on-dark/60">Nguồn từ</div>
                <div className="flex flex-wrap gap-1.5">{SOURCES.map((s) => <Chip key={s.value} on={source === s.value} onClick={() => setSource(s.value)}>{s.label}</Chip>)}</div>
              </div>
              <div>
                <div className="mb-2 text-on-dark/60">Cấp độ <span className="text-on-dark/40">(trống = tất cả)</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {CEFR_LEVELS.map((l) => <Chip key={l} on={levels.includes(l)} onClick={() => setLevels((c) => (c.includes(l) ? c.filter((x) => x !== l) : [...c, l]))}>{l}</Chip>)}
                </div>
                {!levels.length && <button onClick={() => setLevels([defaultLevel])} className="mt-2 text-xs text-gold underline">Chỉ cấp hiện tại ({defaultLevel})</button>}
              </div>
              <div>
                <div className="mb-2 text-on-dark/60">Số từ</div>
                <Segmented size="sm" value={count} onChange={setCount} options={[10, 20, 30].map((n) => ({ value: n, label: String(n) }))} />
              </div>
              <div>
                <div className="mb-2 text-on-dark/60">Giới hạn thời gian</div>
                <Segmented size="sm" value={limit ?? 0} onChange={(v) => setLimit(v || null)} options={[{ value: 0, label: 'Không' }, { value: 180, label: '3 phút' }, { value: 300, label: '5 phút' }, { value: 600, label: '10 phút' }]} />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-on-dark/60"><span>Có {pool.length} từ phù hợp</span><span>{Math.min(count, pool.length)} từ trong phiên</span></div>
            <Button variant="gold" size="lg" className="mt-3 w-full" icon={<SpellCheck size={16} />} onClick={start} disabled={!pool.length || !modes.length}>Bắt đầu luyện chính tả</Button>
            {err && <p role="alert" className="mt-3 text-sm text-[#f0a0a8]">{err}</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ============================ PHIÊN LUYỆN ============================ */
function Runner({ qs, modes, levels, limit, onFinish }: { qs: Q[]; modes: SpellingMode[]; levels: Cefr[]; limit: number | null; onFinish: (r: Result) => void }) {
  const recordSpelling = useHub((s) => s.recordSpelling)
  const { say } = useSpeak()
  const [i, setI] = useState(0)
  const [value, setValue] = useState('')
  const [done, setDone] = useState<Done | null>(null)
  const attempts = useRef<SpellingAttempt[]>([])
  const wrong = useRef<Result['wrong']>([])
  const sessionId = useRef(uid('sp'))
  const t0 = useRef(Date.now())
  const qStart = useRef(Date.now())
  const finished = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const q = qs[i]

  const finish = () => {
    if (finished.current) return
    finished.current = true
    stopSpeaking()
    const list = attempts.current
    const session: SpellingSession = {
      id: sessionId.current, at: new Date().toISOString(), modes, levels, total: list.length, correct: list.filter((a) => a.correct).length,
      durationMs: Date.now() - t0.current, timeLimitSec: limit,
    }
    if (list.length) {
      const mistakes: MistakeInput[] = wrong.current.map((w) => ({ wordId: w.q.word.id, category: 'spelling', source: 'spelling', wrongAnswer: w.answer || undefined }))
      recordSpelling(session, list, mistakes)
    }
    onFinish({ session, attempts: list, wrong: wrong.current })
  }
  const left = useCountdown(limit, !finished.current, finish)

  useEffect(() => {
    qStart.current = Date.now()
    setValue(''); setDone(null)
    inputRef.current?.focus()
    if (q?.mode === 'audio') say(q.word.word, undefined, q.word.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  const check = (skip = false) => {
    if (done || !q) return
    const answer = skip ? '' : value
    const correct = !skip && norm(answer) === norm(q.word.word)
    const ops = charDiff(q.word.word, answer.trim())
    const prompt = q.mode === 'vi_to_en' ? q.word.meaningVi : q.mode === 'def_to_en' ? q.word.definitionEn : q.mode === 'audio' ? '(nghe)' : q.shown
    attempts.current.push({ id: uid('sa'), sessionId: sessionId.current, wordId: q.word.id, mode: q.mode, prompt, answer: answer.trim(), expected: q.word.word, correct, ms: Date.now() - qStart.current, at: new Date().toISOString() })
    if (!correct) wrong.current.push({ q, answer: answer.trim(), ops })
    setDone({ correct, answer: answer.trim(), ops })
    if (correct) say(q.word.word, undefined, q.word.id)
  }
  const next = () => (i + 1 >= qs.length ? finish() : setI(i + 1))
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (done) next(); else if (value.trim()) check() }

  if (!q) return null
  const okCount = attempts.current.filter((a) => a.correct).length
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div><div className="folio">Daily Spelling</div><div className="display text-xl text-ink">{MODE_LABEL[q.mode]}</div></div>
        <div className="flex items-center gap-3">
          {limit != null && <span className={clsx('inline-flex items-center gap-1.5 font-mono text-sm', left <= 30 ? 'text-bad' : 'text-muted')}><Clock size={14} /> {formatDuration(left * 1000)}</span>}
          <Button variant="ghost" size="sm" onClick={() => { if (!attempts.current.length || confirm('Kết thúc phiên? Các câu đã làm sẽ được lưu.')) finish() }} icon={<X size={14} />}>Kết thúc</Button>
        </div>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <ProgressBar value={i + (done ? 1 : 0)} max={qs.length} tone="forest" height={5} />
        <span className="shrink-0 font-mono text-xs text-muted">Câu {i + 1}/{qs.length} · đúng {okCount}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.form key={i} onSubmit={submit} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="sheet frame-ornate p-7 sm:p-10">
          <div className="text-center">
            {q.mode === 'vi_to_en' && (<>
              <p className="font-display text-[2.2rem] leading-tight text-ink">{q.word.meaningVi}</p>
              <p className="serif-italic mt-2 text-lg text-burgundy-ink">{q.word.pos.map((p) => POS_ABBR[p]).join(', ')} · {q.word.word.length} chữ cái, bắt đầu bằng “{q.word.word[0]}”</p>
            </>)}
            {q.mode === 'def_to_en' && (<>
              <p className="serif-italic text-[1.45rem] leading-snug text-ink">“{q.word.definitionEn.replace(new RegExp(q.word.word, 'gi'), '＿＿＿')}”</p>
              <p className="mt-3 text-sm text-muted">{q.word.pos.map((p) => POS_ABBR[p]).join(', ')} · {q.word.word.length} chữ cái</p>
            </>)}
            {q.mode === 'audio' && (
              <div className="flex flex-col items-center gap-3">
                <button type="button" onClick={() => say(q.word.word, 'uk', q.word.id)} className="grid h-20 w-20 place-items-center rounded-full border-2 border-gold bg-gold/10 text-gold-ink transition-transform hover:scale-105" aria-label="Nghe lại"><Headphones size={32} /></button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => say(q.word.word, 'uk', q.word.id)} className="inline-flex items-center gap-1 rounded-full border border-rule-strong px-3 py-1 text-xs text-ink-2 hover:border-gold"><Volume2 size={12} /> Anh-Anh</button>
                  <button type="button" onClick={() => say(q.word.word, 'us', q.word.id)} className="inline-flex items-center gap-1 rounded-full border border-rule-strong px-3 py-1 text-xs text-ink-2 hover:border-gold"><Volume2 size={12} /> Anh-Mỹ</button>
                </div>
                <p className="text-sm text-muted">Nghe và viết lại từ bạn nghe được · {q.word.word.length} chữ cái</p>
              </div>
            )}
            {q.mode === 'missing' && (<>
              <p className="entry-word text-[3.2rem] tracking-[0.12em] text-ink">{q.shown}</p>
              <p className="mt-2 text-sm text-muted">Nghĩa: {q.word.meaningVi}</p>
            </>)}
            {q.mode === 'correction' && (<>
              <p className="entry-word text-[3.2rem] text-bad line-through decoration-bad/50">{q.shown}</p>
              <p className="mt-2 text-sm text-muted">Từ này viết sai. Nghĩa: {q.word.meaningVi}</p>
            </>)}
          </div>

          <div className="mx-auto mt-7 max-w-md">
            <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} disabled={!!done} autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false}
              aria-label="Gõ đáp án" placeholder="Gõ từ tiếng Anh…" className={clsx('field text-center !text-2xl', done && (done.correct ? '!border-ok' : '!border-bad'))} />
          </div>

          {done ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
              <div className={clsx('inline-flex items-center gap-2 font-display text-xl', done.correct ? 'text-ok' : 'text-bad')}>{done.correct ? <Check size={20} /> : <X size={20} />} {done.correct ? 'Chính xác!' : 'Chưa đúng'}</div>
              {!done.correct && (
                <div className="mt-3">
                  <DiffLine ops={done.ops} />
                  <ul className="mt-2 text-sm text-muted">{describeDiff(done.ops).slice(0, 3).map((d, k) => <li key={k}>{d}</li>)}</ul>
                </div>
              )}
              <div className="mt-4 rounded-md border border-rule bg-surface-2/50 p-4 text-left text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="entry-word text-2xl text-ink">{q.word.word}</span><PronounceButtons word={q.word} compact /></div>
                <p className="mt-1 text-ink-2">{q.word.meaningVi}</p>
                {q.word.examples[0] && <p className="mt-2 border-l-2 border-gold pl-3 text-muted">{q.word.examples[0].en}</p>}
              </div>
              <Button type="submit" className="mt-5 flex-row-reverse" icon={<ArrowRight size={16} />}>{i + 1 >= qs.length ? 'Xem kết quả' : 'Câu tiếp theo'}</Button>
            </motion.div>
          ) : (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button type="submit" disabled={!value.trim()} icon={<Check size={16} />}>Kiểm tra</Button>
              <Button type="button" variant="ghost" onClick={() => check(true)}>Bỏ qua (không biết)</Button>
            </div>
          )}
        </motion.form>
      </AnimatePresence>
    </div>
  )
}

/** Hiển thị đáp án đúng, tô màu từng ký tự so với bài làm. */
function DiffLine({ ops }: { ops: DiffOp[] }) {
  return (
    <div className="font-mono text-2xl tracking-wide" aria-label="So sánh từng chữ cái">
      {ops.map((o, k) => {
        if (o.type === 'ok') return <span key={k} className="text-ok">{o.expected}</span>
        if (o.type === 'sub') return <span key={k} className="rounded-sm bg-bad/15 text-bad underline decoration-wavy" title={`Bạn viết “${o.got}”`}>{o.expected}</span>
        if (o.type === 'del') return <span key={k} className="rounded-sm bg-gold/25 text-gold-ink" title="Bạn bị thiếu chữ này">{o.expected}</span>
        return <span key={k} className="text-bad line-through" title="Chữ thừa">{o.got}</span>
      })}
    </div>
  )
}

/* ============================ KẾT QUẢ ============================ */
function ResultView({ r, onAgain, onBack, onRetryWrong }: { r: Result; onAgain: () => void; onBack: () => void; onRetryWrong: () => void }) {
  const { session } = r
  const acc = pct(session.correct, session.total)
  const byMode = MODES.map((m) => {
    const list = r.attempts.filter((a) => a.mode === m.key)
    return { ...m, total: list.length, ok: list.filter((a) => a.correct).length }
  }).filter((m) => m.total > 0)
  const avgSec = r.attempts.length ? Math.round(r.attempts.reduce((n, a) => n + a.ms, 0) / r.attempts.length / 1000) : 0
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <div className="leather p-8 text-center sm:p-10">
        <Laurel className="mx-auto h-12 w-28 text-gold" />
        <h2 className="display mt-3 text-3xl text-on-dark">{session.total === 0 ? 'Phiên trống' : acc >= 80 ? 'Chính tả rất tốt!' : acc >= 50 ? 'Khá ổn, tiếp tục nhé' : 'Cần luyện thêm'}</h2>
        <div className="my-6 flex justify-center">
          <Ring value={acc} size={130} stroke={9} tone="var(--gold)" track="rgba(232,236,250,.15)" label={<span className="display text-3xl">{acc}%</span>} />
        </div>
        <p className="text-sm text-on-dark/75">{session.correct}/{session.total} từ đúng · {formatDuration(session.durationMs)} · trung bình {avgSec} giây/từ</p>
        {byMode.length > 1 && <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">{byMode.map((m) => <span key={m.key} className="rounded-full border border-gold/40 px-3 py-1 text-on-dark/80">{m.label}: {m.ok}/{m.total}</span>)}</div>}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {r.wrong.length > 0 && <Button variant="gold" icon={<RotateCcw size={15} />} onClick={onRetryWrong}>Làm lại {r.wrong.length} từ sai</Button>}
          <Button variant="onDark" onClick={onAgain}>Phiên mới</Button>
          <Button variant="onDark" onClick={onBack}>Về trang chính tả</Button>
        </div>
      </div>

      {r.wrong.length > 0 && (
        <section className="mt-8">
          <SectionTitle numeral="i" aside={<Link to="/mistakes" className="text-xs text-burgundy-ink underline">Mở Sổ lỗi sai</Link>}>Những từ viết sai</SectionTitle>
          <ul className="sheet divide-y divide-rule">
            {r.wrong.map((w, k) => (
              <li key={k} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <Link to={`/library/${w.q.word.id}`} className="entry-word text-2xl text-ink hover:text-burgundy-ink">{w.q.word.word}</Link>
                  <span className="text-sm text-muted">{w.q.word.meaningVi}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 text-sm">
                  <span className="text-muted">Bạn viết: <span className="font-mono text-bad">{w.answer || '(bỏ trống)'}</span></span>
                  {w.answer && <DiffMini ops={w.ops} />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function DiffMini({ ops }: { ops: DiffOp[] }) {
  const msgs = describeDiff(ops).slice(0, 2)
  return <span className="text-xs text-muted">{msgs.join(' · ')}</span>
}
