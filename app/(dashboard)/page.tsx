'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckSquare, DollarSign, Loader2, Plus, Search, TrendingUp } from 'lucide-react'
import { ProjectCard } from '@/components/portfolio/ProjectCard'
import { api } from '@/lib/api'
import type { PortfolioSummary, ProjectStatus } from '@/types'

const FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'green', label: 'On Track' },
  { id: 'yellow', label: 'At Risk' },
  { id: 'red', label: 'Kritisch' },
]

const CATEGORY_LABEL: Record<string, string> = {
  product: 'Produkt',
  delivery: 'Delivery',
  rollout: 'Rollout',
  governance: 'Governance',
}

export default function PortfolioPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | ProjectStatus>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const { data, isLoading } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio'],
    queryFn: () => api.projects.getPortfolio(),
  })

  const summary = data
  const filtered = useMemo(() => {
    const projects = summary?.projects ?? []
    return projects.filter(project => {
      const query = search.toLowerCase()
      return (!query || project.name.toLowerCase().includes(query) || project.customer.toLowerCase().includes(query))
        && (status === 'all' || project.status === status)
    })
  }, [search, status, summary?.projects])

  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Uebersicht</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Stand {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" /> Projekt anlegen
        </button>
      </div>

      {isLoading && (
        <div className="card p-6 flex items-center justify-center text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Portfolio wird geladen...
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: TrendingUp, label: 'Projekte gesamt', value: summary.totalProjects.toString(), sub: `${summary.greenCount} ok · ${summary.yellowCount} at risk · ${summary.redCount} kritisch`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: DollarSign, label: 'Budget gesamt', value: `EUR ${fmt(summary.totalBudget)}`, sub: `EUR ${fmt(summary.spentBudget)} verbraucht`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { icon: CheckSquare, label: 'Offene Tasks', value: summary.totalTasks.toString(), sub: `${summary.overdueTasks} ueberfaellig`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { icon: AlertTriangle, label: 'Governance', value: summary.openGovernanceItems.toString(), sub: `${summary.openDecisions} Entscheidungen offen · ${summary.overdueMilestones} Meilensteine ueberfaellig`, color: 'text-red-400', bg: 'bg-red-500/10' },
            ].map(({ icon: Icon, label, value, sub, color, bg }, index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }} className="card p-5">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-gray-400 mt-0.5">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{sub}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-52 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Projekt oder Kunde..." className="input pl-9" />
            </div>
            <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 gap-1">
              {FILTERS.map(filter => (
                <button key={filter.id} onClick={() => setStatus(filter.id as typeof status)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${status === filter.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
              {(['grid', 'list'] as const).map(nextView => (
                <button key={nextView} onClick={() => setView(nextView)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === nextView ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {nextView === 'grid' ? 'Grid' : 'Liste'}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-gray-500">{filtered.length} Projekte gefunden</p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {Object.entries(CATEGORY_LABEL).map(([key, label]) => {
              const count = filtered.filter(project => project.category === key).length
              const critical = filtered.filter(project => project.category === key && project.status !== 'green').length
              return (
                <div key={key} className="card p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="text-2xl font-semibold text-white mt-1">{count}</p>
                  <p className="text-xs text-gray-500 mt-1">{critical} mit Handlungsbedarf</p>
                </div>
              )
            })}
          </div>

          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'flex flex-col gap-3'}>
            {filtered.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}
          </div>
        </>
      )}
    </div>
  )
}
