import { Flame, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarHeatmap, CHART, ChartTooltip } from '../../components/charts/ChartKit'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { ProgressBar } from '../../components/ui/Progress'
import { Segmented } from '../../components/ui/Segmented'
import { EmptyState } from '../../components/ui/States'
import { Button } from '../../components/ui/Button'
import {
  avgMinutesPerDay, heatmap, inRange, learnedWords, levelProgress, masteredWords, monthlyProgress, newWordsPerWeek, quizAverage,
  spellingAccuracy, statusDistribution, streak, studyPlan, weaknesses, weekActivity,
} from '../../domain/analytics'
import type { StudyModule } from '../../domain/types'
import { formatDuration, pct } from '../../domain/util'
import { useStudyTimer } from '../../hooks'
import { useAllWords, useData } from '../../store/useHub'

const MODULE_LABEL: Record<StudyModule, string> = {
  flashcards: 'Flashcards', spelling: 'Chính tả', daily: 'Học mỗi ngày', listening: 'Luyện nghe', quiz: 'Kiểm tra', library: 'Thư viện', mistakes: 'Sổ lỗi sai', dictionary: 'Từ điển',
}
const STATUS_COLOR: Record<string, string> = { mastered: CHART.forest, review: CHART.gold, learning: CHART.burgundy, new: 'color-mix(in srgb, var(--ink) 18%, transparent)' }
type Period = 7 | 30 | 90 | 0

