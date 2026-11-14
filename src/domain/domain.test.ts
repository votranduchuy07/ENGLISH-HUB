import { describe, expect, it } from 'vitest'
import { advanceQueue } from './deck'
import { dictationScore, diffWords, normWord, pickBlanks, tokenize } from './dictation'
import { charDiff, describeDiff, editDistance, maskWord, misspell } from './spelling'
import { NEW_SRS, schedule, statusFromInterval } from './srs'
import { pct } from './util'

const NOW = new Date('2026-01-10T08:00:00Z')

describe('SRS (SM-2)', () => {
  it('từ mới trả lời Good: ôn lại sau 1 ngày', () => {
    const s = schedule(NEW_SRS, 'good', NOW)
    expect(s.interval).toBe(1)
    expect(s.reps).toBe(1)
  })
  it('Easy cho từ mới giãn lịch 4 ngày và tăng hệ số dễ', () => {
    const s = schedule(NEW_SRS, 'easy', NOW)
    expect(s.interval).toBe(4)
    expect(s.ease).toBeGreaterThan(NEW_SRS.ease)
  })
  it('Again: reset khoảng cách, giảm ease, tính một lần quên', () => {
    const learned = schedule(schedule(NEW_SRS, 'good', NOW), 'good', NOW)
    const s = schedule(learned, 'again', NOW)
    expect(s.interval).toBe(0)
    expect(s.lapses).toBe(1)
    expect(s.ease).toBeLessThan(learned.ease)
  })
  it('hệ số dễ không bao giờ thấp hơn 1.3', () => {
    let s = schedule(NEW_SRS, 'good', NOW)
    for (let i = 0; i < 20; i++) s = schedule(s, 'again', NOW)
    expect(s.ease).toBeGreaterThanOrEqual(1.3)
  })
  it('phân loại trạng thái theo khoảng cách ôn', () => {
    expect(statusFromInterval(0, 0)).toBe('new')
    expect(statusFromInterval(3, 2)).toBe('learning')
    expect(statusFromInterval(10, 4)).toBe('review')
    expect(statusFromInterval(30, 6)).toBe('mastered')
  })
})

describe('Chính tả', () => {
  it('đúng hoàn toàn → toàn thao tác ok', () => {
    expect(charDiff('library', 'Library').every((o) => o.type === 'ok')).toBe(true)
  })
  it('phát hiện thiếu / thừa / sai chữ', () => {
    expect(describeDiff(charDiff('necessary', 'necesary'))).toEqual(['Thiếu chữ “s”'])
    expect(describeDiff(charDiff('big', 'bigg'))).toEqual(['Thừa chữ “g”'])
    expect(describeDiff(charDiff('cat', 'cut'))).toEqual(['Viết “u” thay vì “a”'])
    expect(editDistance('kitten', 'sitting')).toBe(3)
  })
  it('maskWord giữ chữ đầu, giữ độ dài, ổn định theo seed', () => {
    const a = maskWord('beautiful', 1), b = maskWord('beautiful', 1)
    expect(a).toEqual(b)
    expect(a.masked).toHaveLength(9)
    expect(a.masked[0]).toBe('b')
    expect(a.masked).toContain('_')
  })
  it('misspell luôn tạo ra từ khác từ gốc', () => {
    for (const w of ['receive', 'committee', 'go', 'accommodation']) expect(misspell(w, 3)).not.toBe(w)
  })
})

describe('Nghe chép / điền từ', () => {
  const E = 'The office will be closed on Monday because of the national holiday.'
  it('tách từ giữ dấu câu, chuẩn hóa so sánh', () => {
    const t = tokenize("Hello, it's $45!")
    expect(t.map((x) => x.core)).toEqual(['Hello', "it's", '$45'])
    expect(normWord('$45,')).toBe('45')
    expect(normWord('IT’S')).toBe("it's")
  })
  it('chép đúng (bỏ qua hoa/thường, dấu câu) được 100%', () => {
    const ops = diffWords(E, 'the office will be closed on monday because of the national holiday')
    expect(dictationScore(ops)).toBe(1)
  })
  it('thiếu từ, sai từ, thừa từ đều bị phát hiện', () => {
    expect(diffWords(E, 'The office will be closed on Monday of the national holiday').some((o) => o.type === 'del')).toBe(true)
    expect(diffWords(E, 'The office will be closed on Monday because of the nation holiday').some((o) => o.type === 'sub')).toBe(true)
    const extra = diffWords(E, 'The office will be really closed on Monday because of the national holiday')
    expect(extra.some((o) => o.type === 'ins')).toBe(true)
    expect(dictationScore(extra)).toBeLessThan(1)
  })
  it('bỏ trống → 0 điểm', () => {
    expect(dictationScore(diffWords(E, ''))).toBe(0)
  })
  it('pickBlanks: đúng số lượng, tăng dần, ổn định, không chọn từ chức năng', () => {
    const t = tokenize(E)
    const b = pickBlanks(t, 3, 's')
    expect(b).toHaveLength(3)
    expect(b).toEqual([...b].sort((x, y) => x - y))
    expect(pickBlanks(t, 3, 's')).toEqual(b)
    b.forEach((i) => expect(['the', 'will', 'be', 'on', 'of']).not.toContain(normWord(t[i].core)))
  })
})

describe('Hàng đợi flashcard', () => {
  it('Good bỏ thẻ đầu', () => expect(advanceQueue(['a', 'b', 'c'], 'good')).toEqual(['b', 'c']))
  it('Again chèn lại thẻ sau 4 thẻ', () => expect(advanceQueue(['a', 'b', 'c', 'd', 'e', 'f'], 'again')).toEqual(['b', 'c', 'd', 'e', 'a', 'f']))
  it('Again khi hàng đợi ngắn đưa thẻ về cuối', () => expect(advanceQueue(['a', 'b'], 'again')).toEqual(['b', 'a']))
  it('hàng đợi rỗng không lỗi', () => expect(advanceQueue([], 'again')).toEqual([]))
})

describe('Tiện ích', () => {
  it('pct không chia cho 0', () => {
    expect(pct(1, 0)).toBe(0)
    expect(pct(1, 4)).toBe(25)
  })
})
