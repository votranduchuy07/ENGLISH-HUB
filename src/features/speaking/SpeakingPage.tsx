import clsx from 'clsx'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Mic, MicOff, Play, RotateCcw, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Laurel } from '../../components/illustrations'
import { Button } from '../../components/ui/Button'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { ProgressBar, Ring } from '../../components/ui/Progress'
import { Segmented } from '../../components/ui/Segmented'
import { TOEIC_ITEMS } from '../../data/toeic'
import { diffWords, dictationScore, type WordOp } from '../../domain/dictation'
import type { QuizResult } from '../../domain/types'
import { formatDuration, shuffle, uid } from '../../domain/util'
import { useStudyTimer } from '../../hooks'
import { speak, stopSpeaking } from '../../services/speech'
import { useAllWords, useHub } from '../../store/useHub'

interface Rec {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type RecCtor = new () => Rec
const getCtor = (): RecCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

type Source = 'sentences' | 'words'
interface Item { id: string; text: string; sub?: string }
interface Out { item: Item; score: number; heard: string; ops: WordOp[]; ok: boolean }

const ERR_VI: Record<string, string> = {
  'not-allowed': 'Trình duyệt chưa được cấp quyền dùng micro. Hãy bấm biểu tượng ổ khóa trên thanh địa chỉ và cho phép micro.',
  'service-not-allowed': 'Dịch vụ nhận giọng nói bị chặn trên trình duyệt này.',
  'no-speech': 'Không nghe thấy giọng nói. Hãy nói gần micro hơn và thử lại.',
  'audio-capture': 'Không tìm thấy micro. Hãy kiểm tra thiết bị âm thanh.',
  network: 'Nhận giọng nói cần kết nối mạng (Chrome gửi âm thanh tới máy chủ của Google). Hãy kiểm tra mạng.',
}

export default function SpeakingPage() {
  useStudyTimer('listening')
  const words = useAllWords()
  const recordQuiz = useHub((s) => s.recordQuiz)
  const ctor = useMemo(() => (typeof window === 'undefined' ? null : getCtor()), [])
  const [source, setSource] = useState<Source>('sentences')
  const [count, setCount] = useState(6)
  const [run, setRun] = useState<{ key: number; items: Item[] } | null>(null)
  const [results, setResults] = useState<{ outs: Out[]; ms: number } | null>(null)

  const start = () => {
    const items: Item[] = source === 'sentences'
      ? shuffle(TOEIC_ITEMS.filter((i) => i.text.split(' ').length <= 14 && i.topic !== 'announcement')).slice(0, count).map((i) => ({ id: i.id, text: i.text }))
      : shuffle(words.filter((w) => !w.word.includes(' '))).slice(0, count * 2).map((w) => ({ id: w.id, text: w.word, sub: w.meaningVi }))
    setResults(null)
    setRun({ key: Date.now(), items })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  if (run) {
    return <Runner key={run.key} items={run.items} ctor={ctor} onFinish={(outs, ms) => {
      if (outs.length) {
        const r: QuizResult = { id: uid('qz'), at: new Date().toISOString(), module: 'listening', type: 'mixed', total: outs.length, correct: outs.filter((o) => o.ok).length, durationMs: ms, items: outs.map((o) => ({ wordId: source === 'words' ? o.item.id : null, correct: o.ok })) }
        recordQuiz(r, [])
      }
      setRun(null); setResults({ outs, ms })
    }} />
  }
  if (results) return <ResultView r={results} onBack={() => setResults(null)} onAgain={start} />

  return (
    <div className="mx-auto max-w-[900px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="13" kicker="Speaking" title="Luyện" italic="nói"
        lead="Nghe mẫu, rồi tự đọc to. Trình duyệt nhận giọng nói của bạn và so với câu gốc từng từ — nhanh chóng biết mình phát âm thiếu hay sai chỗ nào." />
      {!ctor && (
        <div role="alert" className="mb-6 rounded-xl border border-bad/40 bg-bad/8 p-4 text-sm text-ink-2">
          Trình duyệt này không hỗ trợ nhận giọng nói (Web Speech API). Hãy dùng <b>Chrome</b> hoặc <b>Edge</b> (máy tính hoặc Android). Safari trên iPhone hỗ trợ không đầy đủ.
        </div>
      )}
      <section className="leather p-7">
        <div className="space-y-5 text-sm">
          <div>
            <div className="mb-2 text-on-dark/60">Luyện gì?</div>
            <Segmented size="sm" value={source} onChange={setSource} options={[{ value: 'sentences', label: 'Câu kiểu TOEIC' }, { value: 'words', label: 'Từ vựng trong kho' }]} />
          </div>
          <div>
            <div className="mb-2 text-on-dark/60">Số {source === 'sentences' ? 'câu' : 'nhóm từ'}</div>
            <Segmented size="sm" value={count} onChange={setCount} options={[4, 6, 10].map((n) => ({ value: n, label: String(n) }))} />
          </div>
        </div>
        <Button variant="gold" size="lg" className="mt-6" icon={<Play size={16} />} onClick={start} disabled={!ctor}>Bắt đầu luyện nói</Button>
        <p className="mt-4 text-xs text-on-dark/60">Lưu ý: Chrome gửi âm thanh tới máy chủ nhận dạng giọng nói của Google để chuyển thành chữ. Nếu bạn không muốn, đừng dùng tính năng này. Kết quả nhận dạng có thể sai với giọng nói/tiếng ồn — đây chỉ là công cụ luyện tập, không phải chấm điểm phát âm chuẩn.</p>
      </section>
    </div>
  )
}

function Runner({ items, ctor, onFinish }: { items: Item[]; ctor: RecCtor | null; onFinish: (o: Out[], ms: number) => void }) {
  const [i, setI] = useState(0)
  const [listening, setListening] = useState(false)
  const [out, setOut] = useState<Out | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const outs = useRef<Out[]>([])
  const t0 = useRef(Date.now())
  const rec = useRef<Rec | null>(null)
  const item = items[i]

  useEffect(() => () => { rec.current?.abort(); stopSpeaking() }, [])
  useEffect(() => { setOut(null); setMsg(null) }, [i])

  const listen = () => speak(item.text, 'us', 0.85)
  const record = () => {
    if (!ctor || listening) return
    setMsg(null); stopSpeaking()
    const r = new ctor()
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false
    let got = false
    r.onresult = (e) => {
      got = true
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript)
      // lấy phương án gần câu gốc nhất
      const best = alts.map((t) => ({ t, ops: diffWords(item.text, t) })).sort((a, b) => dictationScore(b.ops) - dictationScore(a.ops))[0]
      const score = best ? dictationScore(best.ops) : 0
      const o: Out = { item, score, heard: best?.t ?? '', ops: best?.ops ?? [], ok: score >= 0.85 }
      setOut(o)
    }
    r.onerror = (e) => { setMsg(ERR_VI[e.error] ?? `Lỗi nhận giọng nói (${e.error}).`) }
    r.onend = () => { setListening(false); if (!got) setMsg((m) => m ?? 'Không nhận được câu nào. Hãy thử lại.') }
    rec.current = r
    try { r.start(); setListening(true) } catch { setMsg('Không bật được micro. Thử lại sau vài giây.') }
  }
  const next = () => {
    if (out) outs.current.push(out)
    if (i + 1 >= items.length) { rec.current?.abort(); onFinish(outs.current, Date.now() - t0.current) } else setI(i + 1)
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between">
        <div><div className="folio">Speaking</div><div className="display text-xl text-ink">Nghe mẫu rồi đọc lại</div></div>
        <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => { rec.current?.abort(); onFinish(out ? [...outs.current, out] : outs.current, Date.now() - t0.current) }}>Kết thúc</Button>
      </div>
      <div className="mb-6 flex items-center gap-3"><ProgressBar value={i + (out ? 1 : 0)} max={items.length} tone="forest" height={5} /><span className="shrink-0 font-mono text-xs text-muted">{i + 1}/{items.length}</span></div>

      <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="sheet frame-ornate p-7 text-center sm:p-10">
        <p className={clsx('font-display text-ink', item.sub ? 'text-[2.6rem]' : 'text-[1.6rem] leading-snug')}>{item.text}</p>
        {item.sub && <p className="mt-1 text-muted">{item.sub}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" icon={<Volume2 size={16} />} onClick={listen}>Nghe mẫu</Button>
          <button onClick={record} disabled={!ctor || listening} aria-label={listening ? 'Đang nghe bạn nói' : 'Bấm để nói'}
            className={clsx('inline-flex h-12 items-center gap-2 rounded-xl border px-5 text-sm font-medium transition-all', listening ? 'animate-pulse border-bad bg-bad/15 text-bad' : 'border-gold bg-gold text-charcoal hover:brightness-105')}>
            {listening ? <><MicOff size={16} /> Đang nghe…</> : <><Mic size={16} /> {out ? 'Nói lại' : 'Bấm và nói'}</>}
          </button>
        </div>
        {msg && <p role="alert" className="mt-4 text-sm text-bad">{msg}</p>}

        {out && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-left">
            <div className={clsx('flex items-center gap-2 font-display text-xl', out.ok ? 'text-ok' : 'text-gold-ink')}>{out.ok ? <Check size={20} /> : <RotateCcw size={18} />} {out.ok ? 'Rất tốt!' : 'Gần đúng'} · {Math.round(out.score * 100)}%</div>
            <p className="mt-2 text-sm text-muted">Hệ thống nghe được: <span className="font-mono text-ink">“{out.heard || '…'}”</span></p>
            <p className="mt-2 font-serif text-lg leading-8">
              {out.ops.map((o, k) => o.type === 'ok' ? <span key={k} className="text-ok">{o.expected} </span>
                : o.type === 'ins' ? <span key={k} className="text-bad line-through">{o.got} </span>
                : <span key={k} className="rounded bg-gold/20 px-0.5 text-gold-ink" title={o.got ? `Nghe thành “${o.got}”` : 'Bị bỏ sót'}>{o.expected} </span>)}
            </p>
            <div className="mt-5 text-center"><Button onClick={next} className="flex-row-reverse" icon={<ArrowRight size={16} />}>{i + 1 >= items.length ? 'Xem kết quả' : 'Tiếp theo'}</Button></div>
          </motion.div>
        )}
        {!out && <div className="mt-5"><button onClick={() => { outs.current.push({ item, score: 0, heard: '', ops: [], ok: false }); next() }} className="text-xs text-muted underline">Bỏ qua câu này</button></div>}
      </motion.div>
    </div>
  )
}

