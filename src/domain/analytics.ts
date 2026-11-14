/** THỐNG KÊ & CÁ NHÂN HÓA — mọi số liệu đều tính từ log thật trong store. */
import type { HubData } from '../store/useHub'
import { TOPICS } from '../data/content'
import { isDue, retentionScore } from './srs'
import { CEFR_LEVELS, type Cefr, type Word } from './types'
import { addDays, dayKey, hashString, lastNDays, pct, rng, startOfDay, weekKey, weightedSample } from './util'

export function activeDays(d: HubData): Set<string> {
  const s = new Set<string>()
  d.reviewLogs.forEach((r) => s.add(dayKey(r.at)))
  d.spellingSessions.forEach((r) => s.add(dayKey(r.at)))
  d.quizResults.forEach((r) => s.add(dayKey(r.at)))
  Object.values(d.sessions).forEach((r) => r.durationMs >= 60_000 && s.add(r.date))
  Object.values(d.progress).forEach((p) => p.firstLearnedAt && s.add(dayKey(p.firstLearnedAt)))
  return s
}

export function streak(d: HubData): { current: number; best: number; activeToday: boolean } {
  const days = activeDays(d)
  const today = dayKey()
  const activeToday = days.has(today)
  let cur = 0
  let cursor = activeToday ? new Date() : addDays(new Date(), -1)
  while (days.has(dayKey(cursor))) { cur++; cursor = addDays(cursor, -1) }
  const sorted = [...days].sort()
  let best = 0, run = 0, prev: string | null = null
  sorted.forEach((k) => {
    run = prev && dayKey(addDays(new Date(prev + 'T12:00:00'), 1)) === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  })
  return { current: cur, best, activeToday }
}

export function todayStats(d: HubData) {
  const t = dayKey()
  const isToday = (iso: string) => dayKey(iso) === t
  return {
    learned: Object.values(d.progress).filter((p) => p.firstLearnedAt && isToday(p.firstLearnedAt)).length,
    reviews: d.reviewLogs.filter((r) => isToday(r.at)).length,
    spelling: d.spellingSessions.filter((r) => isToday(r.at)).length,
    quizzes: d.quizResults.filter((r) => r.module === 'quiz' && isToday(r.at)).length,
    listening: d.quizResults.filter((r) => r.module === 'listening' && isToday(r.at)).length,
    minutes: Math.round(Object.values(d.sessions).filter((s) => s.date === t).reduce((a, s) => a + s.durationMs, 0) / 60000),
  }
}

export function dueWords(d: HubData, words: Word[]): Word[] {
  const now = new Date()
  return words.filter((w) => { const p = d.progress[w.id]; return p && (isDue(p, now) || p.inReviewList) })
}

export function learnedWords(d: HubData, words: Word[]) {
  return words.filter((w) => (d.progress[w.id]?.srs.reps ?? 0) > 0)
}

export function masteredWords(d: HubData, words: Word[]) {
  return words.filter((w) => d.progress[w.id]?.status === 'mastered')
}

export function inRange(iso: string, days: number | null): boolean {
  if (days === null) return true
  return new Date(iso).getTime() >= startOfDay(addDays(new Date(), -(days - 1))).getTime()
}

export function spellingAccuracy(d: HubData, days: number | null = null) {
  const a = d.spellingAttempts.filter((x) => inRange(x.at, days))
  return { total: a.length, correct: a.filter((x) => x.correct).length, pct: pct(a.filter((x) => x.correct).length, a.length) }
}

export function quizAverage(d: HubData, days: number | null = null) {
  const r = d.quizResults.filter((x) => inRange(x.at, days))
  if (!r.length) return { count: 0, avg: 0 }
  return { count: r.length, avg: Math.round(r.reduce((s, x) => s + (x.correct / Math.max(1, x.total)) * 100, 0) / r.length) }
}

export function weekActivity(d: HubData, days = 7) {
  const keys = lastNDays(days)
  return keys.map((k) => {
    const dt = new Date(k + 'T12:00:00')
    return {
      date: k,
      label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dt.getDay()],
      reviews: d.reviewLogs.filter((r) => dayKey(r.at) === k).length,
      learned: Object.values(d.progress).filter((p) => p.firstLearnedAt && dayKey(p.firstLearnedAt) === k).length,
      tests: d.spellingSessions.filter((r) => dayKey(r.at) === k).length + d.quizResults.filter((r) => dayKey(r.at) === k).length,
      minutes: Math.round(Object.values(d.sessions).filter((s) => s.date === k).reduce((a, s) => a + s.durationMs, 0) / 60000),
    }
  })
}

