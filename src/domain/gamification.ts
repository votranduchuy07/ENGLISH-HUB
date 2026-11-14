/** THÀNH TÍCH: điểm kinh nghiệm (XP), cấp độ, huy hiệu và thử thách tuần — tất cả TÍNH TỪ nhật ký học thật, không lưu thêm dữ liệu giả. */
import type { HubData } from '../store/useHub'
import { activeDays, learnedWords, masteredWords, streak } from './analytics'
import type { Word } from './types'
import { dayKey, lastNDays } from './util'

export const XP_RULES = {
  review: 3, newWord: 10, spellingRight: 4, spellingWrong: 1, quizRight: 3, quizDone: 10, activeDay: 20, personalWord: 5,
} as const

export function totalXp(d: HubData): number {
  const newWords = Object.values(d.progress).filter((p) => p.firstLearnedAt).length
  const spR = d.spellingAttempts.filter((a) => a.correct).length
  const spW = d.spellingAttempts.length - spR
  const qR = d.quizResults.reduce((n, r) => n + r.correct, 0)
  return Math.round(
    d.reviewLogs.length * XP_RULES.review + newWords * XP_RULES.newWord + spR * XP_RULES.spellingRight + spW * XP_RULES.spellingWrong +
    qR * XP_RULES.quizRight + d.quizResults.length * XP_RULES.quizDone + activeDays(d).size * XP_RULES.activeDay + d.personal.length * XP_RULES.personalWord,
  )
}

/** Cấp L cần 50·L·(L−1) XP: cấp 2 = 100, cấp 3 = 300, cấp 4 = 600… */
export const xpForLevel = (level: number) => 50 * level * (level - 1)

export const LEVEL_TITLES = ['Người mới', 'Học viên', 'Chăm chỉ', 'Thông thạo', 'Chuyên gia', 'Bậc thầy', 'Huyền thoại']
export function levelInfo(xp: number) {
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 50)) / 2))
  const base = xpForLevel(level), next = xpForLevel(level + 1)
  return { level, title: LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 2))], base, next, into: xp - base, span: next - base, pct: Math.round(((xp - base) / (next - base)) * 100) }
}

export interface Badge { id: string; name: string; desc: string; icon: string; value: number; target: number; earned: boolean }

export function badges(d: HubData, words: Word[]): Badge[] {
  const learned = learnedWords(d, words).length
  const mastered = masteredWords(d, words).length
  const best = streak(d).best
  const spOk = d.spellingAttempts.filter((a) => a.correct).length
  const spAcc = d.spellingAttempts.length >= 30 ? Math.round((spOk / d.spellingAttempts.length) * 100) : 0
  const quizzes = d.quizResults.filter((r) => r.module !== 'listening').length
  const listening = d.quizResults.filter((r) => r.module === 'listening').length
  const perfect = d.quizResults.filter((r) => r.total >= 5 && r.correct === r.total).length
  const resolved = Object.values(d.mistakes).filter((m) => m.resolved).length
  const defs: Omit<Badge, 'earned'>[] = [
    { id: 'first-word', name: 'Bước đầu tiên', desc: 'Học từ đầu tiên', icon: 'sparkles', value: learned, target: 1 },
    { id: 'words-25', name: 'Vốn từ 25', desc: 'Học 25 từ', icon: 'book', value: learned, target: 25 },
    { id: 'words-100', name: 'Vốn từ 100', desc: 'Học 100 từ', icon: 'book', value: learned, target: 100 },
    { id: 'mastered-10', name: 'Nhớ lâu', desc: '10 từ đạt mức thành thạo', icon: 'trophy', value: mastered, target: 10 },
    { id: 'streak-3', name: 'Ba ngày liền', desc: 'Học 3 ngày liên tiếp', icon: 'flame', value: best, target: 3 },
    { id: 'streak-7', name: 'Một tuần kiên trì', desc: 'Học 7 ngày liên tiếp', icon: 'flame', value: best, target: 7 },
    { id: 'streak-30', name: 'Thói quen thép', desc: 'Học 30 ngày liên tiếp', icon: 'flame', value: best, target: 30 },
    { id: 'reviews-100', name: 'Thợ ôn thẻ', desc: 'Ôn 100 lượt flashcard', icon: 'layers', value: d.reviewLogs.length, target: 100 },
    { id: 'spell-50', name: 'Cây bút chắc tay', desc: 'Viết đúng 50 từ chính tả', icon: 'spell', value: spOk, target: 50 },
    { id: 'spell-90', name: 'Chính tả chuẩn', desc: 'Độ chính xác ≥ 90% (tối thiểu 30 lượt)', icon: 'spell', value: spAcc, target: 90 },
    { id: 'quiz-5', name: 'Người làm bài', desc: 'Hoàn thành 5 bài kiểm tra', icon: 'target', value: quizzes, target: 5 },
    { id: 'perfect', name: 'Điểm tuyệt đối', desc: 'Một bài ≥ 5 câu đúng toàn bộ', icon: 'trophy', value: perfect, target: 1 },
    { id: 'listen-5', name: 'Đôi tai tinh', desc: 'Hoàn thành 5 bài luyện nghe', icon: 'headphones', value: listening, target: 5 },
    { id: 'fixed-5', name: 'Sửa sai', desc: 'Khắc phục 5 lỗi trong sổ lỗi sai', icon: 'notebook', value: resolved, target: 5 },
    { id: 'dict-10', name: 'Từ điển riêng', desc: 'Thêm 10 từ vào từ điển cá nhân', icon: 'dict', value: d.personal.length, target: 10 },
  ]
  return defs.map((b) => ({ ...b, earned: b.value >= b.target }))
}

export interface Challenge { id: string; name: string; desc: string; value: number; target: number; done: boolean }

/** Thử thách trong 7 ngày gần nhất (trượt theo ngày, không cần ngày bắt đầu tuần cố định). */
export function weeklyChallenges(d: HubData): Challenge[] {
  const days = new Set(lastNDays(7))
  const inWeek = (iso: string) => days.has(dayKey(iso))
  const active = [...activeDays(d)].filter((k) => days.has(k)).length
  const reviews = d.reviewLogs.filter((r) => inWeek(r.at)).length
  const learned = Object.values(d.progress).filter((p) => p.firstLearnedAt && inWeek(p.firstLearnedAt)).length
  const listening = d.quizResults.filter((r) => r.module === 'listening' && inWeek(r.at)).length
  const spell = d.spellingAttempts.filter((a) => inWeek(a.at) && a.correct).length
  const list = [
    { id: 'w-days', name: 'Học 5 ngày', desc: 'Có hoạt động học ít nhất 5 trong 7 ngày gần nhất', value: active, target: 5 },
    { id: 'w-reviews', name: 'Ôn 50 thẻ', desc: 'Ôn tổng cộng 50 lượt flashcard', value: reviews, target: 50 },
    { id: 'w-new', name: 'Học 20 từ mới', desc: 'Làm quen 20 từ mới', value: learned, target: 20 },
    { id: 'w-listen', name: 'Nghe 3 bài', desc: 'Hoàn thành 3 bài luyện nghe', value: listening, target: 3 },
    { id: 'w-spell', name: 'Viết đúng 30 từ', desc: 'Viết đúng 30 từ trong chính tả', value: spell, target: 30 },
  ]
  return list.map((c) => ({ ...c, done: c.value >= c.target }))
}

