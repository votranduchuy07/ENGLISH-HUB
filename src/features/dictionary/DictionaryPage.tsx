import clsx from 'clsx'
import { motion } from 'framer-motion'
import { BookMarked, ClipboardPaste, Download, Globe, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Chip } from '../../components/ui/Segmented'
import { EmptyState } from '../../components/ui/States'
import { toast } from '../../components/ui/Toast'
import { SpeakIcon } from '../../components/vocab/Pronounce'
import { TOPICS } from '../../data/content'
import type { PersonalWord } from '../../domain/types'
import { useStudyTimer } from '../../hooks'
import { DictionaryError, fetchEnrichment } from '../../services/dictionaryApi'
import { downloadFile } from '../../services/importExport'
import { extractCandidates, type Candidate } from '../../domain/textExtract'
import { useAllWords, useHub } from '../../store/useHub'

type Draft = { id?: string; word: string; meaning: string; ipa: string; example: string; topic: string; note: string }
const EMPTY: Draft = { word: '', meaning: '', ipa: '', example: '', topic: '', note: '' }

export default function DictionaryPage() {
  useStudyTimer('dictionary')
  const words = useAllWords()
  const personal = useHub((s) => s.personal)
  const save = useHub((s) => s.savePersonal)
  const remove = useHub((s) => s.deletePersonal)
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [lookup, setLookup] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [extractOpen, setExtractOpen] = useState(false)
  const [pasted, setPasted] = useState('')
  const [cands, setCands] = useState<Candidate[]>([])
  const [analyzed, setAnalyzed] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  const byWord = useMemo(() => new Map(words.map((w) => [w.word.toLowerCase(), w])), [words])
  const topics = useMemo(() => Array.from(new Set(personal.map((p) => p.topic).filter(Boolean))), [personal])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return personal.filter((p) => (!topic || p.topic === topic) && (!t || p.word.toLowerCase().includes(t) || p.meaning.toLowerCase().includes(t) || p.note.toLowerCase().includes(t)))
  }, [personal, q, topic])

  const open = (p?: PersonalWord) => { setErr(null); setDraft(p ? { id: p.id, word: p.word, meaning: p.meaning, ipa: p.ipa, example: p.example, topic: p.topic, note: p.note } : { ...EMPTY }) }
  const set = (k: keyof Draft, v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const submit = () => {
    if (!draft) return
    const word = draft.word.trim()
    if (!word) return setErr('Hãy nhập từ hoặc cụm từ.')
    if (!draft.meaning.trim()) return setErr('Hãy nhập nghĩa của từ.')
    if (personal.some((p) => p.id !== draft.id && p.word.toLowerCase() === word.toLowerCase())) return setErr(`“${word}” đã có trong từ điển cá nhân của bạn.`)
    const linked = byWord.get(word.toLowerCase())
    save({ ...draft, word, meaning: draft.meaning.trim(), ipa: draft.ipa.trim(), example: draft.example.trim(), note: draft.note.trim(), linkedWordId: linked?.id })
    toast.ok(draft.id ? 'Đã cập nhật từ.' : `Đã thêm “${word}” vào từ điển cá nhân.`)
    setDraft(null)
  }

  const fetchInfo = async () => {
    if (!draft?.word.trim()) return setErr('Nhập từ trước khi tra cứu.')
    setErr(null); setLookup(true)
    try {
      const e = await fetchEnrichment('personal', draft.word)
      setDraft((d) => d && ({
        ...d,
        ipa: d.ipa || e.ipa?.uk || e.ipa?.us || '',
        example: d.example || e.definitions.find((x) => x.example)?.example || '',
        note: d.note || (e.definitions[0] ? `${e.definitions[0].pos}: ${e.definitions[0].definition}` : ''),
      }))
      toast.info('Đã điền phiên âm, ví dụ và định nghĩa tiếng Anh (nguồn Wiktionary, CC BY-SA). Hãy tự nhập nghĩa tiếng Việt.')
    } catch (e) {
      setErr(e instanceof DictionaryError ? e.message : 'Không tra cứu được. Thử lại sau.')
    } finally { setLookup(false) }
  }

  const analyze = () => {
    const known = new Set([...words.map((w) => w.word.toLowerCase()), ...personal.map((p) => p.word.toLowerCase())])
    const list = extractCandidates(pasted, known, 60)
    setCands(list); setAnalyzed(true); setPicked(new Set(list.slice(0, 10).map((c) => c.word)))
  }
  const addSelected = async () => {
    setAdding(true)
    let ok = 0, noDef = 0
    for (const c of cands.filter((x) => picked.has(x.word)).slice(0, 25)) {
      let meaning = '', ipa = '', note = ''
      try {
        const e = await fetchEnrichment('personal', c.word)
        ipa = e.ipa?.uk || e.ipa?.us || ''
        meaning = e.definitions[0]?.definition ?? ''
        note = e.definitions[0] ? e.definitions[0].pos : ''
      } catch { /* không tra được: vẫn thêm để người dùng tự điền */ }
      if (!meaning) { noDef++; meaning = '(chưa có nghĩa — hãy sửa)' }
      save({ word: c.word, meaning, ipa, example: c.example, topic: '', note })
      ok++
    }
    setAdding(false); setExtractOpen(false); setPicked(new Set()); setCands([]); setAnalyzed(false); setPasted('')
    toast.ok(`Đã thêm ${ok} từ vào từ điển cá nhân${noDef ? ` (${noDef} từ chưa tra được nghĩa)` : ''}.`)
  }
  const exportJson = () => downloadFile(`my-dictionary-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(personal, null, 2), 'application/json')
  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    const rows = [['word', 'meaning', 'ipa', 'example', 'topic', 'note'].join(','), ...personal.map((p) => [p.word, p.meaning, p.ipa, p.example, p.topic, p.note].map(esc).join(','))]
    downloadFile(`my-dictionary-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + rows.join('\n'), 'text/csv')
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="08" kicker="My Dictionary" title="Từ điển" italic="cá nhân"
        lead="Nơi bạn ghi lại những từ gặp ngoài đời — phim, sách, bài báo, công việc — theo cách hiểu của riêng bạn. Dữ liệu chỉ lưu trên máy này."
        actions={<div className="flex flex-wrap gap-2">
          {personal.length > 0 && <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportCsv}>CSV</Button>}
          {personal.length > 0 && <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportJson}>JSON</Button>}
          <Button variant="outline" size="sm" icon={<ClipboardPaste size={14} />} onClick={() => setExtractOpen(true)}>Tách từ từ văn bản</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => open()}>Thêm từ mới</Button>
        </div>} />

      {personal.length > 0 && (
        <div className="sheet mb-6 flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
          <label className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm từ, nghĩa hoặc ghi chú…" aria-label="Tìm trong từ điển cá nhân" className="field !pl-9" />
          </label>
          {topics.length > 0 && <div className="flex flex-wrap gap-1.5"><Chip on={topic === ''} onClick={() => setTopic('')}>Tất cả</Chip>{topics.map((t) => <Chip key={t} on={topic === t} onClick={() => setTopic(topic === t ? '' : t)}>{TOPICS[t]?.vi ?? t}</Chip>)}</div>}
          <span className="ml-auto font-mono text-xs text-muted">{list.length}/{personal.length} từ</span>
        </div>
      )}

      {personal.length === 0 ? (
        <div className="sheet"><EmptyState title="Từ điển của bạn còn trống" illustration={<BookMarked className="h-20 w-20" strokeWidth={1} />} action={<Button icon={<Plus size={16} />} onClick={() => open()}>Thêm từ đầu tiên</Button>}>
          Gặp từ lạ khi xem phim hay đọc sách? Ghi lại ở đây cùng nghĩa, ví dụ và ghi chú của riêng bạn.
        </EmptyState></div>
      ) : list.length === 0 ? (
        <div className="sheet"><EmptyState title="Không có từ nào khớp">Thử đổi từ khóa hoặc bỏ bộ lọc chủ đề.</EmptyState></div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((p, i) => {
            const linked = p.linkedWordId ? words.find((w) => w.id === p.linkedWordId) : byWord.get(p.word.toLowerCase())
            return (
              <motion.li key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} className="sheet p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <h3 className="entry-word text-2xl text-ink">{p.word}</h3>
                      {p.ipa && <span className="ipa">{p.ipa}</span>}
                      <SpeakIcon text={p.word} size={14} />
                    </div>
                    <p className="mt-1 font-display text-lg text-ink">{p.meaning}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Sửa từ" onClick={() => open(p)}><Pencil size={14} /></IconButton>
                    <IconButton label="Xóa từ" onClick={() => { if (confirm(`Xóa “${p.word}” khỏi từ điển cá nhân?`)) { remove(p.id); toast.ok('Đã xóa.') } }}><Trash2 size={14} /></IconButton>
                  </div>
                </div>
                {p.example && <p className="mt-3 border-l-2 border-gold pl-3 text-sm text-ink-2 italic">{p.example}</p>}
                {p.note && <p className="mt-2 text-sm text-muted">{p.note}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {p.topic && <span className="rounded-full border border-rule-strong px-2 py-px text-ink-2">{TOPICS[p.topic]?.vi ?? p.topic}</span>}
                  {linked && <Link to={`/library/${linked.id}`} className="rounded-full bg-forest/10 px-2 py-px text-forest underline-offset-2 hover:underline dark:text-[#8fd1a8]">Có trong Thư viện ({linked.cefr})</Link>}
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}


      <Modal open={extractOpen} onClose={() => setExtractOpen(false)} kicker="My Dictionary" title="Tách từ mới từ văn bản" width={680}
        footer={<><Button variant="ghost" onClick={() => setExtractOpen(false)}>Đóng</Button>{cands.length > 0 && <Button onClick={addSelected} disabled={adding || !picked.size} icon={adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}>{adding ? 'Đang thêm…' : `Thêm ${picked.size} từ`}</Button>}</>}>
        <p className="text-sm text-muted">Dán một đoạn tiếng Anh (bài báo, phụ đề phim, email…). English Hub sẽ tìm những từ chưa có trong kho từ và từ điển cá nhân của bạn.</p>
        <textarea className="field mt-3" rows={5} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Dán văn bản tiếng Anh vào đây…" aria-label="Văn bản cần phân tích" />
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={analyze} disabled={!pasted.trim()}>Phân tích</Button>
          {analyzed && <span className="text-xs text-muted">{cands.length ? `Tìm thấy ${cands.length} từ chưa có` : 'Không có từ mới nào — tất cả đã có trong kho!'}</span>}
        </div>
        {cands.length > 0 && (
          <ul className="mt-4 max-h-72 divide-y divide-rule overflow-y-auto rounded-xl border border-rule">
            {cands.map((c) => (
              <li key={c.word}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 hover:bg-gold/6">
                  <input type="checkbox" className="mt-1 accent-[var(--burgundy)]" checked={picked.has(c.word)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(c.word)) n.delete(c.word); else n.add(c.word); return n })} />
                  <span className="min-w-0 flex-1"><span className="font-display text-ink">{c.word}</span>{c.count > 1 && <span className="ml-2 font-mono text-xs text-muted">×{c.count}</span>}<span className="block truncate text-xs text-muted">{c.example}</span></span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {cands.length > 0 && <p className="mt-3 text-xs text-muted">Khi thêm, định nghĩa tiếng Anh và phiên âm được lấy từ Dictionary API (Wiktionary, CC BY-SA). Nghĩa tiếng Việt chưa có — hãy bấm “Sửa” để tự điền sau.</p>}
      </Modal>

      <Modal open={!!draft} onClose={() => setDraft(null)} kicker="My Dictionary" title={draft?.id ? 'Sửa từ' : 'Thêm từ mới'} width={620}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>Hủy</Button><Button onClick={submit}>Lưu từ</Button></>}>
        {draft && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
            <div className="flex gap-2">
              <label className="block flex-1"><span className="mb-1 block text-sm text-ink-2">Từ / cụm từ *</span><input className="field" value={draft.word} onChange={(e) => set('word', e.target.value)} autoFocus placeholder="vd: serendipity" /></label>
              <Button type="button" variant="outline" className="self-end" icon={lookup ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />} onClick={fetchInfo} disabled={lookup}>Tra Dictionary API</Button>
            </div>
            <label className="block"><span className="mb-1 block text-sm text-ink-2">Nghĩa tiếng Việt *</span><input className="field" value={draft.meaning} onChange={(e) => set('meaning', e.target.value)} placeholder="vd: sự tình cờ may mắn" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-sm text-ink-2">Phiên âm</span><input className="field" value={draft.ipa} onChange={(e) => set('ipa', e.target.value)} placeholder="/ˌserənˈdɪpəti/" /></label>
              <label className="block"><span className="mb-1 block text-sm text-ink-2">Chủ đề</span>
                <select className="field" value={draft.topic} onChange={(e) => set('topic', e.target.value)}><option value="">Không chọn</option>{Object.entries(TOPICS).map(([k, v]) => <option key={k} value={k}>{v.vi}</option>)}</select></label>
            </div>
            <label className="block"><span className="mb-1 block text-sm text-ink-2">Câu ví dụ</span><textarea className="field" rows={2} value={draft.example} onChange={(e) => set('example', e.target.value)} placeholder="Câu bạn gặp từ này ở đâu đó…" /></label>
            <label className="block"><span className="mb-1 block text-sm text-ink-2">Ghi chú</span><textarea className="field" rows={2} value={draft.note} onChange={(e) => set('note', e.target.value)} placeholder="Mẹo nhớ, nguồn gặp từ, từ dễ nhầm…" /></label>
            {err && <p role="alert" className={clsx('text-sm text-bad')}>{err}</p>}
            <button type="submit" className="hidden" />
          </form>
        )}
      </Modal>
    </div>
  )
}
