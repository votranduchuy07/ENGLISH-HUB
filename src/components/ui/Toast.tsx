import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { create } from 'zustand'

type Kind = 'ok' | 'error' | 'info'
interface T { id: number; kind: Kind; text: string }

const useToasts = create<{ list: T[]; push: (kind: Kind, text: string) => void }>((set) => ({
  list: [],
  push: (kind, text) => {
    const id = Date.now() + Math.random()
    set((s) => ({ list: [...s.list.slice(-3), { id, kind, text }] }))
    setTimeout(() => set((s) => ({ list: s.list.filter((t) => t.id !== id) })), 3600)
  },
}))

export const toast = {
  ok: (t: string) => useToasts.getState().push('ok', t),
  error: (t: string) => useToasts.getState().push('error', t),
  info: (t: string) => useToasts.getState().push('info', t),
}

export function Toaster() {
  const list = useToasts((s) => s.list)
  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-[60] flex w-[min(92vw,360px)] flex-col gap-2 lg:bottom-6" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => {
          const Icon = t.kind === 'ok' ? CheckCircle2 : t.kind === 'error' ? XCircle : Info
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="leather pointer-events-auto flex items-start gap-2.5 px-4 py-3 text-sm">
              <Icon size={17} className={t.kind === 'ok' ? 'text-[#8fd1a8]' : t.kind === 'error' ? 'text-[#f0a0a8]' : 'text-gold'} />
              <span className="leading-snug">{t.text}</span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
