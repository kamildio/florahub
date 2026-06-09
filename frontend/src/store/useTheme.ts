import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

const initial: Theme =
  (typeof localStorage !== 'undefined' &&
    (JSON.parse(localStorage.getItem('florahub-theme') || '{}')?.state?.theme as Theme)) ||
  (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light')

apply(initial)

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: initial,
      setTheme: (theme) => {
        apply(theme)
        set({ theme })
      },
      toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    { name: 'florahub-theme' },
  ),
)
