/** SINH CÂU HỎI — 9 dạng quiz + 4 dạng luyện nghe, đều dựa trên dữ liệu thật trong kho. */
import { CONFUSABLES, PASSAGES, POS_VI } from '../data/content'
import type { Cefr, MistakeCategory, QuizType, Word } from './types'
import { findWordInSentence, sample, shuffle, uid } from './util'

export interface McqQuestion {
  kind: 'mcq'
  id: string
  type: QuizType
  wordId: string | null
  prompt: string
  context?: string
  speak?: string
  options: string[]
  answer: number
  explain?: string
  category: MistakeCategory
}
export interface MatchQuestion {
  kind: 'match'
  id: string
  type: 'matching'
  pairs: { wordId: string; left: string; right: string }[]
}
export interface OrderQuestion {
  kind: 'order'
  id: string
  type: 'sentence_order'
  wordId: string
  tokens: string[]
  answer: string
  translation: string
}
export interface TypeQuestion {
  kind: 'type'
  id: string
  type: QuizType
  wordId: string
  prompt: string
  context?: string
  speak?: string
  answer: string
  accept?: string[]
  category: MistakeCategory
}
export interface PassageQuestion {
  kind: 'passage'
  id: string
  type: 'listening_passage'
  title: string
  level: string
  text: string
  questions: { q: string; options: string[]; answer: number }[]
}
export type Question = McqQuestion | MatchQuestion | OrderQuestion | TypeQuestion | PassageQuestion

export type Difficulty = 'easy' | 'normal' | 'hard'

export const QUIZ_TYPES: { type: QuizType; label: string; desc: string; category: MistakeCategory }[] = [
  { type: 'meaning', label: 'Chọn nghĩa', desc: 'Từ tiếng Anh → nghĩa tiếng Việt', category: 'meaning' },
  { type: 'matching', label: 'Ghép từ – nghĩa', desc: 'Nối 5 cặp từ và nghĩa', category: 'meaning' },
  { type: 'fill_blank', label: 'Điền từ vào câu', desc: 'Chọn từ phù hợp ngữ cảnh', category: 'context' },
  { type: 'synonym', label: 'Từ đồng nghĩa', desc: 'Tìm từ gần nghĩa nhất', category: 'synonym' },
  { type: 'antonym', label: 'Từ trái nghĩa', desc: 'Tìm từ ngược nghĩa', category: 'synonym' },
  { type: 'confusables', label: 'Từ dễ nhầm', desc: 'affect / effect, lose / loose…', category: 'context' },
  { type: 'word_class', label: 'Nhận diện loại từ', desc: 'Danh, động, tính hay trạng từ?', category: 'word_class' },
  { type: 'sentence_order', label: 'Sắp xếp câu', desc: 'Xếp các từ thành câu đúng', category: 'context' },
  { type: 'collocation', label: 'Collocations', desc: 'Từ nào đi cùng cụm này?', category: 'context' },
]

function distractors(pool: Word[], target: Word, n: number, diff: Difficulty, key: (w: Word) => string): string[] {
  const right = key(target)
  let candidates = pool.filter((w) => w.id !== target.id && key(w) && key(w) !== right)
  if (diff === 'hard') {
    const close = candidates.filter((w) => w.cefr === target.cefr && w.pos.some((p) => target.pos.includes(p)))
    if (close.length >= n) candidates = close
  } else if (diff === 'normal') {
    const samePos = candidates.filter((w) => w.pos.some((p) => target.pos.includes(p)))
    if (samePos.length >= n) candidates = samePos
  }
  const uniq = Array.from(new Set(sample(candidates, n * 3).map(key))).filter((x) => x !== right)
  return uniq.slice(0, n)
}

function mcq(type: QuizType, w: Word | null, prompt: string, right: string, wrong: string[], category: MistakeCategory, extra: Partial<McqQuestion> = {}): McqQuestion | null {
  if (wrong.length < 2) return null
  const options = shuffle([right, ...wrong.slice(0, 3)])
  return { kind: 'mcq', id: uid('q'), type, wordId: w ? w.id : null, prompt, options, answer: options.indexOf(right), category, ...extra }
}

