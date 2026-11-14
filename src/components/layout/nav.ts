import { Mic, Trophy, BarChart3, BookMarked, BookOpenText, CalendarDays, ClipboardCheck, Headphones, Layers, LayoutDashboard, NotebookPen, Settings, SpellCheck, type LucideIcon } from 'lucide-react'

export interface NavItem { to: string; label: string; en: string; icon: LucideIcon; badge?: 'due' | 'mistakes' }
export interface NavGroup { title: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    title: 'Học tập',
    items: [
      { to: '/', label: 'Tổng quan', en: 'Dashboard', icon: LayoutDashboard },
      { to: '/daily', label: 'Học mỗi ngày', en: 'Daily Learning', icon: CalendarDays },
      { to: '/flashcards', label: 'Thẻ ghi nhớ', en: 'Flashcards', icon: Layers, badge: 'due' },
      { to: '/spelling', label: 'Chính tả hằng ngày', en: 'Daily Spelling', icon: SpellCheck },
    ],
  },
  {
    title: 'Luyện tập',
    items: [
      { to: '/listening', label: 'Luyện nghe', en: 'Listening', icon: Headphones },
      { to: '/speaking', label: 'Luyện nói', en: 'Speaking', icon: Mic },
      { to: '/quizzes', label: 'Kiểm tra kiến thức', en: 'Quizzes', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Kho từ',
    items: [
      { to: '/library', label: 'Thư viện từ vựng', en: 'Vocabulary Library', icon: BookOpenText },
      { to: '/dictionary', label: 'Từ điển cá nhân', en: 'My Dictionary', icon: BookMarked },
      { to: '/mistakes', label: 'Sổ ghi lỗi sai', en: 'Mistake Notebook', icon: NotebookPen, badge: 'mistakes' },
    ],
  },
  {
    title: 'Hồ sơ',
    items: [
      { to: '/analytics', label: 'Thống kê học tập', en: 'Learning Analytics', icon: BarChart3 },
      { to: '/achievements', label: 'Thành tích', en: 'Achievements', icon: Trophy },
      { to: '/settings', label: 'Cài đặt', en: 'Settings', icon: Settings },
    ],
  },
]

export const MOBILE_PRIMARY = ['/', '/daily', '/flashcards', '/spelling', '/library']
