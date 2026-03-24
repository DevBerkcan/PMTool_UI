'use client'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, BarChart3, CheckSquare, Loader2, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'
import type { PortfolioSummary } from '@/types'

export default function AnalyticsPage() {
  const { data: summary, isLoading } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio'],
    queryFn: () => api.projects.getPortfolio(),
  })

  const fmtC = (n: number) => new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 0 }).format(n)
  const budgetPct = summary ? Math.round((summary.spentBudget / summary.totalBudget) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-400" /> Analytics & Reporting</h1>

      {isLoading && <div className="card p-6 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analytics werden geladen...</div>}

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: TrendingUp, label: 'Portfolio Budget', value: `EUR ${fmtC(summary.totalBudget)}`, sub: `EUR ${fmtC(summary.spentBudget)} verbraucht`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: BarChart3, label: 'Budget Auslastung', value: `${budgetPct}%`, sub: `EUR ${fmtC(summary.totalBudget - summary.spentBudget)} verbleibend`, color: budgetPct > 80 ? 'text-red-400' : 'text-emerald-400', bg: budgetPct > 80 ? 'bg-red-500/10' : 'bg-emerald-500/10' },
              { icon: CheckSquare, label: 'Offene Tasks', value: summary.totalTasks.toString(), sub: `${summary.overdueTasks} ueberfaellig`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { icon: AlertTriangle, label: 'Kritische Projekte', value: summary.redCount.toString(), sub: `${summary.yellowCount} at risk`, color: 'text-red-400', bg: 'bg-red-500/10' },
            ].map(({ icon: Icon, label, value, sub, color, bg }, index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }} className="card p-5">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-gray-400">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{sub}</p>
              </motion.div>
            ))}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-white mb-5">Projektstatus Uebersicht</h2>
            <div className="space-y-4">
              {summary.projects.map((project, index) => {
                const pBudgetPct = Math.round((project.budgetSpent / project.budgetTotal) * 100)
                return (
                  <motion.div key={project.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4"><p className="text-sm font-medium text-white truncate">{project.name}</p><p className="text-xs text-gray-500">{project.customer}</p></div>
                    <div className="col-span-3">
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Fortschritt</span><span className="text-white font-medium">{project.progressPercent}%</span></div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${project.status === 'green' ? 'bg-emerald-500' : project.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${project.progressPercent}%` }} /></div>
                    </div>
                    <div className="col-span-3">
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Budget</span><span className={`font-medium ${pBudgetPct > 85 ? 'text-red-400' : 'text-white'}`}>{pBudgetPct}%</span></div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pBudgetPct > 85 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(pBudgetPct, 100)}%` }} /></div>
                    </div>
                    <div className="col-span-2 text-right"><span className={`text-xs px-2 py-1 rounded-full font-medium ${project.status === 'green' ? 'bg-emerald-500/15 text-emerald-400' : project.status === 'yellow' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>{project.status === 'green' ? 'On Track' : project.status === 'yellow' ? 'At Risk' : 'Kritisch'}</span></div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