export function makeQuestion(type: QuizType, w: Word, pool: Word[], diff: Difficulty = 'normal'): Question | null {
  switch (type) {
    case 'meaning':
      return mcq(type, w, w.word, w.meaningVi, distractors(pool, w, 3, diff, (x) => x.meaningVi), 'meaning', { context: w.ipa.uk, speak: w.word })
    case 'listening_meaning':
      return mcq(type, w, 'Nghe và chọn nghĩa đúng', w.meaningVi, distractors(pool, w, 3, diff, (x) => x.meaningVi), 'pronunciation', { speak: w.word })
    case 'fill_blank': {
      const ex = w.examples.find((e) => findWordInSentence(e.en, w.word))
      if (!ex) return null
      const f = findWordInSentence(ex.en, w.word)!
      const blanked = ex.en.slice(0, f.start) + '_____' + ex.en.slice(f.end)
      const inflected = f.match.toLowerCase() !== w.word.toLowerCase()
      const wrong = distractors(pool, w, 3, diff === 'easy' ? 'normal' : 'hard', (x) => x.word)
      return mcq(type, w, blanked, w.word, wrong, 'context', {
        context: inflected ? `${ex.vi} · (từ trong câu đã được chia dạng)` : ex.vi,
        explain: ex.en,
      })
    }
    case 'synonym': {
      if (!w.synonyms.length) return null
      const right = w.synonyms[0]
      const ban = new Set([...w.synonyms, ...w.antonyms, w.word])
      const wrong = sample(pool.filter((x) => x.id !== w.id).flatMap((x) => [x.word, ...x.synonyms]).filter((s) => !ban.has(s)), 6)
      return mcq(type, w, `Từ nào gần nghĩa nhất với “${w.word}”?`, right, Array.from(new Set(wrong)), 'synonym', { context: w.meaningVi, explain: `Đồng nghĩa: ${w.synonyms.join(', ')}` })
    }
    case 'antonym': {
      if (!w.antonyms.length) return null
      const right = w.antonyms[0]
      const ban = new Set([...w.synonyms, ...w.antonyms, w.word])
      const wrong = sample(pool.filter((x) => x.id !== w.id).flatMap((x) => [x.word, ...x.antonyms]).filter((s) => !ban.has(s)), 6)
      return mcq(type, w, `Từ nào trái nghĩa với “${w.word}”?`, right, Array.from(new Set(wrong)), 'synonym', { context: w.meaningVi, explain: `Trái nghĩa: ${w.antonyms.join(', ')}` })
    }
    case 'word_class': {
      if (w.pos.length !== 1 || !w.examples.length) return null
      const options = ['noun', 'verb', 'adjective', 'adverb']
      if (!options.includes(w.pos[0])) return null
      const ex = w.examples[0]
      return { kind: 'mcq', id: uid('q'), type, wordId: w.id, prompt: `“${w.word}” trong câu sau là loại từ gì?`, context: ex.en, options: options.map((p) => POS_VI[p]), answer: options.indexOf(w.pos[0]), category: 'word_class', explain: `${w.word} — ${POS_VI[w.pos[0]]}` }
    }
    case 'sentence_order': {
      const ex = w.examples.find((e) => e.en.split(' ').length <= 12)
      if (!ex) return null
      const clean = ex.en.replace(/[.?!]$/, '')
      const tokens = clean.split(' ')
      if (tokens.length < 4) return null
      let shuffled = shuffle(tokens)
      if (shuffled.join(' ') === clean) shuffled = shuffled.slice().reverse()
      return { kind: 'order', id: uid('q'), type, wordId: w.id, tokens: shuffled, answer: clean, translation: ex.vi }
    }
    case 'collocation': {
      const col = w.collocations.find((c) => c.toLowerCase().includes(w.word.toLowerCase()))
      if (!col) return null
      const blanked = col.replace(new RegExp(w.word, 'i'), '_____')
      return mcq(type, w, blanked, w.word, distractors(pool, w, 3, 'hard', (x) => x.word), 'context', { explain: `Collocation: ${col}`, context: w.meaningVi })
    }
    case 'listening_spelling':
      return { kind: 'type', id: uid('q'), type, wordId: w.id, prompt: 'Nghe và viết lại từ', speak: w.word, answer: w.word, category: 'pronunciation' }
    case 'listening_gap': {
      const ex = w.examples.find((e) => findWordInSentence(e.en, w.word))
      if (!ex) return null
      const f = findWordInSentence(ex.en, w.word)!
      return { kind: 'type', id: uid('q'), type, wordId: w.id, prompt: 'Nghe câu và điền từ còn thiếu', context: ex.en.slice(0, f.start) + '_____' + ex.en.slice(f.end), speak: ex.en, answer: f.match.toLowerCase(), category: 'pronunciation' }
    }
    default:
      return null
  }
}

export function makeMatching(words: Word[]): MatchQuestion | null {
  const ws = sample(words, 5)
  if (ws.length < 3) return null
  return { kind: 'match', id: uid('q'), type: 'matching', pairs: ws.map((w) => ({ wordId: w.id, left: w.word, right: w.meaningVi })) }
}

export function makeConfusables(n: number): McqQuestion[] {
  return sample(CONFUSABLES, n).map((c) => {
    const options = shuffle(c.pair)
    return { kind: 'mcq', id: uid('q'), type: 'confusables', wordId: null, prompt: c.sentence, options, answer: options.indexOf(c.answer), category: 'context', explain: c.explain }
  })
}

export function makePassages(level?: Cefr | 'all'): PassageQuestion[] {
  return PASSAGES.filter((p) => !level || level === 'all' || p.level === level).map((p) => ({ kind: 'passage', id: uid('q'), type: 'listening_passage', title: p.title, level: p.level, text: p.text, questions: p.questions }))
}

/** Tạo bộ câu hỏi từ cấu hình. Bỏ qua từ không đủ dữ liệu cho dạng câu hỏi đó (không bịa nội dung). */
export function buildQuiz(opts: { types: QuizType[]; words: Word[]; pool: Word[]; count: number; difficulty: Difficulty }): Question[] {
  const { types, words, pool, count, difficulty } = opts
  const out: Question[] = []
  const wordQueue = shuffle(words)
  let guard = 0
  let ti = 0
  while (out.length < count && guard < count * 12) {
    guard++
    const type = types[ti % types.length]
    ti++
    if (type === 'matching') { const q = makeMatching(sample(words, 5)); if (q) out.push(q); continue }
    if (type === 'confusables') { const used = new Set(out.filter((q) => q.kind === 'mcq' && q.type === 'confusables').map((q) => (q as McqQuestion).prompt)); const q = makeConfusables(12).find((c) => !used.has(c.prompt)); if (q) out.push(q); continue }
    const w = wordQueue[guard % Math.max(1, wordQueue.length)]
    if (!w) break
    if (out.some((q) => 'wordId' in q && q.wordId === w.id && q.type === type)) continue
    const q = makeQuestion(type, w, pool, difficulty)
    if (q) out.push(q)
  }
  return out
}
