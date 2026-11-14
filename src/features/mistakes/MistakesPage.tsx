import clsx from 'clsx'
import { motion } from 'framer-motion'
import { Check, NotebookPen, Play, RotateCcw, Search, SpellCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, IconButton } from '../../components/ui/Button'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { Chip, Segmented } from '../../components/ui/Segmented'
import { EmptyState } from '../../components/ui/States'
import { toast } from '../../components/ui/Toast'
import { SpeakIcon } from '../../components/vocab/Pronounce'
import { buildQuiz } from '../../domain/quiz'
import type { Question } from '../../domain/quiz'
import type { Mistake, MistakeCategory, Word } from '../../domain/types'
import { relativeDay } from '../../domain/util'
import { useStudyTimer } from '../../hooks'
import { useAllWords, useHub } from '../../store/useHub'
import { QuizRunner } from '../quiz/QuizRunner'

const CATEGORY: Record<MistakeCategory, { label: string; tip: string }> = {
  spelling: { label: 'Chính tả', tip: 'Viết sai chữ cái' },
  meaning: { label: 'Nghĩa từ', tip: 'Nhầm nghĩa của từ' },
  word_class: { label: 'Từ loại', tip: 'Nhầm danh/động/tính/trạng từ' },
  pronunciation: { label: 'Phát âm', tip: 'Nhầm cách đọc' },
  synonym: { label: 'Đồng/trái nghĩa', tip: 'Nhầm từ cùng nghĩa hoặc trái nghĩa' },
  context: { label: 'Ngữ cảnh', tip: 'Dùng sai trong câu, cụm từ' },
}
type Status = 'open' | 'resolved' | 'all'
type Sort = 'count' | 'recent'