export function levelProgress(d: HubData, words: Word[]) {
  return CEFR_LEVELS.map((level) => {
    const ws = words.filter((w) => w.cefr === level)
    const states = ws.map((w) => d.progress[w.id]).filter(Boolean)
    const learned = states.filter((p) => p.srs.reps > 0)
    const mastered = states.filter((p) => p.status === 'mastered').length
    const correct = states.reduce((s, p) => s + p.correct, 0), wrong = states.reduce((s, p) => s + p.wrong, 0)
    return {
      level, total: ws.length, learned: learned.length, mastered,
      learnedPct: pct(learned.length, ws.length), masteredPct: pct(mastered, ws.length),
      retention: learned.length ? Math.round(learned.reduce((s, p) => s + retentionScore(p), 0) / learned.length) : 0,
      accuracy: pct(correct, correct + wrong), attempts: correct + wrong,
    }
  })
}

export function statusDistribution(d: HubData, words: Word[]) {
  const c = { new: 0, learning: 0, review: 0, mastered: 0 }
  words.forEach((w) => { c[d.progress[w.id]?.status ?? 'new']++ })
  return [
    { key: 'mastered', name: 'Đã thành thạo', value: c.mastered },
    { key: 'review', name: 'Đang củng cố', value: c.review },
    { key: 'learning', name: 'Đang học', value: c.learning },
    { key: 'new', name: 'Chưa học', value: c.new },
  ]
}

export function newWordsPerWeek(d: HubData, weeks = 8) {
  const now = new Date()
  const keys = Array.from({ length: weeks }, (_, i) => weekKey(addDays(now, -7 * (weeks - 1 - i))))
  return keys.map((k) => ({
    week: k, label: `${k.slice(8, 10)}/${k.slice(5, 7)}`,
    words: Object.values(d.progress).filter((p) => p.firstLearnedAt && weekKey(p.firstLearnedAt) === k).length,
    reviews: d.reviewLogs.filter((r) => weekKey(r.at) === k).length,
  }))
}

export function monthlyProgress(d: HubData, months = 6) {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
    const inMonth = (iso: string) => dayKey(iso).startsWith(key)
    const sp = d.spellingAttempts.filter((a) => inMonth(a.at))
    const qz = d.quizResults.filter((r) => inMonth(r.at))
    const qTotal = qz.reduce((s, r) => s + r.total, 0), qCorrect = qz.reduce((s, r) => s + r.correct, 0)
    const learned = Object.values(d.progress).filter((p) => p.firstLearnedAt && inMonth(p.firstLearnedAt)).length
    const cumulative = Object.values(d.progress).filter((p) => p.firstLearnedAt && dayKey(p.firstLearnedAt) <= `${key}-31`).length
    return {
      key, label: `Th${m.getMonth() + 1}`,
      spelling: sp.length ? pct(sp.filter((a) => a.correct).length, sp.length) : null,
      quiz: qTotal ? pct(qCorrect, qTotal) : null,
      learned, cumulative,
    }
  })
}

export function heatmap(d: HubData, days = 182) {
  const keys = lastNDays(days)
  const counts = new Map<string, number>()
  const add = (k: string, n = 1) => counts.set(k, (counts.get(k) ?? 0) + n)
  d.reviewLogs.forEach((r) => add(dayKey(r.at)))
  d.spellingAttempts.forEach((r) => add(dayKey(r.at)))
  d.quizResults.forEach((r) => add(dayKey(r.at), r.total))
  Object.values(d.progress).forEach((p) => p.firstLearnedAt && add(dayKey(p.firstLearnedAt)))
  return keys.map((k) => ({ date: k, count: counts.get(k) ?? 0 }))
}

export function avgMinutesPerDay(d: HubData, days: number | null) {
  const s = Object.values(d.sessions).filter((x) => inRange(x.date + 'T12:00:00', days))
  const byDay = new Map<string, number>()
  s.forEach((x) => byDay.set(x.date, (byDay.get(x.date) ?? 0) + x.durationMs))
  if (!byDay.size) return 0
  return Math.round([...byDay.values()].reduce((a, b) => a + b, 0) / byDay.size / 60000)
}

/** Phân tích điểm yếu để đề xuất kế hoạch. */
export function weaknesses(d: HubData, words: Word[]) {
  const byId = new Map(words.map((w) => [w.id, w]))
  const levels = levelProgress(d, words).filter((l) => l.attempts >= 5).sort((a, b) => a.accuracy - b.accuracy)
  const topicStats = new Map<string, { c: number; w: number }>()
  Object.values(d.progress).forEach((p) => {
    const w = byId.get(p.wordId)
    if (!w) return
    w.topics.forEach((t) => { const s = topicStats.get(t) ?? { c: 0, w: 0 }; s.c += p.correct; s.w += p.wrong; topicStats.set(t, s) })
  })
  const topics = [...topicStats.entries()].filter(([, s]) => s.c + s.w >= 5).map(([t, s]) => ({ topic: t, name: TOPICS[t]?.vi ?? t, accuracy: pct(s.c, s.c + s.w), attempts: s.c + s.w })).sort((a, b) => a.accuracy - b.accuracy)
  const frequent = Object.values(d.mistakes).filter((m) => !m.resolved).sort((a, b) => b.count - a.count).slice(0, 6).map((m) => ({ ...m, word: byId.get(m.wordId) })).filter((m) => m.word)
  const forgotten = Object.values(d.progress).filter((p) => p.srs.lapses > 0).sort((a, b) => b.srs.lapses - a.srs.lapses).slice(0, 6).map((p) => ({ p, word: byId.get(p.wordId) })).filter((x) => x.word)
  return { weakLevel: levels[0] ?? null, weakTopic: topics[0] ?? null, topics, frequent, forgotten }
}