function ResultView({ r, onBack, onAgain }: { r: { outs: Out[]; ms: number }; onBack: () => void; onAgain: () => void }) {
  const avg = r.outs.length ? Math.round((r.outs.reduce((n, o) => n + o.score, 0) / r.outs.length) * 100) : 0
  const weak = r.outs.filter((o) => !o.ok)
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <div className="leather p-8 text-center sm:p-10">
        <Laurel className="mx-auto h-12 w-28 text-gold" />
        <h2 className="display mt-3 text-3xl text-on-dark">{avg >= 85 ? 'Phát âm rõ ràng!' : avg >= 60 ? 'Khá tốt, luyện thêm nhé' : 'Hãy nghe mẫu và đọc chậm lại'}</h2>
        <div className="my-6 flex justify-center"><Ring value={avg} size={130} stroke={9} tone="var(--gold)" track="rgba(232,236,250,.15)" label={<span className="display text-3xl">{avg}%</span>} /></div>
        <p className="text-sm text-on-dark/75">{r.outs.filter((o) => o.ok).length}/{r.outs.length} đạt · {formatDuration(r.ms)}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3"><Button variant="gold" onClick={onAgain}>Phiên mới</Button><Button variant="onDark" onClick={onBack}>Về trang luyện nói</Button></div>
      </div>
      {weak.length > 0 && (
        <section className="mt-8"><SectionTitle numeral="i">Cần luyện thêm</SectionTitle>
          <ul className="sheet divide-y divide-rule">{weak.map((o, k) => <li key={k} className="px-5 py-3"><p className="font-serif text-lg text-ink">{o.item.text}</p>{o.heard && <p className="text-xs text-muted">Nghe được: “{o.heard}”</p>}</li>)}</ul>
        </section>
      )}
    </div>
  )
}
