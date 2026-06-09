/** Shared domain types for FloraHub. */

export type Locale = 'kk' | 'ru' | 'en'

/** A localized string keyed by locale. */
export type Localized = Record<Locale, string>

export interface City {
  id: string
  /** URL slug, e.g. "shymkent". */
  slug: string
  name: Localized
  active: boolean
  /** Marks the launch / primary city. */
  primary?: boolean
}

export interface Category {
  id: string
  slug: string
  name: Localized
  icon: string
}

export interface Seller {
  id: string
  name: string
  /** Aggregate rating 0–5. */
  rating: number
  reviews: number
  city: string
  /** Year the florist joined the marketplace. */
  since: number
  verified: boolean
}

export interface Product {
  id: string
  slug: string
  name: Localized
  description: Localized
  price: number
  oldPrice?: number
  image: string
  categoryId: string
  sellerId: string
  cityIds: string[]
  rating: number
  reviews: number
  tags: ('new' | 'bestseller' | 'sale' | 'premium')[]
  inStock: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

export type OrderStatus =
  | 'pending' // awaiting confirmation
  | 'accepted' // florist accepted
  | 'assembling' // bouquet being made
  | 'delivering' // courier en route
  | 'completed'
  | 'cancelled'

export interface OrderEvent {
  status: OrderStatus
  at: string
  note?: string
}

export interface Order {
  id: string
  number: string
  createdAt: string
  status: OrderStatus
  total: number
  items: CartItem[]
  cityId: string
  recipient: {
    name: string
    phone: string
    address: string
  }
  deliveryAt: string
  sellerId: string
  timeline: OrderEvent[]
}

export type Role = 'customer' | 'seller' | 'admin'

export interface User {
  id: string
  phone: string
  name: string
  role: Role
  city: string
  createdAt: string
}
