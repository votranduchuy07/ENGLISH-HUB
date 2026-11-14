/** CHÍNH TẢ: so khớp ký tự (Levenshtein + truy vết), sinh từ khuyết chữ, sinh lỗi chính tả. */
import { hashString, rng } from './util'

export type DiffOp = { type: 'ok' | 'sub' | 'ins' | 'del'; expected?: string; got?: string }

/** So sánh đáp án người dùng với đáp án đúng, trả về chuỗi thao tác theo từng ký tự. */
export function charDiff(expected: string, got: string): DiffOp[] {
  const a = expected.toLowerCase(), b = got.toLowerCase()
  const n = a.length, m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i][0] = i
  for (let j = 0; j <= m; j++) dp[0][j] = j
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  const ops: DiffOp[] = []
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { ops.push({ type: 'ok', expected: expected[i - 1], got: got[j - 1] }); i--; j-- }
    else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.push({ type: 'sub', expected: expected[i - 1], got: got[j - 1] }); i--; j-- }
    else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.push({ type: 'del', expected: expected[i - 1] }); i-- }
    else { ops.push({ type: 'ins', got: got[j - 1] }); j-- }
  }
  return ops.reverse()
}

export function editDistance(a: string, b: string): number {
  return charDiff(a, b).filter((o) => o.type !== 'ok').length
}

/** Mô tả lỗi bằng tiếng Việt. */
export function describeDiff(ops: DiffOp[]): string[] {
  const out: string[] = []
  ops.forEach((o) => {
    if (o.type === 'sub') out.push(`Viết “${o.got}” thay vì “${o.expected}”`)
    if (o.type === 'del') out.push(`Thiếu chữ “${o.expected}”`)
    if (o.type === 'ins') out.push(`Thừa chữ “${o.got}”`)
  })
  return out
}

/** Ẩn một số chữ cái (giữ chữ đầu), ổn định theo seed. */
export function maskWord(word: string, seed = 0): { masked: string; hidden: number[] } {
  const r = rng(hashString(word) + seed)
  const letters = word.split('')
  const idx = letters.map((c, i) => (i > 0 && /[a-z]/i.test(c) ? i : -1)).filter((i) => i >= 0)
  const count = Math.max(1, Math.round(idx.length * (word.length <= 4 ? 0.35 : 0.42)))
  const hidden = idx.sort(() => r() - 0.5).slice(0, count).sort((a, b) => a - b)
  return { masked: letters.map((c, i) => (hidden.includes(i) ? '_' : c)).join(''), hidden }
}

const VOWELS = 'aeiou'
/** Sinh một lỗi chính tả "giống thật" (nhân đôi/bỏ phụ âm, đổi nguyên âm, ie↔ei, đảo chữ). */
export function misspell(word: string, seed = 0, avoid: Set<string> = new Set()): string {
  const r = rng(hashString(word) * 7 + seed)
  const w = word.toLowerCase()
  const candidates: string[] = []
  // nhân đôi / bỏ phụ âm đôi
  for (let i = 1; i < w.length; i++) {
    if (w[i] === w[i - 1]) candidates.push(w.slice(0, i) + w.slice(i + 1))
    else if (!VOWELS.includes(w[i]) && /[a-z]/.test(w[i]) && i < w.length - 1) candidates.push(w.slice(0, i) + w[i] + w.slice(i))
  }
  // ie ↔ ei
  if (w.includes('ie')) candidates.push(w.replace('ie', 'ei'))
  if (w.includes('ei')) candidates.push(w.replace('ei', 'ie'))
  // đổi nguyên âm
  for (let i = 1; i < w.length; i++) if (VOWELS.includes(w[i])) {
    const alt = VOWELS[(VOWELS.indexOf(w[i]) + 1 + Math.floor(r() * 4)) % 5]
    candidates.push(w.slice(0, i) + alt + w.slice(i + 1))
  }
  // đảo hai chữ kề nhau
  for (let i = 1; i < w.length - 1; i++) if (w[i] !== w[i + 1]) candidates.push(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2))
  const valid = candidates.filter((c) => c !== w && !avoid.has(c) && c.length > 1)
  if (!valid.length) return w + w[w.length - 1]
  return valid[Math.floor(r() * valid.length)]
}
