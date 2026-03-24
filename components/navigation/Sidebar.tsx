'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Brain,
  AlertTriangle,
  Zap,
  LogOut,
  ChevronRight,
  Settings,
  FolderKanban,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import toast from 'react-hot-toast'

const NAV = [
  { href: '/', icon: LayoutDashboard, label: 'Portfolio', section: 'main' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics', section: 'main' },
  { href: '/resources', icon: Users, label: 'Ressourcen', section: 'main' },
  { href: '/team', icon: FolderKanban, label: 'Team', section: 'main' },
  { href: '/governance', icon: ShieldCheck, label: 'Governance', section: 'main' },
  { href: '/imports', icon: Upload, label: 'Import Center', section: 'main' },
  { href: '/ai', icon: Brain, label: 'AI Assistant', section: 'tools' },
  { href: '/risks', icon: AlertTriangle, label: 'Alle Risiken', section: 'tools' },
  { href: '/settings', icon: Settings, label: 'Einstellungen', section: 'tools' },
]

export function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    toast.success('Abgemeldet')
    router.push('/login')
  }

  const mainNav = NAV.filter(n => n.section === 'main')
  const toolsNav = NAV.filter(n => n.section === 'tools')

  return (
    <aside className="h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-gray-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">realcore PM</p>
          <p className="text-xs text-gray-500">RealCore Projektportfolio</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        <div className="space-y-1">
          <p className="text-xs text-gray-600 font-medium px-3 uppercase tracking-wider mb-2">
            Navigation
          </p>
          {mainNav.map(({ href, icon: Icon, label }) => {
            const active = path === href
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
                </motion.div>
              </Link>
            )
          })}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-600 font-medium px-3 uppercase tracking-wider mb-2">
            Tools
          </p>
          {toolsNav.map(({ href, icon: Icon, label }) => {
            const active = path === href
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
                </motion.div>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'MM'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name ?? 'Benutzer'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
