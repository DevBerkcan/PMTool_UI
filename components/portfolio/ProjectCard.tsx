'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Clock, Users, DollarSign } from 'lucide-react'
import type { Project } from '@/types'

const STATUS = {
  green:  { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'On Track',  bar: 'bg-emerald-500' },
  yellow: { dot: 'bg-amber-500',   text: 'text-amber-400',   label: 'At Risk',   bar: 'bg-amber-500' },
  red:    { dot: 'bg-red-500',     text: 'text-red-400',     label: 'Kritisch',  bar: 'bg-red-500' },
}

const CATEGORY_LABEL: Record<Project['category'], string> = {
  product: 'Produkt',
  delivery: 'Delivery',
  rollout: 'Rollout',
  governance: 'Governance',
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}
function fmtDeadline(date: string) {
  const d = daysUntil(date)
  if (d < 0)   return `${Math.abs(d)}d ueberfaellig`
  if (d === 0) return 'Heute'
  if (d <= 7)  return `${d} Tage`
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export function ProjectCard({ project: p, index }: { project: Project; index: number }) {
  const router = useRouter()
  const s = STATUS[p.status]
  const budgetPct = Math.round((p.budgetSpent / p.budgetTotal) * 100)
  const dl = daysUntil(p.endDate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={() => router.push(`/projects/${p.id}`)}
      className="card p-5 cursor-pointer hover:border-gray-600 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
          <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{CATEGORY_LABEL[p.category]}</span>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{p.customer}</span>
        </div>
      </div>
      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors mb-1 line-clamp-1">{p.name}</h3>
      <p className="text-xs text-gray-500 mb-4 line-clamp-2">{p.description}</p>
      <div className="flex items-center justify-between text-xs mb-4">
        <span className="text-gray-500">Stage</span>
        <span className="text-gray-300 capitalize">{p.stage.replaceAll('_', ' ')}</span>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-400">Fortschritt</span>
          <span className="font-semibold text-white">{p.progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }}
            animate={{ width: `${p.progressPercent}%` }}
            transition={{ duration: 0.9, delay: index * 0.05 + 0.2 }}
            className={`h-full rounded-full ${s.bar}`} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={`flex flex-col items-center p-2 rounded-lg text-center ${budgetPct > 85 ? 'bg-red-950/60' : 'bg-gray-800/60'}`}>
          <DollarSign className={`w-3.5 h-3.5 mb-1 ${budgetPct > 85 ? 'text-red-400' : 'text-gray-400'}`} />
          <span className={`text-sm font-bold ${budgetPct > 85 ? 'text-red-400' : 'text-white'}`}>{budgetPct}%</span>
          <span className="text-xs text-gray-500">Budget</span>
        </div>
        <div className={`flex flex-col items-center p-2 rounded-lg text-center ${dl <= 14 ? 'bg-amber-950/60' : 'bg-gray-800/60'}`}>
          <Clock className={`w-3.5 h-3.5 mb-1 ${dl <= 14 ? 'text-amber-400' : 'text-gray-400'}`} />
          <span className={`text-xs font-bold ${dl <= 14 ? 'text-amber-400' : 'text-white'}`}>{fmtDeadline(p.endDate)}</span>
          <span className="text-xs text-gray-500">Deadline</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg text-center bg-gray-800/60">
          <Users className="w-3.5 h-3.5 mb-1 text-gray-400" />
          <span className="text-sm font-bold text-white">{p.teamSize}</span>
          <span className="text-xs text-gray-500">Team</span>
        </div>
      </div>
    </motion.div>
  )
}
