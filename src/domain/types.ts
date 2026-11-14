/** Kiểu dữ liệu nghiệp vụ dùng chung — không phụ thuộc React hay storage. */

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Cefr = (typeof CEFR_LEVELS)[number]

export const PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'determiner', 'phrase'] as const
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number]

export type VerificationStatus = 'verified' | 'suggested' | 'user'
export type ContentSource = 'curated' | 'dictionaryapi' | 'import' | 'user'

export interface Example {
  en: string
  vi: string
}

export interface Word {
  id: string
  word: string
  ipa: { uk?: string; us?: string }
  audio?: { uk?: string; us?: string }
  pos: PartOfSpeech[]
  meaningVi: string
  definitionEn: string
  examples: Example[]
  synonyms: string[]
  antonyms: string[]
  collocations: string[]
  phrasalVerbs: string[]
  wordFamily: string[]
  cefr: Cefr
  topics: string[]
  source: {
    cefr: VerificationStatus
    cefrRef?: string
    content: ContentSource
    note?: string
  }
  createdAt: string
}

/** Bổ sung lấy từ Dictionary API — lưu riêng, không ghi đè dữ liệu gốc. */
export interface Enrichment {
  wordId: string
  fetchedAt: string
  sourceUrl: string
  license: string
  ipa?: { uk?: string; us?: string }
  audio?: { uk?: string; us?: string }
  definitions: { pos: string; definition: string; example?: string }[]
  synonyms: string[]
  antonyms: string[]
}

export type SrsStatus = 'new' | 'learning' | 'review' | 'mastered'
export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface SrsState {
  ease: number
  interval: number // ngày
  reps: number
  lapses: number
  due: string | null // ISO
  last: string | null
}

export interface UserWordState {
  wordId: string
  status: SrsStatus
  favorite: boolean
  inReviewList: boolean
  srs: SrsState
  correct: number
  wrong: number
  firstLearnedAt: string | null
  addedToListAt?: string
}

export type StudyModule = 'flashcards' | 'spelling' | 'daily' | 'listening' | 'quiz' | 'library' | 'mistakes' | 'dictionary'

export interface ReviewLog {
  id: string
  wordId: string
  at: string
  rating: Rating
  mode: string
  intervalAfter: number
}

export type SpellingMode = 'vi_to_en' | 'def_to_en' | 'audio' | 'missing' | 'correction'

export interface SpellingAttempt {
  id: string
  sessionId: string
  wordId: string
  mode: SpellingMode
  prompt: string
  answer: string
  expected: string
  correct: boolean
  ms: number
  at: string
}

export interface SpellingSession {
  id: string
  at: string
  modes: SpellingMode[]
  levels: Cefr[]
  total: number
  correct: number
  durationMs: number
  timeLimitSec: number | null
}

export type QuizType =
  | 'meaning'
  | 'matching'
  | 'fill_blank'
  | 'synonym'
  | 'antonym'
  | 'confusables'
  | 'word_class'
  | 'sentence_order'
  | 'collocation'
  | 'listening_meaning'
  | 'listening_spelling'
  | 'listening_gap'
  | 'listening_passage'

export interface QuizResult {
  id: string
  at: string
  type: QuizType | 'mixed'
  module: 'quiz' | 'listening' | 'mistakes' | 'daily'
  total: number
  correct: number
  durationMs: number
  items: { wordId: string | null; correct: boolean }[]
}

export type MistakeCategory = 'spelling' | 'meaning' | 'word_class' | 'pronunciation' | 'synonym' | 'context'

export interface Mistake {
  key: string // wordId::category
  wordId: string
  category: MistakeCategory
  source: StudyModule
  count: number
  wrongAnswers: string[]
  firstAt: string
  lastAt: string
  history: { at: string; correct: boolean }[]
  resolved: boolean
}

export interface LearningSession {
  id: string
  date: string // YYYY-MM-DD (giờ địa phương)
  module: StudyModule
  startedAt: string
  durationMs: number
}

export interface DailyGoals {
  newWords: number
  flashcards: number
  quizzes: number
  minutes: number
}

export interface PersonalWord {
  id: string
  word: string
  meaning: string
  ipa: string
  example: string
  topic: string
  note: string
  linkedWordId?: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  name: string
  theme: 'light' | 'dark' | 'system'
  accent: 'uk' | 'us'
  speechRate: number
  level: Cefr
  interests: string[]
  goals: DailyGoals
  onboarded: boolean
  reminder?: { enabled: boolean; time: string }
}
