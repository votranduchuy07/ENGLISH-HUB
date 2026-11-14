import clsx from 'clsx'
import { motion } from 'framer-motion'
import { Ornament } from '../../components/illustrations'
import { CefrBadge } from '../../components/ui/Badge'
import { PronounceButtons } from '../../components/vocab/Pronounce'
import { WordActions } from '../../components/vocab/WordActions'
import { POS_ABBR } from '../../data/content'
import type { Word } from '../../domain/types'

export type Direction = 'en_vi' | 'vi_en'

/** Thẻ lật 3D. Mặt trước/sau thay đổi theo hướng học (Anh→Việt hoặc Việt→Anh). */
export function FlashCard({ word, direction, flipped, onFlip }: { word: Word; direction: Direction; flipped: boolean; onFlip: () => void }) {
  const en = direction === 'en_vi'
  return (
    <div className="perspective mx-auto w-full max-w-2xl">
      <motion.div
        className="preserve-3d relative min-h-[26rem] w-full sm:min-h-[27rem]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 170, damping: 22 }}
      >
        {/* ---- Mặt trước ---- */}
        <div
          role="button" tabIndex={flipped ? -1 : 0} aria-hidden={flipped} aria-label="Lật thẻ để xem đáp án"
          onClick={onFlip} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip() } }}
          className="sheet frame-ornate backface-hidden absolute inset-0 flex cursor-pointer flex-col items-center justify-center px-8 py-10 text-center"
        >
          <div className="absolute top-5 right-5 left-5 flex items-center justify-between">
            <span className="folio">{en ? 'English → Tiếng Việt' : 'Tiếng Việt → English'}</span>
            <CefrBadge level={word.cefr} />
          </div>
          {en ? (
            <>
              <h2 className="entry-word text-[3.4rem] text-ink sm:text-[4.4rem]">{word.word}</h2>
              <div className="mt-2 font-serif text-lg text-burgundy-ink italic">{word.pos.map((p) => POS_ABBR[p]).join(', ')}</div>
              <div className="mt-4" onClick={(e) => e.stopPropagation()}><PronounceButtons word={word} /></div>
            </>
          ) : (
            <>
              <p className="font-display text-[2rem] leading-tight text-ink sm:text-[2.6rem]">{word.meaningVi}</p>
              <div className="mt-3 font-serif text-lg text-burgundy-ink italic">{word.pos.map((p) => POS_ABBR[p]).join(', ')}</div>
              <p className="serif-italic mt-4 max-w-md text-[1.05rem] text-muted">Gợi ý: bắt đầu bằng chữ “{word.word[0]}”, {word.word.length} chữ cái</p>
            </>
          )}
          <div className="absolute right-0 bottom-5 left-0 font-mono text-[0.68rem] tracking-[0.2em] text-muted uppercase">Nhấn Space hoặc chạm vào thẻ để lật</div>
        </div>

        {/* ---- Mặt sau ---- */}
        <div
          aria-hidden={!flipped}
          className="sheet frame-ornate backface-hidden absolute inset-0 overflow-y-auto px-7 py-8 sm:px-10"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={clsx('entry-word text-ink', en ? 'text-[2rem]' : 'text-[3rem]')}>{word.word}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-serif text-base text-burgundy-ink italic">{word.pos.map((p) => POS_ABBR[p]).join(', ')}</span>
                <span className="ipa">{word.ipa.uk}</span>
              </div>
            </div>
            <CefrBadge level={word.cefr} />
          </div>
          <div className="mt-3"><PronounceButtons word={word} compact /></div>
          <Ornament className="my-4 h-3 w-36 text-gold" />
          <p className="font-display text-[1.55rem] leading-snug text-ink">{word.meaningVi}</p>
          <p className="serif-italic mt-2 text-[1.08rem] leading-snug text-ink-2">“{word.definitionEn}”</p>
          {word.examples[0] && (
            <div className="mt-4 border-l-2 border-gold pl-4 text-sm">
              <p className="text-ink">{word.examples[0].en}</p>
              <p className="mt-0.5 text-muted">{word.examples[0].vi}</p>
            </div>
          )}
          {(word.synonyms.length > 0 || word.collocations.length > 0) && (
            <dl className="mt-4 grid gap-1.5 text-sm text-ink-2">
              {word.synonyms.length > 0 && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Đồng nghĩa</dt><dd>{word.synonyms.slice(0, 4).join(', ')}</dd></div>}
              {word.collocations.length > 0 && <div className="flex gap-2"><dt className="w-24 shrink-0 text-muted">Cụm hay gặp</dt><dd>{word.collocations.slice(0, 3).join(' · ')}</dd></div>}
            </dl>
          )}
          <div className="mt-5 border-t border-dashed border-rule-strong pt-4"><WordActions word={word} showLabels /></div>
        </div>
      </motion.div>
    </div>
  )
}
