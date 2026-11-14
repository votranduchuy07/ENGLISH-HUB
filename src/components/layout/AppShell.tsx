import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Layers, Menu, Moon, Sun, X } from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { dueWords, streak } from '../../domain/analytics'
import { useTheme } from '../../hooks'
import { useReminder } from '../../hooks/useReminder'
import { getData, useAllWords, useHub } from '../../store/useHub'
import { ExLibris } from '../illustrations'
import { PageSkeleton } from '../ui/States'
import { Toaster } from '../ui/Toast'
import { MOBILE_PRIMARY, NAV } from './nav'

function useBadges() {
  const words = useAllWords()
  const progress = useHub((s) => s.progress)
  const mistakes = useHub((s) => s.mistakes)
  return useMemo(() => {
    const d = getData()
    return { due: dueWords({ ...d, progress }, words).length, mistakes: Object.values(mistakes).filter((m) => !m.resolved).length }
  }, [words, progress, mistakes])
}

function useIsDark() {
  const theme = useHub((s) => s.settings.theme)
  return theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

function ThemeButton() {
  const update = useHub((s) => s.updateSettings)
  const isDark = useIsDark()
  return (
    <button onClick={() => update({ theme: isDark ? 'light' : 'dark' })} aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className="grid h-9 w-9 place-items-center rounded-lg border border-rule-strong text-ink-2 transition-colors hover:border-gold hover:text-gold-ink">
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

function useStreak() {
  const activity = useHub((s) => s.reviewLogs.length + s.quizResults.length + s.spellingSessions.length + Object.keys(s.progress).length)
  return useMemo(() => streak(getData()), [activity])
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const badges = useBadges()
  const name = useHub((s) => s.settings.name)
  const st = useStreak()
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-4">
        <NavLink to="/" onClick={onNavigate} className="group flex items-center gap-3">
          <ExLibris className="h-10 w-10 shrink-0 text-gold drop-shadow-[0_0_8px_var(--glow)] transition-transform duration-500 group-hover:scale-110" />
          <div>
            <div className="display text-[1.4rem] leading-none text-on-dark">English <span className="grad-text">Hub</span></div>
            <div className="mt-1.5 font-mono text-[0.58rem] tracking-[0.24em] text-on-dark/50 uppercase">Learning OS · v2.0</div>
          </div>
        </NavLink>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Điều hướng chính">
        {NAV.map((g, gi) => (
          <div key={g.title} className="mb-3">
            <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
              <span className="font-mono text-[0.6rem] text-gold">{String(gi + 1).padStart(2, '0')}</span>
              <span className="text-[0.6rem] font-semibold tracking-[0.22em] text-on-dark/45 uppercase">{g.title}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
            </div>
            {g.items.map((it) => {
              const Icon = it.icon
              const count = it.badge ? badges[it.badge] : 0
              return (
                <NavLink key={it.to} to={it.to} end={it.to === '/'} onClick={onNavigate}
                  className={({ isActive }) => clsx('group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[0.86rem] transition-all',
                    isActive ? 'bg-gradient-to-r from-gold/15 to-transparent text-on-dark' : 'text-on-dark/65 hover:bg-white/[0.05] hover:text-on-dark')}>
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-active" className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-gold shadow-[0_0_10px_2px_var(--glow)]" />}
                      <Icon size={17} strokeWidth={1.7} className={clsx('shrink-0', isActive ? 'text-gold' : 'text-on-dark/50 group-hover:text-gold/80')} />
                      <span className="flex-1">{it.label}</span>
                      {count > 0 && <span className={clsx('rounded-full px-1.5 py-px font-mono text-[0.62rem]', it.badge === 'mistakes' ? 'bg-burgundy text-on-dark' : 'bg-gold text-charcoal')}>{count}</span>}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <Link to="/settings" onClick={onNavigate} className="mx-3 mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-gold/50">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-burgundy to-gold font-display text-sm font-bold text-white">{(name || 'H').trim().charAt(0).toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-on-dark">{name || 'Học giả'}</span>
          <span className="block text-[0.62rem] tracking-[0.16em] text-on-dark/50 uppercase">Hồ sơ & cài đặt</span>
        </span>
        <span className={clsx('flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs', st.activeToday ? 'bg-gold/20 text-gold' : 'bg-white/10 text-on-dark/60')} title="Chuỗi ngày học liên tục">
          <Flame size={12} /> {st.current}
        </span>
      </Link>
    </div>
  )
}

function DesktopTopbar({ label }: { label?: string }) {
  const badges = useBadges()
  const st = useStreak()
  return (
    <div className="sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-rule bg-bg/75 px-8 py-3 backdrop-blur-md lg:flex">
      <div className="font-mono text-xs text-muted"><span className="text-gold-ink">english-hub</span> / {label?.toLowerCase() ?? '…'}</div>
      <div className="flex items-center gap-2.5">
        {badges.due > 0 && (
          <Link to="/flashcards" className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs text-gold-ink transition-colors hover:bg-gold/20">
            <Layers size={13} /> {badges.due} thẻ đến hạn
          </Link>
        )}
        <span className={clsx('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs', st.activeToday ? 'border-burgundy/50 bg-burgundy/10 text-burgundy-ink' : 'border-rule-strong text-muted')} title="Chuỗi ngày học liên tục">
          <Flame size={13} /> {st.current} ngày
        </span>
        <ThemeButton />
      </div>
    </div>
  )
}

export function AppShell() {
  useTheme()
  useReminder()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const flat = NAV.flatMap((g) => g.items)
  const current = flat.find((i) => (i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)))

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <aside className="leather fixed inset-y-0 left-0 z-30 hidden w-[264px] rounded-none border-0 border-r border-gold/20 lg:block">
        <SidebarContent />
      </aside>

      <header className="leather sticky top-0 z-30 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden">
        <NavLink to="/" className="display flex items-center gap-2 text-lg text-on-dark"><ExLibris className="h-7 w-7 text-gold" />English <span className="grad-text">Hub</span></NavLink>
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-dark/60">{current?.label}</span>
          <button onClick={() => setOpen(true)} aria-label="Mở menu" className="rounded-md p-2 text-on-dark"><Menu size={20} /></button>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.aside className="leather absolute inset-y-0 left-0 w-[82vw] max-w-[300px] rounded-none" initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
              <button onClick={() => setOpen(false)} aria-label="Đóng menu" className="absolute top-4 right-4 text-on-dark/70"><X size={20} /></button>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <DesktopTopbar label={current?.en} />
      <main className="pb-24 lg:pb-12">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname.split('/').slice(0, 2).join('/')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-gold/25 bg-deep/95 backdrop-blur lg:hidden" aria-label="Điều hướng nhanh">
        {MOBILE_PRIMARY.map((to) => {
          const it = flat.find((i) => i.to === to)!
          const Icon = it.icon
          return (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => clsx('flex flex-col items-center gap-0.5 py-2.5 text-[0.62rem]', isActive ? 'text-gold' : 'text-on-dark/60')}>
              <Icon size={19} strokeWidth={1.7} />
              <span className="max-w-[4.5rem] truncate">{it.label.split(' ').slice(0, 2).join(' ')}</span>
            </NavLink>
          )
        })}
      </nav>
      <Toaster />
    </div>
  )
}
