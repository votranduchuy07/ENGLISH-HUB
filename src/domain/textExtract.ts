/** TÁCH TỪ MỚI TỪ VĂN BẢN: dán một đoạn tiếng Anh, tìm những từ chưa có trong kho hay từ điển cá nhân. Hàm thuần. */
const STOP = new Set(`a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself several many much one two three four five get got like even still yet ever never always however therefore`.split(/\s+/))

export interface Candidate { word: string; count: number; example: string }

/** Các dạng gốc có thể có của một từ (đủ dùng để khớp danh từ số nhiều, động từ chia -s/-ed/-ing). */
export function stems(w: string): string[] {
  const out = new Set([w])
  if (w.endsWith('ies') && w.length > 4) out.add(w.slice(0, -3) + 'y')
  if (w.endsWith('es') && w.length > 3) out.add(w.slice(0, -2))
  if (w.endsWith('s') && w.length > 3) out.add(w.slice(0, -1))
  if (w.endsWith('ied') && w.length > 4) out.add(w.slice(0, -3) + 'y')
  if (w.endsWith('ed') && w.length > 4) { out.add(w.slice(0, -2)); out.add(w.slice(0, -1)) }
  if (w.endsWith('ing') && w.length > 5) { out.add(w.slice(0, -3)); out.add(w.slice(0, -3) + 'e') }
  if (w.endsWith('ly') && w.length > 4) out.add(w.slice(0, -2))
  return [...out]
}

/**
 * @param known tập từ đã có (kho từ + từ điển cá nhân), chữ thường.
 * Trả về các từ lạ, nhiều lần nhất trước; mỗi từ kèm một câu chứa nó để làm ví dụ.
 */
export function extractCandidates(text: string, known: Set<string>, limit = 60): Candidate[] {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)
  const map = new Map<string, Candidate>()
  for (const s of sentences) {
    for (const m of s.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)) {
      const raw = m[0].replace(/['’]s$/i, '')
      const w = raw.toLowerCase()
      if (w.length < 3 || STOP.has(w) || w.includes("'") || w.includes('’')) continue
      if (stems(w).some((x) => known.has(x))) continue
      const cur = map.get(w)
      if (cur) cur.count++
      else map.set(w, { word: w, count: 1, example: s.trim().slice(0, 220) })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)).slice(0, limit)
}
