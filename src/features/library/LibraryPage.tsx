import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { Grid3x3, Rows3, Search, Upload, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookStack } from '../../components/illustrations'
import { CefrBadge, VerificationTag } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Chip, Segmented } from '../../components/ui/Segmented'
import { EmptyState } from '../../components/ui/States'
import { SpeakIcon } from '../../components/vocab/Pronounce'
import { WordActions } from '../../components/vocab/WordActions'
import { CEFR_INFO, POS_ABBR, POS_VI, TOPICS } from '../../data/content'
import { CEFR_LEVELS, PARTS_OF_SPEECH, type SrsStatus, type Word } from '../../domain/types'
import { useStudyTimer } from '../../hooks'
import { useAllWords, useHub } from '../../store/useHub'
import { ImportExportModal } from './ImportExportModal'

export const STATUS_VI: Record<SrsStatus, string> = { new: 'Chưa học', learning: 'Đang học', review: 'Đang củng cố', mastered: 'Thành thạo' }
const STATUS_DOT: Record<SrsStatus, string> = { new: 'bg-ink/20', learning: 'bg-burgundy', review: 'bg-forest', mastered: 'bg-gold' }
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function LibraryPage() {
  useStudyTimer('library')
  const words = useAllWords()
  const progress = useHub((s) => s.progress)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const get = (k: string, d = '') => params.get(k) ?? d
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }) }

  const q = get('q'), level = get('level'), pos = get('pos'), topic = get('topic'), status = get('status'), sort = get('sort', 'alpha'), view = get('view', 'cards'), letter = get('letter'), fav = get('fav')
  const dq = useDeferredValue(q)

  const filtered = useMemo(() => {
    const term = dq.trim().toLowerCase()
    let list = words.filter((w) => {
      const st = progress[w.id]
      if (level && w.cefr !== level) return false
      if (pos && !w.pos.includes(pos as Word['pos'][number])) return false
      if (topic && !w.topics.includes(topic)) return false
      if (status && (st?.status ?? 'new') !== status) return false
      if (fav === '1' && !st?.favorite) return false
      if (fav === 'review' && !st?.inReviewList) return false
      if (letter && !w.word.toUpperCase().startsWith(letter)) return false
      if (term && !(w.word.toLowerCase().includes(term) || w.meaningVi.toLowerCase().includes(term) || w.synonyms.some((s) => s.toLowerCase().includes(term))))
        return false
      return true
    })
    if (sort === 'alpha') list = list.slice().sort((a, b) => a.word.localeCompare(b.word))
    if (sort === 'alpha-desc') list = list.slice().sort((a, b) => b.word.localeCompare(a.word))
    if (sort === 'newest') list = list.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    if (sort === 'level') list = list.slice().sort((a, b) => CEFR_LEVELS.indexOf(a.cefr) - CEFR_LEVELS.indexOf(b.cefr) || a.word.localeCompare(b.word))
    return list
  }, [words, progress, dq, level, pos, topic, status, sort, letter, fav])

  const letterCounts = useMemo(() => {
    const m = new Map<string, number>()
    words.forEach((w) => m.set(w.word[0].toUpperCase(), (m.get(w.word[0].toUpperCase()) ?? 0) + 1))
    return m
  }, [words])
  const activeFilters = [level, pos, topic, status, letter, fav].filter(Boolean).length

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="02" kicker="Vocabulary Library" title="Thư viện" italic="từ vựng"
        lead={<>Kho {words.length} mục từ được phân loại theo sáu cấp độ CEFR. Mỗi mục ghi rõ nguồn dữ liệu và trạng thái xác minh cấp độ.</>}
        actions={<Button variant="outline" icon={<Upload size={15} />} onClick={() => setImportOpen(true)}>Nhập / Xuất dữ liệu</Button>} />

      {/* Thanh tìm kiếm kiểu phiếu tra cứu */}
      <div className="sheet mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => set('q', e.target.value)} placeholder="Tra cứu từ tiếng Anh, nghĩa tiếng Việt hoặc từ đồng nghĩa…"
              className="field !pl-10 font-serif text-lg" aria-label="Tìm kiếm từ vựng" />
            {q && <button onClick={() => set('q', '')} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-ink" aria-label="Xóa tìm kiếm"><X size={16} /></button>}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select value={sort} onChange={(e) => set('sort', e.target.value)} className="field !w-auto !py-2 text-sm" aria-label="Sắp xếp">
              <option value="alpha">A → Z</option>
              <option value="alpha-desc">Z → A</option>
              <option value="newest">Mới thêm gần đây</option>
              <option value="level">Theo cấp độ</option>
            </select>
            <Segmented size="sm" value={view} onChange={(v) => set('view', v)} options={[{ value: 'cards', label: <span className="flex items-center gap-1"><Grid3x3 size={13} />Phiếu</span> }, { value: 'table', label: <span className="flex items-center gap-1"><Rows3 size={13} />Bảng</span> }]} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="kicker mr-1">Cấp độ</span>
            {CEFR_LEVELS.map((l) => <Chip key={l} on={level === l} onClick={() => set('level', level === l ? '' : l)}>{l}</Chip>)}
          </div>
          <select value={pos} onChange={(e) => set('pos', e.target.value)} className="field !w-auto !py-1.5 text-sm" aria-label="Loại từ">
            <option value="">Mọi loại từ</option>
            {PARTS_OF_SPEECH.map((p) => <option key={p} value={p}>{POS_VI[p]}</option>)}
          </select>
          <select value={topic} onChange={(e) => set('topic', e.target.value)} className="field !w-auto !py-1.5 text-sm" aria-label="Chủ đề">
            <option value="">Mọi chủ đề</option>
            {Object.entries(TOPICS).map(([k, t]) => <option key={k} value={k}>{t.vi}</option>)}
          </select>
          <select value={status} onChange={(e) => set('status', e.target.value)} className="field !w-auto !py-1.5 text-sm" aria-label="Trạng thái ghi nhớ">
            <option value="">Mọi trạng thái</option>
            {(Object.keys(STATUS_VI) as SrsStatus[]).map((s) => <option key={s} value={s}>{STATUS_VI[s]}</option>)}
          </select>
          <div className="flex gap-1.5">
            <Chip on={fav === '1'} onClick={() => set('fav', fav === '1' ? '' : '1')}>♥ Yêu thích</Chip>
            <Chip on={fav === 'review'} onClick={() => set('fav', fav === 'review' ? '' : 'review')}>Danh sách ôn</Chip>
          </div>
          {activeFilters > 0 && <button onClick={() => setParams(q ? { q } : {}, { replace: true })} className="text-xs text-burgundy-ink underline">Xóa {activeFilters} bộ lọc</button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[52px_1fr]">
        {/* Thẻ chữ cái như ngăn kéo mục lục */}
        <div className="hidden lg:block">
          <div className="sticky top-6 flex flex-col overflow-hidden rounded-md border border-rule bg-surface-2/60">
            {LETTERS.map((L) => {
              const n = letterCounts.get(L) ?? 0
              return (
                <button key={L} disabled={!n} onClick={() => set('letter', letter === L ? '' : L)}
                  className={clsx('h-[26px] font-display text-sm transition-colors', letter === L ? 'bg-burgundy text-on-dark' : n ? 'text-ink-2 hover:bg-gold/20' : 'text-ink/20')}>{L}</button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-serif text-lg text-ink-2 italic">{filtered.length} mục từ{letter && ` bắt đầu bằng “${letter}”`}</p>
            <p className="hidden font-mono text-[0.68rem] text-muted sm:block">Nhấn vào một phiếu để mở mục từ</p>
          </div>

          {filtered.length === 0 ? (
            <div className="sheet"><EmptyState title="Không tìm thấy mục từ nào" illustration={<BookStack className="h-24 w-24" />} action={<Button variant="outline" onClick={() => setParams({}, { replace: true })}>Xóa bộ lọc</Button>}>Thử từ khóa khác hoặc bỏ bớt bộ lọc. Bạn cũng có thể nhập thêm từ vựng có nguồn kiểm chứng.</EmptyState></div>
          ) : view === 'table' ? (
            <div className="sheet overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-rule-strong bg-surface-2/50">
                  <tr className="kicker">{['Từ', 'IPA', 'Loại', 'Nghĩa', 'Cấp', 'Trạng thái', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((w) => {
                    const st = progress[w.id]?.status ?? 'new'
                    return (
                      <tr key={w.id} onClick={() => navigate(`/library/${w.id}`)} className="cursor-pointer border-b border-rule transition-colors last:border-0 hover:bg-gold/8">
                        <td className="px-4 py-2.5 font-display text-[1.05rem] font-semibold text-ink">{w.word}</td>
                        <td className="ipa px-4">{w.ipa.uk}</td>
                        <td className="px-4 font-serif text-burgundy-ink italic">{w.pos.map((p) => POS_ABBR[p]).join(' ')}</td>
                        <td className="max-w-xs truncate px-4 text-ink-2">{w.meaningVi}</td>
                        <td className="px-4"><CefrBadge level={w.cefr} /></td>
                        <td className="px-4"><span className="flex items-center gap-1.5 text-xs text-muted"><i className={clsx('h-2 w-2 rounded-full', STATUS_DOT[st])} />{STATUS_VI[st]}</span></td>
                        <td className="px-4"><WordActions word={w} size="sm" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.slice(0, 240).map((w, i) => {
                  const st = progress[w.id]?.status ?? 'new'
                  return (
                    <motion.article key={w.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                      onClick={() => navigate(`/library/${w.id}`)}
                      className="sheet sheet-lift group relative cursor-pointer overflow-hidden p-5 pt-6">
                      {/* lỗ xỏ phiếu mục lục */}
                      <span className="absolute top-2 left-1/2 h-2 w-6 -translate-x-1/2 rounded-full border border-rule-strong bg-bg" />
                      <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-burgundy via-gold to-forest opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[0.64rem] tracking-[0.18em] text-muted">{w.cefr} · {w.topics.map((t) => TOPICS[t]?.en ?? t)[0]?.toUpperCase()}</span>
                        <CefrBadge level={w.cefr} />
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <h3 className="entry-word text-[1.9rem] text-ink transition-colors group-hover:text-burgundy-ink">{w.word}</h3>
                        <span className="font-serif text-burgundy-ink italic">{w.pos.map((p) => POS_ABBR[p]).join(' ')}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1"><span className="ipa">{w.ipa.uk}</span><SpeakIcon text={w.word} wordId={w.id} size={14} /></div>
                      <p className="mt-3 line-clamp-2 min-h-[2.6rem] text-[0.92rem] text-ink-2">{w.meaningVi}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-dashed border-rule-strong pt-3">
                        <span className="flex items-center gap-1.5 text-xs text-muted"><i className={clsx('h-2 w-2 rounded-full', STATUS_DOT[st])} />{STATUS_VI[st]}</span>
                        <div className="flex items-center gap-2">
                          <VerificationTag status={w.source.cefr} refText={w.source.cefrRef} compact />
                          <WordActions word={w} size="sm" />
                        </div>
                      </div>
                    </motion.article>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
          <p className="mt-8 text-center font-mono text-[0.66rem] text-muted">
            {CEFR_LEVELS.map((l) => `${l} ${CEFR_INFO[l].en}`).join('  ·  ')}
          </p>
        </div>
      </div>
      <ImportExportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
