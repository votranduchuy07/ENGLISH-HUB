import clsx from 'clsx'
import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { BookStack } from '../illustrations'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-2/3" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

export function EmptyState({ title, children, action, illustration }: { title: string; children?: ReactNode; action?: ReactNode; illustration?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 text-gold">{illustration ?? <BookStack className="h-24 w-24" />}</div>
      <h3 className="display text-2xl text-ink">{title}</h3>
      {children && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Đã có lỗi xảy ra', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-bad/35 bg-bad/6 p-4 text-sm">
      <AlertTriangle className="mt-0.5 shrink-0 text-bad" size={18} />
      <div className="flex-1">
        <div className="font-semibold text-bad">{title}</div>
        <p className="mt-0.5 text-ink-2">{message}</p>
      </div>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Thử lại</Button>}
    </div>
  )
}
