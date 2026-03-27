'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/navigation/Sidebar'
import { TopBar } from '@/components/navigation/TopBar'
import { ProjectModal } from '@/components/modals/ProjectModal'
import { canAccessRoute } from '@/lib/permissions'
import { useAccessMatrix } from '@/lib/hooks/useAccessMatrix'
import { useAuthStore } from '@/lib/store/authStore'
import { ShieldAlert } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const { can } = useAccessMatrix()
  const canManagePortfolio = can('managePortfolio')
  const allowed = canAccessRoute(pathname, user?.role)
  const [open, setOpen] = useState(true)
  const [showProjectModal, setShowProjectModal] = useState(false)

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="sidebar"
            initial={{ width: 0 }}
            animate={{ width: 256 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="w-64 h-full">
              <Sidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar
          onToggleSidebar={() => setOpen(o => !o)}
          onNewProject={() => canManagePortfolio && setShowProjectModal(true)}
        />
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {hasHydrated && !allowed ? (
              <div className="card p-8 max-w-2xl mx-auto text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-semibold text-white">Zugriff eingeschraenkt</h1>
                <p className="mt-2 text-sm text-gray-400">Ihre aktuelle Rolle darf diese Seite nicht oeffnen.</p>
                <button onClick={() => router.push('/')} className="btn-primary mt-5">Zurueck zum Portfolio</button>
              </div>
            ) : (
              children
            )}
          </motion.div>
        </main>
      </div>
      <ProjectModal open={showProjectModal && canManagePortfolio} onClose={() => setShowProjectModal(false)} />
    </div>
  )
}
