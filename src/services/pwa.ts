/** PWA: cài lên màn hình chính + nhắc học bằng thông báo của trình duyệt (chỉ hoạt động khi trang đang mở hoặc app đã cài). */
import { useEffect, useState } from 'react'

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; listeners.forEach((l) => l()) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((l) => l()) })
}

export function usePwaInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)
  return {
    canInstall: !!deferred,
    installed: standalone,
    install: async () => {
      if (!deferred) return false
      await deferred.prompt()
      const r = await deferred.userChoice
      deferred = null
      listeners.forEach((l) => l())
      return r.outcome === 'accepted'
    },
  }
}

export const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window

export async function requestNotifications(): Promise<NotificationPermission> {
  if (!notificationsSupported) return 'denied'
  return Notification.requestPermission()
}

export async function showReminder(title: string, body: string) {
  if (!notificationsSupported || Notification.permission !== 'granted') return false
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (reg) await reg.showNotification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg', tag: 'english-hub-reminder' })
    else new Notification(title, { body, icon: '/favicon.svg', tag: 'english-hub-reminder' })
    return true
  } catch { return false }
}
