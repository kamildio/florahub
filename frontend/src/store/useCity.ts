import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cities } from '@/data/mock'

interface CityState {
  cityId: string
  setCity: (id: string) => void
}

const defaultCity = cities.find((c) => c.primary && c.active) ?? cities[0]

export const useCity = create<CityState>()(
  persist(
    (set) => ({
      cityId: defaultCity.id,
      setCity: (cityId) => set({ cityId }),
    }),
    { name: 'florahub-city' },
  ),
)
