import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order, User } from '@/lib/types'
import { seedOrders } from '@/data/mock'

interface AuthState {
  user: User | null
  orders: Order[]
  login: (user: User) => void
  logout: () => void
  addOrder: (order: Order) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      orders: [],
      login: (user) =>
        set({
          user,
          // Seed demo history for the demo phone number on first login.
          orders: user.phone.replace(/\D/g, '').endsWith('1234567') ? seedOrders : [],
        }),
      logout: () => set({ user: null, orders: [] }),
      addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
    }),
    { name: 'florahub-auth' },
  ),
)
