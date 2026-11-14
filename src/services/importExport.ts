/** NHẬP / XUẤT — CSV & JSON, kiểm tra từng dòng bằng zod, phát hiện trùng lặp. */
import { z } from 'zod'
import { CEFR_LEVELS, PARTS_OF_SPEECH, type Word } from '../domain/types'
import { uid } from '../domain/util'

export const CSV_COLUMNS = [
  'word', 'ipa_uk', 'ipa_us', 'pos', 'meaning_vi', 'definition_en', 'example_en', 'example_vi',
  'synonyms', 'antonyms', 'collocations', 'phrasal_verbs', 'word_family', 'cefr', 'cefr_source', 'topics',
] as const

const list = z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
  (Array.isArray(v) ? v : (v ?? '').split(/[;|]/)).map((s) => s.trim()).filter(Boolean),
)

const ImportRow = z.object({
  word: z.string().trim().min(1, 'Thiếu cột word').max(60).regex(/^[A-Za-z][A-Za-z\s'’-]*$/, 'Từ chỉ được chứa chữ cái Latin, dấu cách, gạch nối'),
  ipa_uk: z.string().trim().optional(),
  ipa_us: z.string().trim().optional(),
  pos: list.refine((v) => v.length > 0, 'Thiếu loại từ (pos)').refine((v) => v.every((p) => (PARTS_OF_SPEECH as readonly string[]).includes(p.toLowerCase())), 'Loại từ không hợp lệ'),
  meaning_vi: z.string().trim().min(1, 'Thiếu nghĩa tiếng Việt'),
  definition_en: z.string().trim().optional().default(''),
  example_en: z.string().trim().optional(),
  example_vi: z.string().trim().optional(),
  synonyms: list, antonyms: list, collocations: list, phrasal_verbs: list, word_family: list, topics: list,
  cefr: z.string().trim().toUpperCase().refine((v) => (CEFR_LEVELS as readonly string[]).includes(v), 'CEFR phải là A1–C2'),
  cefr_source: z.string().trim().optional(),
})

export interface ImportReport {
  valid: Word[]
  errors: { row: number; word?: string; message: string }[]
  duplicates: string[]
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let cur: string[] = [], field = '', q = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { cur.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      cur.push(field); field = ''
      if (cur.some((x) => x.trim())) rows.push(cur)
      cur = []
    } else field += c
  }
  cur.push(field)
  if (cur.some((x) => x.trim())) rows.push(cur)
  if (!rows.length) return []
  const head = rows[0].map((h) => h.trim().toLowerCase())
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

/**
 * Kiểm tra dữ liệu nhập. `verifiedSource` = người dùng xác nhận file đến từ nguồn CEFR
 * có kiểm chứng → các dòng có cột cefr_source được gắn 'verified'.
 */
export function validateImport(rows: unknown[], existing: Word[], verifiedSource: boolean): ImportReport {
  const known = new Set(existing.map((w) => w.word.toLowerCase()))
  const seen = new Set<string>()
  const report: ImportReport = { valid: [], errors: [], duplicates: [] }
  rows.forEach((raw, i) => {
    const r = ImportRow.safeParse(raw)
    if (!r.success) {
      report.errors.push({ row: i + 2, word: (raw as { word?: string })?.word, message: r.error.issues.map((x) => x.message).join('; ') })
      return
    }
    const d = r.data
    const key = d.word.toLowerCase()
    if (known.has(key) || seen.has(key)) { report.duplicates.push(d.word); return }
    seen.add(key)
    const verified = verifiedSource && !!d.cefr_source
    report.valid.push({
      id: uid('imp'),
      word: d.word,
      ipa: { uk: d.ipa_uk || undefined, us: d.ipa_us || d.ipa_uk || undefined },
      pos: d.pos.map((p) => p.toLowerCase()) as Word['pos'],
      meaningVi: d.meaning_vi,
      definitionEn: d.definition_en,
      examples: d.example_en ? [{ en: d.example_en, vi: d.example_vi ?? '' }] : [],
      synonyms: d.synonyms, antonyms: d.antonyms, collocations: d.collocations, phrasalVerbs: d.phrasal_verbs, wordFamily: d.word_family,
      cefr: d.cefr as Word['cefr'],
      topics: d.topics.length ? d.topics : ['abstract'],
      source: { cefr: verified ? 'verified' : 'suggested', cefrRef: d.cefr_source || 'Không ghi nguồn', content: 'import' },
      createdAt: new Date().toISOString(),
    })
  })
  return report
}

export function parseImportFile(name: string, text: string): unknown[] {
  if (name.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(text)
    const arr = Array.isArray(data) ? data : Array.isArray(data?.words) ? data.words : null
    if (!arr) throw new Error('File JSON phải là một mảng hoặc có thuộc tính "words".')
    return arr.map((w: Record<string, unknown>) => ('meaningVi' in w ? fromWordShape(w) : w))
  }
  return parseCsv(text)
}

function fromWordShape(w: Record<string, unknown>) {
  const W = w as unknown as Word
  return {
    word: W.word, ipa_uk: W.ipa?.uk, ipa_us: W.ipa?.us, pos: W.pos, meaning_vi: W.meaningVi, definition_en: W.definitionEn,
    example_en: W.examples?.[0]?.en, example_vi: W.examples?.[0]?.vi, synonyms: W.synonyms, antonyms: W.antonyms,
    collocations: W.collocations, phrasal_verbs: W.phrasalVerbs, word_family: W.wordFamily, cefr: W.cefr,
    cefr_source: W.source?.cefr === 'verified' ? W.source.cefrRef : (w as { cefr_source?: string }).cefr_source, topics: W.topics,
  }
}

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function wordsToCsv(words: Word[]): string {
  const lines = [CSV_COLUMNS.join(',')]
  words.forEach((w) => {
    const row = [w.word, w.ipa.uk ?? '', w.ipa.us ?? '', w.pos.join(';'), w.meaningVi, w.definitionEn, w.examples[0]?.en ?? '', w.examples[0]?.vi ?? '',
      w.synonyms.join(';'), w.antonyms.join(';'), w.collocations.join(';'), w.phrasalVerbs.join(';'), w.wordFamily.join(';'), w.cefr,
      w.source.cefr === 'verified' ? w.source.cefrRef ?? '' : '', w.topics.join(';')]
    lines.push(row.map((x) => esc(String(x))).join(','))
  })
  return '﻿' + lines.join('\n')
}

export function downloadFile(name: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const CSV_TEMPLATE = CSV_COLUMNS.join(',') + '\n' +
  'resilience,/rɪˈzɪliəns/,/rɪˈzɪliəns/,noun,sự kiên cường,the ability to recover quickly from difficulties,Her resilience impressed everyone.,Sự kiên cường của cô ấy khiến mọi người ấn tượng.,toughness,fragility,show resilience,,resilient,C1,Ghi tên nguồn CEFR ở đây (để trống nếu chưa xác minh),emotions\n'
