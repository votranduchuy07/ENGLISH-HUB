import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ open, onClose, title, kicker, children, width = 560, footer }: { open: boolean; onClose: () => void; title: string; kicker?: string; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-charcoal/55 backdrop-blur-[3px]" onClick={onClose} />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className="sheet frame-ornate relative max-h-[88vh] w-full overflow-hidden"
            style={{ maxWidth: width }}
            initial={{ y: 24, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule px-7 pt-6 pb-4">
              <div>
                {kicker && <div className="folio mb-1">{kicker}</div>}
                <h2 className="display text-2xl text-ink">{title}</h2>
              </div>
              <button onClick={onClose} aria-label="Đóng" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-ink"><X size={18} /></button>
            </div>
            <div className="max-h-[calc(88vh-150px)] overflow-y-auto px-7 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-rule bg-surface-2/40 px-7 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
