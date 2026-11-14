import { useEffect } from 'react'
import { toast } from '../components/ui/Toast'
import { dueWords, streak } from '../domain/analytics'
import { dayKey } from '../domain/util'
import { showReminder } from '../services/pwa'
import { getData, useAllWords, useHub } from '../store/useHub'

const KEY = 'englishhub.reminded'

/** Nhắc học một lần mỗi ngày vào giờ đã chọn (khi trang/app đang mở). Chỉ nhắc nếu hôm nay chưa học. */
export function useReminder() {
  const reminder = useHub((s) => s.settings.reminder)
  const words = useAllWords()
  useEffect(() => {
    if (!reminder?.enabled) return
    const check = () => {
      const now = new Date()
      const [h, m] = reminder.time.split(':').map(Number)
      if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return
      let last: string | null = null
      try { last = localStorage.getItem(KEY) } catch { /* bỏ qua */ }
      if (last === dayKey()) return
      try { localStorage.setItem(KEY, dayKey()) } catch { /* bỏ qua */ }
      const d = getData()
      const st = streak(d)
      if (st.activeToday) return
      const due = dueWords(d, words).length
      const body = due > 0 ? `Bạn có ${due} thẻ đến hạn ôn tập${st.current ? ` — giữ chuỗi ${st.current} ngày nhé!` : '.'}` : 'Dành vài phút học từ mới hôm nay nhé!'
      showReminder('English Hub — đến giờ học rồi', body).then((ok) => { if (!ok) toast.info(body) })
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [reminder?.enabled, reminder?.time, words])
}
