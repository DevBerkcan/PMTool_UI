'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderKanban, Loader2, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Project } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  project?: Project | null
}

export function ProjectModal({ open, onClose, project }: Props) {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    customer: 'RealCore Intern',
    budgetTotal: '',
    startDate: '',
    endDate: '',
    status: 'green',
  })

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        description: project.description,
        customer: project.customer,
        budgetTotal: project.budgetTotal.toString(),
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
      })
      return
    }

    setForm({
      name: '',
      description: '',
      customer: 'RealCore Intern',
      budgetTotal: '',
      startDate: '',
      endDate: '',
      status: 'green',
    })
  }, [project, open])

  const setValue = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      const payload = { ...form, budgetTotal: parseFloat(form.budgetTotal) }
      if (project) {
        await api.projects.update(project.id, payload)
        toast.success('Projekt aktualisiert!')
      } else {
        await api.projects.create(payload)
        toast.success('Projekt erstellt!')
      }
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative card p-6 w-full max-w-lg z-10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-white">
                  {project ? 'Projekt bearbeiten' : 'Neues Projekt'}
                </h2>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Projektname *</label>
                <input
                  value={form.name}
                  onChange={event => setValue('name', event.target.value)}
                  className="input"
                  placeholder="z.B. G-Share"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Beschreibung</label>
                <textarea
                  value={form.description}
                  onChange={event => setValue('description', event.target.value)}
                  className="input resize-none"
                  rows={2}
                  placeholder="Kurze Projektbeschreibung..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kunde *</label>
                  <input
                    value={form.customer}
                    onChange={event => setValue('customer', event.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Status</label>
                  <select
                    value={form.status}
                    onChange={event => setValue('status', event.target.value)}
                    className="input"
                  >
                    <option value="green">On Track</option>
                    <option value="yellow">At Risk</option>
                    <option value="red">Kritisch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Budget (EUR) *</label>
                <input
                  type="number"
                  value={form.budgetTotal}
                  onChange={event => setValue('budgetTotal', event.target.value)}
                  className="input"
                  placeholder="850000"
                  required
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Startdatum *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={event => setValue('startDate', event.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Enddatum *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={event => setValue('endDate', event.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
                  Abbrechen
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : project ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
