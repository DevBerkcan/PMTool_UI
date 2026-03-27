'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { AuditEntry, PortfolioSummary } from '@/types'

export default function AuditPage() {
  const [projectId, setProjectId] = useState('')
  const [entityType, setEntityType] = useState('')
  const [userRole, setUserRole] = useState('')
  const [changeType, setChangeType] = useState('')
  const [range, setRange] = useState('30')

  const { data: portfolio } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio'],
    queryFn: () => api.projects.getPortfolio(),
  })

  const dateFrom = useMemo(() => {
    const days = Number(range)
    if (!days) return undefined
    return new Date(Date.now() - days * 86400000).toISOString()
  }, [range])

  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit-global', projectId, entityType, userRole, changeType, range],
    queryFn: () => api.activities.getAudit({
      projectId: projectId || undefined,
      entityType: entityType || undefined,
      userRole: userRole || undefined,
      changeType: changeType || undefined,
      dateFrom,
    }),
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><History className="w-6 h-6 text-blue-400" /> Audit Historie</h1>
        <p className="text-sm text-gray-400 mt-1">Globale Nachvollziehbarkeit fuer Rollen-, Freigabe- und PMO-Aenderungen.</p>
      </div>

      <div className="card p-5 grid md:grid-cols-5 gap-3">
        <select value={projectId} onChange={event => setProjectId(event.target.value)} className="input text-sm">
          <option value="">Alle Projekte</option>
          {portfolio?.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select value={entityType} onChange={event => setEntityType(event.target.value)} className="input text-sm">
          <option value="">Alle Typen</option>
          <option value="UserRole">Rollen</option>
          <option value="ProjectApproval">Freigaben</option>
        </select>
        <select value={userRole} onChange={event => setUserRole(event.target.value)} className="input text-sm">
          <option value="">Alle Rollen</option>
          <option value="Admin">Admin</option>
          <option value="Management">Management</option>
          <option value="PMO">PMO</option>
          <option value="Projektleiter">Projektleiter</option>
        </select>
        <select value={changeType} onChange={event => setChangeType(event.target.value)} className="input text-sm">
          <option value="">Alle Aenderungen</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="status_update">status_update</option>
        </select>
        <select value={range} onChange={event => setRange(event.target.value)} className="input text-sm">
          <option value="7">Letzte 7 Tage</option>
          <option value="30">Letzte 30 Tage</option>
          <option value="90">Letzte 90 Tage</option>
          <option value="0">Gesamt</option>
        </select>
      </div>

      <div className="card p-5">
        {isLoading ? (
          <div className="flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Audit wird geladen...</div>
        ) : (
          <div className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Audit-Eintraege fuer den aktuellen Filter.</p>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{entry.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{entry.userName} · {entry.userRole} · {entry.entityType} · {entry.changeType}</p>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                  {(entry.fromValue || entry.toValue) && <p className="mt-3 text-xs text-gray-300">{entry.fromValue || 'leer'} → {entry.toValue || 'leer'}</p>}
                  {entry.detail && <p className="mt-1 text-xs text-gray-400">{entry.detail}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
