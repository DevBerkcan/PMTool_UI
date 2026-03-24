'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/navigation/Sidebar'
import { TopBar } from '@/components/navigation/TopBar'
import { ProjectModal } from '@/components/modals/ProjectModal'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
          onNewProject={() => setShowProjectModal(true)}
        />
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      <ProjectModal open={showProjectModal} onClose={() => setShowProjectModal(false)} />
    </div>
  )
}
