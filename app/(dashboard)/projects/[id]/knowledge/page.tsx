'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { type ChangeEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, ChevronRight, FileSearch, Filter, Lightbulb, Loader2, Search, Sparkles, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import mammoth from 'mammoth'
import { api } from '@/lib/api'

const SOURCE_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  import: 'Import',
  delivery_note: 'Delivery Note',
  decision_log: 'Decision Log',
  note: 'Notiz',
  document_upload: 'Dokument',
}

const CATEGORY_OPTIONS = [
  { id: 'general', label: 'Allgemein' },
  { id: 'requirement', label: 'Anforderung' },
  { id: 'architecture', label: 'Architektur' },
  { id: 'customer', label: 'Kunde' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'governance', label: 'Governance' },
]

export default function ProjectKnowledgePage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [minImportance, setMinImportance] = useState(1)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('general')
  const [uploadContent, setUploadContent] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadImportance, setUploadImportance] = useState(4)
  const [uploadFileName, setUploadFileName] = useState('')
  const [linkedEntityType, setLinkedEntityType] = useState('')
  const [linkedEntityId, setLinkedEntityId] = useState('')
  const [meetingReference, setMeetingReference] = useState('')
  const [parentKnowledgeId, setParentKnowledgeId] = useState('')
  const [parsingFile, setParsingFile] = useState(false)

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.getById(id),
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => api.tasks.getByProject(id),
    enabled: !!id,
  })

  const { data: risks = [] } = useQuery({
    queryKey: ['project-risks', id],
    queryFn: () => api.risks.getByProject(id),
    enabled: !!id,
  })

  const { data: knowledgeHub, isLoading } = useQuery({
    queryKey: ['knowledge-hub', id, query, sourceType, minImportance],
    queryFn: () => api.projects.getKnowledgeHub(id, {
      query: query || undefined,
      sourceType: sourceType || undefined,
      minImportance,
      limit: 80,
    }),
    enabled: !!id,
  })

  const uploadMutation = useMutation({
    mutationFn: () => api.projects.uploadKnowledgeDocument(id, {
      title: uploadTitle || uploadFileName || 'Dokumentwissen',
      sourceType: 'document_upload',
      sourceLabel: uploadFileName || 'Knowledge Hub Upload',
      category: uploadCategory,
      sourceFileName: uploadFileName,
      content: uploadContent,
      parentKnowledgeItemId: parentKnowledgeId || null,
      linkedEntityType,
      linkedEntityId: linkedEntityId || null,
      meetingReference,
      tags: uploadTags.split(',').map(tag => tag.trim()).filter(Boolean),
      importance: uploadImportance,
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['knowledge-hub', id] })
      await qc.invalidateQueries({ queryKey: ['project', id] })
      setUploadTitle('')
      setUploadContent('')
      setUploadTags('')
      setUploadFileName('')
      setLinkedEntityType('')
      setLinkedEntityId('')
      setMeetingReference('')
      setParentKnowledgeId('')
      setUploadImportance(4)
      toast.success('Dokumentwissen gespeichert')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const availableSources = useMemo(
    () => knowledgeHub?.sources.map(source => source.key) ?? [],
    [knowledgeHub?.sources]
  )

  const linkOptions = useMemo(() => {
    if (linkedEntityType === 'task') {
      return tasks.map(task => ({ id: task.id, label: task.title }))
    }

    if (linkedEntityType === 'risk') {
      return risks.map(risk => ({ id: risk.id, label: risk.title }))
    }

    if (linkedEntityType === 'decision') {
      return project?.decisions.map(decision => ({ id: decision.id, label: decision.title })) ?? []
    }

    return []
  }, [linkedEntityType, project?.decisions, risks, tasks])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setParsingFile(true)
    try {
      const lowerName = file.name.toLowerCase()
      let text = ''

      if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.csv')) {
        text = (await file.text()).trim()
      } else if (lowerName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
        text = result.value.trim()
      } else if (lowerName.endsWith('.pdf')) {
        throw new Error('PDF-Parsing folgt im naechsten Schritt. Fuer jetzt bitte TXT, MD oder DOCX verwenden.')
      } else {
        throw new Error('Dateityp wird fuer die erste Knowledge-Version noch nicht unterstuetzt.')
      }

      setUploadFileName(file.name)
      setUploadTitle(file.name.replace(/\.[^.]+$/, ''))
      setUploadContent(text)
      setUploadCategory('delivery')
      toast.success(`Dokument geparsed: ${file.name}`)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Datei konnte nicht verarbeitet werden.')
    } finally {
      setParsingFile(false)
      event.target.value = ''
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/" className="text-gray-500 hover:text-gray-300">Portfolio</Link>
        <ChevronRight className="w-4 h-4 text-gray-600" />
        <Link href={`/projects/${id}`} className="text-gray-500 hover:text-gray-300">{project?.name ?? 'Projekt'}</Link>
        <ChevronRight className="w-4 h-4 text-gray-600" />
        <span className="text-white font-medium">Knowledge Hub</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-400" /> Knowledge Hub
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Wissensbasis, Suchkontext, Dokument-Upload und KI-relevante Quellen fuer {project?.name ?? 'das Projekt'}.
          </p>
        </div>
        <Link href={`/projects/${id}`} className="btn-ghost">Zurueck zum Projekt</Link>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold text-white">Dokument in Knowledge ueberfuehren</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <input value={uploadTitle} onChange={event => setUploadTitle(event.target.value)} placeholder="Titel..." className="input" />
              <select value={uploadCategory} onChange={event => setUploadCategory(event.target.value)} className="input">
                {CATEGORY_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/60 p-4">
              <p className="text-sm text-gray-300">TXT, MD und DOCX direkt einlesen und als versionierbares Projektwissen speichern. PDF folgt im naechsten Ausbauschritt.</p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700">
                {parsingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Datei auswaehlen
                <input type="file" className="hidden" accept=".txt,.md,.docx" onChange={handleFileChange} />
              </label>
              <p className="mt-2 text-xs text-gray-500">{uploadFileName || 'Noch keine Datei geladen.'}</p>
            </div>
            <textarea value={uploadContent} onChange={event => setUploadContent(event.target.value)} className="input min-h-64 py-3 text-sm" placeholder="Extrahierter Dokumentinhalt oder manuelle Beschreibung..." />
            <div className="grid md:grid-cols-2 gap-3">
              <input value={uploadTags} onChange={event => setUploadTags(event.target.value)} placeholder="Tags, kommasepariert..." className="input" />
              <select value={uploadImportance} onChange={event => setUploadImportance(Number(event.target.value))} className="input">
                <option value={1}>Prio 1</option>
                <option value={2}>Prio 2</option>
                <option value={3}>Prio 3</option>
                <option value={4}>Prio 4</option>
                <option value={5}>Prio 5</option>
              </select>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <select value={linkedEntityType} onChange={event => { setLinkedEntityType(event.target.value); setLinkedEntityId('') }} className="input">
                <option value="">Kein Link</option>
                <option value="task">Mit Task verknuepfen</option>
                <option value="risk">Mit Risiko verknuepfen</option>
                <option value="decision">Mit Entscheidung verknuepfen</option>
              </select>
              <select value={linkedEntityId} onChange={event => setLinkedEntityId(event.target.value)} className="input" disabled={!linkedEntityType}>
                <option value="">Eintrag waehlen</option>
                {linkOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <input value={meetingReference} onChange={event => setMeetingReference(event.target.value)} placeholder="Meeting-Referenz optional..." className="input" />
              <select value={parentKnowledgeId} onChange={event => setParentKnowledgeId(event.target.value)} className="input">
                <option value="">Neue Wissensbasis</option>
                {project?.knowledgeItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title} (v{item.version})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => uploadTitle.trim() && uploadContent.trim() && uploadMutation.mutate()}
              disabled={!uploadTitle.trim() || !uploadContent.trim() || uploadMutation.isPending}
              className="btn-primary"
            >
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Dokumentwissen speichern
            </button>
          </div>

          <div className="card p-5 space-y-4">
            <div className="grid lg:grid-cols-[1fr_220px_160px] gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Nach Wissen, Risiken, Entscheidungen oder Begriffen suchen..."
                  className="input pl-10"
                />
              </div>
              <select value={sourceType} onChange={event => setSourceType(event.target.value)} className="input">
                <option value="">Alle Quellen</option>
                {availableSources.map(source => (
                  <option key={source} value={source}>
                    {SOURCE_LABELS[source] ?? source}
                  </option>
                ))}
              </select>
              <select value={minImportance} onChange={event => setMinImportance(Number(event.target.value))} className="input">
                <option value={1}>Ab Prio 1</option>
                <option value={2}>Ab Prio 2</option>
                <option value={3}>Ab Prio 3</option>
                <option value={4}>Ab Prio 4</option>
                <option value={5}>Nur Prio 5</option>
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-gray-800/60 p-4">
                <p className="text-xs text-gray-500">Knowledge Items</p>
                <p className="text-2xl font-bold text-white mt-1">{knowledgeHub?.totalItems ?? 0}</p>
              </div>
              <div className="rounded-xl bg-gray-800/60 p-4">
                <p className="text-xs text-gray-500">Hohe Relevanz</p>
                <p className="text-2xl font-bold text-amber-300 mt-1">{knowledgeHub?.highImportanceItems ?? 0}</p>
              </div>
              <div className="rounded-xl bg-gray-800/60 p-4">
                <p className="text-xs text-gray-500">Quelltypen</p>
                <p className="text-2xl font-bold text-blue-300 mt-1">{knowledgeHub?.sources.length ?? 0}</p>
              </div>
              <div className="rounded-xl bg-gray-800/60 p-4">
                <p className="text-xs text-gray-500">Top Tags</p>
                <p className="text-2xl font-bold text-emerald-300 mt-1">{knowledgeHub?.topTags.length ?? 0}</p>
              </div>
            </div>

            {query.trim() && (
              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-medium text-white">Semantische Treffer</p>
                </div>
                <div className="space-y-3">
                  {knowledgeHub?.semanticMatches.length ? knowledgeHub.semanticMatches.map(match => (
                    <div key={`${match.knowledgeItemId}-${match.chunkIndex}`} className="rounded-lg bg-gray-900/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-white">{match.knowledgeTitle}</p>
                        <span className="text-[11px] rounded-full bg-blue-600/10 px-2 py-1 text-blue-300">Score {match.semanticScore}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{SOURCE_LABELS[match.sourceType] ?? match.sourceType} | {match.category} | Abschnitt {match.chunkIndex}</p>
                      <p className="text-sm text-gray-300 mt-2">{match.text}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400">Keine semantischen Treffer fuer diese Suche.</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {isLoading ? (
                <div className="rounded-xl bg-gray-800/50 p-6 text-sm text-gray-400">Knowledge Hub wird geladen...</div>
              ) : knowledgeHub?.items.length ? (
                knowledgeHub.items.map(item => (
                  <div key={item.id} className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {SOURCE_LABELS[item.sourceType] ?? item.sourceType} | {item.category} | {item.sourceFileName || item.sourceLabel || item.authorName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {query && <span className="rounded-full bg-blue-600/10 px-2 py-1 text-[11px] text-blue-300">Score {item.relevanceScore}</span>}
                        <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[11px] text-violet-300">v{item.version}</span>
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">Prio {item.importance}/5</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mt-3">{item.excerpt}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="rounded-full bg-gray-800 px-2 py-1 text-[11px] text-gray-300">{tag}</span>
                      ))}
                      {item.linkedEntityType && (
                        <span className="rounded-full bg-blue-950/40 px-2 py-1 text-[11px] text-blue-200">
                          Link: {item.linkedEntityType}
                        </span>
                      )}
                      {item.meetingReference && (
                        <span className="rounded-full bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-200">
                          Meeting: {item.meetingReference}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-gray-800/50 p-6 text-sm text-gray-400">
                  Keine Eintraege fuer die aktuelle Suche gefunden.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-medium text-white">Quellenueberblick</p>
            </div>
            <div className="space-y-2">
              {knowledgeHub?.sources.map(source => (
                <div key={source.key} className="rounded-lg bg-gray-800/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white">{SOURCE_LABELS[source.key] ?? source.key}</p>
                    <span className="text-xs text-gray-400">{source.count}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{source.highImportanceCount} mit hoher Relevanz</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileSearch className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-medium text-white">Top Tags</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {knowledgeHub?.topTags.map(tag => (
                <button
                  key={tag.tag}
                  onClick={() => setQuery(tag.tag)}
                  className="rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700"
                >
                  {tag.tag} ({tag.count})
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-medium text-white">AI-Nutzung</p>
            </div>
            <p className="text-sm text-gray-300">
              Diese Wissensbasis ist jetzt versionierbar und kann mit Projektobjekten verknuepft werden. Das ist die Grundlage fuer semantische Suche, Quellenranking und staerkere KI-Vorschlaege in den naechsten Phasen.
            </p>
            <Link href="/ai" className="btn-primary mt-4 inline-flex">
              <Sparkles className="w-4 h-4" /> Projekt in AI befragen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
