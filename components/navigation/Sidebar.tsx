'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Brain,
  AlertTriangle,
  LogOut,
  ChevronRight,
  Settings,
  FolderKanban,
  ShieldCheck,
  Upload,
  History,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { useAccessMatrix } from '@/lib/hooks/useAccessMatrix'
import { isEntraConfigured, logoutEntra } from '@/lib/entra/client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TimeEntryNotificationDto } from '@/types'
import toast from 'react-hot-toast'

export function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const { user, authProvider, logout } = useAuthStore()
  const { can } = useAccessMatrix()
  const isManager = ['Admin', 'Management', 'PMO', 'Projektleiter'].includes(user?.role ?? '')

  const { data: notifications = [] } = useQuery<TimeEntryNotificationDto[]>({
    queryKey: ['time-notifications'],
    queryFn: () => api.timeEntries.getNotifications(),
    refetchInterval: 60_000,
    enabled: isManager,
  })
  const unreadTimeCount = (notifications as TimeEntryNotificationDto[]).filter(n => !n.isRead).length

  const handleLogout = async () => {
    logout()
    toast.success('Abgemeldet')
    if (authProvider === 'entra' && isEntraConfigured) {
      await logoutEntra()
      return
    }

    router.push('/login')
  }

  const nav = [
    { href: '/', icon: LayoutDashboard, label: 'Portfolio', section: 'main', visible: true },
    { href: '/analytics', icon: BarChart3, label: 'Analytics', section: 'main', visible: true },
    { href: '/time', icon: Clock, label: 'Zeiterfassung', section: 'main', visible: true },
    { href: '/resources', icon: Users, label: 'Ressourcen', section: 'main', visible: true },
    { href: '/team', icon: FolderKanban, label: 'Team', section: 'main', visible: can('manageTeam') },
    { href: '/governance', icon: ShieldCheck, label: 'Governance', section: 'main', visible: can('managePmo') },
    { href: '/imports', icon: Upload, label: 'Import Center', section: 'main', visible: true },
    { href: '/audit', icon: History, label: 'Audit', section: 'tools', visible: can('managePmo') },
    { href: '/ai', icon: Brain, label: 'AI Assistant', section: 'tools', visible: true },
    { href: '/risks', icon: AlertTriangle, label: 'Alle Risiken', section: 'tools', visible: true },
    { href: '/settings', icon: Settings, label: 'Einstellungen', section: 'tools', visible: can('configureIntegrations') },
  ]
  const visibleNav = nav.filter(item => item.visible)
  const mainNav = visibleNav.filter(n => n.section === 'main')
  const toolsNav = visibleNav.filter(n => n.section === 'tools')

  return (
    <aside className="h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="flex h-24 items-center justify-center border-b border-gray-800 px-5">
        <div className="relative h-14 w-40 overflow-hidden rounded-2xl bg-white/95 px-3 py-2 shadow-sm">
          <Image src="/realcorelogo.png" alt="RealCore Logo" fill className="object-contain p-2" sizes="160px" priority />
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        <div className="space-y-1">
          <p className="text-xs text-gray-600 font-medium px-3 uppercase tracking-wider mb-2">
            Navigation
          </p>
          {mainNav.map(({ href, icon: Icon, label }) => {
            const active = path === href
            const badge = href === '/time' && isManager && unreadTimeCount > 0 ? unreadTimeCount : 0
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  {badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {badge}
                    </span>
                  )}
                  {active && badge === 0 && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
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
