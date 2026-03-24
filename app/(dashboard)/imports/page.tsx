'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, Upload, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { ImportAnalyzeResponse, PortfolioSummary } from '@/types'

const SOURCE_TYPES = [
  { id: 'excel', label: 'Excel / CSV' },
  { id: 'teams', label: 'Teams Meeting Export' },
  { id: 'planner', label: 'Planner / Taskliste' },
]

const SAMPLE = `Name;Status;Owner;DueDate
Standort Berlin;Open;Berk;2026-04-10
Standort Hamburg;Review;Philipp;2026-04-12`

export default function ImportsPage() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const [sourceType, setSourceType] = useState('excel')
  const [title, setTitle] = useState('Standortimport')
  const [content, setContent] = useState(SAMPLE)
  const [preview, setPreview] = useState<ImportAnalyzeResponse | null>(null)

  const { data } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio'],
    queryFn: () => api.projects.getPortfolio(),
  })

  const projects = data?.projects ?? []
  const selectedProject = useMemo(() => projects.find(project => project.id === projectId), [projectId, projects])

  const analyzeMutation = useMutation({
    mutationFn: () => api.imports.analyze({ projectId, sourceType, content }),
    onSuccess: result => setPreview(result),
    onError: (err: Error) => toast.error(err.message),
  })

  const commitMutation = useMutation({
    mutationFn: () => api.imports.commit({ projectId, sourceType, title, content }),
    onSuccess: async result => {
      toast.success(result.summary)
      await qc.invalidateQueries({ queryKey: ['project', projectId] })
      setPreview(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Import Center</h1>
        <p className="text-sm text-gray-400 mt-1">Excel-, CSV- oder Teams-Daten analysieren und intelligent ins Projekt einspeisen.</p>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="card p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Projekt</label>
              <select value={projectId} onChange={event => setProjectId(event.target.value)} className="input">
                <option value="">Projekt waehlen</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Quelle</label>
              <select value={sourceType} onChange={event => setSourceType(event.target.value)} className="input">
                {SOURCE_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Importtitel</label>
            <input value={title} onChange={event => setTitle(event.target.value)} className="input" placeholder="z. B. Standortimport April" />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Rohdaten</label>
            <textarea value={content} onChange={event => setContent(event.target.value)} className="input min-h-72 py-3 font-mono text-sm" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => projectId && content.trim() && analyzeMutation.mutate()}
              disabled={!projectId || !content.trim() || analyzeMutation.isPending}
              className="btn-primary"
            >
              {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Analyse
            </button>
            <button
              onClick={() => preview && commitMutation.mutate()}
              disabled={!preview || commitMutation.isPending}
              className="btn-ghost"
            >
              {commitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import uebernehmen
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold text-white">Import-Kontext</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-gray-800/70 p-3">
                <p className="text-xs text-gray-500">Projekt</p>
                <p className="text-white">{selectedProject?.name ?? 'Noch nicht ausgewaehlt'}</p>
              </div>
              <div className="rounded-lg bg-gray-800/70 p-3">
                <p className="text-xs text-gray-500">Quelle</p>
                <p className="text-white">{SOURCE_TYPES.find(type => type.id === sourceType)?.label}</p>
              </div>
              <div className="rounded-lg bg-gray-800/70 p-3">
                <p className="text-xs text-gray-500">Intelligenter Nutzen</p>
                <p className="text-gray-300">Importe werden analysiert und als Projektwissen dokumentiert. Spaeter kann die KI daraus Aufgaben, Risiken und Entscheidungen vorschlagen.</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-white mb-3">Analyse-Ergebnis</h2>
            {!preview ? (
              <p className="text-sm text-gray-500">Noch keine Analyse vorhanden.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500">Zeilen</p><p className="text-white font-semibold">{preview.rowCount}</p></div>
                  <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500">Spalten</p><p className="text-white font-semibold">{preview.columnCount}</p></div>
                  <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500">Quelle</p><p className="text-white font-semibold">{preview.sourceType}</p></div>
                </div>
                <p className="text-sm text-gray-300">{preview.summary}</p>
                <div className="overflow-hidden rounded-lg border border-gray-800">
                  <div className="grid bg-gray-900 px-3 py-2 text-xs text-gray-500" style={{ gridTemplateColumns: `repeat(${Math.max(preview.headers.length, 1)}, minmax(0, 1fr))` }}>
                    {preview.headers.map(header => <span key={header}>{header}</span>)}
                  </div>
                  {preview.rows.map(row => (
                    <div key={row.rowNumber} className="grid border-t border-gray-800 px-3 py-2 text-sm text-gray-200" style={{ gridTemplateColumns: `repeat(${Math.max(preview.headers.length, 1)}, minmax(0, 1fr))` }}>
                      {row.values.map((value, index) => <span key={`${row.rowNumber}-${index}`} className="truncate">{value}</span>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
