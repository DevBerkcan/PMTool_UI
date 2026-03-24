'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isAuthRoute = pathname === '/login'

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/login')
      return
    }

    if (isAuthenticated && isAuthRoute) {
      router.replace('/')
    }
  }, [hasHydrated, isAuthenticated, isAuthRoute, router])

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Sitzung wird geladen...
      </div>
    )
  }

  if ((!isAuthenticated && !isAuthRoute) || (isAuthenticated && isAuthRoute)) {
    return null
  }

  return <>{children}</>
}
