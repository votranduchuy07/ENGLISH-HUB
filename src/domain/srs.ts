/**
 * SPACED REPETITION — biến thể SM-2 với 4 mức đánh giá (Again / Hard / Good / Easy).
 * - ease (hệ số dễ) bắt đầu 2.5, tối thiểu 1.3.
 * - interval tính bằng ngày; thẻ "Again" quay lại ngay trong phiên và lặp lại vào ngày mai.
 * - Trạng thái: new → learning (<7 ngày) → review (7–20) → mastered (≥21).
 */
import type { Rating, SrsState, SrsStatus, UserWordState } from './types'
import { DAY_MS } from './util'

export const NEW_SRS: SrsState = { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: null, last: null }

export function statusFromInterval(interval: number, reps: number): SrsStatus {
  if (reps === 0) return 'new'
  if (interval >= 21) return 'mastered'
  if (interval >= 7) return 'review'
  return 'learning'
}

export function schedule(prev: SrsState, rating: Rating, now: Date = new Date()): SrsState {
  let { ease, interval, reps, lapses } = prev
  const isNew = reps === 0
  switch (rating) {
    case 'again':
      lapses += isNew ? 0 : 1
      ease = Math.max(1.3, ease - 0.2)
      interval = 0
      reps = Math.max(1, reps)
      break
    case 'hard':
      ease = Math.max(1.3, ease - 0.15)
      interval = isNew ? 1 : Math.max(1, interval * 1.2)
      reps += 1
      break
    case 'good':
      interval = isNew ? 1 : reps === 1 ? 3 : Math.max(interval + 1, interval * ease)
      reps += 1
      break
    case 'easy':
      ease = ease + 0.15
      interval = isNew ? 4 : Math.max(interval + 2, interval * ease * 1.3)
      reps += 1
      break
  }
  interval = Math.round(interval * 10) / 10
  // "Again": ôn lại sau 10 phút (trong phiên) — lưu due ngắn
  const dueMs = rating === 'again' ? 10 * 60 * 1000 : interval * DAY_MS
  return { ease: Math.round(ease * 100) / 100, interval, reps, lapses, due: new Date(now.getTime() + dueMs).toISOString(), last: now.toISOString() }
}

/** Dự báo khoảng ôn kế tiếp cho từng nút (hiển thị dưới nút đánh giá). */
export function previewIntervals(prev: SrsState): Record<Rating, string> {
  const fmt = (s: SrsState, r: Rating) => (r === 'again' ? '10 phút' : s.interval < 1 ? '< 1 ngày' : s.interval < 30 ? `${Math.round(s.interval)} ngày` : `${Math.round(s.interval / 30)} tháng`)
  const out = {} as Record<Rating, string>
  ;(['again', 'hard', 'good', 'easy'] as Rating[]).forEach((r) => (out[r] = fmt(schedule(prev, r), r)))
  return out
}

export function isDue(s: UserWordState, now: Date = new Date()): boolean {
  return s.srs.reps > 0 && !!s.srs.due && new Date(s.srs.due).getTime() <= now.getTime()
}

/** Mức ghi nhớ 0–100 ước tính theo interval & tỉ lệ đúng. */
export function retentionScore(s: UserWordState): number {
  if (s.srs.reps === 0) return 0
  const byInterval = Math.min(1, Math.log2(1 + s.srs.interval) / Math.log2(22))
  const total = s.correct + s.wrong
  const acc = total ? s.correct / total : 0.6
  return Math.round((byInterval * 0.65 + acc * 0.35) * 100)
}
