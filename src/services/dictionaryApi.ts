/**
 * DICTIONARY API — https://dictionaryapi.dev (miễn phí, không cần API key).
 * Nội dung lấy từ Wiktionary, giấy phép CC BY-SA 3.0. Chỉ dùng để BỔ SUNG
 * phiên âm, audio, định nghĩa, đồng nghĩa; không bao giờ gán cấp độ CEFR.
 */
import { z } from 'zod'
import type { Enrichment } from '../domain/types'

const Phonetic = z.object({ text: z.string().optional(), audio: z.string().optional() })
const Definition = z.object({ definition: z.string(), example: z.string().optional(), synonyms: z.array(z.string()).optional(), antonyms: z.array(z.string()).optional() })
const Meaning = z.object({ partOfSpeech: z.string(), definitions: z.array(Definition), synonyms: z.array(z.string()).optional(), antonyms: z.array(z.string()).optional() })
const Entry = z.object({
  word: z.string(),
  phonetics: z.array(Phonetic).default([]),
  meanings: z.array(Meaning).default([]),
  sourceUrls: z.array(z.string()).optional(),
})
const Response = z.array(Entry)

export class DictionaryError extends Error {
  readonly code: 'not_found' | 'network' | 'invalid' | 'rate_limit'
  constructor(message: string, code: 'not_found' | 'network' | 'invalid' | 'rate_limit') { super(message); this.code = code }
}

export async function fetchEnrichment(wordId: string, word: string, signal?: AbortSignal): Promise<Enrichment> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`
  let res: globalThis.Response
  try {
    res = await fetch(url, { signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new DictionaryError('Không kết nối được tới Dictionary API. Kiểm tra mạng và thử lại.', 'network')
  }
  if (res.status === 404) throw new DictionaryError(`Dictionary API không có mục từ “${word}”.`, 'not_found')
  if (res.status === 429) throw new DictionaryError('Dictionary API đang giới hạn số lượt gọi. Thử lại sau ít phút.', 'rate_limit')
  if (!res.ok) throw new DictionaryError(`Dictionary API trả lỗi ${res.status}.`, 'network')
  const parsed = Response.safeParse(await res.json())
  if (!parsed.success || !parsed.data.length) throw new DictionaryError('Dữ liệu trả về không đúng định dạng mong đợi.', 'invalid')
  const entries = parsed.data
  const phon = entries.flatMap((e) => e.phonetics)
  const pick = (re: RegExp) => phon.find((p) => p.audio && re.test(p.audio))
  const uk = pick(/-uk\.mp3$/), us = pick(/-us\.mp3$/)
  const anyText = phon.find((p) => p.text)?.text
  const meanings = entries.flatMap((e) => e.meanings)
  return {
    wordId,
    fetchedAt: new Date().toISOString(),
    sourceUrl: entries[0].sourceUrls?.[0] ?? `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
    license: 'CC BY-SA 3.0 (Wiktionary qua dictionaryapi.dev)',
    ipa: { uk: uk?.text ?? anyText, us: us?.text ?? anyText },
    audio: { uk: uk?.audio || undefined, us: us?.audio || undefined },
    definitions: meanings.flatMap((m) => m.definitions.slice(0, 2).map((d) => ({ pos: m.partOfSpeech, definition: d.definition, example: d.example }))).slice(0, 6),
    synonyms: Array.from(new Set(meanings.flatMap((m) => [...(m.synonyms ?? []), ...m.definitions.flatMap((d) => d.synonyms ?? [])]))).slice(0, 10),
    antonyms: Array.from(new Set(meanings.flatMap((m) => [...(m.antonyms ?? []), ...m.definitions.flatMap((d) => d.antonyms ?? [])]))).slice(0, 10),
  }
}
