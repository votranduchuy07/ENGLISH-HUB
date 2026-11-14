import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, GraduationCap, Layers, Play, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ornament } from '../../components/illustrations'
import { CefrBadge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { ProgressBar, Ring } from '../../components/ui/Progress'
import { PronounceButtons, SpeakIcon } from '../../components/vocab/Pronounce'
import { WordActions } from '../../components/vocab/WordActions'
import { POS_ABBR } from '../../data/content'
import { dueWords, pickDailyWords, todayStats, wordOfDay } from '../../domain/analytics'
import { buildQuiz, makeQuestion } from '../../domain/quiz'
import type { Question } from '../../domain/quiz'
import type { Word } from '../../domain/types'
import { dayKey, formatVietnameseDate } from '../../domain/util'
import { useStudyTimer } from '../../hooks'
import { stopSpeaking } from '../../services/speech'
import { useAllWords, useData, useHub } from '../../store/useHub'
import { McqView } from '../quiz/QuestionViews'
import { QuizRunner } from '../quiz/QuizRunner'

type View = { name: 'home' } | { name: 'learn'; ids: string[] } | { name: 'quiz'; qs: Question[]; key: number }

export default function DailyPage() {
  useStudyTimer('daily')
  const words = useAllWords()
  const data = useData()
  const plan = useHub((s) => s.dailyPlan)
  const setDailyPlan = useHub((s) => s.setDailyPlan)
  const reviewCard = useHub((s) => s.reviewCard)
  const today = dayKey()
  const goals = data.settings.goals
  const [view, setView] = useState<View>({ name: 'home' })

  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words])

  // Kế hoạch hôm nay: tạo một lần mỗi ngày, lưu lại để không đổi khi tải lại trang.
  useEffect(() => {
    if (plan && plan.date === today) return
    setDailyPlan(today, pickDailyWords(words, data, goals.newWords, today).map((w) => w.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.date, today, words.length])

  const planWords = useMemo(() => (plan && plan.date === today ? plan.wordIds : []).map((id) => byId.get(id)).filter((w): w is Word => !!w), [plan, today, byId])
  const isLearned = (w: Word) => (data.progress[w.id]?.srs.reps ?? 0) > 0
  const todo = planWords.filter((w) => !isLearned(w))
  const learned = planWords.filter(isLearned)
  const stats = todayStats(data)
  const due = dueWords(data, words).length
  const quizDone = data.quizResults.some((r) => r.module === 'daily' && dayKey(r.at) === today)

  const replaceWord = (id: string) => {
    const exclude = new Set(planWords.map((w) => w.id))
    const pick = pickDailyWords(words.filter((w) => !exclude.has(w.id)), data, 1, `${today}:swap:${id}:${Date.now()}`)[0]
    if (!pick) return
    setDailyPlan(today, planWords.map((w) => (w.id === id ? pick.id : w.id)))
  }
  const regenerate = () => {
    const keep = learned.map((w) => w.id)
    const fresh = pickDailyWords(words.filter((w) => !keep.includes(w.id)), data, Math.max(0, goals.newWords - keep.length), `${today}:regen:${Date.now()}`).map((w) => w.id)
    setDailyPlan(today, [...keep, ...fresh])
  }
  const alreadyKnow = (id: string) => reviewCard(id, 'easy', 'daily')

  const startQuiz = () => {
    const pool = learned.length >= 3 ? learned : words.filter((w) => (data.progress[w.id]?.srs.reps ?? 0) > 0).slice(0, 15)
    const qs = buildQuiz({ types: ['meaning', 'fill_blank', 'synonym'], words: pool, pool: words, count: Math.min(10, Math.max(5, pool.length)), difficulty: 'normal' })
    if (qs.length) setView({ name: 'quiz', qs, key: Date.now() })
  }

  if (view.name === 'learn') {
    return <LearnSession words={view.ids.map((id) => byId.get(id)).filter((w): w is Word => !!w)} onExit={() => setView({ name: 'home' })}
      onQuiz={() => { setView({ name: 'home' }); setTimeout(startQuiz, 0) }} />
  }
  if (view.name === 'quiz') {
    return <QuizRunner key={view.key} questions={view.qs} module="daily" title="Kiểm tra nhanh hôm nay" kicker="Daily Learning" onExit={() => setView({ name: 'home' })} onRestart={startQuiz} restartLabel="Làm bộ khác" />
  }

  const steps = [
    { icon: GraduationCap, title: 'Học từ mới', done: learned.length >= planWords.length && planWords.length > 0, detail: `${learned.length}/${planWords.length} từ trong kế hoạch` },
    { icon: ClipboardCheck, title: 'Kiểm tra nhanh', done: quizDone, detail: quizDone ? 'Đã làm hôm nay' : learned.length ? 'Kiểm tra các từ vừa học' : 'Học từ trước, rồi kiểm tra' },
    { icon: Layers, title: 'Ôn thẻ đến hạn', done: due === 0 && stats.reviews > 0, detail: due ? `${due} thẻ đang chờ` : stats.reviews ? 'Không còn thẻ đến hạn' : 'Chưa có thẻ nào đến hạn' },
  ]
  const completion = Math.round((steps.filter((s) => s.done).length / steps.length) * 100)

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="03" kicker="Daily Learning" title="Học" italic="mỗi ngày"
        lead={`${formatVietnameseDate()}. Mỗi ngày một bộ từ mới vừa sức, một bài kiểm tra ngắn và các thẻ đến hạn — đủ để tiến bộ đều đặn mà không quá tải.`}
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={regenerate} disabled={todo.length === 0}>Đổi bộ từ chưa học</Button>} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ===== Lộ trình hôm nay ===== */}
        <section className="wine relative min-w-0 self-start overflow-hidden p-7 lg:sticky lg:top-20 lg:col-span-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase">Lộ trình hôm nay</div>
              <h2 className="display mt-1 text-3xl">Ba <span className="grad-text">bước</span> nhỏ</h2>
              <p className="mt-1 text-sm text-on-dark/70">{stats.learned}/{goals.newWords} từ mới · {stats.minutes}/{goals.minutes} phút</p>
            </div>
            <Ring value={completion} size={92} stroke={7} tone="var(--gold)" track="rgba(232,236,250,.15)" label={<span className="display text-2xl">{completion}%</span>} />
          </div>
          <ol className="mt-6 space-y-3">
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <li key={s.title} className="flex items-center gap-4 rounded-md border border-gold/20 bg-black/15 px-4 py-3">
                  <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-full border', s.done ? 'border-gold bg-gold text-charcoal' : 'border-gold/40 text-gold')}>
                    {s.done ? <Check size={17} strokeWidth={2.4} /> : <Icon size={16} strokeWidth={1.7} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={clsx('text-sm font-medium', s.done && 'text-on-dark/60 line-through decoration-gold/60')}><span className="font-mono text-sm text-gold">{String(i + 1).padStart(2, '0')}</span> {s.title}</div>
                    <div className="text-xs text-on-dark/60">{s.detail}</div>
                  </div>
                  {i === 2 && due > 0 && <Link to="/flashcards" className="shrink-0 text-xs text-gold underline">Ôn ngay</Link>}
                </li>
              )
            })}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            {todo.length > 0
              ? <Button variant="gold" size="lg" icon={<Play size={16} />} onClick={() => setView({ name: 'learn', ids: todo.map((w) => w.id) })}>Bắt đầu học {todo.length} từ</Button>
              : <Button variant="gold" size="lg" icon={<ClipboardCheck size={16} />} onClick={startQuiz} disabled={planWords.length === 0 && stats.learned === 0}>Làm bài kiểm tra nhanh</Button>}
            {todo.length > 0 && learned.length >= 3 && <Button variant="onDark" size="lg" onClick={startQuiz}>Kiểm tra từ đã học</Button>}
          </div>
        </section>

        {/* ===== Danh sách từ của hôm nay ===== */}
        <section className="min-w-0 sheet p-6 lg:col-span-7">
          <SectionTitle numeral="i" aside={<span className="font-mono text-xs text-muted">{planWords.length} từ · gợi ý theo cấp {data.settings.level}</span>}>Bộ từ hôm nay</SectionTitle>
          {planWords.length === 0 ? <p className="py-8 text-center text-sm text-muted">Kho không còn từ mới để gợi ý. Hãy nhập thêm từ vựng trong Thư viện.</p> : (
            <ul className="divide-y divide-rule">
              {planWords.map((w, i) => {
                const done = isLearned(w)
                return (
                  <motion.li key={w.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="flex items-center gap-3 py-3">
                    <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full border text-transparent', done ? 'border-forest bg-forest text-on-dark' : 'border-rule-strong')}><Check size={13} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <Link to={`/library/${w.id}`} className="font-display text-lg text-ink hover:text-burgundy-ink">{w.word}</Link>
                        <span className="font-serif text-sm text-burgundy-ink italic">{w.pos.map((p) => POS_ABBR[p]).join(', ')}</span>
                        <span className="ipa">{w.ipa.uk}</span>
                      </div>
                      <div className="truncate text-sm text-muted">{w.meaningVi}</div>
                    </div>
                    <CefrBadge level={w.cefr} />
                    <SpeakIcon text={w.word} wordId={w.id} />
                    {!done && (
                      <div className="flex shrink-0 gap-1">
                        <IconButton label="Tôi đã biết từ này rồi" onClick={() => alreadyKnow(w.id)}><Check size={14} /></IconButton>
                        <IconButton label="Đổi sang từ khác" onClick={() => replaceWord(w.id)}><RefreshCw size={14} /></IconButton>
                      </div>
                    )}
                  </motion.li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <WordOfDayCard words={words} />
    </div>
  )
}

/* ============================ CÂU HỎI NHANH VỀ TỪ CỦA NGÀY ============================ */
function WordOfDayCard({ words }: { words: Word[] }) {
  const level = useHub((s) => s.settings.level)
  const answered = useHub((s) => s.wordOfDayQuiz)
  const setAnswered = useHub((s) => s.setWordOfDayAnswered)
  const today = dayKey()
  const wod = useMemo(() => wordOfDay(words, level, today), [words, level, today])
  const q = useMemo(() => makeQuestion('meaning', wod, words, 'normal'), [wod, words])
  const done = today in answered
  return (
    <section className="leather mt-6 p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase"><Sparkles size={14} /> Từ của ngày</div>
          <h3 className="entry-word mt-2 text-5xl text-on-dark">{wod.word}</h3>
          <div className="mt-2"><PronounceButtons word={wod} onDark /></div>
        </div>
        <CefrBadge level={wod.cefr} size="lg" />
      </div>
      <Ornament className="my-5 h-3 w-40 text-gold" />
      {done ? (
        <div className="text-sm">
          <p className={clsx('font-medium', answered[today] ? 'text-[#8fd1a8]' : 'text-[#f0a0a8]')}>{answered[today] ? 'Bạn đã trả lời đúng câu hỏi hôm nay.' : 'Câu hỏi hôm nay bạn chưa trả lời đúng.'}</p>
          <p className="mt-2 font-display text-xl text-on-dark">{wod.meaningVi}</p>
          <p className="serif-italic mt-1 text-on-dark/80">“{wod.definitionEn}”</p>
          {wod.examples[0] && <p className="mt-3 border-l-2 border-gold pl-3 text-on-dark/80">{wod.examples[0].en}<span className="block text-on-dark/55">{wod.examples[0].vi}</span></p>}
        </div>
      ) : q && q.kind === 'mcq' ? (
        <div className="rounded-md bg-surface p-5 text-ink">
          <McqView q={q} onResolve={(u) => setAnswered(today, u[0]?.correct ?? false)} />
        </div>
      ) : <p className="text-sm text-on-dark/70">Hôm nay chưa thể tạo câu hỏi cho từ này.</p>}
    </section>
  )
}

/* ============================ PHIÊN HỌC TỪ MỚI ============================ */
function LearnSession({ words, onExit, onQuiz }: { words: Word[]; onExit: () => void; onQuiz: () => void }) {
  const markLearned = useHub((s) => s.markLearned)
  const [i, setI] = useState(0)
  const [finished, setFinished] = useState(false)
  const maxSeen = useRef(0)
  const saved = useRef(false)

  const commit = () => {
    if (saved.current) return
    saved.current = true
    stopSpeaking()
    markLearned(words.slice(0, maxSeen.current + 1).map((w) => w.id))
  }
  const go = (d: number) => {
    const n = i + d
    if (n < 0) return
    if (n >= words.length) { commit(); setFinished(true); return }
    maxSeen.current = Math.max(maxSeen.current, n)
    setI(n)
  }
  const goRef = useRef(go)
  goRef.current = go
  const latest = useRef({ words, markLearned })
  latest.current = { words, markLearned }
  // Rời trang giữa chừng: vẫn lưu những từ đã xem (không tính từ đang xem dở cuối cùng).
  useEffect(() => () => {
    const { words: ws, markLearned: ml } = latest.current
    if (!saved.current && maxSeen.current > 0) ml(ws.slice(0, maxSeen.current).map((w) => w.id))
  }, [])
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') goRef.current(1)
      if (e.key === 'ArrowLeft') goRef.current(-1)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  if (finished) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 text-center sm:px-8">
        <div className="leather p-10">
          <GraduationCap className="mx-auto text-gold" size={44} strokeWidth={1.2} />
          <h2 className="display mt-4 text-3xl text-on-dark">Bạn vừa học {words.length} từ mới</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-on-dark/70">Các từ này đã được xếp lịch ôn: lần ôn đầu tiên vào ngày mai. Kiểm tra nhanh ngay bây giờ sẽ giúp ghi nhớ sâu hơn.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" icon={<ClipboardCheck size={16} />} onClick={onQuiz}>Kiểm tra nhanh</Button>
            <Button variant="onDark" size="lg" onClick={onExit}>Xong, quay lại</Button>
          </div>
        </div>
      </div>
    )
  }

  const w = words[i]
  if (!w) return null
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div><div className="folio">Daily Learning</div><div className="display text-xl text-ink">Học từ mới</div></div>
        <Button variant="ghost" size="sm" onClick={() => { commit(); onExit() }}>Thoát (lưu phần đã xem)</Button>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <ProgressBar value={i + 1} max={words.length} tone="forest" height={5} />
        <span className="shrink-0 font-mono text-xs text-muted">Từ {i + 1}/{words.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.article key={w.id} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="sheet frame-ornate p-7 sm:p-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="entry-word text-[3.2rem] text-ink sm:text-[4rem]">{w.word}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 font-serif text-lg text-burgundy-ink italic">{w.pos.map((p) => POS_ABBR[p]).join(', ')}</div>
            </div>
            <CefrBadge level={w.cefr} size="lg" />
          </div>
          <div className="mt-3"><PronounceButtons word={w} /></div>
          <Ornament className="my-5 h-3 w-40 text-gold" />
          <p className="font-display text-[1.75rem] leading-snug text-ink">{w.meaningVi}</p>
          <p className="serif-italic mt-2 text-[1.12rem] leading-snug text-ink-2">“{w.definitionEn}”</p>
          {w.examples.length > 0 && (
            <ul className="mt-5 space-y-3">
              {w.examples.slice(0, 2).map((ex, k) => (
                <li key={k} className="flex gap-2 border-l-2 border-gold pl-4 text-sm">
                  <div className="flex-1"><p className="text-ink">{ex.en}</p><p className="mt-0.5 text-muted">{ex.vi}</p></div>
                  <SpeakIcon text={ex.en} />
                </li>
              ))}
            </ul>
          )}
          {(w.synonyms.length > 0 || w.collocations.length > 0 || w.wordFamily.length > 0) && (
            <dl className="mt-5 grid gap-1.5 text-sm text-ink-2">
              {w.synonyms.length > 0 && <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Đồng nghĩa</dt><dd>{w.synonyms.slice(0, 5).join(', ')}</dd></div>}
              {w.collocations.length > 0 && <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Cụm hay gặp</dt><dd>{w.collocations.slice(0, 4).join(' · ')}</dd></div>}
              {w.wordFamily.length > 0 && <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Họ từ</dt><dd>{w.wordFamily.slice(0, 5).join(', ')}</dd></div>}
            </dl>
          )}
          <div className="mt-6 border-t border-dashed border-rule-strong pt-4"><WordActions word={w} showLabels /></div>
        </motion.article>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => go(-1)} disabled={i === 0} icon={<ArrowLeft size={16} />}>Từ trước</Button>
        <Button onClick={() => go(1)} icon={<ArrowRight size={16} />} className="flex-row-reverse">{i + 1 >= words.length ? 'Hoàn thành' : 'Từ tiếp theo'}</Button>
      </div>
      <p className="mt-3 text-center font-mono text-[0.68rem] text-muted">Dùng phím ← → để chuyển từ</p>
    </div>
  )
}
