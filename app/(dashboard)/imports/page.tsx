'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, MessagesSquare, Upload, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { ImportAnalyzeResponse, MeetingAnalyzeResponse, PortfolioSummary } from '@/types'

const SOURCE_TYPES = [
  { id: 'excel', label: 'Excel / CSV' },
  { id: 'teams', label: 'Teams Meeting' },
  { id: 'planner', label: 'Planner / Taskliste' },
]

const TABULAR_SAMPLE = `Name;Status;Owner;DueDate
Standort Berlin;Open;Berk;2026-04-10
Standort Hamburg;Review;Philipp;2026-04-12`

const MEETING_SAMPLE = `INFO: Standortdaten aus Excel sind noch unvollstaendig.
TODO: Dublettenpruefung fuer Standort-IDs in den Import aufnehmen.
DECISION: Excel bleibt fuer den Pilot der erste Datenkanal, API folgt spaeter.
RISK: Fehlende Kassenpakete koennen den Rollout einzelner Standorte blockieren.
NOTE: Operations erwartet einen taeglichen Fortschrittsstand bis zum ersten Rollout.`

export default function ImportsPage() {
  const qc = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const [sourceType, setSourceType] = useState('excel')
  const [title, setTitle] = useState('Standortimport')
  const [content, setContent] = useState(TABULAR_SAMPLE)
  const [tabularPreview, setTabularPreview] = useState<ImportAnalyzeResponse | null>(null)
  const [meetingPreview, setMeetingPreview] = useState<MeetingAnalyzeResponse | null>(null)

  const isMeetingMode = sourceType === 'teams'

  const { data } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio'],
    queryFn: () => api.projects.getPortfolio(),
  })

  const projects = data?.projects ?? []
  const selectedProject = useMemo(() => projects.find(project => project.id === projectId), [projectId, projects])

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (isMeetingMode) {
        return api.imports.analyzeMeeting({ projectId, sourceType, title, content })
      }

      return api.imports.analyze({ projectId, sourceType, content })
    },
    onSuccess: result => {
      if (isMeetingMode) {
        setMeetingPreview(result as MeetingAnalyzeResponse)
        setTabularPreview(null)
      } else {
        setTabularPreview(result as ImportAnalyzeResponse)
        setMeetingPreview(null)
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (isMeetingMode) {
        return api.imports.commitMeeting({ projectId, sourceType, title, content })
      }

      return api.imports.commit({ projectId, sourceType, title, content })
    },
    onSuccess: async result => {
      toast.success(result.summary)
      await qc.invalidateQueries({ queryKey: ['project', projectId] })
      await qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      await qc.invalidateQueries({ queryKey: ['project-risks', projectId] })
      await qc.invalidateQueries({ queryKey: ['ai-suggestions', projectId] })
      await qc.invalidateQueries({ queryKey: ['weekly-status', projectId] })
      setTabularPreview(null)
      setMeetingPreview(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const applySourceType = (nextSourceType: string) => {
    setSourceType(nextSourceType)
    const meetingMode = nextSourceType === 'teams'
    setTitle(meetingMode ? 'Teams Weekly Sync' : 'Standortimport')
    setContent(meetingMode ? MEETING_SAMPLE : TABULAR_SAMPLE)
    setTabularPreview(null)
    setMeetingPreview(null)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Import Center</h1>
        <p className="text-sm text-gray-400 mt-1">Excel-, CSV- und Teams-Meetings analysieren und intelligent ins Projekt einspeisen.</p>
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
              <select value={sourceType} onChange={event => applySourceType(event.target.value)} className="input">
                {SOURCE_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Importtitel</label>
            <input value={title} onChange={event => setTitle(event.target.value)} className="input" placeholder="z. B. Weekly Sync KW14" />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">{isMeetingMode ? 'Meeting-Notizen / Transcript' : 'Rohdaten'}</label>
            <textarea value={content} onChange={event => setContent(event.target.value)} className="input min-h-72 py-3 font-mono text-sm" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => projectId && content.trim() && analyzeMutation.mutate()}
              disabled={!projectId || !content.trim() || analyzeMutation.isPending}
              className="btn-primary"
            >
              {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isMeetingMode ? 'Meeting analysieren' : 'Analyse'}
            </button>
            <button
              onClick={() => (meetingPreview || tabularPreview) && commitMutation.mutate()}
              disabled={(!meetingPreview && !tabularPreview) || commitMutation.isPending}
              className="btn-ghost"
            >
              {commitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isMeetingMode ? 'Meeting uebernehmen' : 'Import uebernehmen'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              {isMeetingMode ? <MessagesSquare className="w-4 h-4 text-blue-400" /> : <FileSpreadsheet className="w-4 h-4 text-blue-400" />}
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
                <p className="text-gray-300">
                  {isMeetingMode
                    ? 'Meeting-Import erkennt Aufgaben, Entscheidungen, Risiken und Wissenseintraege aus Teams-Notizen und schreibt sie direkt in das Projekt.'
                    : 'Importe werden analysiert und als Projektwissen dokumentiert. Spaeter kann die KI daraus Aufgaben, Risiken und Entscheidungen vorschlagen.'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-white mb-3">Analyse-Ergebnis</h2>
            {!tabularPreview && !meetingPreview ? (
              <p className="text-sm text-gray-500">Noch keine Analyse vorhanden.</p>
            ) : meetingPreview ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-300">{meetingPreview.summary}</p>
                {[
                  { label: 'Aufgaben', items: meetingPreview.actions },
                  { label: 'Entscheidungen', items: meetingPreview.decisions },
                  { label: 'Risiken', items: meetingPreview.risks },
                  { label: 'Knowledge', items: meetingPreview.knowledge },
                ].map(section => (
                  <div key={section.label}>
                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">{section.label}</p>
                    <div className="space-y-2">
                      {section.items.length === 0 ? (
                        <div className="rounded-lg bg-gray-800/70 px-3 py-2 text-sm text-gray-500">Keine Eintraege erkannt.</div>
                      ) : (
                        section.items.map(item => (
                          <div key={`${section.label}-${item.title}`} className="rounded-lg bg-gray-800/70 px-3 py-2">
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="mt-1 text-sm text-gray-300">{item.detail}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const preview = tabularPreview!

                  return (
                    <>
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
                    </>
                  )
                })()}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