export default function AnalyticsPage() {
  useStudyTimer('library')
  const words = useAllWords()
  const d = useData()
  const [period, setPeriod] = useState<Period>(30)
  const days = period === 0 ? null : period

  const st = useMemo(() => streak(d), [d])
  const learned = useMemo(() => learnedWords(d, words).length, [d, words])
  const mastered = useMemo(() => masteredWords(d, words).length, [d, words])
  const spell = useMemo(() => spellingAccuracy(d, days), [d, days])
  const quiz = useMemo(() => quizAverage(d, days), [d, days])
  const avgMin = useMemo(() => avgMinutesPerDay(d, days), [d, days])
  const activity = useMemo(() => weekActivity(d, period === 0 ? 90 : period), [d, period])
  const weekly = useMemo(() => newWordsPerWeek(d, 8), [d])
  const status = useMemo(() => statusDistribution(d, words), [d, words])
  const levels = useMemo(() => levelProgress(d, words), [d, words])
  const monthly = useMemo(() => monthlyProgress(d, 6), [d])
  const heat = useMemo(() => heatmap(d, 182), [d])
  const weak = useMemo(() => weaknesses(d, words), [d, words])
  const plan = useMemo(() => studyPlan(d, words), [d, words])
  const byModule = useMemo(() => {
    const m = new Map<StudyModule, number>()
    Object.values(d.sessions).filter((s) => inRange(s.date + 'T12:00:00', days)).forEach((s) => m.set(s.module, (m.get(s.module) ?? 0) + s.durationMs))
    const list = [...m.entries()].map(([k, ms]) => ({ key: k, label: MODULE_LABEL[k], ms })).sort((a, b) => b.ms - a.ms)
    return { list, total: list.reduce((n, x) => n + x.ms, 0) }
  }, [d, days])
  const listening = useMemo(() => {
    const r = d.quizResults.filter((x) => x.module === 'listening' && inRange(x.at, days))
    const t = r.reduce((n, x) => n + x.total, 0), c = r.reduce((n, x) => n + x.correct, 0)
    return { sessions: r.length, pct: pct(c, t), total: t }
  }, [d, days])

  const hasData = d.reviewLogs.length + d.spellingAttempts.length + d.quizResults.length + Object.keys(d.progress).length > 0
  const barData = activity.map((a) => ({ ...a, name: a.date.slice(8, 10) + '/' + a.date.slice(5, 7) }))
  const pieData = status.filter((s) => s.value > 0)

  if (!hasData) {
    return (
      <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
        <PageHeader no="10" kicker="Analytics" title="Thống kê" italic="học tập" lead="Mọi số liệu ở đây đều tính từ lịch sử học thật của bạn." />
        <div className="sheet"><EmptyState title="Chưa có dữ liệu để thống kê" action={<Link to="/daily"><Button>Bắt đầu học hôm nay</Button></Link>}>Hãy học vài từ, làm một bài chính tả hoặc bài kiểm tra — biểu đồ sẽ xuất hiện ngay.</EmptyState></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="10" kicker="Analytics" title="Thống kê" italic="học tập"
        lead="Bức tranh về tiến độ, độ chính xác và thói quen học của bạn — tính trực tiếp từ nhật ký học, không có số liệu giả."
        actions={<Segmented size="sm" value={period} onChange={setPeriod} options={[{ value: 7, label: '7 ngày' }, { value: 30, label: '30 ngày' }, { value: 90, label: '90 ngày' }, { value: 0, label: 'Tất cả' }]} />} />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="Chuỗi ngày học" value={st.current} unit="ngày" sub={`Dài nhất ${st.best} ngày`} icon={<Flame size={15} className="text-burgundy" />} />
        <Stat label="Từ đã học" value={learned} sub={`${pct(learned, words.length)}% kho từ`} />
        <Stat label="Thành thạo" value={mastered} sub={`${pct(mastered, learned)}% từ đã học`} />
        <Stat label="Phút / ngày" value={avgMin} unit="phút" sub="Trung bình ngày có học" />
        <Stat label="Chính tả" value={spell.total ? `${spell.pct}%` : '—'} sub={`${spell.total} lượt viết`} />
        <Stat label="Điểm kiểm tra" value={quiz.count ? `${quiz.avg}%` : '—'} sub={`${quiz.count} bài`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="min-w-0 sheet p-6 lg:col-span-8">
          <SectionTitle numeral="i" aside={<span className="font-mono text-xs text-muted">{period === 0 ? '90 ngày gần nhất' : `${period} ngày gần nhất`}</span>}>Hoạt động theo ngày</SectionTitle>
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={barData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" tick={CHART.font} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
                <YAxis yAxisId="l" tick={CHART.font} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" tick={CHART.font} tickLine={false} axisLine={false} allowDecimals={false} hide />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--gold) 10%, transparent)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="learned" name="Từ mới" stackId="a" fill={CHART.forest} />
                <Bar yAxisId="l" dataKey="reviews" name="Lượt ôn" stackId="a" fill={CHART.gold} radius={[3, 3, 0, 0]} />
                <Line yAxisId="r" dataKey="minutes" name="Phút học" stroke={CHART.burgundy} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="min-w-0 sheet p-6 lg:col-span-4">
          <SectionTitle numeral="ii">Trạng thái kho từ</SectionTitle>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                  {pieData.map((s) => <Cell key={s.key} fill={STATUS_COLOR[s.key]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {status.map((s) => <li key={s.key} className="flex items-center justify-between"><span className="flex items-center gap-2 text-ink-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s.key] }} />{s.name}</span><span className="font-mono text-xs text-muted">{s.value}</span></li>)}
          </ul>
        </section>

        <section className="min-w-0 sheet p-6 lg:col-span-7">
          <SectionTitle numeral="iii">Tiến độ theo cấp độ CEFR</SectionTitle>
          <ul className="space-y-3.5">
            {levels.map((l) => (
              <li key={l.level} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 text-sm">
                <span className="font-display text-lg text-ink">{l.level}</span>
                <div>
                  <ProgressBar value={l.learned} max={Math.max(1, l.total)} tone="forest" height={7} />
                  <div className="mt-1 text-xs text-muted">{l.learned}/{l.total} từ đã học · {l.mastered} thành thạo{l.attempts ? ` · chính xác ${l.accuracy}%` : ''}</div>
                </div>
                <span className="w-14 text-right font-mono text-xs text-muted">{l.total ? `${l.learnedPct}%` : '—'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0 sheet p-6 lg:col-span-5">
          <SectionTitle numeral="iv">Thời gian học theo mô-đun</SectionTitle>
          {byModule.list.length === 0 ? <p className="py-6 text-center text-sm text-muted">Chưa ghi nhận thời gian học trong khoảng này.</p> : (
            <ul className="space-y-3">
              {byModule.list.map((m) => (
                <li key={m.key} className="text-sm">
                  <div className="mb-1 flex justify-between"><span className="text-ink-2">{m.label}</span><span className="font-mono text-xs text-muted">{formatDuration(m.ms)}</span></div>
                  <ProgressBar value={m.ms} max={byModule.total} tone="burgundy" height={5} />
                </li>
              ))}
              <li className="border-t border-dashed border-rule-strong pt-2 text-right font-mono text-xs text-muted">Tổng {formatDuration(byModule.total)}</li>
            </ul>
          )}
        </section>

        <section className="min-w-0 sheet p-6 lg:col-span-6">
          <SectionTitle numeral="v">Độ chính xác theo tháng</SectionTitle>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={CHART.font} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={CHART.font} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<ChartTooltip unit="%" />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="spelling" name="Chính tả" stroke={CHART.burgundy} strokeWidth={2.2} connectNulls dot={{ r: 3 }} />
                <Line dataKey="quiz" name="Kiểm tra" stroke={CHART.forest} strokeWidth={2.2} connectNulls dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="min-w-0 sheet p-6 lg:col-span-6">
          <SectionTitle numeral="vi" aside={<span className="font-mono text-xs text-muted">8 tuần</span>}>Từ mới & lượt ôn theo tuần</SectionTitle>
          <div className="h-60">
            <ResponsiveContainer>
              <ComposedChart data={weekly} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={CHART.font} tickLine={false} axisLine={false} />
                <YAxis tick={CHART.font} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--gold) 10%, transparent)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="words" name="Từ mới" fill={CHART.forest} radius={[3, 3, 0, 0]} />
                <Line dataKey="reviews" name="Lượt ôn" stroke={CHART.gold} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="min-w-0 sheet p-6 lg:col-span-12">
          <SectionTitle numeral="vii" aside={<span className="font-mono text-xs text-muted">26 tuần gần nhất</span>}>Lịch hoạt động</SectionTitle>
          <CalendarHeatmap data={heat} />
        </section>

        <section className="min-w-0 leather p-7 lg:col-span-7">
          <div className="flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase"><Target size={14} /> Gợi ý học tập cho bạn</div>
          <ol className="mt-4 space-y-3 text-[0.95rem]">
            {plan.map((p, i) => <li key={i} className="flex gap-3"><span className="font-mono text-sm text-gold">{String(i + 1).padStart(2, '0')}</span><span className="text-on-dark/90">{p}</span></li>)}
          </ol>
          {listening.sessions > 0 && <p className="mt-5 border-t border-gold/25 pt-3 text-sm text-on-dark/70">Luyện nghe: {listening.sessions} bài, độ chính xác {listening.pct}%.</p>}
        </section>

        <section className="min-w-0 sheet p-6 lg:col-span-5">
          <SectionTitle numeral="viii">Điểm yếu cần chú ý</SectionTitle>
          <div className="space-y-4 text-sm">
            {weak.weakLevel && <p><span className="text-muted">Cấp độ yếu nhất:</span> <b className="text-ink">{weak.weakLevel.level}</b> <span className="font-mono text-xs text-muted">({weak.weakLevel.accuracy}%)</span></p>}
            {weak.weakTopic && <p><span className="text-muted">Chủ đề yếu nhất:</span> <b className="text-ink">{weak.weakTopic.name}</b> <span className="font-mono text-xs text-muted">({weak.weakTopic.accuracy}%)</span></p>}
            <div>
              <div className="mb-1.5 text-muted">Từ hay sai nhất</div>
              {weak.frequent.length ? <ul className="flex flex-wrap gap-2">{weak.frequent.map((m) => <li key={m.key}><Link to={`/library/${m.wordId}`} className="rounded-full border border-rule-strong px-2.5 py-0.5 hover:border-gold">{m.word!.word} <span className="font-mono text-xs text-bad">×{m.count}</span></Link></li>)}</ul> : <p className="text-muted">Chưa có từ nào sai nhiều lần.</p>}
            </div>
            {weak.forgotten.length > 0 && (
              <div>
                <div className="mb-1.5 text-muted">Từ hay quên (flashcard)</div>
                <ul className="flex flex-wrap gap-2">{weak.forgotten.map((x) => <li key={x.p.wordId}><Link to={`/library/${x.p.wordId}`} className="rounded-full border border-rule-strong px-2.5 py-0.5 hover:border-gold">{x.word!.word} <span className="font-mono text-xs text-muted">{x.p.srs.lapses} lần quên</span></Link></li>)}</ul>
              </div>
            )}
            {!weak.weakLevel && !weak.weakTopic && weak.frequent.length === 0 && <p className="text-muted">Cần thêm dữ liệu (ít nhất 5 lượt trả lời mỗi cấp/chủ đề) để phân tích điểm yếu.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, unit, sub, icon }: { label: string; value: number | string; unit?: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="sheet p-4">
      <div className="flex items-center gap-1.5 font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">{icon}{label}</div>
      <div className="display mt-1 text-3xl text-ink">{value}{unit && <span className="ml-1 text-base text-muted">{unit}</span>}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}
