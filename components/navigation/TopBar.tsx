'use client'

import { Menu, Search, Plus, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { useAccessMatrix } from '@/lib/hooks/useAccessMatrix'
import { useAuthStore } from '@/lib/store/authStore'
import { useTheme } from 'next-themes'

interface Props {
  onToggleSidebar: () => void
  onNewProject?: () => void
}

export function TopBar({ onToggleSidebar, onNewProject }: Props) {
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)
  const { user } = useAuthStore()
  const { can } = useAccessMatrix()
  const { theme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4 flex-shrink-0">
      <button
        onClick={onToggleSidebar}
        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Projekte suchen..."
          className="input pl-9 py-1.5"
        />
      </div>
      <div className="flex-1" />

      {can('managePortfolio') && (
        <button onClick={onNewProject} className="btn-primary">
          <Plus className="w-4 h-4" /> Projekt
        </button>
      )}
      {mounted && (
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn-ghost">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      )}
      <NotificationBell />
      <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
          {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'MM'}
        </div>
        <div className="hidden md:block">
          <p className="text-xs font-medium text-white">{user?.name ?? 'Benutzer'}</p>
          <p className="text-xs text-gray-500">{user?.role ?? ''}</p>
        </div>
      </div>
    </header>
  )
}
