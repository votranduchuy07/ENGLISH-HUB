import { BellRing, Database, Download, Monitor, Moon, Smartphone, Sun, Trash2, Upload, Volume2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { Chip, Segmented } from '../../components/ui/Segmented'
import { toast } from '../../components/ui/Toast'
import { TOPICS } from '../../data/content'
import { CEFR_INFO } from '../../data/content'
import { CEFR_LEVELS, type Cefr, type Settings } from '../../domain/types'
import { downloadFile } from '../../services/importExport'
import { notificationsSupported, requestNotifications, showReminder, usePwaInstall } from '../../services/pwa'
import { speak } from '../../services/speech'
import { activeAdapter } from '../../services/storage'
import { getData, useHub, type HubData } from '../../store/useHub'

const KEYS: (keyof HubData)[] = ['settings', 'customWords', 'enrichments', 'progress', 'reviewLogs', 'spellingAttempts', 'spellingSessions', 'quizResults', 'mistakes', 'sessions', 'personal', 'dailyPlan', 'wordOfDayQuiz']
const ARRAYS = ['customWords', 'reviewLogs', 'spellingAttempts', 'spellingSessions', 'quizResults', 'personal']
const OBJECTS = ['enrichments', 'progress', 'mistakes', 'sessions', 'settings', 'wordOfDayQuiz']

function validateBackup(raw: unknown): { ok: true; data: Partial<HubData> } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'Tệp không phải bản sao lưu English Hub (không phải đối tượng JSON).' }
  const o = raw as Record<string, unknown>
  const body = (o.data && typeof o.data === 'object' ? o.data : o) as Record<string, unknown>
  if (!KEYS.some((k) => k in body)) return { ok: false, reason: 'Không tìm thấy dữ liệu English Hub trong tệp này.' }
  for (const k of ARRAYS) if (k in body && !Array.isArray(body[k])) return { ok: false, reason: `Trường “${k}” phải là danh sách.` }
  for (const k of OBJECTS) if (k in body && (typeof body[k] !== 'object' || body[k] === null || Array.isArray(body[k]))) return { ok: false, reason: `Trường “${k}” có định dạng không đúng.` }
  const picked: Record<string, unknown> = {}
  KEYS.forEach((k) => { if (k in body) picked[k] = body[k] })
  return { ok: true, data: picked as Partial<HubData> }
}

