/**
 * PHÁT ÂM — Web Speech API (en-GB / en-US), ưu tiên file audio từ Dictionary API nếu có.
 * Xử lý trường hợp trình duyệt không hỗ trợ hoặc không có giọng tiếng Anh.
 */
export type Accent = 'uk' | 'us'

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

let voices: SpeechSynthesisVoice[] = []
function loadVoices() {
  if (!speechSupported) return
  voices = window.speechSynthesis.getVoices()
}
if (speechSupported) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

export function voiceFor(accent: Accent): SpeechSynthesisVoice | null {
  if (!voices.length) loadVoices()
  const lang = accent === 'uk' ? 'en-GB' : 'en-US'
  return (
    voices.find((v) => v.lang === lang && /natural|neural|online/i.test(v.name)) ??
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.replace('_', '-').startsWith(lang)) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  )
}

export function hasEnglishVoice(): boolean {
  if (!voices.length) loadVoices()
  return voices.some((v) => v.lang.startsWith('en'))
}

export interface SpeakResult { ok: boolean; reason?: string }

let currentAudio: HTMLAudioElement | null = null

export function speak(text: string, accent: Accent = 'uk', rate = 0.9, audioUrl?: string): Promise<SpeakResult> {
  stopSpeaking()
  if (audioUrl) {
    return new Promise((resolve) => {
      const a = new Audio(audioUrl)
      currentAudio = a
      a.onended = () => resolve({ ok: true })
      a.onerror = () => resolve(speakTts(text, accent, rate))
      a.play().catch(() => resolve(speakTts(text, accent, rate)))
    })
  }
  return speakTts(text, accent, rate)
}

function speakTts(text: string, accent: Accent, rate: number): Promise<SpeakResult> {
  if (!speechSupported) return Promise.resolve({ ok: false, reason: 'Trình duyệt không hỗ trợ đọc văn bản (Web Speech API).' })
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    const v = voiceFor(accent)
    if (v) u.voice = v
    u.lang = accent === 'uk' ? 'en-GB' : 'en-US'
    u.rate = rate
    u.onend = () => resolve({ ok: true })
    u.onerror = (e) => resolve({ ok: e.error === 'interrupted' || e.error === 'canceled', reason: `Không phát được âm thanh (${e.error}).` })
    window.speechSynthesis.speak(u)
    if (!v && !hasEnglishVoice()) resolve({ ok: true, reason: 'Máy chưa cài giọng tiếng Anh — đang dùng giọng mặc định.' })
  })
}

export function stopSpeaking() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null }
  if (speechSupported) window.speechSynthesis.cancel()
}
