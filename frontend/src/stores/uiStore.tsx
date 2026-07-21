import { create } from 'zustand'

interface UIStore {
  toastMessage: string | null
  toastVisible: boolean
  showToast: (msg: string) => void
  hideToast: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  toastMessage: null,
  toastVisible: false,

  showToast: (msg: string) => {
    set({ toastMessage: msg, toastVisible: true })

    // Auto-hide after 3 seconds
    setTimeout(() => {
      set({ toastVisible: false, toastMessage: null })
    }, 3000)
  },

  hideToast: () => {
    set({ toastVisible: false, toastMessage: null })
  },
}))