const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`)

export default function SettingsPage() {
  const s = useHub((x) => x.settings)
  const update = useHub((x) => x.updateSettings)
  const replaceAll = useHub((x) => x.replaceAll)
  const resetAll = useHub((x) => x.resetAll)
  const fileRef = useRef<HTMLInputElement>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const pwa = usePwaInstall()
  const rem = s.reminder ?? { enabled: false, time: '20:00' }
  const toggleReminder = async (on: boolean) => {
    if (on && notificationsSupported && Notification.permission === 'default') {
      const p = await requestNotifications()
      if (p !== 'granted') toast.info('Chưa được cấp quyền thông báo — nhắc học sẽ hiện ngay trong trang thay vì thông báo hệ thống.')
    }
    update({ reminder: { ...rem, enabled: on } })
  }
  const [usage, setUsage] = useState(() => activeAdapter.usageBytes())

  const numField = (k: keyof Settings['goals'], label: string, unit: string, min: number, max: number) => (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-2">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" className="field !w-24" min={min} max={max} value={s.goals[k]}
          onChange={(e) => { const v = Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))); update({ goals: { ...s.goals, [k]: v } }) }} />
        <span className="text-sm text-muted">{unit}</span>
      </div>
    </label>
  )

  const backup = () => {
    downloadFile(`english-hub-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'english-hub', version: 1, exportedAt: new Date().toISOString(), data: getData() }, null, 2), 'application/json')
    toast.ok('Đã tải bản sao lưu về máy.')
  }
  const restore = async (file: File | undefined) => {
    if (!file) return
    try {
      const v = validateBackup(JSON.parse(await file.text()))
      if (!v.ok) return toast.error(v.reason)
      if (!confirm('Khôi phục sẽ THAY THẾ toàn bộ dữ liệu hiện tại bằng nội dung trong tệp. Tiếp tục?')) return
      replaceAll(v.data as HubData)
      setUsage(activeAdapter.usageBytes())
      toast.ok('Đã khôi phục dữ liệu từ bản sao lưu.')
    } catch { toast.error('Không đọc được tệp. Hãy chọn đúng tệp .json do English Hub xuất ra.') }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }
  const doReset = () => { resetAll(); setResetOpen(false); setConfirmText(''); setUsage(activeAdapter.usageBytes()); toast.ok('Đã xóa toàn bộ dữ liệu học.') }

  const count = (k: keyof HubData) => { const v = getData()[k]; return Array.isArray(v) ? v.length : Object.keys(v ?? {}).length }

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="11" kicker="Settings" title="Cài" italic="đặt" lead="Tùy chỉnh giao diện, giọng đọc và mục tiêu học. Mọi thay đổi được lưu ngay trên máy của bạn." />

      <div className="space-y-8">
        <section className="sheet p-6">
          <SectionTitle numeral="i">Hồ sơ & giao diện</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm text-ink-2">Tên của bạn</span><input className="field" value={s.name} onChange={(e) => update({ name: e.target.value })} maxLength={40} placeholder="Học giả" /></label>
            <div>
              <span className="mb-1 block text-sm text-ink-2">Chế độ màu</span>
              <Segmented value={s.theme} onChange={(v) => update({ theme: v })} options={[
                { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun size={14} />Sáng</span> },
                { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon size={14} />Tối</span> },
                { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor size={14} />Theo máy</span> },
              ]} />
            </div>
          </div>
        </section>

        <section className="sheet p-6">
          <SectionTitle numeral="ii">Phát âm</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <div><span className="mb-1 block text-sm text-ink-2">Giọng mặc định</span><Segmented value={s.accent} onChange={(v) => update({ accent: v })} options={[{ value: 'uk', label: 'Anh-Anh (UK)' }, { value: 'us', label: 'Anh-Mỹ (US)' }]} /></div>
            <label className="block">
              <span className="mb-1 block text-sm text-ink-2">Tốc độ đọc: <b className="font-mono">{s.speechRate.toFixed(2)}×</b></span>
              <input type="range" min={0.5} max={1.3} step={0.05} value={s.speechRate} onChange={(e) => update({ speechRate: Number(e.target.value) })} className="w-full accent-[var(--burgundy)]" aria-label="Tốc độ đọc" />
            </label>
          </div>
          <Button variant="outline" size="sm" className="mt-4" icon={<Volume2 size={14} />} onClick={() => speak('The quarterly meeting has been rescheduled to Thursday.', s.accent, s.speechRate)}>Nghe thử</Button>
        </section>

        <section className="sheet p-6">
          <SectionTitle numeral="iii">Học tập</SectionTitle>
          <div>
            <span className="mb-2 block text-sm text-ink-2">Trình độ hiện tại — dùng để gợi ý từ mới</span>
            <Segmented value={s.level} onChange={(v: Cefr) => update({ level: v })} options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))} />
            <p className="mt-2 text-xs text-muted">{CEFR_INFO[s.level]?.vi}</p>
          </div>
          <div className="mt-6">
            <span className="mb-2 block text-sm text-ink-2">Chủ đề quan tâm <span className="text-muted">(được ưu tiên khi gợi ý từ)</span></span>
            <div className="flex flex-wrap gap-1.5">{Object.entries(TOPICS).map(([k, v]) => <Chip key={k} on={s.interests.includes(k)} onClick={() => update({ interests: s.interests.includes(k) ? s.interests.filter((x) => x !== k) : [...s.interests, k] })}>{v.vi}</Chip>)}</div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {numField('newWords', 'Từ mới mỗi ngày', 'từ', 1, 50)}
            {numField('flashcards', 'Thẻ ôn mỗi ngày', 'thẻ', 5, 200)}
            {numField('quizzes', 'Bài kiểm tra mỗi ngày', 'bài', 0, 10)}
            {numField('minutes', 'Thời gian học mỗi ngày', 'phút', 5, 240)}
          </div>
        </section>

        <section className="sheet p-6">
          <SectionTitle numeral="iv">Nhắc học & cài app</SectionTitle>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm text-ink"><BellRing size={16} className="text-gold-ink" /> Nhắc học mỗi ngày</span>
                <Segmented size="sm" value={rem.enabled ? 1 : 0} onChange={(v) => toggleReminder(v === 1)} options={[{ value: 0, label: 'Tắt' }, { value: 1, label: 'Bật' }]} />
              </div>
              <label className="mt-3 block"><span className="mb-1 block text-sm text-ink-2">Giờ nhắc</span>
                <input type="time" className="field !w-36" value={rem.time} disabled={!rem.enabled} onChange={(e) => update({ reminder: { ...rem, time: e.target.value || '20:00' } })} /></label>
              <p className="mt-2 text-xs text-muted">Chỉ nhắc nếu hôm nay bạn chưa học. Trình duyệt chỉ gửi thông báo khi trang (hoặc app đã cài) đang mở, không thể nhắc khi đã đóng hẳn.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={async () => { if (!(await showReminder('English Hub', 'Đây là thông báo thử.'))) toast.info('Chưa có quyền thông báo. Hãy bật nhắc học và cho phép thông báo.') }}>Gửi thử thông báo</Button>
            </div>
            <div>
              <span className="inline-flex items-center gap-2 text-sm text-ink"><Smartphone size={16} className="text-gold-ink" /> Cài lên màn hình chính</span>
              <p className="mt-2 text-sm text-muted">{pwa.installed ? 'Bạn đang dùng bản đã cài.' : pwa.canInstall ? 'Cài English Hub như một ứng dụng riêng, mở toàn màn hình.' : 'Trên Chrome/Edge: menu ⋮ → “Cài đặt ứng dụng”. Trên iPhone (Safari): nút Chia sẻ → “Thêm vào Màn hình chính”. Cần chạy bản đã đưa lên mạng (https).'}</p>
              {pwa.canInstall && !pwa.installed && <Button className="mt-3" size="sm" onClick={() => pwa.install()}>Cài ứng dụng</Button>}
            </div>
          </div>
        </section>

        <section className="sheet p-6">
          <SectionTitle numeral="v">Dữ liệu & sao lưu</SectionTitle>
          <div className="flex items-start gap-3 rounded-md border border-rule bg-surface-2/50 p-4 text-sm">
            <Database size={18} className="mt-0.5 shrink-0 text-gold-ink" />
            <div className="text-ink-2">
              <p>Dữ liệu lưu trong trình duyệt này ({activeAdapter.kind === 'local' ? 'LocalStorage' : 'Supabase'}), đang dùng <b className="font-mono">{fmtBytes(usage)}</b>. Xóa dữ liệu duyệt web hoặc đổi máy sẽ mất — hãy sao lưu định kỳ.</p>
              <p className="mt-1 font-mono text-xs text-muted">{count('progress')} từ có tiến độ · {count('reviewLogs')} lượt ôn · {count('spellingAttempts')} lượt chính tả · {count('quizResults')} bài kiểm tra · {count('mistakes')} lỗi · {count('personal')} từ cá nhân</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" icon={<Download size={15} />} onClick={backup}>Sao lưu (tải .json)</Button>
            <Button variant="outline" icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>Khôi phục từ tệp</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} aria-label="Chọn tệp sao lưu" />
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setResetOpen(true)}>Xóa toàn bộ dữ liệu</Button>
          </div>
        </section>

        <section className="sheet p-6 text-sm text-muted">
          <SectionTitle numeral="vi">Giới thiệu</SectionTitle>
          <p>English Hub — thư viện học tiếng Anh cá nhân, chạy hoàn toàn trên máy bạn. Phiên âm, âm thanh và định nghĩa bổ sung lấy từ Dictionary API (Wiktionary, giấy phép CC BY-SA 3.0). Giọng đọc là giọng tổng hợp của trình duyệt. Cấp độ CEFR của kho từ gốc là ước lượng tham khảo, không phải đánh giá chính thức.</p>
        </section>
      </div>

      <Modal open={resetOpen} onClose={() => { setResetOpen(false); setConfirmText('') }} kicker="Nguy hiểm" title="Xóa toàn bộ dữ liệu?" width={500}
        footer={<><Button variant="ghost" onClick={() => { setResetOpen(false); setConfirmText('') }}>Hủy</Button><Button variant="danger" disabled={confirmText.trim().toUpperCase() !== 'XÓA'} onClick={doReset}>Xóa vĩnh viễn</Button></>}>
        <p className="text-sm text-ink-2">Thao tác này xóa tiến độ, lịch sử học, sổ lỗi sai, từ cá nhân, từ đã nhập và cài đặt — <b>không thể hoàn tác</b>. Hãy sao lưu trước nếu cần.</p>
        <label className="mt-4 block"><span className="mb-1 block text-sm text-ink-2">Gõ <b>XÓA</b> để xác nhận</span><input className="field" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus /></label>
      </Modal>
    </div>
  )
}
