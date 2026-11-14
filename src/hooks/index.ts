import { useCallback, useEffect, useRef, useState } from 'react'
import type { StudyModule } from '../domain/types'
import { speak, speechSupported, type Accent } from '../services/speech'
import { useHub } from '../store/useHub'
import { toast } from '../components/ui/Toast'

/** Phát âm theo cài đặt; dùng audio Dictionary API (nếu đã bổ sung) cho từ đơn. */
export function useSpeak() {
  const rate = useHub((s) => s.settings.speechRate)
  const defaultAccent = useHub((s) => s.settings.accent)
  const enrichments = useHub((s) => s.enrichments)
  const [speaking, setSpeaking] = useState<string | null>(null)
  const say = useCallback(async (text: string, accent: Accent = defaultAccent, wordId?: string) => {
    if (!speechSupported && !(wordId && enrichments[wordId]?.audio?.[accent])) {
      toast.error('Trình duyệt này không hỗ trợ phát âm (Web Speech API). Hãy thử Chrome hoặc Edge.')
      return
    }
    setSpeaking(text + accent)
    const res = await speak(text, accent, rate, wordId ? enrichments[wordId]?.audio?.[accent] : undefined)
    setSpeaking(null)
    if (!res.ok && res.reason) toast.error(res.reason)
    else if (res.reason) toast.info(res.reason)
  }, [rate, defaultAccent, enrichments])
  return { say, speaking, supported: speechSupported }
}

/** Đo thời gian học thực: chỉ tính khi tab đang hiển thị và người dùng có tương tác trong 90 giây gần nhất. */
export function useStudyTimer(module: StudyModule) {
  const log = useHub((s) => s.logStudyTime)
  const last = useRef(Date.now())
  const acc = useRef(0)
  const lastInput = useRef(Date.now())
  useEffect(() => {
    const onInput = () => { lastInput.current = Date.now() }
    const tick = () => {
      const now = Date.now()
      const dt = now - last.current
      last.current = now
      if (!document.hidden && now - lastInput.current < 90_000) acc.current += Math.min(dt, 15_000)
      if (acc.current >= 15_000) { log(module, acc.current); acc.current = 0 }
    }
    const id = window.setInterval(tick, 5000)
    window.addEventListener('pointerdown', onInput)
    window.addEventListener('keydown', onInput)
    window.addEventListener('scroll', onInput, { passive: true })
    return () => {
      tick()
      if (acc.current > 0) log(module, acc.current)
      acc.current = 0
      window.clearInterval(id)
      window.removeEventListener('pointerdown', onInput)
      window.removeEventListener('keydown', onInput)
      window.removeEventListener('scroll', onInput)
    }
  }, [module, log])
}

export function useTheme() {
  const theme = useHub((s) => s.settings.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e1612' : '#192820')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), intervalMs); return () => clearInterval(id) }, [intervalMs])
  return now
}

export function useCountdown(seconds: number | null, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(seconds ?? 0)
  const end = useRef(onEnd)
  end.current = onEnd
  useEffect(() => { setLeft(seconds ?? 0) }, [seconds])
  useEffect(() => {
    if (!seconds || !running) return
    const id = setInterval(() => setLeft((l) => { if (l <= 1) { clearInterval(id); end.current(); return 0 } return l - 1 }), 1000)
    return () => clearInterval(id)
  }, [seconds, running])
  return left
}
