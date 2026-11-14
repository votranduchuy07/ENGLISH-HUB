import clsx from 'clsx'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Check, Clock, Flame, Headphones, Layers, Lightbulb, SpellCheck, Target } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART, ChartTooltip } from '../../components/charts/ChartKit'
import { DeskLamp, Ornament } from '../../components/illustrations'
import { CefrBadge } from '../../components/ui/Badge'
import { ProgressBar, Ring } from '../../components/ui/Progress'
import { SectionTitle } from '../../components/ui/PageHeader'
import { PronounceButtons } from '../../components/vocab/Pronounce'
import { CEFR_INFO, POS_ABBR, QUOTES } from '../../data/content'
import { dueWords, learnedWords, levelProgress, masteredWords, recentHistory, spellingAccuracy, streak, studyPlan, todayStats, weekActivity, wordOfDay } from '../../domain/analytics'
import { dayKey, formatVietnameseDate, hashString } from '../../domain/util'
import { useNow } from '../../hooks'
import { useAllWords, useData } from '../../store/useHub'

function greeting(h: number) {
  if (h < 11) return 'Chào buổi sáng'
  if (h < 14) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function DashboardPage() {
  const now = useNow()
  const data = useData()
  const words = useAllWords()
  const goals = data.settings.goals

  const m = useMemo(() => {
    const t = todayStats(data)
    return {
      t,
      learned: learnedWords(data, words).length,
      mastered: masteredWords(data, words).length,
      due: dueWords(data, words).length,
      spelling: spellingAccuracy(data),
      st: streak(data),
      week: weekActivity(data),
      levels: levelProgress(data, words),
      history: recentHistory(data, 6),
      plan: studyPlan(data, words),
      wod: wordOfDay(words, data.settings.level),
    }
  }, [data, words])

  const quote = QUOTES[hashString(dayKey()) % QUOTES.length]
  const tasks = [
    { icon: BookOpen, label: `Học ${goals.newWords} từ mới`, value: m.t.learned, max: goals.newWords, to: '/daily' },
    { icon: Layers, label: `Ôn ${goals.flashcards} flashcard`, value: m.t.reviews, max: goals.flashcards, to: '/flashcards' },
    { icon: SpellCheck, label: 'Hoàn thành bài kiểm tra chính tả', value: m.t.spelling, max: 1, to: '/spelling' },
    { icon: Headphones, label: 'Làm một bài luyện nghe', value: m.t.listening, max: 1, to: '/listening' },
    { icon: Target, label: `Làm ${goals.quizzes} bài quiz`, value: m.t.quizzes, max: goals.quizzes, to: '/quizzes' },
  ].filter((t) => t.max > 0)
  const done = tasks.filter((t) => t.value >= t.max).length
  const completion = Math.round((tasks.reduce((s, t) => s + Math.min(1, t.value / t.max), 0) / tasks.length) * 100)
  const issue = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      {/* ===== MASTHEAD ===== */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule-strong pb-2 font-mono text-[0.68rem] tracking-[0.2em] text-muted uppercase">
          <span className="inline-flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-ok shadow-[0_0_8px_var(--ok)]" />Online · Ngày {issue}/365</span>
          <span className="hidden sm:inline">Learning OS — bảng điều khiển học tiếng Anh của bạn</span>
          <span>{formatVietnameseDate(now)}</span>
        </div>
        <div className="mt-6 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="folio">01 · Tổng quan</div>
            <h1 className="display mt-2 text-[2.6rem] text-ink sm:text-[3.6rem]">
              {greeting(now.getHours())}, <span className="grad-text">{data.settings.name}.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[0.98rem] text-muted">
              {m.due > 0 ? <>Hôm nay có <b className="text-ink">{m.due} từ</b> đến hạn ôn tập và {Math.max(0, goals.newWords - m.t.learned)} từ mới đang chờ bạn.</> : <>Không có thẻ nào đến hạn — một ngày tốt để mở rộng vốn từ.</>}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="kicker">Chuỗi ngày học</div>
              <div className="display text-4xl text-ink">{m.st.current}<span className="ml-1 font-serif text-lg text-muted italic">ngày</span></div>
              <div className="text-xs text-muted">Kỷ lục: {m.st.best} ngày</div>
            </div>
            <div className={clsx('grid h-20 w-20 place-items-center rounded-full border-2', m.st.activeToday ? 'border-gold bg-burgundy text-gold' : 'border-rule-strong text-muted')}>
              <Flame size={34} strokeWidth={1.4} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ===== DAILY STUDY + WORD OF THE DAY ===== */}
      <div className="grid gap-6 lg:grid-cols-12">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="wine relative overflow-hidden p-7 lg:col-span-7">
          <DeskLamp className="pointer-events-none absolute -right-4 -bottom-6 h-44 w-44 text-gold/15" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase">Daily Study</div>
              <h2 className="display mt-1 text-3xl">Nhiệm vụ <span className="grad-text">hôm nay</span></h2>
              <p className="mt-1 text-sm text-on-dark/70">Đã hoàn thành {done}/{tasks.length} nhiệm vụ · {m.t.minutes}/{goals.minutes} phút học</p>
            </div>
            <Ring value={completion} size={96} stroke={7} tone="var(--gold)" track="rgba(232,236,250,.15)" label={<span className="display text-2xl">{completion}%</span>} />
          </div>
          <ul className="relative mt-6 space-y-2.5">
            {tasks.map((t, i) => {
              const ok = t.value >= t.max
              const Icon = t.icon
              return (
                <motion.li key={t.label} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                  <Link to={t.to} className="group flex items-center gap-4 rounded-md border border-gold/20 bg-black/15 px-4 py-3 transition-colors hover:border-gold/60 hover:bg-black/25">
                    <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-full border', ok ? 'border-gold bg-gold text-charcoal' : 'border-gold/40 text-gold')}>
                      {ok ? <Check size={17} strokeWidth={2.4} /> : <Icon size={16} strokeWidth={1.7} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className={clsx(ok && 'text-on-dark/60 line-through decoration-gold/60')}>{t.label}</span>
                        <span className="font-mono text-xs text-on-dark/70">{Math.min(t.value, t.max)}/{t.max}</span>
                      </div>
                      <ProgressBar value={t.value} max={t.max} tone="gold" height={4} className="mt-2 !bg-white/10" />
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-gold/60 transition-transform group-hover:translate-x-1 group-hover:text-gold" />
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="sheet frame-ornate relative p-7 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="folio">Word of the Day</span>
            <CefrBadge level={m.wod.cefr} />
          </div>
          <div className="mt-5 flex items-baseline gap-3">
            <h3 className="entry-word text-[3.2rem] text-ink">{m.wod.word}</h3>
            <span className="font-serif text-lg text-burgundy-ink italic">{m.wod.pos.map((p) => POS_ABBR[p]).join(', ')}</span>
          </div>
          <div className="mt-2"><PronounceButtons word={m.wod} /></div>
          <Ornament className="my-5 h-3 w-40 text-gold" />
          <p className="font-display text-xl text-ink">{m.wod.meaningVi}</p>
          <p className="serif-italic mt-2 text-[1.08rem] leading-snug text-ink-2">“{m.wod.definitionEn}”</p>
          {m.wod.examples[0] && (
            <div className="mt-4 border-l-2 border-gold pl-4 text-sm">
              <p className="text-ink">{m.wod.examples[0].en}</p>
              <p className="mt-0.5 text-muted">{m.wod.examples[0].vi}</p>
            </div>
          )}
          <Link to="/daily" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-burgundy-ink hover:underline">Làm câu hỏi nhanh <ArrowRight size={14} /></Link>
        </motion.section>
      </div>

      {/* ===== LEDGER ===== */}
      <section className="sheet mt-6 grid grid-cols-2 divide-rule sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        {[
          { k: 'Từ đã học', v: m.learned, s: `/${words.length} trong kho` },
          { k: 'Đã ghi nhớ', v: m.mastered, s: 'khoảng ôn ≥ 21 ngày' },
          { k: 'Cần ôn hôm nay', v: m.due, s: 'thẻ đến hạn', accent: m.due > 0 },
          { k: 'Chính tả TB', v: m.spelling.total ? `${m.spelling.pct}%` : '—', s: `${m.spelling.total} lượt viết` },
          { k: 'Chuỗi ngày', v: m.st.current, s: m.st.activeToday ? 'đã học hôm nay' : 'chưa học hôm nay' },
          { k: 'Mục tiêu ngày', v: `${m.t.minutes}′`, s: `/${goals.minutes} phút` },
        ].map((x, i) => (
          <motion.div key={x.k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.05 }} className="border-rule px-5 py-5 max-lg:border-b">
            <div className="kicker">{x.k}</div>
            <div className={clsx('display mt-2 text-[2.1rem] leading-none', x.accent ? 'text-burgundy-ink' : 'text-ink')}>{x.v}</div>
            <div className="mt-1.5 font-mono text-[0.68rem] text-muted">{x.s}</div>
          </motion.div>
        ))}
      </section>

      {/* ===== CHARTS ===== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="sheet p-6 lg:col-span-7">
          <SectionTitle numeral="i" aside={<Link to="/analytics" className="text-xs text-muted hover:text-gold-ink">Xem thống kê →</Link>}>Hoạt động trong tuần</SectionTitle>
          {m.week.every((d) => !d.reviews && !d.learned && !d.tests) ? (
            <div className="grid h-[230px] place-items-center rounded-md border border-dashed border-rule-strong text-center text-sm text-muted">
              <div>Chưa có hoạt động nào trong 7 ngày qua.<br /><Link to="/daily" className="mt-2 inline-block text-burgundy-ink underline">Bắt đầu với 15 từ mới hôm nay</Link></div>
            </div>
          ) : (
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={m.week} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="label" tick={CHART.font} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART.font} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--gold) 10%, transparent)' }} />
                  <Bar dataKey="reviews" name="Thẻ ôn" stackId="a" fill={CHART.forest} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="learned" name="Từ mới" stackId="a" fill={CHART.burgundy} radius={[3, 3, 0, 0]} />
                  <Line dataKey="tests" name="Bài kiểm tra" stroke={CHART.gold} strokeWidth={2} dot={{ r: 3, fill: CHART.gold }} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="sheet p-6 lg:col-span-5">
          <SectionTitle numeral="ii">Tiến độ A1 – C2</SectionTitle>
          <div className="space-y-3.5">
            {m.levels.map((l, i) => (
              <div key={l.level} className="grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-3">
                <CefrBadge level={l.level} />
                <div>
                  <div className="mb-1 flex justify-between text-[0.72rem] text-muted"><span>{CEFR_INFO[l.level].vi}</span><span className="font-mono">{l.learned}/{l.total}</span></div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-ink/8 dark:bg-white/8">
                    <motion.div className="absolute inset-y-0 left-0 bg-forest/45" initial={{ width: 0 }} animate={{ width: `${l.learnedPct}%` }} transition={{ delay: 0.1 * i, duration: 0.8 }} />
                    <motion.div className="absolute inset-y-0 left-0 bg-gold" initial={{ width: 0 }} animate={{ width: `${l.masteredPct}%` }} transition={{ delay: 0.1 * i + 0.2, duration: 0.8 }} />
                  </div>
                </div>
                <span className="text-right font-mono text-xs text-ink-2">{l.learnedPct}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-[0.7rem] text-muted"><span className="flex items-center gap-1.5"><i className="h-2 w-3 rounded-sm bg-forest/45" />Đã học</span><span className="flex items-center gap-1.5"><i className="h-2 w-3 rounded-sm bg-gold" />Đã thành thạo</span></div>
        </section>
      </div>

      {/* ===== QUOTE + HISTORY + PLAN ===== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="leather relative overflow-hidden p-8 lg:col-span-6">
          <div className="font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase">Quote of the Day</div>
          <blockquote className="mt-4">
            <p className="font-display text-[1.7rem] leading-[1.25] italic">“{quote.en}”</p>
            <footer className="mt-3 text-sm text-on-dark/65">— {quote.author}</footer>
          </blockquote>
          <div className="mt-6 border-t border-gold/25 pt-4 text-sm">
            <p className="text-on-dark/85">{quote.vi}</p>
            <p className="mt-2 font-mono text-xs text-gold">Từ đáng chú ý · {quote.note}</p>
          </div>
        </section>

        <section className="sheet p-6 lg:col-span-3">
          <SectionTitle numeral="iii">Nhật ký gần đây</SectionTitle>
          {m.history.length === 0 ? (
            <p className="text-sm text-muted">Nhật ký đang trống. Mọi buổi học của bạn sẽ được ghi tại đây.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-rule-strong pl-4">
              {m.history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-surface bg-gold" />
                  <div className="text-sm text-ink">{h.text} {h.score && <span className="font-mono text-xs text-burgundy-ink">· {h.score}</span>}</div>
                  <div className="flex items-center gap-1 font-mono text-[0.66rem] text-muted"><Clock size={10} />{new Date(h.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="sheet p-6 lg:col-span-3">
          <SectionTitle numeral="iv">Gợi ý học tập</SectionTitle>
          <ul className="space-y-3">
            {m.plan.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-snug text-ink-2"><Lightbulb size={15} className="mt-0.5 shrink-0 text-gold-ink" />{p}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