export function studyPlan(d: HubData, words: Word[]): string[] {
  const w = weaknesses(d, words)
  const due = dueWords(d, words).length
  const out: string[] = []
  if (due) out.push(`Ưu tiên ôn ${due} thẻ đến hạn trước khi học từ mới — đây là lúc trí nhớ dễ mất nhất.`)
  if (w.frequent.length) out.push(`Luyện lại ${w.frequent.length} từ hay sai nhất (${w.frequent.slice(0, 3).map((x) => x.word!.word).join(', ')}) bằng bài kiểm tra trong Sổ lỗi sai.`)
  if (w.weakLevel && w.weakLevel.accuracy < 75) out.push(`Cấp ${w.weakLevel.level} có độ chính xác ${w.weakLevel.accuracy}% — nên làm thêm quiz cấp này.`)
  if (w.weakTopic && w.weakTopic.accuracy < 75) out.push(`Chủ đề “${w.weakTopic.name}” đang yếu (${w.weakTopic.accuracy}%) — thử Flashcards theo chủ đề.`)
  if (!out.length) out.push('Bạn đang đi đúng nhịp. Hoàn thành Daily Study hôm nay để giữ chuỗi ngày học.')
  return out
}

/** Gợi ý từ mới mỗi ngày: không lặp từ đã học/thành thạo, ưu tiên cấp độ hiện tại & chủ đề quan tâm. */
export function pickDailyWords(words: Word[], d: HubData, n: number, date = dayKey()): Word[] {
  const lvl = CEFR_LEVELS.indexOf(d.settings.level)
  const interests = new Set(d.settings.interests)
  const candidates = words.filter((w) => (d.progress[w.id]?.srs.reps ?? 0) === 0)
  const rand = rng(hashString(date + d.settings.level))
  return weightedSample(candidates, (w) => {
    const dist = Math.abs(CEFR_LEVELS.indexOf(w.cefr) - lvl)
    const levelW = dist === 0 ? 6 : dist === 1 ? (CEFR_LEVELS.indexOf(w.cefr) > lvl ? 3 : 2) : 0.4
    const topicW = w.topics.some((t) => interests.has(t)) ? 2 : 1
    return levelW * topicW
  }, n, rand)
}

export function wordOfDay(words: Word[], level: Cefr, date = dayKey()): Word {
  const li = CEFR_LEVELS.indexOf(level)
  const pool = words.filter((w) => Math.abs(CEFR_LEVELS.indexOf(w.cefr) - (li + 1)) <= 1 && w.examples.length && w.synonyms.length)
  const list = pool.length ? pool : words
  return list[hashString('wod' + date) % list.length]
}

export interface HistoryItem { at: string; kind: string; text: string; score?: string }

export function recentHistory(d: HubData, limit = 8): HistoryItem[] {
  const items: HistoryItem[] = []
  const byDay = new Map<string, number>()
  d.reviewLogs.forEach((r) => byDay.set(dayKey(r.at), (byDay.get(dayKey(r.at)) ?? 0) + 1))
  byDay.forEach((n, k) => {
    const last = d.reviewLogs.filter((r) => dayKey(r.at) === k).at(-1)!
    items.push({ at: last.at, kind: 'flashcards', text: `Ôn ${n} thẻ flashcard` })
  })
  d.spellingSessions.forEach((s) => items.push({ at: s.at, kind: 'spelling', text: 'Kiểm tra chính tả', score: `${s.correct}/${s.total}` }))
  d.quizResults.forEach((q) => items.push({ at: q.at, kind: q.module, text: q.module === 'listening' ? 'Bài luyện nghe' : q.module === 'mistakes' ? 'Ôn từ hay sai' : 'Bài quiz', score: `${q.correct}/${q.total}` }))
  const learnedByDay = new Map<string, { n: number; at: string }>()
  Object.values(d.progress).forEach((p) => { if (!p.firstLearnedAt) return; const k = dayKey(p.firstLearnedAt); const cur = learnedByDay.get(k); learnedByDay.set(k, { n: (cur?.n ?? 0) + 1, at: cur && cur.at > p.firstLearnedAt ? cur.at : p.firstLearnedAt }) })
  learnedByDay.forEach((v) => items.push({ at: v.at, kind: 'daily', text: `Học ${v.n} từ mới` }))
  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit)
}
