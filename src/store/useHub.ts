/**
 * STORE TRUNG TÂM — nguồn sự thật duy nhất cho mọi dữ liệu học tập.
 * Lưu qua StorageAdapter (LocalStorage ở v1). Kho seed KHÔNG được lưu lại
 * (tránh trùng lặp) — chỉ lưu từ người dùng nhập thêm và trạng thái học.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { SEED_VOCABULARY } from '../data/vocabulary'
import { NEW_SRS, schedule, statusFromInterval } from '../domain/srs'
import type {
  Enrichment, LearningSession, Mistake, MistakeCategory, PersonalWord, QuizResult, Rating, ReviewLog,
  Settings, SpellingAttempt, SpellingSession, StudyModule, UserWordState, Word,
} from '../domain/types'
import { dayKey, uid } from '../domain/util'
import { activeAdapter } from '../services/storage'

export interface HubData {
  settings: Settings
  customWords: Word[]
  enrichments: Record<string, Enrichment>
  progress: Record<string, UserWordState>
  reviewLogs: ReviewLog[]
  spellingAttempts: SpellingAttempt[]
  spellingSessions: SpellingSession[]
  quizResults: QuizResult[]
  mistakes: Record<string, Mistake>
  sessions: Record<string, LearningSession>
  personal: PersonalWord[]
  dailyPlan: { date: string; wordIds: string[] } | null
  wordOfDayQuiz: Record<string, boolean>
}

export interface MistakeInput { wordId: string; category: MistakeCategory; source: StudyModule; wrongAnswer?: string }

interface HubActions {
  updateSettings: (p: Partial<Settings>) => void
  toggleFavorite: (id: string) => void
  toggleReviewList: (id: string) => void
  markLearned: (ids: string[]) => void
  reviewCard: (id: string, rating: Rating, mode: string) => void
  recordOutcome: (wordId: string, correct: boolean) => void
  recordSpelling: (session: SpellingSession, attempts: SpellingAttempt[], mistakes: MistakeInput[]) => void
  recordQuiz: (result: QuizResult, mistakes: MistakeInput[]) => void
  addMistake: (m: MistakeInput) => void
  resolveMistake: (key: string, resolved?: boolean) => void
  deleteMistake: (key: string) => void
  logStudyTime: (module: StudyModule, ms: number) => void
  savePersonal: (w: Omit<PersonalWord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => PersonalWord
  deletePersonal: (id: string) => void
  importWords: (words: Word[]) => void
  deleteCustomWord: (id: string) => void
  saveEnrichment: (e: Enrichment) => void
  setDailyPlan: (date: string, ids: string[]) => void
  setWordOfDayAnswered: (date: string, correct: boolean) => void
  replaceAll: (data: HubData) => void
  resetAll: () => void
}

export const DEFAULT_SETTINGS: Settings = {
  name: 'Học giả',
  theme: 'dark',
  accent: 'uk',
  speechRate: 0.9,
  level: 'A2',
  interests: ['education', 'travel', 'work'],
  goals: { newWords: 15, flashcards: 20, quizzes: 1, minutes: 20 },
  onboarded: false,
  reminder: { enabled: false, time: '20:00' },
}

const initialData = (): HubData => ({
  settings: DEFAULT_SETTINGS,
  customWords: [],
  enrichments: {},
  progress: {},
  reviewLogs: [],
  spellingAttempts: [],
  spellingSessions: [],
  quizResults: [],
  mistakes: {},
  sessions: {},
  personal: [],
  dailyPlan: null,
  wordOfDayQuiz: {},
})

export function blankState(wordId: string): UserWordState {
  return { wordId, status: 'new', favorite: false, inReviewList: false, srs: { ...NEW_SRS }, correct: 0, wrong: 0, firstLearnedAt: null }
}

const MAX_LOG = 5000
const trim = <T,>(a: T[]) => (a.length > MAX_LOG ? a.slice(a.length - MAX_LOG) : a)

function applyMistake(map: Record<string, Mistake>, m: MistakeInput, now: string): Record<string, Mistake> {
  const key = `${m.wordId}::${m.category}`
  const prev = map[key]
  const next: Mistake = prev
    ? {
        ...prev, count: prev.count + 1, lastAt: now, resolved: false, source: m.source,
        wrongAnswers: m.wrongAnswer ? Array.from(new Set([m.wrongAnswer, ...prev.wrongAnswers])).slice(0, 6) : prev.wrongAnswers,
        history: [...prev.history, { at: now, correct: false }].slice(-30),
      }
    : { key, wordId: m.wordId, category: m.category, source: m.source, count: 1, wrongAnswers: m.wrongAnswer ? [m.wrongAnswer] : [], firstAt: now, lastAt: now, history: [{ at: now, correct: false }], resolved: false }
  return { ...map, [key]: next }
}

/** Ghi nhận câu trả lời đúng cho các lỗi đang mở → lịch sử cải thiện. */
function applyImprovement(map: Record<string, Mistake>, wordId: string, now: string): Record<string, Mistake> {
  let changed = false
  const out = { ...map }
  Object.values(map).forEach((m) => {
    if (m.wordId !== wordId || m.resolved) return
    changed = true
    const history = [...m.history, { at: now, correct: true }].slice(-30)
    const streak = [...history].reverse().findIndex((h) => !h.correct)
    out[m.key] = { ...m, history, resolved: (streak === -1 ? history.length : streak) >= 3 }
  })
  return changed ? out : map
}

