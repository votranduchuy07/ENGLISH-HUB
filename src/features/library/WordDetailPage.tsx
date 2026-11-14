import clsx from 'clsx'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronLeft, ChevronRight, CloudDownload, ExternalLink, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Ornament } from '../../components/illustrations'
import { CefrBadge, Pill, VerificationTag } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Skeleton, ErrorState, EmptyState } from '../../components/ui/States'
import { toast } from '../../components/ui/Toast'
import { PronounceButtons, SpeakIcon } from '../../components/vocab/Pronounce'
import { WordActions } from '../../components/vocab/WordActions'
import { CEFR_INFO, POS_ABBR, POS_VI, TOPICS } from '../../data/content'
import { previewIntervals, retentionScore } from '../../domain/srs'
import type { Word } from '../../domain/types'
import { relativeDay } from '../../domain/util'
import { useStudyTimer } from '../../hooks'
import { DictionaryError, fetchEnrichment } from '../../services/dictionaryApi'
import { useAllWords, useHub } from '../../store/useHub'
import { STATUS_VI } from './LibraryPage'

const CONTENT_SOURCE_VI = { curated: 'Biên soạn bởi English Hub', dictionaryapi: 'Dictionary API (Wiktionary)', import: 'Nhập từ file', user: 'Người dùng tự thêm' }

function Linked({ items, words }: { items: string[]; words: Word[] }) {
  if (!items.length) return <span className="text-sm text-muted italic">—</span>
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-1.5">
      {items.map((s, i) => {
        const w = words.find((x) => x.word.toLowerCase() === s.toLowerCase())
        return (
          <span key={s} className="font-serif text-[1.05rem]">
            {w ? <Link to={`/library/${w.id}`} className="text-burgundy-ink underline decoration-gold/50 underline-offset-4 hover:decoration-burgundy">{s}</Link> : <span className="text-ink-2">{s}</span>}
            {i < items.length - 1 && <span className="text-muted">,</span>}
          </span>
        )
      })}
    </div>
  )
}

