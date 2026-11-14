/** NGHE – ĐIỀN TỪ / CHÉP CÂU: tách câu thành từ, chọn chỗ trống, chấm từng từ. Hàm thuần, không phụ thuộc React. */
import { hashString, rng } from './util'

export interface Token { text: string; pre: string; core: string; post: string; space: string }

/** Tách câu thành các "từ" giữ nguyên dấu câu phía trước/sau để hiển thị lại đẹp. */
export function tokenize(sentence: string): Token[] {
  return sentence.trim().split(/\s+/).filter(Boolean).map((raw) => {
    const m = raw.match(/^([^\w$]*)(.*?)([^\w%]*)$/)
    const pre = m?.[1] ?? '', core = m?.[2] ?? raw, post = m?.[3] ?? ''
    return { text: raw, pre, core, post, space: ' ' }
  })
}

export const normWord = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/^[^\w$]+|[^\w%]+$/g, '').replace(/[$]/g, '')

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that', 'these', 'those', 'you', 'your', 'we', 'our', 'i', 'he', 'she', 'they', 'will', 'would', 'could', 'should', 'can', 'may', 'must', 'have', 'has', 'had', 'not', 'all', 'any', 'please', 'if', 'as', 'so', 'than', 'then', 'there', 'here', 'who', 'what', 'which', 'when', 'where', 'my', 'me', 'us', 'do', 'does', 'did'])

/** Chọn `count` từ nội dung (không phải từ chức năng) để làm chỗ trống; ổn định theo seed. Trả về chỉ số token, đã sắp xếp. */
export function pickBlanks(tokens: Token[], count: number, seed: string): number[] {
  const r = rng(hashString(seed))
  const good = tokens.map((t, i) => ({ i, w: normWord(t.core) })).filter((x) => x.w.length >= 4 && !STOP.has(x.w))
  const okish = tokens.map((t, i) => ({ i, w: normWord(t.core) })).filter((x) => x.w.length >= 3 && !STOP.has(x.w) && !good.some((g) => g.i === x.i))
  const pool = [...good, ...okish]
  const picked: number[] = []
  const shuffled = pool.map((p) => ({ p, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.p)
  for (const c of shuffled) {
    if (picked.length >= count) break
    if (picked.some((i) => Math.abs(i - c.i) < 2 && pool.length > count * 2)) continue // tránh hai chỗ trống liền nhau nếu đủ lựa chọn
    picked.push(c.i)
  }
  return picked.sort((a, b) => a - b)
}

export type WordOp = { type: 'ok' | 'sub' | 'del' | 'ins'; expected?: string; got?: string }

/** So sánh từng từ giữa câu đúng và câu người học chép (quy hoạch động, bỏ qua hoa/thường và dấu câu). */
export function diffWords(expected: string, got: string): WordOp[] {
  const a = tokenize(expected).map((t) => t.core), b = tokenize(got).map((t) => t.core)
  const na = a.map(normWord), nb = b.map(normWord)
  const n = a.length, m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i][0] = i
  for (let j = 0; j <= m; j++) dp[0][j] = j
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (na[i - 1] === nb[j - 1] ? 0 : 1))
  const ops: WordOp[] = []
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && na[i - 1] === nb[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { ops.push({ type: 'ok', expected: a[i - 1], got: b[j - 1] }); i--; j-- }
    else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.push({ type: 'sub', expected: a[i - 1], got: b[j - 1] }); i--; j-- }
    else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.push({ type: 'del', expected: a[i - 1] }); i-- }
    else { ops.push({ type: 'ins', got: b[j - 1] }); j-- }
  }
  return ops.reverse()
}

/** Điểm 0–1 = số từ đúng / số từ của câu gốc (từ thừa bị trừ nhẹ). */
export function dictationScore(ops: WordOp[]): number {
  const total = ops.filter((o) => o.type !== 'ins').length
  if (!total) return 0
  const ok = ops.filter((o) => o.type === 'ok').length
  const extra = ops.filter((o) => o.type === 'ins').length
  return Math.max(0, (ok - extra * 0.5) / total)
}
