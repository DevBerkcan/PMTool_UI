'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, BarChart3, CheckSquare, Download, Loader2, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { AuditEntry, PortfolioSummary } from '@/types'

function buildPath(values: number[], width: number, height: number) {
  if (values.length === 0) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

export default function AnalyticsPage() {
  const { data: summary, isLoading } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio'],
    queryFn: () => api.projects.getPortfolio(),
  })

  const { data: auditEntries = [] } = useQuery<AuditEntry[]>({
    queryKey: ['audit-analytics'],
    queryFn: () => api.activities.getAudit({ dateFrom: new Date(Date.now() - 30 * 86400000).toISOString() }),
  })

  const fmtC = (n: number) => new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 0 }).format(n)
  const budgetPct = summary ? Math.round((summary.spentBudget / summary.totalBudget) * 100) : 0

  const auditTrend = useMemo(() => {
    const map = new Map<string, number>()
    auditEntries.forEach(entry => {
      const key = new Date(entry.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return Array.from(map.entries()).slice(-10)
  }, [auditEntries])

  const forecastBars = useMemo(() => {
    if (!summary) return []
    return summary.projects.map(project => ({
      name: project.name,
      actual: project.budgetSpent,
      forecast: project.progressPercent > 0 ? project.budgetSpent / project.progressPercent * 100 : project.budgetTotal,
      budget: project.budgetTotal,
    }))
  }, [summary])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-400" /> Analytics & Reporting</h1>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const blob = await api.reports.exportAuditCsv({ dateFrom: new Date(Date.now() - 30 * 86400000).toISOString() })
                downloadBlob(blob, 'audit-analytics.csv')
              } catch (error: any) {
                toast.error(error.message)
              }
            }}
            className="btn-ghost"
          >
            <Download className="w-4 h-4" /> Audit CSV
          </button>
          <button
            onClick={async () => {
              try {
                const blob = await api.reports.exportAuditPdf({ dateFrom: new Date(Date.now() - 30 * 86400000).toISOString() })
                downloadBlob(blob, 'audit-analytics.pdf')
              } catch (error: any) {
                toast.error(error.message)
              }
            }}
            className="btn-primary"
          >
            <Download className="w-4 h-4" /> Audit PDF
          </button>
        </div>
      </div>

      {isLoading && <div className="card p-6 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analytics werden geladen...</div>}

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: TrendingUp, label: 'Portfolio Budget', value: `EUR ${fmtC(summary.totalBudget)}`, sub: `Forecast EUR ${fmtC(summary.forecastBudget)}`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: BarChart3, label: 'Budget Auslastung', value: `${budgetPct}%`, sub: `Varianz EUR ${fmtC(summary.forecastVariance)}`, color: budgetPct > 80 ? 'text-red-400' : 'text-emerald-400', bg: budgetPct > 80 ? 'bg-red-500/10' : 'bg-emerald-500/10' },
              { icon: CheckSquare, label: 'Offene Tasks', value: summary.totalTasks.toString(), sub: `${summary.overdueTasks} ueberfaellig`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { icon: AlertTriangle, label: 'Audit Events', value: auditEntries.length.toString(), sub: 'letzte 30 Tage', color: 'text-red-400', bg: 'bg-red-500/10' },
            ].map(({ icon: Icon, label, value, sub, color, bg }, index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }} className="card p-5">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-gray-400">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{sub}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h2 className="font-semibold text-white mb-5">Portfolio-Forecast Trend</h2>
              <svg viewBox="0 0 360 180" className="w-full h-44">
                <path d={buildPath(forecastBars.map(item => item.budget), 360, 180)} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
                <path d={buildPath(forecastBars.map(item => item.actual), 360, 180)} fill="none" stroke="#34d399" strokeWidth="3" />
                <path d={buildPath(forecastBars.map(item => item.forecast), 360, 180)} fill="none" stroke="#60a5fa" strokeWidth="3" />
              </svg>
              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" /> Budget</span>
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Ist</span>
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-400" /> Forecast</span>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-white mb-5">Audit Trend</h2>
              <svg viewBox="0 0 360 180" className="w-full h-44">
                <path d={buildPath(auditTrend.map(item => item[1]), 360, 180)} fill="none" stroke="#f59e0b" strokeWidth="3" />
              </svg>
              <div className="mt-4 grid grid-cols-5 gap-2 text-[11px] text-gray-500">
                {auditTrend.slice(-5).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-gray-800/60 px-2 py-2 text-center">
                    <p>{label}</p>
                    <p className="text-white mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-white mb-5">Projektstatus Uebersicht</h2>
            <div className="space-y-4">
              {summary.projects.map((project, index) => {
                const pBudgetPct = Math.round((project.budgetSpent / project.budgetTotal) * 100)
                const pForecast = project.progressPercent > 0 ? project.budgetSpent / project.progressPercent * 100 : project.budgetTotal
                return (
                  <motion.div key={project.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4"><p className="text-sm font-medium text-white truncate">{project.name}</p><p className="text-xs text-gray-500">{project.customer}</p></div>
                    <div className="col-span-3">
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Fortschritt</span><span className="text-white font-medium">{project.progressPercent}%</span></div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${project.status === 'green' ? 'bg-emerald-500' : project.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${project.progressPercent}%` }} /></div>
                    </div>
                    <div className="col-span-3">
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Budget / Forecast</span><span className={`font-medium ${pBudgetPct > 85 ? 'text-red-400' : 'text-white'}`}>{pBudgetPct}% · EUR {fmtC(pForecast)}</span></div>
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
