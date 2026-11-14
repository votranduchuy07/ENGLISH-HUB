import clsx from 'clsx'
import { Volume2 } from 'lucide-react'
import { useSpeak } from '../../hooks'
import type { Word } from '../../domain/types'

/** Hai nút phát âm Anh-Anh / Anh-Mỹ kèm phiên âm IPA. */
export function PronounceButtons({ word, compact, onDark }: { word: Word; compact?: boolean; onDark?: boolean }) {
  const { say, speaking } = useSpeak()
  const items = [
    { accent: 'uk' as const, label: 'UK', ipa: word.ipa.uk },
    { accent: 'us' as const, label: 'US', ipa: word.ipa.us },
  ]
  return (
    <div className={clsx('flex flex-wrap items-center', compact ? 'gap-1.5' : 'gap-2')}>
      {items.map((it) => {
        const active = speaking === word.word + it.accent
        return (
          <button key={it.accent} onClick={(e) => { e.stopPropagation(); say(word.word, it.accent, word.id) }}
            className={clsx('group inline-flex items-center gap-1.5 rounded-full border transition-all',
              compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
              onDark ? 'border-gold/45 text-on-dark hover:bg-white/10' : 'border-rule-strong text-ink-2 hover:border-gold hover:text-gold-ink',
              active && 'border-gold bg-gold/15')}
            aria-label={`Phát âm ${it.label === 'UK' ? 'Anh-Anh' : 'Anh-Mỹ'}`}>
            <Volume2 size={compact ? 12 : 14} className={clsx(active && 'animate-pulse text-gold')} />
            <span className="font-mono text-[0.68em] font-semibold tracking-wider">{it.label}</span>
            {!compact && it.ipa && <span className={clsx('font-mono text-[0.82em]', onDark ? 'text-on-dark/75' : 'text-muted')}>{it.ipa}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function SpeakIcon({ text, wordId, className, size = 16 }: { text: string; wordId?: string; className?: string; size?: number }) {
  const { say, speaking } = useSpeak()
  return (
    <button onClick={(e) => { e.stopPropagation(); say(text, undefined, wordId) }} aria-label={`Nghe “${text}”`}
      className={clsx('inline-flex items-center justify-center rounded-full p-1.5 text-muted transition-colors hover:bg-gold/15 hover:text-gold-ink', speaking?.startsWith(text) && 'text-gold', className)}>
      <Volume2 size={size} />
    </button>
  )
}