export const useHub = create<HubData & HubActions>()(
  persist(
    (set, get) => ({
      ...initialData(),

      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p, goals: { ...s.settings.goals, ...(p.goals ?? {}) } } })),

      toggleFavorite: (id) => set((s) => {
        const st = s.progress[id] ?? blankState(id)
        return { progress: { ...s.progress, [id]: { ...st, favorite: !st.favorite } } }
      }),

      toggleReviewList: (id) => set((s) => {
        const st = s.progress[id] ?? blankState(id)
        const on = !st.inReviewList
        return { progress: { ...s.progress, [id]: { ...st, inReviewList: on, addedToListAt: on ? new Date().toISOString() : st.addedToListAt } } }
      }),

      markLearned: (ids) => set((s) => {
        const now = new Date()
        const progress = { ...s.progress }
        ids.forEach((id) => {
          const st = progress[id] ?? blankState(id)
          if (st.srs.reps > 0) return
          const srs = schedule(st.srs, 'good', now)
          progress[id] = { ...st, srs, status: statusFromInterval(srs.interval, srs.reps), firstLearnedAt: st.firstLearnedAt ?? now.toISOString() }
        })
        return { progress }
      }),

      reviewCard: (id, rating, mode) => set((s) => {
        const now = new Date()
        const st = s.progress[id] ?? blankState(id)
        const srs = schedule(st.srs, rating, now)
        const ok = rating !== 'again'
        const next: UserWordState = {
          ...st, srs, status: statusFromInterval(srs.interval, srs.reps),
          correct: st.correct + (ok ? 1 : 0), wrong: st.wrong + (ok ? 0 : 1),
          firstLearnedAt: st.firstLearnedAt ?? now.toISOString(),
        }
        const iso = now.toISOString()
        let mistakes = s.mistakes
        if (!ok) mistakes = applyMistake(mistakes, { wordId: id, category: 'meaning', source: 'flashcards' }, iso)
        else mistakes = applyImprovement(mistakes, id, iso)
        return {
          progress: { ...s.progress, [id]: next },
          reviewLogs: trim([...s.reviewLogs, { id: uid('rv'), wordId: id, at: iso, rating, mode, intervalAfter: srs.interval }]),
          mistakes,
        }
      }),

      recordOutcome: (wordId, correct) => set((s) => {
        const st = s.progress[wordId] ?? blankState(wordId)
        return {
          progress: { ...s.progress, [wordId]: { ...st, correct: st.correct + (correct ? 1 : 0), wrong: st.wrong + (correct ? 0 : 1) } },
          mistakes: correct ? applyImprovement(s.mistakes, wordId, new Date().toISOString()) : s.mistakes,
        }
      }),

      recordSpelling: (session, attempts, mistakeInputs) => set((s) => {
        const iso = new Date().toISOString()
        let mistakes = s.mistakes
        const progress = { ...s.progress }
        attempts.forEach((a) => {
          const st = progress[a.wordId] ?? blankState(a.wordId)
          progress[a.wordId] = { ...st, correct: st.correct + (a.correct ? 1 : 0), wrong: st.wrong + (a.correct ? 0 : 1) }
          if (a.correct) mistakes = applyImprovement(mistakes, a.wordId, iso)
        })
        mistakeInputs.forEach((m) => (mistakes = applyMistake(mistakes, m, iso)))
        return { spellingSessions: trim([...s.spellingSessions, session]), spellingAttempts: trim([...s.spellingAttempts, ...attempts]), progress, mistakes }
      }),

      recordQuiz: (result, mistakeInputs) => set((s) => {
        const iso = new Date().toISOString()
        let mistakes = s.mistakes
        const progress = { ...s.progress }
        result.items.forEach((it) => {
          if (!it.wordId) return
          const st = progress[it.wordId] ?? blankState(it.wordId)
          progress[it.wordId] = { ...st, correct: st.correct + (it.correct ? 1 : 0), wrong: st.wrong + (it.correct ? 0 : 1) }
          if (it.correct) mistakes = applyImprovement(mistakes, it.wordId, iso)
        })
        mistakeInputs.forEach((m) => (mistakes = applyMistake(mistakes, m, iso)))
        return { quizResults: trim([...s.quizResults, result]), progress, mistakes }
      }),

      addMistake: (m) => set((s) => ({ mistakes: applyMistake(s.mistakes, m, new Date().toISOString()) })),
      resolveMistake: (key, resolved = true) => set((s) => (s.mistakes[key] ? { mistakes: { ...s.mistakes, [key]: { ...s.mistakes[key], resolved } } } : {})),
      deleteMistake: (key) => set((s) => { const m = { ...s.mistakes }; delete m[key]; return { mistakes: m } }),

      logStudyTime: (module, ms) => {
        if (ms < 1000) return
        const date = dayKey()
        const id = `${date}::${module}`
        set((s) => {
          const prev = s.sessions[id]
          return { sessions: { ...s.sessions, [id]: prev ? { ...prev, durationMs: prev.durationMs + ms } : { id, date, module, startedAt: new Date().toISOString(), durationMs: ms } } }
        })
      },

      savePersonal: (w) => {
        const now = new Date().toISOString()
        const existing = w.id ? get().personal.find((p) => p.id === w.id) : undefined
        const rec: PersonalWord = existing ? { ...existing, ...w, id: existing.id, updatedAt: now } : { ...w, id: uid('pw'), createdAt: now, updatedAt: now }
        set((s) => ({ personal: existing ? s.personal.map((p) => (p.id === rec.id ? rec : p)) : [rec, ...s.personal] }))
        return rec
      },
      deletePersonal: (id) => set((s) => ({ personal: s.personal.filter((p) => p.id !== id) })),

      importWords: (words) => set((s) => ({ customWords: [...s.customWords, ...words] })),
      deleteCustomWord: (id) => set((s) => {
        const progress = { ...s.progress }; delete progress[id]
        return { customWords: s.customWords.filter((w) => w.id !== id), progress }
      }),
      saveEnrichment: (e) => set((s) => ({ enrichments: { ...s.enrichments, [e.wordId]: e } })),
      setDailyPlan: (date, ids) => set({ dailyPlan: { date, wordIds: ids } }),
      setWordOfDayAnswered: (date, correct) => set((s) => ({ wordOfDayQuiz: { ...s.wordOfDayQuiz, [date]: correct } })),
      replaceAll: (data) => set({ ...initialData(), ...data }),
      resetAll: () => set(initialData()),
    }),
    {
      name: 'englishhub.v1',
      version: 1,
      storage: createJSONStorage(() => activeAdapter),
      partialize: (s) => {
        const { settings, customWords, enrichments, progress, reviewLogs, spellingAttempts, spellingSessions, quizResults, mistakes, sessions, personal, dailyPlan, wordOfDayQuiz } = s
        return { settings, customWords, enrichments, progress, reviewLogs, spellingAttempts, spellingSessions, quizResults, mistakes, sessions, personal, dailyPlan, wordOfDayQuiz }
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<HubData>
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}), goals: { ...DEFAULT_SETTINGS.goals, ...(p.settings?.goals ?? {}) } } }
      },
    },
  ),
)

