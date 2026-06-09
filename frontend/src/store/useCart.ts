import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from '@/lib/types'

const DELIVERY_FEE = 1500
const FREE_DELIVERY_THRESHOLD = 15000

interface CartState {
  items: CartItem[]
  add: (product: Product, quantity?: number) => void
  remove: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clear: () => void
  count: () => number
  subtotal: () => number
  deliveryFee: () => number
  total: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            }
          }
          return { items: [...s.items, { product, quantity }] }
        }),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.product.id !== productId) })),
      setQuantity: (productId, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.product.id !== productId)
              : s.items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      deliveryFee: () => {
        const sub = get().subtotal()
        return sub === 0 || sub >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
      },
      total: () => get().subtotal() + get().deliveryFee(),
    }),
    { name: 'florahub-cart' },
  ),
)
