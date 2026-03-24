'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { TeamMember } from '@/types'

export default function ResourcesOverviewPage() {
  const { data: team = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: () => api.team.getAll(),
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Users className="w-6 h-6 text-blue-400" /> Ressourcenuebersicht
      </h1>

      {isLoading && (
        <div className="card p-5 flex items-center justify-center text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Ressourcen werden geladen...
        </div>
      )}

      <div className="grid gap-4">
        {team.map((m, i) => {
          const pct = Math.round((m.allocatedHours / m.totalCapacityHours) * 100)
          const over = pct > 100
          const almost = pct > 85 && !over
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`card p-5 ${over ? 'border-red-800' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${over ? 'bg-red-600' : 'bg-blue-600'}`}
                >
                  {m.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-white">{m.name}</p>
                    {over && (
                      <span className="badge-red flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Ueberlastet
                      </span>
                    )}
                    {almost && <span className="badge-yellow">Fast voll</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {m.role} · {m.email}
                  </p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Auslastung</span>
                      <span
                        className={`font-semibold ${over ? 'text-red-400' : almost ? 'text-amber-400' : 'text-white'}`}
                      >
                        {m.allocatedHours}h / {m.totalCapacityHours}h ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }}
                        className={`h-full rounded-full ${over ? 'bg-red-500' : almost ? 'bg-amber-500' : 'bg-blue-500'}`}
                      />
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
