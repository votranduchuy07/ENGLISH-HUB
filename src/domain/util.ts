/** Tiện ích thuần: ngày tháng theo giờ địa phương, random có seed, chuẩn hóa chuỗi. */

export const DAY_MS = 86_400_000

export function dayKey(d: Date | string = new Date()): string {
  const x = typeof d === 'string' ? new Date(d) : d
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${x.getFullYear()}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function lastNDays(n: number, end: Date = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(addDays(end, -i)))
  return out
}

/** Thứ Hai đầu tuần của một ngày. */
export function weekKey(d: Date | string): string {
  const x = startOfDay(typeof d === 'string' ? new Date(d) : d)
  const wd = (x.getDay() + 6) % 7
  return dayKey(addDays(x, -wd))
}

export const VI_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function formatVietnameseDate(d: Date = new Date()): string {
  const wd = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()]
  return `${wd}, ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} giây`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} phút ${s % 60 ? `${s % 60} giây` : ''}`.trim()
  return `${Math.floor(m / 60)} giờ ${m % 60} phút`
}

export function relativeDay(iso: string | null): string {
  if (!iso) return '—'
  const diff = Math.round((startOfDay(new Date(iso)).getTime() - startOfDay().getTime()) / DAY_MS)
  if (diff === 0) return 'hôm nay'
  if (diff === 1) return 'ngày mai'
  if (diff === -1) return 'hôm qua'
  return diff > 0 ? `${diff} ngày nữa` : `${-diff} ngày trước`
}

/** mulberry32 */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample<T>(arr: T[], n: number, rand: () => number = Math.random): T[] {
  return shuffle(arr, rand).slice(0, n)
}

/** Chọn có trọng số, không lặp. */
export function weightedSample<T>(items: T[], weight: (t: T) => number, n: number, rand: () => number = Math.random): T[] {
  const pool = items.map((it) => ({ it, w: Math.max(0.0001, weight(it)) }))
  const out: T[] = []
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0)
    let r = rand() * total
    let idx = 0
    for (; idx < pool.length; idx++) { r -= pool[idx].w; if (r <= 0) break }
    out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0].it)
  }
  return out
}

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ')
}

export function uid(prefix = 'id'): string {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}_${r}`
}

export function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v))
}

export function pct(a: number, b: number): number {
  return b ? Math.round((a / b) * 100) : 0
}

/** Tìm vị trí từ (hoặc dạng biến thể đơn giản) trong câu để đục lỗ. */
export function findWordInSentence(sentence: string, word: string): { start: number; end: number; match: string } | null {
  const stem = word.toLowerCase().replace(/e$/, '')
  const re = new RegExp(`\\b(${escapeRe(word)}|${escapeRe(stem)}[a-z]{0,4})\\b`, 'i')
  const m = re.exec(sentence)
  if (!m) return null
  return { start: m.index, end: m.index + m[0].length, match: m[0] }
}

export function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
