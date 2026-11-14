import clsx from 'clsx'
import { motion } from 'framer-motion'
import { Check, ClipboardCheck, Play, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Chip, Segmented } from '../../components/ui/Segmented'
import { ErrorState } from '../../components/ui/States'
import { TOPICS } from '../../data/content'
import { buildQuiz, QUIZ_TYPES, type Difficulty, type Question } from '../../domain/quiz'
import { CEFR_LEVELS, type Cefr, type QuizType } from '../../domain/types'
import { pct } from '../../domain/util'
import { useStudyTimer } from '../../hooks'
import { useAllWords, useHub } from '../../store/useHub'
import { QuizRunner } from '../quiz/QuizRunner'

export default function QuizzesPage() {
  useStudyTimer('quiz')
  const words = useAllWords()
  const results = useHub((s) => s.quizResults)
  const defaultLevel = useHub((s) => s.settings.level)
  const [types, setTypes] = useState<QuizType[]>(['meaning', 'fill_blank', 'synonym'])
  const [levels, setLevels] = useState<Cefr[]>([])
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [time, setTime] = useState(0)
  const [diff, setDiff] = useState<Difficulty>('normal')
  const [run, setRun] = useState<{ qs: Question[]; key: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const pool = useMemo(() => words.filter((w) => (!levels.length || levels.includes(w.cefr)) && (!topic || w.topics.includes(topic))), [words, levels, topic])
  const history = useMemo(() => results.filter((r) => r.module === 'quiz').slice(-5).reverse(), [results])

  const startExam = (n: number, minutes: number) => {
    setErr(null)
    const mix: QuizType[] = ['fill_blank', 'word_class', 'synonym', 'collocation', 'confusables', 'meaning', 'listening_meaning', 'listening_gap']
    const qs = buildQuiz({ types: mix, words, pool: words, count: n, difficulty: 'normal' })
    if (!qs.length) return setErr('Chưa đủ dữ liệu để tạo bài thi thử.')
    setTime(minutes)
    setRun({ qs, key: Date.now() })
  }
  const toggleType = (t: QuizType) => setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const start = () => {
    setErr(null)
    if (!types.length) return setErr('Hãy chọn ít nhất một dạng bài.')
    if (pool.length < 4) return setErr(`Bộ lọc chỉ còn ${pool.length} từ — cần ít nhất 4 từ để tạo câu hỏi có đáp án nhiễu. Hãy nới lỏng cấp độ hoặc chủ đề.`)
    const qs = buildQuiz({ types, words: pool, pool: words, count, difficulty: diff })
    if (!qs.length) return setErr('Không đủ dữ liệu (ví dụ, từ đồng nghĩa, collocation…) để tạo dạng bài này từ bộ từ đã lọc. Thử chọn dạng khác hoặc mở rộng bộ lọc.')
    setRun({ qs, key: Date.now() })
  }

  if (run) {
    return <QuizRunner key={run.key} questions={run.qs} module="quiz" title="Kiểm tra kiến thức" kicker="Quiz" timeLimitSec={time ? time * 60 : null}
      onExit={() => setRun(null)} onRestart={start} restartLabel="Làm bộ khác cùng cấu hình" />
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="06" kicker="Knowledge Quizzes" title="Kiểm tra" italic="kiến thức"
        lead="Chín dạng bài, sinh trực tiếp từ kho từ vựng của bạn. Đáp án sai được ghi vào Sổ lỗi sai để ôn lại đúng chỗ." />

      <section className="wine mb-8 flex flex-wrap items-center justify-between gap-5 p-6">
        <div className="min-w-[16rem] flex-1">
          <div className="flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase"><Timer size={14} /> Chế độ thi thử</div>
          <h2 className="display mt-1 text-2xl">Thi thử có đồng hồ đếm ngược</h2>
          <p className="mt-1 text-sm text-on-dark/75">Trộn nhiều dạng bài (ngữ pháp từ vựng, cụm từ, đồng nghĩa và câu nghe) giống áp lực phòng thi. Kết quả chỉ để tham khảo, không quy đổi thành điểm TOEIC chính thức.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gold" icon={<Play size={15} />} onClick={() => startExam(20, 12)}>Nhanh · 20 câu / 12 phút</Button>
          <Button variant="onDark" icon={<Play size={15} />} onClick={() => startExam(40, 25)}>Đầy đủ · 40 câu / 25 phút</Button>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Mục lục các dạng bài */}
        <section>
          <SectionTitle numeral="i" aside={<div className="flex gap-3 text-xs"><button className="text-burgundy-ink underline" onClick={() => setTypes(QUIZ_TYPES.map((t) => t.type))}>Chọn tất cả</button><button className="text-muted underline" onClick={() => setTypes([])}>Bỏ chọn</button></div>}>Chọn dạng bài</SectionTitle>
          <ol className="sheet divide-y divide-rule">
            {QUIZ_TYPES.map((t, i) => {
              const on = types.includes(t.type)
              return (
                <motion.li key={t.type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <button onClick={() => toggleType(t.type)} aria-pressed={on} className={clsx('group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors', on ? 'bg-forest/8' : 'hover:bg-gold/6')}>
                    <span className="w-9 shrink-0 font-mono text-base text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg text-ink">{t.label}</span>
                      <span className="block text-sm text-muted">{t.desc}</span>
                    </span>
                    <span className={clsx('grid h-6 w-6 place-items-center rounded-full border transition-colors', on ? 'border-forest bg-forest text-on-dark' : 'border-rule-strong text-transparent group-hover:border-gold')}><Check size={14} /></span>
                  </button>
                </motion.li>
              )
            })}
          </ol>

          <div className="mt-8">
            <SectionTitle numeral="ii">Lần làm gần đây</SectionTitle>
            {history.length === 0 ? <p className="sheet p-5 text-sm text-muted">Bạn chưa làm bài quiz nào. Kết quả thật của mỗi lượt sẽ hiện ở đây.</p> : (
              <ul className="sheet divide-y divide-rule">
                {history.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-ink-2">{new Date(r.at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {r.type === 'mixed' ? 'Nhiều dạng' : QUIZ_TYPES.find((t) => t.type === r.type)?.label ?? r.type}</span>
                    <span className={clsx('font-mono', pct(r.correct, r.total) >= 75 ? 'text-ok' : 'text-burgundy-ink')}>{r.correct}/{r.total} · {pct(r.correct, r.total)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Phiếu cấu hình bài thi */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="leather p-6">
            <div className="flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.3em] text-gold uppercase"><ClipboardCheck size={14} /> Phiếu dự thi</div>
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
                <div className="mb-2 text-on-dark/60">Số câu</div>
                <Segmented value={count} onChange={setCount} size="sm" className="!border-gold/40 !bg-black/20" options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))} />
              </div>
              <div>
                <div className="mb-2 text-on-dark/60">Độ khó</div>
                <Segmented value={diff} onChange={setDiff} size="sm" className="!border-gold/40 !bg-black/20" options={[{ value: 'easy', label: 'Dễ' }, { value: 'normal', label: 'Vừa' }, { value: 'hard', label: 'Khó' }]} />
                <p className="mt-1.5 text-xs text-on-dark/50">Khó hơn = đáp án nhiễu cùng cấp độ và loại từ.</p>
              </div>
              <div>
                <div className="mb-2 text-on-dark/60">Giới hạn thời gian</div>
                <Segmented value={time} onChange={setTime} size="sm" className="!border-gold/40 !bg-black/20" options={[{ value: 0, label: 'Không' }, { value: 3, label: '3′' }, { value: 5, label: '5′' }, { value: 10, label: '10′' }]} />
              </div>
            </div>
            <div className="mt-5 border-t border-gold/25 pt-4 font-mono text-xs text-on-dark/70">{pool.length} từ phù hợp bộ lọc · {types.length} dạng bài</div>
            <Button variant="gold" size="lg" className="mt-4 w-full" icon={<Play size={17} />} onClick={start}>Bắt đầu làm bài</Button>
          </div>
          {err && <div className="mt-3"><ErrorState title="Chưa thể tạo bài" message={err} /></div>}
        </aside>
      </div>
    </div>
  )
}
