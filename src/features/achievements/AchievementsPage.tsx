import clsx from 'clsx'
import { motion } from 'framer-motion'
import { Award, BookMarked, BookOpen, Flame, Headphones, Layers, NotebookPen, Sparkles, SpellCheck, Target, Trophy, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { PageHeader, SectionTitle } from '../../components/ui/PageHeader'
import { ProgressBar } from '../../components/ui/Progress'
import { badges, levelInfo, totalXp, weeklyChallenges, XP_RULES } from '../../domain/gamification'
import { useStudyTimer } from '../../hooks'
import { useAllWords, useData } from '../../store/useHub'

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles, book: BookOpen, trophy: Trophy, flame: Flame, layers: Layers, spell: SpellCheck, target: Target, headphones: Headphones, notebook: NotebookPen, dict: BookMarked,
}

export default function AchievementsPage() {
  useStudyTimer('library')
  const d = useData()
  const words = useAllWords()
  const xp = useMemo(() => totalXp(d), [d])
  const lv = levelInfo(xp)
  const bs = useMemo(() => badges(d, words), [d, words])
  const ch = useMemo(() => weeklyChallenges(d), [d])
  const earned = bs.filter((b) => b.earned).length

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 lg:py-10">
      <PageHeader no="12" kicker="Achievements" title="Thành" italic="tích"
        lead="Điểm kinh nghiệm, cấp độ và huy hiệu được tính từ chính lịch sử học của bạn. Học đều mỗi ngày quan trọng hơn học dồn."
        actions={<span className="font-mono text-xs text-muted">{earned}/{bs.length} huy hiệu</span>} />

      <section className="wine mb-8 p-7">
        <div className="flex flex-wrap items-center gap-6">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/10 backdrop-blur">
            <div className="text-center"><div className="font-mono text-[0.6rem] tracking-[0.25em] text-on-dark/70 uppercase">Cấp</div><div className="display text-5xl leading-none">{lv.level}</div></div>
          </div>
          <div className="min-w-[14rem] flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="display text-3xl">{lv.title}</h2>
              <span className="font-mono text-sm text-on-dark/80">{xp} XP</span>
            </div>
            <div className="mt-3"><ProgressBar value={lv.into} max={lv.span} tone="gold" height={9} /></div>
            <p className="mt-2 font-mono text-xs text-on-dark/70">Còn {lv.next - xp} XP nữa để lên cấp {lv.level + 1}</p>
          </div>
        </div>
        <p className="mt-5 border-t border-white/20 pt-3 text-xs text-on-dark/70">
          Cách tính XP: ôn thẻ +{XP_RULES.review} · từ mới +{XP_RULES.newWord} · chính tả đúng +{XP_RULES.spellingRight} · câu kiểm tra đúng +{XP_RULES.quizRight} · hoàn thành bài +{XP_RULES.quizDone} · mỗi ngày có học +{XP_RULES.activeDay} · từ cá nhân +{XP_RULES.personalWord}
        </p>
      </section>

      <section className="mb-10">
        <SectionTitle numeral="i" aside={<span className="font-mono text-xs text-muted">7 ngày gần nhất</span>}>Thử thách tuần này</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ch.map((c) => (
            <li key={c.id} className={clsx('sheet p-4', c.done && 'border-ok/50')}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-lg text-ink">{c.name}</span>
                <span className={clsx('font-mono text-xs', c.done ? 'text-ok' : 'text-muted')}>{c.done ? 'Hoàn thành ✓' : `${Math.min(c.value, c.target)}/${c.target}`}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{c.desc}</p>
              <div className="mt-3"><ProgressBar value={c.value} max={c.target} tone={c.done ? 'forest' : 'burgundy'} height={5} /></div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle numeral="ii">Huy hiệu</SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bs.map((b, i) => {
            const Icon = ICONS[b.icon] ?? Award
            return (
              <motion.li key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.025 }}
                className={clsx('sheet flex items-center gap-4 p-4', b.earned ? 'border-gold/60' : 'opacity-70')}>
                <span className={clsx('grid h-12 w-12 shrink-0 place-items-center rounded-xl', b.earned ? 'bg-gradient-to-br from-burgundy to-gold text-white shadow-[0_0_18px_-4px_var(--glow)]' : 'border border-rule-strong text-muted')}><Icon size={22} strokeWidth={1.6} /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base text-ink">{b.name}</div>
                  <div className="text-xs text-muted">{b.desc}</div>
                  {!b.earned && <div className="mt-2"><ProgressBar value={b.value} max={b.target} tone="burgundy" height={4} /></div>}
                </div>
                {b.earned && <span className="font-mono text-[0.62rem] tracking-widest text-gold-ink uppercase">Đạt</span>}
              </motion.li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
