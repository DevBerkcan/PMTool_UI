'use client'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, Loader2, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { ProjectDetail } from '@/types'

export default function ResourcesPage() {
  const { id } = useParams<{ id: string }>()
  const { data: project, isLoading } = useQuery<ProjectDetail>({
    queryKey: ['project', id],
    queryFn: () => api.projects.getById(id),
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /> Ressourcenplanung - {project?.name}</h1>
      {isLoading && <div className="card p-5 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Ressourcen werden geladen...</div>}
      <div className="grid gap-4">
        {project?.teamMembers.map((member, index) => {
          const pct = Math.round((member.allocatedHours / member.totalCapacityHours) * 100)
          const over = pct > 100
          const almost = pct > 85 && !over
          return (
            <motion.div key={member.userId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }} className={`card p-5 ${over ? 'border-red-800' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${over ? 'bg-red-600' : 'bg-blue-600'}`}>{member.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-white">{member.name}</p>
                    {over && <span className="badge-red flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Ueberlastet</span>}
                    {almost && <span className="badge-yellow">Fast voll</span>}
                  </div>
                  <p className="text-xs text-gray-500">{member.projectRole}</p>
                  <p className="text-xs text-gray-500 mt-1">{member.responsibility}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Auslastung</span><span className={`font-semibold ${over ? 'text-red-400' : almost ? 'text-amber-400' : 'text-white'}`}>{member.allocatedHours}h / {member.totalCapacityHours}h ({pct}%)</span></div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: index * 0.06 }} className={`h-full rounded-full ${over ? 'bg-red-500' : almost ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
