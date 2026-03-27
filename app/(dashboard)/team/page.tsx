'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Mail, Trash2, Shield, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAccessMatrix } from '@/lib/hooks/useAccessMatrix'
import toast from 'react-hot-toast'
import type { AuditEntry, TeamMember } from '@/types'

export default function TeamPage() {
  const { can, availableRoles } = useAccessMatrix()
  const canManageTeam = can('manageTeam')
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'Entwickler' })
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const { data: team = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: () => api.team.getAll(),
  })
  const { data: roleAudit = [] } = useQuery<AuditEntry[]>({
    queryKey: ['audit-user-roles'],
    queryFn: () => api.activities.getAudit({ entityType: 'UserRole' }),
    enabled: canManageTeam,
  })

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.team.invite(form)
      await qc.invalidateQueries({ queryKey: ['team'] })
      await qc.invalidateQueries({ queryKey: ['audit-user-roles'] })
      setForm({ name: '', email: '', role: 'Entwickler' })
      setShowInvite(false)
      toast.success(`${form.name} wurde eingeladen!`)
    } catch (err: any) {
      toast.error(err.message || 'Einladung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" /> Team-Verwaltung
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{team.length} Mitglieder</p>
        </div>
        {canManageTeam && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Mitglied einladen
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Gesamt', value: team.length, color: 'text-blue-400' },
          {
            label: 'Ueberlastet',
            value: team.filter(m => m.allocatedHours / m.totalCapacityHours > 1).length,
            color: 'text-red-400',
          },
          {
            label: 'Verfuegbar',
            value: team.filter(m => m.allocatedHours / m.totalCapacityHours < 0.8).length,
            color: 'text-emerald-400',
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-4 text-center"
          >
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-400 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="card divide-y divide-gray-800">
        {isLoading && (
          <div className="p-6 flex items-center justify-center text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Team wird geladen...
          </div>
        )}
        {team.map((m, i) => {
          const pct = Math.round((m.allocatedHours / m.totalCapacityHours) * 100)
          const over = pct > 100
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${over ? 'bg-red-600' : 'bg-blue-600'}`}
              >
                {m.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{m.name}</p>
                  {over && <span className="badge-red">Ueberlastet</span>}
                </div>
                <p className="text-xs text-gray-500">{m.email}</p>
              </div>
              <div className="hidden md:block w-36">
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-0.5 ${over ? 'text-red-400' : 'text-gray-500'}`}>
                  {m.allocatedHours}h / {m.totalCapacityHours}h ({pct}%)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded-lg">
                  <Shield className="w-3 h-3" /> {m.role}
                </span>
                {canManageTeam && (
                  <select
                    value={draftRoles[m.id] ?? m.role}
                    onChange={e => setDraftRoles(current => ({ ...current, [m.id]: e.target.value }))}
                    onBlur={async e => {
                      const nextRole = e.target.value
                      if (nextRole === m.role) return
                      try {
                        await api.team.update(m.id, { role: nextRole })
                        await qc.invalidateQueries({ queryKey: ['team'] })
                        await qc.invalidateQueries({ queryKey: ['audit-user-roles'] })
                        toast.success(`${m.name} aktualisiert`)
                      } catch (err: any) {
                        toast.error(err.message || 'Rolle konnte nicht aktualisiert werden')
                      }
                    }}
                    className="input h-8 w-40 text-xs"
                  >
                    {(availableRoles.length > 0 ? availableRoles : [m.role]).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                )}
                {canManageTeam && (
                  <button
                    onClick={async () => {
                      try {
                        await api.team.remove(m.id)
                        await qc.invalidateQueries({ queryKey: ['team'] })
                        toast.success(`${m.name} entfernt`)
                      } catch (err: any) {
                        toast.error(err.message || 'Entfernen fehlgeschlagen')
                      }
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {canManageTeam && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Rollen-Audit</h2>
            <span className="text-xs text-gray-500">{roleAudit.length} Eintraege</span>
          </div>
          <div className="space-y-3">
            {roleAudit.length === 0 ? (
              <p className="text-sm text-gray-500">Noch keine Rollen-Aenderungen protokolliert.</p>
            ) : (
              roleAudit.slice(0, 12).map(entry => (
                <div key={entry.id} className="rounded-lg bg-gray-800/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{entry.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{entry.userName}</p>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-3">{entry.fromValue || 'leer'} → {entry.toValue || 'leer'}</p>
                  {entry.detail && <p className="text-xs text-gray-400 mt-1">{entry.detail}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showInvite && canManageTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowInvite(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative card p-6 w-full max-w-md z-10"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Mitglied einladen</h2>
                <button
                  onClick={() => setShowInvite(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input"
                    placeholder="Vor- und Nachname"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input"
                    placeholder="name@heinemann.de"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Rolle</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="input"
                  >
                    {(availableRoles.length > 0 ? availableRoles : ['Entwickler']).map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="btn-ghost flex-1 justify-center"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 justify-center"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" /> Einladen
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
