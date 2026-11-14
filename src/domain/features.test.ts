import { describe, expect, it } from 'vitest'
import { CONVERSATIONS, TOEIC_ITEMS } from '../data/toeic'
import { SEED_VOCABULARY } from '../data/vocabulary'
import { levelInfo, totalXp, weeklyChallenges, xpForLevel } from './gamification'
import { extractCandidates, stems } from './textExtract'
import type { HubData } from '../store/useHub'
import { DEFAULT_SETTINGS } from '../store/useHub'

const empty = (): HubData => ({
  settings: DEFAULT_SETTINGS, customWords: [], enrichments: {}, progress: {}, reviewLogs: [], spellingAttempts: [], spellingSessions: [],
  quizResults: [], mistakes: {}, sessions: {}, personal: [], dailyPlan: null, wordOfDayQuiz: {},
})

describe('XP & cấp độ', () => {
  it('dữ liệu rỗng → 0 XP, cấp 1', () => {
    expect(totalXp(empty())).toBe(0)
    expect(levelInfo(0).level).toBe(1)
  })
  it('mốc cấp khớp công thức 50·L·(L−1)', () => {
    expect(xpForLevel(2)).toBe(100)
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100).level).toBe(2)
    expect(levelInfo(299).level).toBe(2)
    expect(levelInfo(300).level).toBe(3)
  })
  it('phần trăm tiến độ trong cấp nằm trong 0–100', () => {
    for (const xp of [0, 50, 100, 250, 1234]) { const p = levelInfo(xp).pct; expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThan(100) }
  })
  it('XP tăng khi có hoạt động ôn thẻ', () => {
    const d = empty()
    d.reviewLogs.push({ id: 'r1', wordId: 'w', at: new Date().toISOString(), rating: 'good', mode: 'flashcards', intervalAfter: 1 })
    expect(totalXp(d)).toBeGreaterThan(0)
  })
  it('thử thách tuần bắt đầu ở 0 và chưa hoàn thành', () => {
    const c = weeklyChallenges(empty())
    expect(c.length).toBeGreaterThan(0)
    expect(c.every((x) => x.value === 0 && !x.done)).toBe(true)
  })
})

describe('Tách từ mới từ văn bản', () => {
  it('stems nhận ra dạng chia của từ', () => {
    expect(stems('studies')).toContain('study')
    expect(stems('walked')).toContain('walk')
    expect(stems('running')).toContain('runn')
    expect(stems('shipments')).toContain('shipment')
  })
  it('bỏ từ chức năng, từ ngắn và từ đã biết; xếp theo tần suất', () => {
    const text = 'The consignment arrived. The consignment was late, and the manager hates delays. Delays hurt.'
    const out = extractCandidates(text, new Set(['manager']))
    const words = out.map((c) => c.word)
    expect(words[0]).toBe('consignment')
    expect(words).not.toContain('the')
    expect(words).not.toContain('manager')
    expect(out.find((c) => c.word === 'consignment')?.count).toBe(2)
  })
  it('khớp dạng số nhiều với từ đã biết', () => {
    expect(extractCandidates('Several warehouses opened.', new Set(['warehouse'])).map((c) => c.word)).not.toContain('warehouses')
  })
})

describe('Dữ liệu nội dung', () => {
  it('kho từ không có từ trùng và mọi id là duy nhất', () => {
    const ids = SEED_VOCABULARY.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(SEED_VOCABULARY.map((w) => w.word.toLowerCase())).size).toBe(SEED_VOCABULARY.length)
  })
  it('gói từ TOEIC đã được nối vào kho', () => {
    expect(SEED_VOCABULARY.some((w) => w.word === 'invoice')).toBe(true)
    expect(SEED_VOCABULARY.every((w) => w.examples.length > 0 && w.meaningVi && w.definitionEn)).toBe(true)
  })
  it('câu nghe TOEIC: id duy nhất và không rỗng', () => {
    expect(new Set(TOEIC_ITEMS.map((i) => i.id)).size).toBe(TOEIC_ITEMS.length)
    expect(TOEIC_ITEMS.every((i) => i.text.trim().length > 10)).toBe(true)
  })
  it('hội thoại: mỗi câu hỏi có 4 đáp án và đáp án đúng hợp lệ', () => {
    for (const c of CONVERSATIONS) {
      expect(c.lines.length).toBeGreaterThanOrEqual(2)
      for (const q of c.questions) { expect(q.options).toHaveLength(4); expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(4) }
    }
  })
})