/** Toàn bộ kho = seed + từ đã nhập. */
let cacheKey: Word[] | null = null
let cacheAll: Word[] = SEED_VOCABULARY
export function allWords(custom: Word[]): Word[] {
  if (custom !== cacheKey) { cacheKey = custom; cacheAll = [...SEED_VOCABULARY, ...custom] }
  return cacheAll
}
export const useAllWords = () => allWords(useHub((s) => s.customWords))

const selectData = (s: HubData): HubData => ({
  settings: s.settings, customWords: s.customWords, enrichments: s.enrichments, progress: s.progress, reviewLogs: s.reviewLogs,
  spellingAttempts: s.spellingAttempts, spellingSessions: s.spellingSessions, quizResults: s.quizResults, mistakes: s.mistakes,
  sessions: s.sessions, personal: s.personal, dailyPlan: s.dailyPlan, wordOfDayQuiz: s.wordOfDayQuiz,
})
/** Ảnh chụp dữ liệu có phản ứng (re-render khi bất kỳ phần dữ liệu nào đổi). */
export const useData = () => useHub(useShallow(selectData))

export function getData(): HubData {
  const s = useHub.getState()
  return {
    settings: s.settings, customWords: s.customWords, enrichments: s.enrichments, progress: s.progress, reviewLogs: s.reviewLogs,
    spellingAttempts: s.spellingAttempts, spellingSessions: s.spellingSessions, quizResults: s.quizResults, mistakes: s.mistakes,
    sessions: s.sessions, personal: s.personal, dailyPlan: s.dailyPlan, wordOfDayQuiz: s.wordOfDayQuiz,
  }
}
