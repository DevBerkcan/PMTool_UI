'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Brain, Calendar, Check, CheckCircle2, ChevronRight,
  Circle, Clock, Download, FileText, FolderKanban, Link2, Loader2,
  Plus, Search, Sparkles, Upload, Users, Video, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { GlobalMeeting, MeetingExtractResult, Project } from '@/types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusBadge(s: GlobalMeeting['extractionStatus'], hasTranscript: boolean) {
  if (s === 'extracted') return { label: 'Analysiert', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', Icon: CheckCircle2 }
  if (s === 'pending')   return { label: 'Wird analysiert…', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', Icon: Clock }
  if (hasTranscript)     return { label: 'Bereit', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', Icon: FileText }
  return { label: 'Kein Transkript', color: 'text-gray-500', bg: 'bg-gray-700/30 border-gray-700', Icon: Circle }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── New-meeting modal ─────────────────────────────────────────────────────────

function NewMeetingModal({ projects, onClose, onCreated }: {
  projects: Project[]
  onClose: () => void
  onCreated: (m: GlobalMeeting) => void
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [participants, setParticipants] = useState('')
  const [teamsId, setTeamsId] = useState('')
  const [transcript, setTranscript] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: async () => {
      const m = await api.projects.createMeeting(projectId, {
        title, meetingDate: new Date(date).toISOString(),
        participants, location: '', teamsOnlineMeetingId: teamsId || undefined,
      })
      if (transcript.trim()) await api.projects.addTranscript(projectId, m.id, transcript.trim())
      return m
    },
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['global-meetings'] })
      toast.success('Meeting erstellt')
      onCreated({
        id: m.id, projectId,
        projectName: projects.find(p => p.id === projectId)?.name ?? '',
        title: m.title, meetingDate: m.meetingDate,
        participants: m.participants, location: m.location,
        extractionStatus: 'none', hasTranscript: !!transcript.trim(),
        notes: m.notes, createdByName: m.createdByName, createdAt: m.createdAt,
        summary: '', teamsOnlineMeetingId: teamsId,
      })
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Video className="w-5 h-5 text-blue-400" /> Neues Meeting</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Projekt *</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Titel *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Sprint Planning Q2"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Datum & Uhrzeit</label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Teilnehmer (optional)</label>
            <input value={participants} onChange={e => setParticipants(e.target.value)} placeholder="z.B. Berk, Anna, Tom"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-blue-400" /> Teams Meeting-ID (optional)
            </label>
            <input value={teamsId} onChange={e => setTeamsId(e.target.value)}
              placeholder="MSthreadsJA6…  (für automatischen Transkript-Abruf)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs" />
            <p className="text-xs text-gray-600 mt-1">In Teams: Meeting → Details → Meeting-ID kopieren</p>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Transkript einfügen (optional)</label>
            <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
              placeholder="Teams-Transkript hier einfügen…" rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono text-xs" />
          </div>
        </div>

        <div className="p-5 border-t border-gray-800 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Abbrechen</button>
          <button onClick={() => mut.mutate()} disabled={!projectId || !title.trim() || mut.isPending}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Erstellen
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const c: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }
  return (
    <div className={`rounded-xl border p-3 ${c[color]}`}>
      <div className="flex items-center gap-2 mb-1"><Icon className="w-3.5 h-3.5" /><span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

// ─── Meeting detail panel ──────────────────────────────────────────────────────

function MeetingDetail({ meeting, onClose }: { meeting: GlobalMeeting; onClose: () => void }) {
  const [tab, setTab] = useState<'transcript' | 'results'>(meeting.hasTranscript ? 'transcript' : 'transcript')
  const [transcript, setTranscript] = useState('')
  const [teamsId, setTeamsId] = useState(meeting.teamsOnlineMeetingId ?? '')
  const [result, setResult] = useState<MeetingExtractResult | null>(null)
  const [localStatus, setLocalStatus] = useState(meeting.extractionStatus)
  const qc = useQueryClient()

  const { data: tokenStatus } = useQuery({
    queryKey: ['graph-token-status'],
    queryFn: () => api.integrations.getGraphTokenStatus(),
  })

  const saveMut = useMutation({
    mutationFn: () => api.projects.addTranscript(meeting.projectId, meeting.id, transcript),
    onSuccess: () => { toast.success('Transkript gespeichert'); qc.invalidateQueries({ queryKey: ['global-meetings'] }) },
    onError: () => toast.error('Fehler beim Speichern'),
  })

  const fetchFromTeamsMut = useMutation({
    mutationFn: async () => {
      // Save Teams ID first if changed
      if (teamsId !== meeting.teamsOnlineMeetingId) {
        await api.projects.updateMeeting(meeting.projectId, meeting.id, { teamsOnlineMeetingId: teamsId })
      }
      return api.projects.fetchTranscript(meeting.projectId, meeting.id)
    },
    onSuccess: () => {
      toast.success('Transkript aus Teams geladen!')
      qc.invalidateQueries({ queryKey: ['global-meetings'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Fehler beim Laden aus Teams'),
  })

  const extractMut = useMutation({
    mutationFn: () => api.projects.extractMeeting(meeting.projectId, meeting.id),
    onMutate: () => setLocalStatus('pending'),
    onSuccess: (data) => {
      setResult(data); setLocalStatus('extracted'); setTab('results')
      toast.success(`Analyse fertig: ${data.createdTasks} Tasks, ${data.createdDecisions} Entscheidungen, ${data.createdRisks} Risiken`)
      qc.invalidateQueries({ queryKey: ['global-meetings'] })
    },
    onError: () => { setLocalStatus('none'); toast.error('AI-Analyse fehlgeschlagen') },
  })

  const hasTranscript = meeting.hasTranscript || transcript.trim().length > 0
  const graphConnected = tokenStatus?.hasValidToken ?? false

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-800 gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
            {meeting.projectName}
          </span>
          <h2 className="text-base font-semibold text-white mt-1 truncate">{meeting.title}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmt(meeting.meetingDate)}</span>
            {meeting.participants && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{meeting.participants}</span>}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors flex-shrink-0 mt-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['transcript', 'results'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>
            {t === 'transcript' ? '📝 Transkript' : '✨ Ergebnisse'}
            {t === 'results' && (localStatus === 'extracted' || result) && (
              <span className="ml-1.5 inline-flex w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Transkript tab ── */}
        {tab === 'transcript' && (
          <div className="p-4 space-y-4">
            {/* Teams-ID + Graph fetch */}
            <div className="rounded-xl bg-gray-800/60 border border-gray-700 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-sm font-medium text-white">Aus Microsoft Teams laden</span>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-medium ${graphConnected ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-500 bg-gray-700/30 border-gray-700'}`}>
                  {graphConnected ? '● Verbunden' : '○ Nicht verbunden'}
                </span>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Teams Meeting-ID</label>
                <input value={teamsId} onChange={e => setTeamsId(e.target.value)}
                  placeholder="z.B. MSthreadsJA6Xv3tE… (aus Teams → Meeting Details)"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
              </div>

              {graphConnected ? (
                <button
                  onClick={() => fetchFromTeamsMut.mutate()}
                  disabled={!teamsId.trim() || fetchFromTeamsMut.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-sm font-medium disabled:opacity-40 transition-colors">
                  {fetchFromTeamsMut.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Lade Transkript…</>
                    : <><Download className="w-4 h-4" /> Transkript aus Teams abrufen</>}
                </button>
              ) : (
                <a href="/settings" className="flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-400 text-sm hover:text-white transition-colors">
                  <Link2 className="w-4 h-4" />
                  Microsoft verbinden → Einstellungen
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </a>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <div className="flex-1 h-px bg-gray-800" /> oder manuell einfügen <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Manual paste */}
            {meeting.hasTranscript && !transcript && (
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400 flex items-center gap-2">
                <Check className="w-3.5 h-3.5" /> Transkript ist bereits hinterlegt
              </div>
            )}
            <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
              placeholder="Teams-Transkript hier einfügen…" rows={7}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono leading-relaxed" />

            <div className="flex gap-2">
              <button onClick={() => saveMut.mutate()} disabled={!transcript.trim() || saveMut.isPending}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 disabled:opacity-40 transition-colors">
                {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Speichern
              </button>
              <button onClick={() => extractMut.mutate()}
                disabled={!hasTranscript || extractMut.isPending || localStatus === 'pending'}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium disabled:opacity-40 transition-colors">
                {extractMut.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysiere…</>
                  : <><Sparkles className="w-4 h-4" /> AI-Analyse starten</>}
              </button>
            </div>

            {!hasTranscript && (
              <p className="text-xs text-gray-600 text-center">
                Verbinde Microsoft Teams oder füge das Transkript manuell ein — die KI extrahiert dann automatisch Tasks, Entscheidungen und Risiken.
              </p>
            )}
          </div>
        )}

        {/* ── Ergebnisse tab ── */}
        {tab === 'results' && (
          <div className="p-4 space-y-4">
            {!result && localStatus !== 'extracted' && localStatus !== 'pending' && (
              <div className="text-center py-12 text-gray-600">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Noch keine Analyse vorhanden.</p>
                <button onClick={() => setTab('transcript')} className="mt-3 text-xs text-blue-400 hover:text-blue-300">
                  → Transkript hinzufügen & analysieren
                </button>
              </div>
            )}
            {localStatus === 'pending' && !result && (
              <div className="text-center py-12 text-amber-400">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                <p className="text-sm">KI analysiert das Transkript…</p>
              </div>
            )}
            {result && (
              <>
                {result.summary && (
                  <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
                    <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Zusammenfassung</p>
                    <p className="text-sm text-gray-200 leading-relaxed">{result.summary}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Check} label="Tasks erstellt" value={result.createdTasks} color="emerald" />
                  <StatCard icon={FileText} label="Entscheidungen" value={result.createdDecisions} color="blue" />
                  <StatCard icon={AlertTriangle} label="Risiken" value={result.createdRisks} color="amber" />
                  <StatCard icon={Brain} label="Wissensbeiträge" value={result.createdKnowledgeItems} color="purple" />
                </div>
                <a href={`/projects/${meeting.projectId}/tasks`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 hover:text-white transition-colors">
                  <FolderKanban className="w-4 h-4" /> Tasks im Projekt anzeigen
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<GlobalMeeting | null>(null)
  const [showNew, setShowNew] = useState(false)

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.projects.getAll(),
  })

  const { data: meetings = [], isLoading } = useQuery<GlobalMeeting[]>({
    queryKey: ['global-meetings', filterProject, filterStatus],
    queryFn: () => api.globalMeetings.getAll({ projectId: filterProject || undefined, status: filterStatus || undefined }),
  })

  const { data: tokenStatus } = useQuery({
    queryKey: ['graph-token-status'],
    queryFn: () => api.integrations.getGraphTokenStatus(),
  })

  const filtered = meetings.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.title.toLowerCase().includes(q) || m.projectName.toLowerCase().includes(q)
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-400" /> Meetings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Transkripte hochladen · AI extrahiert Tasks, Entscheidungen & Risiken automatisch
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tokenStatus?.hasValidToken ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Microsoft verbunden
            </span>
          ) : (
            <a href="/settings" className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-blue-500 transition-colors flex items-center gap-1.5">
              <Video className="w-3 h-3" /> Teams verbinden
            </a>
          )}
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Neues Meeting
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche…"
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Alle Projekte</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">Alle Status</option>
          <option value="none">Kein Transkript / Bereit</option>
          <option value="extracted">Analysiert</option>
        </select>
      </div>

      {/* Split layout */}
      <div className="flex-1 min-h-0 flex rounded-xl overflow-hidden border border-gray-800">
        {/* List */}
        <div className={`flex flex-col bg-gray-900 overflow-y-auto transition-all duration-200 ${selected ? 'w-2/5 border-r border-gray-800' : 'w-full'}`}>
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-gray-600">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Keine Meetings gefunden.</p>
              <button onClick={() => setShowNew(true)} className="mt-3 text-xs text-blue-400 hover:text-blue-300">
                + Erstes Meeting erstellen
              </button>
            </div>
          )}
          {filtered.map(m => {
            const st = statusBadge(m.extractionStatus, m.hasTranscript)
            const isActive = selected?.id === m.id
            return (
              <button key={m.id} onClick={() => setSelected(isActive ? null : m)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-800 transition-colors hover:bg-gray-800/60 ${isActive ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{fmt(m.meetingDate)}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-blue-400/80 truncate">{m.projectName}</span>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${st.bg} ${st.color}`}>
                    <st.Icon className="w-2.5 h-2.5" />
                    {!selected && st.label}
                  </span>
                </div>
                {m.teamsOnlineMeetingId && !selected && (
                  <p className="text-[10px] text-blue-500/60 mt-1 flex items-center gap-1">
                    <Video className="w-2.5 h-2.5" /> Teams verknüpft
                  </p>
                )}
                {m.participants && !selected && (
                  <p className="text-xs text-gray-600 mt-1 truncate flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />{m.participants}
                  </p>
                )}
              </button>
            )
          })}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.15 }} className="flex-1 min-w-0">
              <MeetingDetail meeting={selected} onClose={() => setSelected(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showNew && (
          <NewMeetingModal projects={projects} onClose={() => setShowNew(false)}
            onCreated={m => { setShowNew(false); setSelected(m) }} />
        )}
      </AnimatePresence>
    </div>
  )
}
