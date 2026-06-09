import { sleep } from './utils'
import type { Order, User } from './types'

/**
 * Front-end API client. By default it runs against an in-browser mock so the
 * app is fully usable without a backend. Set VITE_USE_REAL_API=true to route
 * the same calls to the PHP backend under /api (see backend/ and README).
 */
const USE_REAL = import.meta.env.VITE_USE_REAL_API === 'true'
const BASE = '/api'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  /** Request an SMS verification code for a phone number. */
  async requestCode(phone: string): Promise<{ sent: boolean }> {
    if (USE_REAL) return http('/auth/request-code', { method: 'POST', body: JSON.stringify({ phone }) })
    await sleep(700)
    return { sent: true }
  },

  /** Verify the SMS code and return the authenticated user. */
  async verifyCode(phone: string, code: string): Promise<User> {
    if (USE_REAL) {
      return http('/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) })
    }
    await sleep(600)
    if (code !== '1234') throw new Error('INVALID_CODE')
    const digits = phone.replace(/\D/g, '')
    return {
      id: 'u-' + digits.slice(-6),
      phone,
      name: '',
      role: 'customer',
      city: 'c1',
      createdAt: new Date().toISOString(),
    }
  },

  /** Create an order (returns the persisted order). */
  async createOrder(order: Order): Promise<Order> {
    if (USE_REAL) return http('/orders', { method: 'POST', body: JSON.stringify(order) })
    await sleep(800)
    return order
  },
}
