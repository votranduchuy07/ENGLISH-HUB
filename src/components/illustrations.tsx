/** Minh họa nét mảnh kiểu bản vẽ kỹ thuật (dùng currentColor để đổi màu theo ngữ cảnh). */
type P = { className?: string }
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

/** Chồng lớp dữ liệu. */
export function BookStack({ className }: P) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...S}>
      <path d="M60 22l40 18-40 18-40-18z" /><path d="M20 58l40 18 40-18" opacity=".7" /><path d="M20 76l40 18 40-18" opacity=".45" />
      <circle cx="60" cy="40" r="3" /><path d="M60 22V10M100 40h12M20 40H8" opacity=".5" /><circle cx="60" cy="8" r="2" /><circle cx="114" cy="40" r="2" /><circle cx="6" cy="40" r="2" />
    </svg>
  )
}

/** Cửa sổ terminal. */
export function FountainPen({ className }: P) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...S}>
      <rect x="14" y="22" width="92" height="76" rx="8" /><path d="M14 38h92" />
      <circle cx="26" cy="30" r="2" /><circle cx="35" cy="30" r="2" /><circle cx="44" cy="30" r="2" />
      <path d="M28 54l12 10-12 10" /><path d="M48 76h26" /><path d="M80 54h14M80 64h8" opacity=".5" />
    </svg>
  )
}

/** Bóng đèn ý tưởng kiểu mạch. */
export function DeskLamp({ className }: P) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...S}>
      <path d="M44 74c-10-8-14-16-14-26a30 30 0 0 1 60 0c0 10-4 18-14 26v8H44z" /><path d="M48 92h24M52 102h16" />
      <path d="M52 56l8-8 8 8M60 48v22" opacity=".6" /><path d="M60 10v8M20 48h8M92 48h8M30 22l6 6M90 22l-6 6" opacity=".5" />
    </svg>
  )
}

/** Sóng âm. */
export function Gramophone({ className }: P) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...S}>
      <circle cx="60" cy="60" r="40" opacity=".4" /><circle cx="60" cy="60" r="28" opacity=".7" />
      {[28, 38, 48, 58, 68, 78, 88].map((x, i) => { const h = [10, 22, 34, 44, 30, 18, 8][i]; return <path key={x} d={`M${x + 2} ${60 - h / 2}v${h}`} strokeWidth="3" /> })}
    </svg>
  )
}

/** Logo: lục giác + sóng âm. */
export function ExLibris({ className }: P) {
  return (
    <svg viewBox="0 0 120 120" className={className} {...S} strokeWidth={4}>
      <path d="M60 8l44 25v54L60 112 16 87V33z" />
      <path d="M38 60v0M48 48v24M60 38v44M72 50v20M82 58v4" strokeWidth={6} />
    </svg>
  )
}

/** Huy hiệu thành tích: vòng radar. */
export function Laurel({ className }: P) {
  return (
    <svg viewBox="0 0 120 60" className={className} {...S}>
      <path d="M12 54a48 48 0 0 1 96 0" opacity=".35" /><path d="M26 54a34 34 0 0 1 68 0" opacity=".6" /><path d="M40 54a20 20 0 0 1 40 0" />
      <path d="M60 54V14" opacity=".6" /><circle cx="60" cy="14" r="3" /><path d="M52 40l6 6 12-14" />
    </svg>
  )
}

/** Đường phân cách kiểu mạch điện. */
export function Ornament({ className }: P) {
  return (
    <svg viewBox="0 0 160 16" className={className} {...S} strokeWidth={1.2}>
      <path d="M0 8h60l6-5h28l6 5h60" opacity=".7" /><rect x="74" y="5" width="12" height="6" rx="1.5" /><circle cx="60" cy="8" r="1.6" fill="currentColor" /><circle cx="100" cy="8" r="1.6" fill="currentColor" />
    </svg>
  )
}