export default function MistakesPage() {
  useStudyTimer('mistakes')
  const words = useAllWords()
  const mistakes = useHub((s) => s.mistakes)
  const resolveMistake = useHub((s) => s.resolveMistake)
  const deleteMistake = useHub((s) => s.deleteMistake)
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words])

  const [status, setStatus] = useState<Status>('open')
  const [cat, setCat] = useState<MistakeCategory | ''>('')
  const [sort, setSort] = useState<Sort>('count')
  const [q, setQ] = useState('')
  const [practice, setPractice] = useState<{ key: number; qs: Question[] } | null>(null)

  const all = useMemo(() => Object.values(mistakes).filter((m) => byId.has(m.wordId)), [mistakes, byId])
  const open = all.filter((m) => !m.resolved)
  const resolved = all.length - open.length
  const catCounts = useMemo(() => {
    const c: Partial<Record<MistakeCategory, number>> = {}
    open.forEach((m) => { c[m.category] = (c[m.category] ?? 0) + 1 })
    return c
  }, [open])
  const top = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0] as [MistakeCategory, number] | undefined

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all
      .filter((m) => (status === 'all' ? true : status === 'open' ? !m.resolved : m.resolved))
      .filter((m) => !cat || m.category === cat)
      .filter((m) => { if (!term) return true; const w = byId.get(m.wordId)!; return w.word.toLowerCase().includes(term) || w.meaningVi.toLowerCase().includes(term) })
      .sort((a, b) => (sort === 'count' ? b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1) : a.lastAt < b.lastAt ? 1 : -1))
  }, [all, status, cat, q, sort, byId])

  const startPractice = () => {
    const ids = Array.from(new Set(open.filter((m) => m.category !== 'spelling').map((m) => m.wordId)))
    const ws = ids.map((id) => byId.get(id)).filter((w): w is Word => !!w)
    if (!ws.length) return toast.info('Chưa có lỗi nào cần luyện bằng câu hỏi. Lỗi chính tả hãy luyện ở trang Chính tả.')
    const qs = buildQuiz({ types: ['meaning', 'fill_blank', 'synonym', 'word_class'], words: ws, pool: words, count: Math.min(15, Math.max(5, ws.length)), difficulty: 'normal' })
    if (!qs.length) return toast.info('Không đủ dữ liệu để tạo câu hỏi cho các từ này.')
    setPractice({ key: Date.now(), qs })
  }

  if (practice) {
    return <QuizRunner key={practice.key} questions={practice.qs} module="mistakes" title="Luyện lại lỗi sai" kicker="Mistake Notebook"
      onExit={() => setPractice(null)} onRestart={startPractice} restartLabel="Luyện bộ khác" />
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="09" kicker="Mistake Notebook" title="Sổ ghi" italic="lỗi sai"
        lead="Mọi câu trả lời sai đều được ghi lại ở đây, cùng các đáp án sai của bạn. Trả lời đúng liên tiếp 3 lần, lỗi sẽ tự được đánh dấu đã khắc phục."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/spelling"><Button variant="outline" size="sm" icon={<SpellCheck size={14} />}>Luyện chính tả</Button></Link>
            <Button size="sm" icon={<Play size={14} />} onClick={startPractice} disabled={!open.length}>Luyện lại lỗi sai</Button>
          </div>
        } />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Lỗi đang mở" value={open.length} tone="text-burgundy-ink" />
        <Stat label="Đã khắc phục" value={resolved} tone="text-forest dark:text-[#8fd1a8]" />
        <Stat label="Hay mắc nhất" value={top ? CATEGORY[top[0]].label : '—'} sub={top ? `${top[1]} lỗi` : 'Chưa có dữ liệu'} />
      </div>

      <div className="sheet mb-6 flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
        <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'open', label: `Đang mở (${open.length})` }, { value: 'resolved', label: `Đã khắc phục (${resolved})` }, { value: 'all', label: 'Tất cả' }]} />
        <Segmented size="sm" value={sort} onChange={setSort} options={[{ value: 'count', label: 'Sai nhiều nhất' }, { value: 'recent', label: 'Gần đây' }]} />
        <label className="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm từ…" aria-label="Tìm trong sổ lỗi sai" className="field !pl-9" />
        </label>
        <div className="flex w-full flex-wrap gap-1.5">
          <Chip on={cat === ''} onClick={() => setCat('')}>Mọi loại</Chip>
          {(Object.keys(CATEGORY) as MistakeCategory[]).map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(cat === c ? '' : c)}>{CATEGORY[c].label}{catCounts[c] ? ` · ${catCounts[c]}` : ''}</Chip>)}
        </div>
      </div>

      {all.length === 0 ? (
        <div className="sheet"><EmptyState title="Sổ lỗi sai còn trống" illustration={<NotebookPen className="h-20 w-20" strokeWidth={1} />}
          action={<Link to="/quizzes"><Button>Làm bài kiểm tra</Button></Link>}>
          Khi bạn trả lời sai trong flashcard, chính tả hoặc bài kiểm tra, từ đó sẽ xuất hiện ở đây để bạn ôn lại đúng chỗ yếu.
        </EmptyState></div>
      ) : list.length === 0 ? (
        <div className="sheet"><EmptyState title="Không có mục nào khớp">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</EmptyState></div>
      ) : (
        <section>
          <SectionTitle numeral="i" aside={<span className="font-mono text-xs text-muted">{list.length} mục</span>}>Danh sách lỗi</SectionTitle>
          <ul className="sheet divide-y divide-rule">
            {list.map((m, i) => (
              <Row key={m.key} m={m} word={byId.get(m.wordId)!} i={i}
                onToggle={() => resolveMistake(m.key, !m.resolved)}
                onDelete={() => { deleteMistake(m.key); toast.ok('Đã xóa khỏi sổ lỗi sai.') }} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone?: string }) {
  return (
    <div className="sheet p-5">
      <div className="font-mono text-[0.66rem] tracking-[0.25em] text-muted uppercase">{label}</div>
      <div className={clsx('display mt-1 text-4xl', tone)}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  )
}

function Row({ m, word, i, onToggle, onDelete }: { m: Mistake; word: Word; i: number; onToggle: () => void; onDelete: () => void }) {
  const recent = m.history.slice(-8)
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.025 }} className={clsx('flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4', m.resolved && 'opacity-70')}>
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <Link to={`/library/${word.id}`} className="entry-word text-2xl text-ink hover:text-burgundy-ink">{word.word}</Link>
          <SpeakIcon text={word.word} wordId={word.id} size={14} />
          <span className="rounded-full border border-rule-strong px-2 py-px text-[0.68rem] text-ink-2" title={CATEGORY[m.category].tip}>{CATEGORY[m.category].label}</span>
          {m.resolved && <span className="inline-flex items-center gap-1 text-xs text-ok"><Check size={12} /> đã khắc phục</span>}
        </div>
        <p className="text-sm text-muted">{word.meaningVi}</p>
        {m.wrongAnswers.length > 0 && (
          <p className="mt-1 text-sm text-muted">Bạn từng chọn/viết: {m.wrongAnswers.slice(0, 4).map((a, k) => <span key={k} className="mr-2 rounded bg-bad/10 px-1.5 font-mono text-xs text-bad">{a}</span>)}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 text-xs text-muted">
        <span>Sai <b className="font-mono text-sm text-burgundy-ink">{m.count}</b> lần · {relativeDay(m.lastAt)}</span>
        <span className="flex gap-1" aria-label="Lịch sử gần đây">{recent.map((h, k) => <span key={k} className={clsx('h-2.5 w-2.5 rounded-full', h.correct ? 'bg-ok' : 'bg-bad')} title={h.correct ? 'Đúng' : 'Sai'} />)}</span>
      </div>
      <div className="flex gap-1">
        <IconButton label={m.resolved ? 'Mở lại lỗi này' : 'Đánh dấu đã khắc phục'} onClick={onToggle}>{m.resolved ? <RotateCcw size={15} /> : <Check size={15} />}</IconButton>
        <IconButton label="Xóa khỏi sổ" onClick={onDelete}><Trash2 size={15} /></IconButton>
      </div>
    </motion.li>
  )
}
