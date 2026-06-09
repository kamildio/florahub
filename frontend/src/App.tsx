import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'

// Route-level code splitting keeps the initial bundle small.
const Catalog = lazy(() => import('@/pages/Catalog').then((m) => ({ default: m.Catalog })))
const Product = lazy(() => import('@/pages/Product').then((m) => ({ default: m.Product })))
const Cart = lazy(() => import('@/pages/Cart').then((m) => ({ default: m.Cart })))
const Checkout = lazy(() => import('@/pages/Checkout').then((m) => ({ default: m.Checkout })))
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })))
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })))
const OrderDetail = lazy(() => import('@/pages/OrderDetail').then((m) => ({ default: m.OrderDetail })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))
const AdminApp = lazy(() => import('@/pages/admin/AdminApp').then((m) => ({ default: m.AdminApp })))
const SellerApp = lazy(() => import('@/pages/seller/SellerApp').then((m) => ({ default: m.SellerApp })))

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  )
}

const withSuspense = (el: React.ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/catalog', element: withSuspense(<Catalog />) },
      { path: '/product/:slug', element: withSuspense(<Product />) },
      { path: '/cart', element: withSuspense(<Cart />) },
      { path: '/checkout', element: withSuspense(<Checkout />) },
      { path: '/login', element: withSuspense(<Login />) },
      { path: '/profile', element: withSuspense(<Profile />) },
      { path: '/order/:id', element: withSuspense(<OrderDetail />) },
      { path: '*', element: withSuspense(<NotFound />) },
    ],
  },
  // Admin & seller consoles use their own chrome (no public navbar/footer).
  { path: '/admin/*', element: withSuspense(<AdminApp />) },
  { path: '/seller/*', element: withSuspense(<SellerApp />) },
])

export function App() {
  return <RouterProvider router={router} />
}
