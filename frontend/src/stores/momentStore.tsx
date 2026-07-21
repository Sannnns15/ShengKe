import { create } from 'zustand'

interface DraftData {
  content: string
  title: string
  mood: string
  [key: string]: any
}

interface MomentStore {
  drafts: Record<string, DraftData>
  saveDraft: (key: string, draft: Partial<DraftData>) => void
  clearDraft: (key: string) => void
  currentSort: 'latest' | 'hot'
  setCurrentSort: (sort: 'latest' | 'hot') => void
}

export const useMomentStore = create<MomentStore>((set) => ({
  drafts: {},

  saveDraft: (key: string, draft: Partial<DraftData>) => {
    set((state) => ({
      drafts: {
        ...state.drafts,
        [key]: { ...state.drafts[key], ...draft } as DraftData,
      },
    }))
  },

  clearDraft: (key: string) => {
    set((state) => {
      const { [key]: _, ...rest } = state.drafts
      return { drafts: rest }
    })
  },

  currentSort: 'latest',

  setCurrentSort: (sort: 'latest' | 'hot') => {
    set({ currentSort: sort })
  },
}))
