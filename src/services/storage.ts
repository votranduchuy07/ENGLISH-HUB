/**
 * STORAGE ADAPTER
 * v1: LocalStorage (đồng bộ, offline). Store Zustand chỉ biết tới interface này,
 * nên khi nâng cấp chỉ cần cài một adapter khác (ví dụ ghi đệm + đồng bộ Supabase
 * theo các bảng trong supabase/schema.sql) mà không phải sửa UI hay domain.
 */
import type { StateStorage } from 'zustand/middleware'

export interface StorageAdapter extends StateStorage {
  readonly kind: 'local' | 'supabase'
  usageBytes(): number
}

export const localAdapter: StorageAdapter = {
  kind: 'local',
  getItem: (name) => {
    try { return localStorage.getItem(name) } catch { return null }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value) } catch (e) {
      console.error('[EnglishHub] Không thể lưu dữ liệu (bộ nhớ đầy?)', e)
      window.dispatchEvent(new CustomEvent('hub:storage-error'))
    }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name) } catch { /* ignore */ }
  },
  usageBytes: () => {
    try {
      let n = 0
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!
        n += k.length + (localStorage.getItem(k)?.length ?? 0)
      }
      return n * 2
    } catch { return 0 }
  },
}

/**
 * Supabase adapter (v2) — khung tích hợp.
 * Thiết lập: tạo project Supabase, chạy supabase/schema.sql, khai báo
 * VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env.local (anon key là khóa
 * công khai; quyền truy cập được bảo vệ bằng Row Level Security). KHÔNG đưa
 * service_role key vào mã frontend.
 */
export const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export const activeAdapter: StorageAdapter = localAdapter
