import { Download, FileJson, FileSpreadsheet, FileUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { CefrBadge, VerificationTag } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Segmented } from '../../components/ui/Segmented'
import { ErrorState } from '../../components/ui/States'
import { toast } from '../../components/ui/Toast'
import { CSV_TEMPLATE, downloadFile, parseImportFile, validateImport, wordsToCsv, type ImportReport } from '../../services/importExport'
import { useAllWords, useHub } from '../../store/useHub'

export function ImportExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'import' | 'export'>('import')
  const [report, setReport] = useState<ImportReport | null>(null)
  const [fileName, setFileName] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const rawRows = useRef<unknown[]>([])
  const words = useAllWords()
  const custom = useHub((s) => s.customWords)
  const importWords = useHub((s) => s.importWords)

  const onFile = async (f: File) => {
    setError(null); setReport(null); setFileName(f.name); setBusy(true)
    try {
      if (f.size > 5_000_000) throw new Error('File lớn hơn 5MB. Hãy chia nhỏ dữ liệu.')
      const rows = parseImportFile(f.name, await f.text())
      if (!rows.length) throw new Error('File không có dòng dữ liệu nào.')
      rawRows.current = rows
      setReport(validateImport(rows, words, verified))
    } catch (e) {
      setError((e as Error).message || 'Không đọc được file.')
    } finally { setBusy(false) }
  }
  const revalidate = (v: boolean) => { setVerified(v); if (rawRows.current.length) setReport(validateImport(rawRows.current, words, v)) }
  const commit = () => {
    if (!report?.valid.length) return
    importWords(report.valid)
    toast.ok(`Đã thêm ${report.valid.length} mục từ vào thư viện`)
    setReport(null); rawRows.current = []; setFileName('')
    onClose()
  }
  const stamp = new Date().toISOString().slice(0, 10)

  return (
    <Modal open={open} onClose={onClose} title="Nhập & xuất kho từ vựng" kicker="Quản lý dữ liệu" width={760}
      footer={tab === 'import' ? <><Button variant="ghost" onClick={onClose}>Đóng</Button><Button disabled={!report?.valid.length} onClick={commit}>Thêm {report?.valid.length ?? 0} mục từ</Button></> : <Button variant="ghost" onClick={onClose}>Đóng</Button>}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'import', label: 'Nhập dữ liệu' }, { value: 'export', label: 'Xuất dữ liệu' }]} />
      {tab === 'import' ? (
        <div className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-ink-2">
            Hỗ trợ <b>CSV</b> (UTF-8, có dòng tiêu đề) và <b>JSON</b>. Mỗi dòng được kiểm tra: từ hợp lệ, loại từ, nghĩa tiếng Việt, cấp độ A1–C2. Từ đã có trong thư viện sẽ được bỏ qua.
            Cấp CEFR chỉ được đánh dấu <i>đã xác minh</i> khi dòng có cột <code className="font-mono text-xs">cefr_source</code> và bạn xác nhận nguồn bên dưới.
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-rule-strong bg-surface-2/40 px-6 py-8 text-center transition-colors hover:border-gold">
            <FileUp className="text-gold-ink" />
            <span className="font-medium text-ink">{fileName || 'Chọn file CSV hoặc JSON'}</span>
            <span className="text-xs text-muted">{busy ? 'Đang đọc và kiểm tra…' : 'Tối đa 5MB'}</span>
            <input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <label className="flex items-start gap-2.5 text-sm text-ink-2">
            <input type="checkbox" checked={verified} onChange={(e) => revalidate(e.target.checked)} className="mt-1 accent-[var(--forest)]" />
            <span>Tôi xác nhận cột <code className="font-mono text-xs">cefr_source</code> ghi một nguồn CEFR có thể kiểm chứng (ví dụ Oxford 3000/5000, English Vocabulary Profile) và tôi có quyền sử dụng dữ liệu này.</span>
          </label>
          <button onClick={() => downloadFile('english-hub-template.csv', '﻿' + CSV_TEMPLATE, 'text/csv')} className="inline-flex items-center gap-1.5 text-sm text-burgundy-ink underline"><Download size={14} />Tải file mẫu CSV</button>
          {error && <ErrorState title="Không thể nhập file" message={error} />}
          {report && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md border border-ok/40 bg-ok/6 p-3"><div className="display text-2xl text-ok">{report.valid.length}</div><div className="text-xs text-muted">hợp lệ</div></div>
                <div className="rounded-md border border-gold/40 bg-gold/6 p-3"><div className="display text-2xl text-gold-ink">{report.duplicates.length}</div><div className="text-xs text-muted">trùng lặp (bỏ qua)</div></div>
                <div className="rounded-md border border-bad/40 bg-bad/6 p-3"><div className="display text-2xl text-bad">{report.errors.length}</div><div className="text-xs text-muted">lỗi</div></div>
              </div>
              {report.valid.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-rule">
                  {report.valid.slice(0, 30).map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-3 border-b border-rule px-3 py-2 text-sm last:border-0">
                      <span><b className="font-display">{w.word}</b> <span className="text-muted">— {w.meaningVi}</span></span>
                      <span className="flex items-center gap-2"><CefrBadge level={w.cefr} /><VerificationTag status={w.source.cefr} refText={w.source.cefrRef} compact /></span>
                    </div>
                  ))}
                </div>
              )}
              {report.errors.length > 0 && (
                <ul className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-bad/30 bg-bad/5 p-3 text-xs text-ink-2">
                  {report.errors.slice(0, 50).map((e, i) => <li key={i}><b className="font-mono">Dòng {e.row}</b>{e.word && ` (${e.word})`}: {e.message}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { icon: FileSpreadsheet, title: 'Toàn bộ kho (CSV)', desc: `${words.length} mục · mở được bằng Excel`, run: () => downloadFile(`english-hub-vocabulary-${stamp}.csv`, wordsToCsv(words), 'text/csv') },
            { icon: FileJson, title: 'Toàn bộ kho (JSON)', desc: 'Đủ mọi trường dữ liệu', run: () => downloadFile(`english-hub-vocabulary-${stamp}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), words }, null, 2), 'application/json') },
            { icon: FileSpreadsheet, title: 'Chỉ từ đã nhập (CSV)', desc: `${custom.length} mục do bạn thêm`, run: () => custom.length ? downloadFile(`english-hub-imported-${stamp}.csv`, wordsToCsv(custom), 'text/csv') : toast.info('Bạn chưa nhập thêm mục từ nào.') },
          ].map((x) => (
            <button key={x.title} onClick={x.run} className="sheet sheet-lift flex items-start gap-3 p-4 text-left">
              <x.icon className="mt-0.5 shrink-0 text-forest dark:text-gold" />
              <span><span className="block font-medium text-ink">{x.title}</span><span className="text-xs text-muted">{x.desc}</span></span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
