'use client'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api'
import type { ProjectDetail, Risk } from '@/types'

function riskColor(score: number) {
  if (score >= 15) return { bg: 'bg-red-500/70', border: 'border-red-400', label: 'Kritisch', badge: 'badge-red' }
  if (score >= 8) return { bg: 'bg-amber-500/70', border: 'border-amber-400', label: 'Hoch', badge: 'badge-yellow' }
  if (score >= 4) return { bg: 'bg-yellow-500/70', border: 'border-yellow-400', label: 'Mittel', badge: 'badge-yellow' }
  return { bg: 'bg-emerald-500/70', border: 'border-emerald-400', label: 'Niedrig', badge: 'badge-green' }
}

export default function RisksPage() {
  const { id } = useParams<{ id: string }>()
  const { data: project } = useQuery<ProjectDetail>({ queryKey: ['project', id], queryFn: () => api.projects.getById(id) })
  const { data: risks = [], isLoading } = useQuery<Risk[]>({ queryKey: ['project-risks', id], queryFn: () => api.risks.getByProject(id) })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-400" /> Risikomanagement</h1>
        <p className="text-gray-400 text-sm">{project?.name}</p>
      </div>

      {isLoading && <div className="card p-6 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Risiken werden geladen...</div>}

      <div className="card p-6">
        <h2 className="font-semibold text-white mb-4">Risikomatrix (Impact x Wahrscheinlichkeit)</h2>
        <div className="flex gap-4">
          <div className="flex flex-col justify-between text-xs text-gray-500 text-right pr-2 py-1" style={{ minWidth: 72 }}>
            {['Kritisch (5)', 'Hoch (4)', 'Mittel (3)', 'Niedrig (2)', 'Gering (1)'].map(label => <span key={label}>{label}</span>)}
          </div>
          <div className="flex-1">
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {[5, 4, 3, 2, 1].flatMap(impact =>
                [1, 2, 3, 4, 5].map(prob => {
                  const score = impact * prob
                  const col = riskColor(score)
                  const cellRisks = risks.filter(risk => risk.impact === impact && risk.probability === prob)
                  return (
                    <div key={`${impact}-${prob}`} className={`h-14 rounded border ${col.border} ${col.bg} flex items-center justify-center gap-1 flex-wrap`}>
                      {cellRisks.map(risk => <div key={risk.id} className="w-7 h-7 rounded-full bg-white text-gray-900 text-xs font-bold shadow-lg flex items-center justify-center">{risk.title.charAt(0)}</div>)}
                    </div>
                  )
                }),
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-white mb-4">Alle Risiken</h2>
        <div className="space-y-3">
          {[...risks].sort((a, b) => b.score - a.score).map(risk => {
            const col = riskColor(risk.score)
            return (
              <motion.div key={risk.id} whileHover={{ x: 2 }} className="flex items-start gap-4 p-4 bg-gray-800/60 rounded-lg hover:bg-gray-800 transition-colors">
                <div className={`w-12 h-12 rounded-lg ${col.bg} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>{risk.score}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><p className="font-medium text-white">{risk.title}</p><span className={col.badge}>{col.label}</span></div>
                  <p className="text-sm text-gray-400">{risk.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Massnahme: {risk.mitigation}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">Impact: {risk.impact}/5</p>
                  <p className="text-xs text-gray-500">Prob: {risk.probability}/5</p>
                  <p className="text-xs text-gray-500 mt-1">{risk.ownerName}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
