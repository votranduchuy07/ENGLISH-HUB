/** BỘ THẺ FLASHCARD — chọn từ nào sẽ ôn, sắp xếp ưu tiên, và quản lý hàng đợi trong một phiên. Hàm thuần, không phụ thuộc React. */
import type { HubData } from '../store/useHub'
import { dueWords, pickDailyWords } from './analytics'
import { retentionScore } from './srs'
import type { Cefr, Word } from './types'
import { dayKey } from './util'

export type DeckSource = 'due' | 'new' | 'learned' | 'favorites' | 'review_list' | 'mistakes'

export const DECK_SOURCES: { key: DeckSource; label: string; desc: string }[] = [
  { key: 'due', label: 'Đến hạn ôn tập', desc: 'Thẻ đã tới lúc ôn theo lịch lặp lại ngắt quãng — hiệu quả nhất để giữ trí nhớ.' },
  { key: 'new', label: 'Từ mới chưa học', desc: 'Làm quen từ mới, gợi ý theo cấp độ và chủ đề bạn quan tâm.' },
  { key: 'learned', label: 'Ôn lại từ đã học', desc: 'Từ đã học nhưng chưa vững, ưu tiên những từ bạn nhớ kém nhất.' },
  { key: 'favorites', label: 'Từ yêu thích', desc: 'Những từ bạn đã gắn trái tim.' },
  { key: 'review_list', label: 'Danh sách cần ôn', desc: 'Những từ bạn tự thêm vào danh sách ôn tập.' },
  { key: 'mistakes', label: 'Từ hay sai', desc: 'Từ nằm trong Sổ lỗi sai và chưa được giải quyết.' },
]

export interface DeckFilter { levels: Cefr[]; topic: string }

const passes = (w: Word, f: DeckFilter) => (!f.levels.length || f.levels.includes(w.cefr)) && (!f.topic || w.topics.includes(f.topic))

/** Toàn bộ từ thuộc nguồn này (chưa lọc, chưa cắt số lượng), đã sắp theo thứ tự ưu tiên. */
export function poolFor(source: DeckSource, data: HubData, words: Word[]): Word[] {
  const st = (w: Word) => data.progress[w.id]
  switch (source) {
    case 'due':
      return dueWords(data, words).sort((a, b) => (st(a).srs.due ?? '9999') < (st(b).srs.due ?? '9999') ? -1 : 1)
    case 'new':
      return words.filter((w) => (st(w)?.srs.reps ?? 0) === 0)
    case 'learned':
      return words.filter((w) => (st(w)?.srs.reps ?? 0) > 0).sort((a, b) => retentionScore(st(a)) - retentionScore(st(b)))
    case 'favorites':
      return words.filter((w) => st(w)?.favorite)
    case 'review_list':
      return words.filter((w) => st(w)?.inReviewList)
    case 'mistakes': {
      const byId = new Map(words.map((w) => [w.id, w]))
      const score = new Map<string, number>()
      Object.values(data.mistakes).filter((m) => !m.resolved).forEach((m) => score.set(m.wordId, (score.get(m.wordId) ?? 0) + m.count))
      return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => byId.get(id)).filter((w): w is Word => !!w)
    }
  }
}

export function deckCounts(data: HubData, words: Word[], filter: DeckFilter): Record<DeckSource, number> {
  const out = {} as Record<DeckSource, number>
  DECK_SOURCES.forEach((s) => (out[s.key] = poolFor(s.key, data, words).filter((w) => passes(w, filter)).length))
  return out
}

/** Dựng bộ thẻ. size = 0 nghĩa là lấy hết. Từ mới được chọn có trọng số theo cấp độ/chủ đề (không bịa từ ngoài kho). */
export function buildDeck(source: DeckSource, data: HubData, words: Word[], filter: DeckFilter, size: number): Word[] {
  let pool = poolFor(source, data, words).filter((w) => passes(w, filter))
  if (source === 'new' && size > 0) pool = pickDailyWords(pool, data, size, `${dayKey()}:flash:${Math.floor(Date.now() / 3_600_000)}`)
  return size > 0 ? pool.slice(0, size) : pool
}

/**
 * Sau khi chấm một thẻ: bỏ thẻ đầu hàng đợi; nếu "Again" thì chèn lại sau `offset` thẻ để gặp lại trong phiên
 * (giống Anki — chưa nhớ thì phải gặp lại cho tới khi nhớ).
 */
export function advanceQueue(queue: string[], rating: 'again' | 'hard' | 'good' | 'easy', offset = 4): string[] {
  if (!queue.length) return queue
  const [head, ...rest] = queue
  if (rating === 'again') rest.splice(Math.min(offset, rest.length), 0, head)
  return rest
}
