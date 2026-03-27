'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ShieldCheck, Loader2, AlertTriangle, Scale, CalendarClock, GitMerge, Stamp } from 'lucide-react'
import { api } from '@/lib/api'
import type { GovernanceOverview } from '@/types'

const CATEGORY_LABEL: Record<string, string> = {
  product: 'Produkt',
  delivery: 'Delivery',
  rollout: 'Rollout',
  governance: 'Governance',
}

export default function GovernancePage() {
  const { data, isLoading } = useQuery<GovernanceOverview>({
    queryKey: ['governance-overview'],
    queryFn: () => api.governance.getOverview(),
  })

  if (isLoading || !data) {
    return <div className="card p-6 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Governance wird geladen...</div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Governance Cockpit</h1>
        <p className="text-sm text-gray-400 mt-1">Stage Gates, offene Entscheidungen und ueberfaellige Meilensteine ueber alle Projekte hinweg.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Governance Checks offen', value: data.openGovernanceChecks, icon: ShieldCheck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Entscheidungen offen', value: data.openDecisions, icon: Scale, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Meilensteine ueberfaellig', value: data.overdueMilestones, icon: CalendarClock, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Stage Gates offen', value: data.openStageGates, icon: GitMerge, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Stage Gates blockiert', value: data.blockedStageGates, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Freigaben ausstehend', value: data.pendingApprovals, icon: Stamp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map(item => (
          <div key={item.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}><item.icon className={`w-5 h-5 ${item.color}`} /></div>
            <p className="text-2xl font-bold text-white">{item.value}</p>
            <p className="text-sm text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Projektuebersicht</h2>
          <span className="text-xs text-gray-500">{data.totalProjects} Projekte</span>
        </div>
        <div className="space-y-3">
          {data.projects.map(project => (
            <Link key={project.projectId} href={`/projects/${project.projectId}`} className="block rounded-xl border border-gray-800 bg-gray-900/70 p-4 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{project.projectName}</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{CATEGORY_LABEL[project.category] ?? project.category}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">{project.stage.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Status: {project.status}</p>
                </div>
                {(project.openGovernanceChecks > 0 || project.openDecisions > 0 || project.overdueMilestones > 0) && (
                  <div className="flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Governance Handlungsbedarf
                  </div>
                )}
              </div>
              <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3 mt-4 text-sm">
                <div className="rounded-lg bg-gray-800/70 px-3 py-2">
                  <p className="text-xs text-gray-500">Checks offen</p>
                  <p className="text-white font-semibold">{project.openGovernanceChecks}</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 px-3 py-2">
                  <p className="text-xs text-gray-500">Entscheidungen offen</p>
                  <p className="text-white font-semibold">{project.openDecisions}</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 px-3 py-2">
                  <p className="text-xs text-gray-500">Meilensteine ueberfaellig</p>
                  <p className="text-white font-semibold">{project.overdueMilestones}</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 px-3 py-2">
                  <p className="text-xs text-gray-500">Stage Gates offen</p>
                  <p className="text-white font-semibold">{project.openStageGates}</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 px-3 py-2">
                  <p className="text-xs text-gray-500">Stage Gates blockiert</p>
                  <p className="text-white font-semibold">{project.blockedStageGates}</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 px-3 py-2">
                  <p className="text-xs text-gray-500">Freigaben offen</p>
                  <p className="text-white font-semibold">{project.pendingApprovals}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