export default function WordDetailPage() {
  useStudyTimer('library')
  const { id } = useParams()
  const navigate = useNavigate()
  const words = useAllWords()
  const w = words.find((x) => x.id === id)
  const st = useHub((s) => (id ? s.progress[id] : undefined))
  const enrichment = useHub((s) => (id ? s.enrichments[id] : undefined))
  const saveEnrichment = useHub((s) => s.saveEnrichment)
  const deleteCustomWord = useHub((s) => s.deleteCustomWord)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  useEffect(() => () => ctrl.current?.abort(), [])
  useEffect(() => { setErr(null) }, [id])

  const sorted = useMemo(() => words.slice().sort((a, b) => a.word.localeCompare(b.word)), [words])
  const idx = sorted.findIndex((x) => x.id === id)
  const related = useMemo(() => (w ? words.filter((x) => x.id !== w.id && x.topics.some((t) => w.topics.includes(t))).slice(0, 6) : []), [w, words])

  if (!w) return (
    <div className="mx-auto max-w-3xl px-6 py-16"><div className="sheet"><EmptyState title="Không tìm thấy mục từ" action={<Button onClick={() => navigate('/library')}>Về thư viện</Button>}>Mục từ này không tồn tại hoặc đã bị xóa khỏi kho.</EmptyState></div></div>
  )

  const enrich = async () => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    setLoading(true); setErr(null)
    try {
      const e = await fetchEnrichment(w.id, w.word, ctrl.current.signal)
      saveEnrichment(e)
      toast.ok('Đã bổ sung dữ liệu từ Dictionary API')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErr(e instanceof DictionaryError ? e.message : 'Không thể lấy dữ liệu. Vui lòng thử lại.')
    } finally { setLoading(false) }
  }
  const prev = sorted[(idx - 1 + sorted.length) % sorted.length], next = sorted[(idx + 1) % sorted.length]
  const iv = st ? previewIntervals(st.srs) : null

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 lg:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/library" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold-ink"><ArrowLeft size={15} />Thư viện <span className="text-rule-strong">/</span> {w.cefr} <span className="text-rule-strong">/</span> <span className="text-ink">{w.word}</span></Link>
        <div className="flex gap-1">
          <Link to={`/library/${prev.id}`} className="rounded-full border border-rule-strong p-1.5 text-ink-2 hover:border-gold" aria-label={`Từ trước: ${prev.word}`}><ChevronLeft size={16} /></Link>
          <Link to={`/library/${next.id}`} className="rounded-full border border-rule-strong p-1.5 text-ink-2 hover:border-gold" aria-label={`Từ sau: ${next.word}`}><ChevronRight size={16} /></Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <motion.article key={w.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="sheet frame-ornate relative overflow-hidden px-7 py-9 sm:px-12">
          <span className="pointer-events-none absolute top-6 right-8 font-display text-[9rem] leading-none text-ink/[0.04] select-none">{w.word[0].toUpperCase()}</span>
          <div className="folio">Mục từ · {CEFR_INFO[w.cefr].en}</div>
          <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
            <h1 className="entry-word text-[3.4rem] text-ink sm:text-[4.6rem]">{w.word}</h1>
            <span className="mb-2 font-serif text-2xl text-burgundy-ink italic">{w.pos.map((p) => POS_ABBR[p]).join(', ')}</span>
            <CefrBadge level={w.cefr} size="lg" className="mb-3" />
          </div>
          <div className="mt-3"><PronounceButtons word={{ ...w, ipa: { uk: enrichment?.ipa?.uk && !w.ipa.uk ? enrichment.ipa.uk : w.ipa.uk, us: w.ipa.us ?? enrichment?.ipa?.us } }} /></div>
          <div className="mt-2 text-xs text-muted">{w.pos.map((p) => POS_VI[p]).join(' · ')}{w.source.note && <> · <span className="text-gold-ink">{w.source.note}</span></>}</div>

          <Ornament className="my-7 h-3 w-48 text-gold" />

          <section>
            <div className="flex gap-4">
              <span className="font-display text-3xl text-gold-ink">1</span>
              <div>
                <p className="font-display text-[1.6rem] leading-tight text-ink">{w.meaningVi}</p>
                <p className="serif-italic mt-2 text-[1.28rem] leading-snug text-ink-2">{w.definitionEn}</p>
              </div>
            </div>
            <ul className="mt-6 space-y-4 pl-10">
              {w.examples.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1.5 -left-6 text-gold">◆</span>
                  <p className="flex items-start gap-1 text-[1.02rem] text-ink">{e.en}<SpeakIcon text={e.en} size={14} className="-mt-0.5" /></p>
                  {e.vi && <p className="mt-0.5 text-sm text-muted">{e.vi}</p>}
                </li>
              ))}
            </ul>
          </section>

          {w.collocations.length > 0 && (
            <section className="mt-9 rounded-md border-l-4 border-forest bg-forest/[0.06] px-5 py-4 dark:bg-forest/20">
              <div className="kicker !text-forest dark:!text-gold">Collocations · Cụm từ thường đi kèm</div>
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {w.collocations.map((c) => <li key={c} className="font-serif text-[1.08rem] text-ink">▸ {c}</li>)}
              </ul>
            </section>
          )}

          <div className="mt-9 grid gap-8 sm:grid-cols-2">
            <section><div className="kicker mb-2">SYN · Từ đồng nghĩa</div><Linked items={w.synonyms} words={words} /></section>
            <section><div className="kicker mb-2">OPP · Từ trái nghĩa</div><Linked items={w.antonyms} words={words} /></section>
            <section><div className="kicker mb-2">Phrasal verbs</div>{w.phrasalVerbs.length ? <div className="flex flex-wrap gap-1.5">{w.phrasalVerbs.map((p) => <Pill key={p}>{p}</Pill>)}</div> : <span className="text-sm text-muted italic">Không có cụm động từ liên quan</span>}</section>
            <section>
              <div className="kicker mb-2">Word family · Họ từ</div>
              {w.wordFamily.length ? <div className="font-serif text-[1.05rem] text-ink-2"><b className="text-ink">{w.word}</b> → {w.wordFamily.filter((f) => f !== w.word).join(' · ')}</div> : <span className="text-sm text-muted italic">—</span>}
            </section>
          </div>

          {/* Bổ sung từ Dictionary API */}
          <section className="mt-10 border-t border-rule-strong pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="kicker">Tư liệu bổ sung</div>
                <p className="mt-1 text-xs text-muted">Lấy từ dictionaryapi.dev (Wiktionary · CC BY-SA). Dữ liệu được lưu riêng và không thay đổi cấp CEFR.</p>
              </div>
              <Button size="sm" variant="outline" icon={<CloudDownload size={14} />} onClick={enrich} disabled={loading}>{enrichment ? 'Cập nhật' : 'Bổ sung từ Dictionary API'}</Button>
            </div>
            {loading && <div className="mt-4 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div>}
            {err && !loading && <div className="mt-4"><ErrorState message={err} onRetry={enrich} /></div>}
            {enrichment && !loading && (
              <div className="mt-4 space-y-3">
                <ol className="space-y-2">
                  {enrichment.definitions.map((d, i) => (
                    <li key={i} className="text-sm text-ink-2"><span className="font-serif text-burgundy-ink italic">{d.pos}</span> — {d.definition}{d.example && <span className="block pl-4 text-muted italic">“{d.example}”</span>}</li>
                  ))}
                </ol>
                {(enrichment.synonyms.length > 0) && <p className="text-sm"><span className="kicker mr-2">Đồng nghĩa (đề xuất)</span>{enrichment.synonyms.join(', ')}</p>}
                <p className="flex flex-wrap items-center gap-2 font-mono text-[0.66rem] text-muted">
                  <span>Lấy lúc {new Date(enrichment.fetchedAt).toLocaleString('vi-VN')}</span>·<span>{enrichment.license}</span>·
                  <a href={enrichment.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">Nguồn <ExternalLink size={10} /></a>
                  {(enrichment.audio?.uk || enrichment.audio?.us) && <span className="text-ok">· Có audio thật — nút phát âm sẽ ưu tiên dùng</span>}
                </p>
              </div>
            )}
          </section>
        </motion.article>

        {/* ===== Lề phải: hồ sơ & nguồn ===== */}
        <aside className="space-y-5">
          <div className="leather p-5">
            <div className="font-mono text-[0.64rem] tracking-[0.25em] text-gold uppercase">Hồ sơ ghi nhớ</div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="display text-2xl">{STATUS_VI[st?.status ?? 'new']}</span>
              <span className="font-mono text-sm text-gold">{st ? retentionScore(st) : 0}%</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-y-2.5 text-sm">
              <dt className="text-on-dark/60">Lần ôn</dt><dd className="text-right font-mono">{st?.srs.reps ?? 0}</dd>
              <dt className="text-on-dark/60">Đúng / Sai</dt><dd className="text-right font-mono">{st?.correct ?? 0} / {st?.wrong ?? 0}</dd>
              <dt className="text-on-dark/60">Hệ số dễ</dt><dd className="text-right font-mono">{st?.srs.ease.toFixed(2) ?? '2.50'}</dd>
              <dt className="text-on-dark/60">Ôn gần nhất</dt><dd className="text-right">{relativeDay(st?.srs.last ?? null)}</dd>
              <dt className="text-on-dark/60">Ôn tiếp theo</dt><dd className="text-right text-gold">{st?.srs.reps ? relativeDay(st.srs.due) : 'chưa lên lịch'}</dd>
            </dl>
            {iv && st?.srs.reps ? <p className="mt-3 border-t border-gold/20 pt-3 text-[0.72rem] text-on-dark/60">Nếu ôn hôm nay: Again {iv.again} · Good {iv.good} · Easy {iv.easy}</p> : null}
            <div className="mt-4 border-t border-gold/20 pt-4"><WordActions word={w} showLabels /></div>
          </div>

          <div className="sheet p-5">
            <div className="kicker">Nguồn dữ liệu</div>
            <p className="mt-2 text-sm text-ink">{CONTENT_SOURCE_VI[w.source.content]}</p>
            <div className="mt-3"><VerificationTag status={w.source.cefr} refText={w.source.cefrRef} /></div>
            {w.source.cefrRef && <p className="mt-2 text-xs leading-relaxed text-muted">{w.source.cefrRef}</p>}
            <div className="mt-4 kicker">Chủ đề</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{w.topics.map((t) => <Link key={t} to={`/library?topic=${t}`}><Pill className="hover:border-gold">{TOPICS[t]?.vi ?? t}</Pill></Link>)}</div>
            {w.source.content === 'import' && (
              <button onClick={() => { deleteCustomWord(w.id); toast.ok(`Đã xóa “${w.word}”`); navigate('/library') }} className="mt-4 inline-flex items-center gap-1.5 text-xs text-bad hover:underline"><Trash2 size={13} />Xóa mục từ đã nhập</button>
            )}
          </div>

          {related.length > 0 && (
            <div className="sheet p-5">
              <div className="kicker mb-3">Cùng chủ đề</div>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.id}><Link to={`/library/${r.id}`} className={clsx('group flex items-center justify-between gap-2 text-sm')}>
                    <span className="font-display text-[1.02rem] text-ink group-hover:text-burgundy-ink">{r.word}</span>
                    <span className="truncate text-xs text-muted">{r.meaningVi}</span>
                  </Link></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
