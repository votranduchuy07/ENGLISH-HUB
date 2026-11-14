import clsx from 'clsx'
import { BookmarkPlus, Check, Heart, ListPlus } from 'lucide-react'
import type { Word } from '../../domain/types'
import { useHub } from '../../store/useHub'
import { toast } from '../ui/Toast'

/** Yêu thích · Thêm vào danh sách ôn · Thêm vào từ điển cá nhân. */
export function WordActions({ word, size = 'md', showLabels }: { word: Word; size?: 'sm' | 'md'; showLabels?: boolean }) {
  const st = useHub((s) => s.progress[word.id])
  const inDict = useHub((s) => s.personal.some((p) => p.linkedWordId === word.id))
  const toggleFavorite = useHub((s) => s.toggleFavorite)
  const toggleReviewList = useHub((s) => s.toggleReviewList)
  const savePersonal = useHub((s) => s.savePersonal)
  const fav = !!st?.favorite, rev = !!st?.inReviewList
  const cls = (on: boolean, tone: string) => clsx('inline-flex items-center gap-1.5 rounded-full border transition-colors', size === 'sm' ? 'p-1.5' : showLabels ? 'px-3 py-1.5 text-xs' : 'p-2',
    on ? tone : 'border-rule-strong text-muted hover:border-gold hover:text-gold-ink')
  const s = size === 'sm' ? 13 : 15
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button aria-pressed={fav} aria-label="Yêu thích" title="Yêu thích" className={cls(fav, 'border-burgundy bg-burgundy text-on-dark')} onClick={() => toggleFavorite(word.id)}>
        <Heart size={s} fill={fav ? 'currentColor' : 'none'} />{showLabels && (fav ? 'Đã thích' : 'Yêu thích')}
      </button>
      <button aria-pressed={rev} aria-label="Thêm vào danh sách ôn tập" title="Danh sách ôn tập" className={cls(rev, 'border-forest bg-forest text-on-dark')}
        onClick={() => { toggleReviewList(word.id); toast.ok(rev ? `Đã bỏ “${word.word}” khỏi danh sách ôn` : `Đã thêm “${word.word}” vào danh sách ôn tập`) }}>
        {rev ? <Check size={s} /> : <ListPlus size={s} />}{showLabels && (rev ? 'Trong danh sách ôn' : 'Cần ôn tập')}
      </button>
      <button aria-label="Thêm vào từ điển cá nhân" title="Từ điển cá nhân" className={cls(inDict, 'border-gold bg-gold text-charcoal')} disabled={inDict}
        onClick={() => {
          savePersonal({ word: word.word, meaning: word.meaningVi, ipa: word.ipa.uk ?? '', example: word.examples[0]?.en ?? '', topic: word.topics[0] ?? '', note: '', linkedWordId: word.id })
          toast.ok(`Đã chép “${word.word}” vào từ điển cá nhân`)
        }}>
        <BookmarkPlus size={s} />{showLabels && (inDict ? 'Đã có trong sổ' : 'Vào từ điển của tôi')}
      </button>
    </div>
  )
}
