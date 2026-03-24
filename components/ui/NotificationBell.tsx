'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Bell, CheckCheck, CheckCircle, Clock, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Activity } from '@/types'

type NotificationItem = {
  id: string
  type: 'risk' | 'deadline' | 'task' | 'success'
  title: string
  message: string
  time: string
  read: boolean
}

const ICON: Record<string, React.ReactNode> = {
  risk: <AlertTriangle className="w-4 h-4 text-red-400" />,
  deadline: <Clock className="w-4 h-4 text-amber-400" />,
  task: <CheckCircle className="w-4 h-4 text-blue-400" />,
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
}

function mapActivity(activity: Activity): NotificationItem {
  const action = activity.action.toLowerCase()
  const type = action.includes('risiko') ? 'risk' : action.includes('status') || action.includes('task') ? 'task' : 'success'
  return {
    id: activity.id,
    type,
    title: activity.entityType,
    message: `${activity.userName} ${activity.action}`,
    time: new Date(activity.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    read: false,
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => api.activities.getAll(),
  })

  const notifs = useMemo(() => activities.map(mapActivity).filter(item => !dismissedIds.includes(item.id)).map(item => ({ ...item, read: readIds.includes(item.id) })), [activities, dismissedIds, readIds])
  const unread = notifs.filter(item => !item.read).length

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">{unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <h3 className="font-semibold text-white text-sm">Benachrichtigungen</h3>
                {unread > 0 && <button onClick={() => setReadIds(notifs.map(item => item.id))} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><CheckCheck className="w-3.5 h-3.5" /> Alle gelesen</button>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.map(item => (
                  <div key={item.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${!item.read ? 'bg-blue-950/10' : ''}`}>
                    <div className="mt-0.5 flex-shrink-0">{ICON[item.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="text-sm font-medium text-white">{item.title}</p>{!item.read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}</div>
                      <p className="text-xs text-gray-400 mt-0.5">{item.message}</p>
                      <p className="text-xs text-gray-600 mt-1">{item.time}</p>
                    </div>
                    <button onClick={() => setDismissedIds(prev => [...prev, item.id])} className="text-gray-600 hover:text-gray-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
