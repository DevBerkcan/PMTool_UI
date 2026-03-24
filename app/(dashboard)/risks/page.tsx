'use client'
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Loader2, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Project, Risk } from '@/types'

export default function AllRisksPage() {
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.projects.getAll(),
  })

  const riskQueries = useQueries({
    queries: projects.map(project => ({
      queryKey: ['project-risks', project.id],
      queryFn: () => api.risks.getByProject(project.id),
      enabled: projects.length > 0,
    })),
  })

  const all = useMemo(() => {
    return riskQueries.flatMap((query, index) => {
      const project = projects[index]
      const risks = (query.data ?? []) as Risk[]
      return risks.map(risk => ({ ...risk, projectName: project?.name ?? '-' }))
    }).sort((a, b) => b.score - a.score)
  }, [projects, riskQueries])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-amber-400" /> Alle Risiken</h1>
      {isLoading && <div className="card p-6 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Risiken werden geladen...</div>}
      <div className="space-y-3">
        {all.map((risk, index) => {
          const bg = risk.score >= 15 ? 'bg-red-950/20 border-red-800' : risk.score >= 8 ? 'bg-amber-950/20 border-amber-800' : 'border-gray-800'
          const badge = risk.score >= 15 ? 'badge-red' : risk.score >= 8 ? 'badge-yellow' : 'badge-green'
          const dot = risk.score >= 15 ? 'bg-red-600' : risk.score >= 8 ? 'bg-amber-600' : 'bg-emerald-600'
          return (
            <motion.div key={risk.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={`card p-4 border ${bg}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg ${dot} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>{risk.score}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><p className="font-medium text-white">{risk.title}</p><span className={badge}>Score {risk.score}/25</span></div>
                  <p className="text-sm text-gray-400">{risk.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Massnahme: {risk.mitigation}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Link href={`/projects/${risk.projectId}`} className="text-xs text-blue-400 hover:text-blue-300">{risk.projectName}</Link>
                  <p className="text-xs text-gray-500 mt-1">{risk.ownerName}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
