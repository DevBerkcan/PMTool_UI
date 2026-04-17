'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, BarChart3, Brain, Calendar, Check, ChevronRight,
  Clock, FileText, Loader2, Send, ShieldAlert, Sparkles, Terminal, TrendingUp, User, Wand2, X, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useSignalR } from '@/lib/useSignalR'
import type {
  AiAnswerSource, AiChatResponse, AiLearningSummary, AiSuggestion,
  CommandResult, DeadlinePrediction, NlTaskResult, PortfolioBriefing, PortfolioSummary,
  ProjectAiAnswer, RiskSignal, WeeklyStatus,
} from '@/types'

type Message =
  | { kind: 'chat'; role: 'user' | 'assistant'; content: string; sources?: AiAnswerSource[]; ts: Date }
  | { kind: 'command'; input: string; result: CommandResult; ts: Date }

const ENTITY_TYPE_LABEL: Record<string, string> = {
  task: 'Task', risk: 'Risiko', decision: 'Entscheidung',
  knowledge: 'Wissen', retro: 'Retro', note: 'Notiz',
}

const SUGGESTIONS = [
  'Portfolio Ueberblick', 'Kritische Risiken zeigen',
  'Welche Entscheidungen sind offen?', 'Was braucht Governance?',
  'Welches Wissen sollte ich in Aktionen umsetzen?',
]

export default function AIPage() {
  const qc = useQueryClient()
  const [messages, setMessages] = useState<Message[]>([
    {
      kind: 'chat', role: 'assistant',
      content: 'Hallo! Ich bin Ihr KI-Projektassistent.\n\nNutzen Sie Slash-Befehle wie /today, /focus, /risks, /priority — oder stellen Sie eine Frage. Ich greife auf Live-Projektdaten und die Knowledge Base zu.',
      ts: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [applyTargets, setApplyTargets] = useState<Record<string, 'task' | 'risk' | 'decision'>>({})
  const [projectQuestion, setProjectQuestion] = useState('')
  const [nlInput, setNlInput] = useState('')
  const [nlPreview, setNlPreview] = useState<NlTaskResult | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const { data: portfolio } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio'],
    queryFn: () => api.projects.getPortfolio(),
  })

  const { data: suggestions = [] } = useQuery<AiSuggestion[]>({
    queryKey: ['ai-suggestions', selectedProjectId],
    queryFn: () => api.ai.getSuggestions(selectedProjectId || undefined),
  })

  const { data: weeklyStatus } = useQuery<WeeklyStatus>({
    queryKey: ['weekly-status', selectedProjectId],
    queryFn: () => api.ai.getWeeklyStatus(selectedProjectId),
    enabled: !!selectedProjectId,
  })

  const { data: portfolioBriefing } = useQuery<PortfolioBriefing>({
    queryKey: ['portfolio-briefing'],
    queryFn: () => api.ai.getPortfolioBriefing(),
  })

  const { data: riskSignals = [] } = useQuery<RiskSignal[]>({
    queryKey: ['risk-signals', selectedProjectId],
    queryFn: () => api.ai.getRiskSignals(selectedProjectId || undefined),
  })

  const { data: learningSummary } = useQuery<AiLearningSummary>({
    queryKey: ['ai-learning-summary'],
    queryFn: () => api.ai.getLearningSummary(),
  })

  const { data: deadlinePrediction } = useQuery<DeadlinePrediction>({
    queryKey: ['deadline-prediction', selectedProjectId],
    queryFn: () => api.ai.predictDeadline(selectedProjectId),
    enabled: !!selectedProjectId,
  })

  // Real-time SignalR events on this page
  useSignalR({
    TaskCreated: (data: unknown) => {
      const d = data as { title: string; projectName: string }
      toast.success(`Task erstellt: ${d.title} (${d.projectName})`)
      qc.invalidateQueries({ queryKey: ['ai-suggestions'] })
    },
    MeetingExtracted: (data: unknown) => {
      const d = data as { meetingTitle: string; tasksCreated: number }
      setMessages(prev => [...prev, {
        kind: 'chat', role: 'assistant',
        content: `📋 Meeting automatisch verarbeitet: "${d.meetingTitle}" — ${d.tasksCreated} Tasks erstellt.`,
        ts: new Date(),
      }])
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: ({ projectId, type, title, status }: { projectId: string; type: string; title: string; status: 'accepted' | 'rejected' | 'edited' }) =>
      api.ai.submitFeedback({ projectId, type, title, status, notes: '' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ai-suggestions', selectedProjectId] })
      toast.success('AI-Vorschlag aktualisiert')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const applyMutation = useMutation({
    mutationFn: ({ projectId, type, title, recommendation, targetType }: { projectId: string; type: string; title: string; recommendation: string; targetType: 'task' | 'risk' | 'decision' }) =>
      api.ai.applySuggestion({ projectId, type, title, recommendation, targetType }),
    onSuccess: async result => {
      await qc.invalidateQueries({ queryKey: ['ai-suggestions', selectedProjectId] })
      await qc.invalidateQueries({ queryKey: ['project', result.projectId] })
      toast.success(`Als ${result.targetType} angelegt`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const questionMutation = useMutation<ProjectAiAnswer, Error, string>({
    mutationFn: question => api.ai.askProjectQuestion(selectedProjectId, question),
    onError: err => toast.error(err.message),
  })

  const nlDryRunMutation = useMutation<NlTaskResult, Error, string>({
    mutationFn: text => api.ai.createFromText({ text, projectId: selectedProjectId || undefined, dryRun: true }),
    onSuccess: result => setNlPreview(result),
    onError: err => toast.error(err.message),
  })

  const nlCreateMutation = useMutation<NlTaskResult, Error, string>({
    mutationFn: text => api.ai.createFromText({ text, projectId: selectedProjectId || undefined, dryRun: false }),
    onSuccess: result => {
      setNlPreview(null)
      setNlInput('')
      toast.success(result.message || 'Task erstellt')
      qc.invalidateQueries({ queryKey: ['project-tasks', selectedProjectId] })
    },
    onError: err => toast.error(err.message),
  })

  const selectedProject = useMemo(
    () => portfolio?.projects.find(p => p.id === selectedProjectId),
    [portfolio?.projects, selectedProjectId]
  )

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const isCommand = (text: string) => text.trimStart().startsWith('/')

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { kind: 'chat', role: 'user', content: text, ts: new Date() }])
    setInput('')
    setLoading(true)
    try {
      if (isCommand(text)) {
        const result: CommandResult = await api.ai.command(text, selectedProjectId || undefined)
        setMessages(prev => [...prev, { kind: 'command', input: text, result, ts: new Date() }])
      } else {
        const res: AiChatResponse = await api.ai.chat(text, selectedProjectId || undefined, conversationId)
        setConversationId(res.conversationId)
        setMessages(prev => [...prev, {
          kind: 'chat', role: 'assistant', content: res.reply, sources: res.sources, ts: new Date(),
        }])
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Die Antwort konnte nicht geladen werden.'
      setMessages(prev => [...prev, { kind: 'chat', role: 'assistant', content: message, ts: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const getDefaultTarget = (suggestion: AiSuggestion): 'task' | 'risk' | 'decision' => {
    if (suggestion.type === 'risk') return 'risk'
    if (suggestion.type === 'decision') return 'decision'
    return 'task'
  }

  return (
    <div className="max-w-7xl mx-auto grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
      {/* ── Left column: Chat ── */}
      <div className="flex flex-col gap-4 min-h-[calc(100vh-140px)]">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">PM Operating System</h1>
            <p className="text-gray-400 text-sm">Slash-Befehle (/today, /focus, /risks …) · RAG-Chat · Deadline-Prognose · Intelligente Vorschläge</p>
          </div>
        </div>

        {/* Project selector */}
        <div className="card p-4 flex items-center gap-3 flex-shrink-0">
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="input max-w-sm">
            <option value="">Alle Projekte</option>
            {portfolio?.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {conversationId && (
            <button
              onClick={() => { setConversationId(undefined); setMessages([{ kind: 'chat', role: 'assistant', content: 'Neues Gespräch gestartet.', ts: new Date() }]) }}
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Neues Gespräch
            </button>
          )}
          <p className="text-xs text-gray-500">Optional auf ein Projekt fokussieren, um Briefing, Vorschlaege und Wissenskontext zu verdichten.</p>
        </div>

        {/* Chat messages */}
        <div className="flex-1 card p-4 overflow-y-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {msg.kind === 'command' ? (
                  /* Command result card */
                  <div className="rounded-xl bg-gray-800/60 border border-gray-700/40 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">/{msg.result.command}</span>
                      <span className="text-sm font-semibold text-white">{msg.result.title}</span>
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border font-medium ${msg.result.severity === 'critical' ? 'bg-red-500/15 text-red-300 border-red-500/20' : msg.result.severity === 'warning' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : msg.result.severity === 'ok' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-blue-500/15 text-blue-300 border-blue-500/20'}`}>
                        {msg.result.severity}
                      </span>
                    </div>
                    {msg.result.summary && <p className="text-xs text-gray-400">{msg.result.summary}</p>}
                    {msg.result.sections.map((section, si) => (
                      <div key={si} className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-300">{section.icon} {section.title} <span className="text-gray-600 font-normal">({section.items.length})</span></p>
                        <div className="space-y-1 pl-2">
                          {section.items.slice(0, 4).map((item, ii) => (
                            <div key={ii} className={`border-l-2 pl-2 py-1 rounded-r text-xs ${item.severity === 'critical' ? 'border-red-500 bg-red-500/5' : item.severity === 'warning' ? 'border-amber-500 bg-amber-500/5' : item.severity === 'ok' ? 'border-emerald-500 bg-emerald-500/5' : 'border-blue-500/40 bg-blue-500/5'}`}>
                              <span className="text-white font-medium">{item.title}</span>
                              {item.projectName && <span className="text-gray-500 ml-2">{item.projectName}</span>}
                              {item.score && <span className={`ml-2 text-[10px] px-1 rounded ${item.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>{item.score}</span>}
                            </div>
                          ))}
                          {section.items.length > 4 && <p className="text-[10px] text-gray-600 pl-2">+{section.items.length - 4} weitere</p>}
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-600">{msg.ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ) : (
                  /* Chat message */
                  <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-blue-600/20'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                      <div className={`rounded-xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                        {msg.content.split('\n').map((line, li) => (
                          <p key={li} className={`text-sm leading-relaxed ${li > 0 ? 'mt-0.5' : ''}`}>{line || '\u00A0'}</p>
                        ))}
                        <p className="text-xs opacity-50 mt-2">{msg.ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="space-y-1.5 w-full">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wide">Quellen</p>
                          {msg.sources.map((src, si) => (
                            <div key={si} className="rounded-lg bg-gray-800/60 border border-gray-700/30 px-3 py-2 flex items-start gap-2">
                              <FileText className="w-3 h-3 text-gray-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0"><p className="text-[11px] text-gray-300 leading-snug">{src.snippet}</p></div>
                              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                <span className="text-[10px] text-gray-500">{ENTITY_TYPE_LABEL[src.entityType] ?? src.entityType}</span>
                                <span className="text-[10px] text-gray-600">{Math.round(src.score * 100)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-gray-800 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Command quick-access */}
        <div className="flex gap-1.5 flex-wrap flex-shrink-0">
          {['/today', '/focus', '/risks', '/priority', '/overdue', '/projects', '/whatdidimiss'].map(cmd => (
            <button key={cmd} onClick={() => send(cmd)} className="text-[11px] font-mono px-2.5 py-1 bg-gray-800/80 hover:bg-gray-700 text-blue-400 hover:text-blue-300 rounded-full border border-gray-700/50 transition-colors">
              {cmd}
            </button>
          ))}
        </div>

        {/* Natural language prompts */}
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full border border-gray-700 transition-colors flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />{s}
            </button>
          ))}
        </div>

        {/* Chat input */}
        <div className="flex gap-3 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Fragen Sie mich zu Ihren Projekten..."
            className="input flex-1"
            disabled={loading}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading} className="btn-primary px-4">
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* NL Task Creation panel */}
        <div className="card p-5 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">Task aus Text erstellen</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">Beschreiben Sie eine Aufgabe in natürlicher Sprache — die KI erstellt den Task automatisch.</p>
          <div className="flex gap-2">
            <input
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && nlInput.trim() && nlDryRunMutation.mutate(nlInput)}
              placeholder='z.B. "Berk soll bis Freitag die API-Dokumentation überprüfen, hohe Priorität"'
              className="input flex-1 text-sm"
            />
            <button
              onClick={() => nlDryRunMutation.mutate(nlInput)}
              disabled={!nlInput.trim() || nlDryRunMutation.isPending}
              className="btn-ghost px-3 text-sm"
            >
              {nlDryRunMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vorschau'}
            </button>
          </div>
          {nlPreview && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl border border-blue-500/20 bg-blue-600/5 p-4 space-y-2">
              <p className="text-sm font-medium text-white">{nlPreview.title}</p>
              {nlPreview.description && <p className="text-xs text-gray-400">{nlPreview.description}</p>}
              <div className="flex gap-3 text-xs text-gray-400">
                {nlPreview.assigneeName && <span>Zugewiesen: {nlPreview.assigneeName}</span>}
                {nlPreview.priority && <span>Priorität: {nlPreview.priority}</span>}
                {nlPreview.dueDate && <span>Fällig: {nlPreview.dueDate}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => nlCreateMutation.mutate(nlInput)}
                  disabled={nlCreateMutation.isPending}
                  className="btn-primary px-4 py-2 text-xs"
                >
                  {nlCreateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Task erstellen</>}
                </button>
                <button onClick={() => setNlPreview(null)} className="btn-ghost px-3 py-2 text-xs">Abbrechen</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Right column: Panels ── */}
      <div className="space-y-6">
        {/* Deadline Prediction */}
        {selectedProjectId && deadlinePrediction && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold text-white">Deadline-Prognose</h2>
              <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full ${deadlinePrediction.isOnTrack ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                {deadlinePrediction.isOnTrack ? 'On Track' : 'Verzögerung'}
              </span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-500">Geplantes Ende</p>
                  <p className="text-sm font-medium text-white mt-1">{deadlinePrediction.plannedEndDate ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-500">Prognose</p>
                  <p className={`text-sm font-medium mt-1 ${deadlinePrediction.isOnTrack ? 'text-emerald-300' : 'text-red-300'}`}>
                    {deadlinePrediction.predictedEndDate ?? '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-500">Velocity</p>
                  <p className="text-sm font-medium text-white mt-1">{deadlinePrediction.velocityTasksPerWeek.toFixed(1)} Tasks/Woche</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-500">Konfidenz</p>
                  <p className="text-sm font-medium text-white mt-1">{Math.round(deadlinePrediction.confidence * 100)}%</p>
                </div>
              </div>
              {deadlinePrediction.reasoning && (
                <div className="rounded-lg bg-blue-600/10 border border-blue-600/20 px-3 py-2">
                  <p className="text-xs text-blue-200">{deadlinePrediction.reasoning}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Management Briefing */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">Management Briefing</h2>
          </div>
          {!portfolioBriefing ? (
            <p className="text-sm text-gray-500">Portfolio-Briefing wird geladen.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-200">{portfolioBriefing.summary}</p>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Highlights</p>
                <div className="space-y-2">
                  {portfolioBriefing.highlights.map(item => (
                    <div key={item} className="rounded-lg bg-gray-800/70 px-3 py-2 text-sm text-gray-200">{item}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Eskalationen</p>
                <div className="space-y-2">
                  {portfolioBriefing.escalations.map(item => (
                    <div key={item} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{item}</div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {portfolioBriefing.projects.slice(0, 4).map(project => (
                  <div key={project.projectId} className="rounded-lg bg-gray-800/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{project.projectName}</p>
                      <span className="text-[11px] text-gray-400">{project.progressPercent}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{project.headline}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Risk signals */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-white">Risiko-Frueherkennung</h2>
          </div>
          {riskSignals.length === 0 ? (
            <p className="text-sm text-gray-500">Aktuell keine zusaetzlichen Fruehwarnsignale erkannt.</p>
          ) : (
            <div className="space-y-3">
              {riskSignals.slice(0, 6).map(signal => (
                <div key={`${signal.projectId}-${signal.title}`} className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{signal.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{signal.projectName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] ${signal.severity === 'high' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{signal.severity}</span>
                      <span className="rounded-full bg-gray-800 px-2 py-1 text-[11px] text-gray-300">Score {signal.score}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mt-3">{signal.detail}</p>
                  {signal.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {signal.sources.map(source => <span key={source} className="rounded-full bg-gray-800 px-2 py-1 text-[11px] text-gray-300">{source}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Learning feedback */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">Lernendes Feedback</h2>
          </div>
          {!learningSummary ? (
            <p className="text-sm text-gray-500">KI-Lernmuster werden geladen.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500">Feedback gesamt</p><p className="mt-1 text-lg font-semibold text-white">{learningSummary.totalFeedback}</p></div>
                <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500">Akzeptiert</p><p className="mt-1 text-lg font-semibold text-emerald-300">{learningSummary.accepted}</p></div>
                <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500">Verworfen</p><p className="mt-1 text-lg font-semibold text-red-300">{learningSummary.rejected}</p></div>
                <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500">Bearbeitet</p><p className="mt-1 text-lg font-semibold text-blue-300">{learningSummary.edited}</p></div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Erkenntnisse</p>
                <div className="space-y-2">
                  {learningSummary.insights.map(item => <div key={item} className="rounded-lg bg-blue-600/10 border border-blue-600/20 px-3 py-2 text-sm text-blue-100">{item}</div>)}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Top Typen</p>
                <div className="space-y-2">
                  {learningSummary.byType.slice(0, 4).map(item => (
                    <div key={item.suggestionType} className="rounded-lg bg-gray-800/70 p-3 text-sm text-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <span>{item.suggestionType}</span>
                        <span className="text-xs text-gray-500">{item.accepted} akzeptiert / {item.rejected} verworfen</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Project question with RAG sources */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">Ask Project AI</h2>
          </div>
          {!selectedProjectId ? (
            <p className="text-sm text-gray-500">Waehlen Sie oben ein Projekt aus, um gezielte Fragen mit Quellenbezug zu stellen.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={projectQuestion}
                  onChange={e => setProjectQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && projectQuestion.trim() && questionMutation.mutate(projectQuestion)}
                  placeholder={`Frage zu ${selectedProject?.name ?? 'dem Projekt'}...`}
                  className="input flex-1"
                />
                <button
                  onClick={() => projectQuestion.trim() && questionMutation.mutate(projectQuestion)}
                  disabled={!projectQuestion.trim() || questionMutation.isPending}
                  className="btn-primary px-4"
                >
                  {questionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {questionMutation.data && (
                <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{questionMutation.data.projectName}</p>
                    <span className="rounded-full bg-blue-600/10 px-2 py-1 text-[11px] text-blue-300">{questionMutation.data.confidence}</span>
                  </div>
                  <p className="text-sm text-gray-200">{questionMutation.data.answer}</p>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Quellen</p>
                    <div className="space-y-2">
                      {questionMutation.data.sources.map(source => (
                        <div key={`${source.type}-${source.title}`} className="rounded-lg bg-gray-800/70 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-white">{source.title}</p>
                            <span className="text-[11px] text-gray-500">{source.type}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{source.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Empfohlene Aktionen</p>
                    <div className="space-y-2">
                      {questionMutation.data.suggestedActions.map(action => (
                        <div key={action} className="rounded-lg bg-blue-600/10 border border-blue-600/20 px-3 py-2 text-sm text-blue-100">{action}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weekly status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">Smart Weekly Status</h2>
          </div>
          {!selectedProjectId || !weeklyStatus ? (
            <p className="text-sm text-gray-500">Projekt auswaehlen, um den intelligenten Wochenstatus zu sehen.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-white">{weeklyStatus.projectName}</p>
                <p className="text-sm text-gray-300 mt-2">{weeklyStatus.summary}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500 mb-1">Delivery Focus</p><p className="text-gray-200">{weeklyStatus.deliveryFocus}</p></div>
                <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500 mb-1">Risk Focus</p><p className="text-gray-200">{weeklyStatus.riskFocus}</p></div>
                <div className="rounded-lg bg-gray-800/70 p-3"><p className="text-xs text-gray-500 mb-1">Governance Focus</p><p className="text-gray-200">{weeklyStatus.governanceFocus}</p></div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Highlights</p>
                <div className="space-y-2">{weeklyStatus.highlights.map(item => <div key={item} className="rounded-lg bg-gray-800/70 px-3 py-2 text-sm text-gray-200">{item}</div>)}</div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Naechste Schritte</p>
                <div className="space-y-2">{weeklyStatus.nextActions.map(item => <div key={item} className="rounded-lg bg-blue-600/10 border border-blue-600/20 px-3 py-2 text-sm text-blue-100">{item}</div>)}</div>
              </div>
            </div>
          )}
        </div>

        {/* AI Inbox (suggestions) */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-white">AI Inbox</h2>
          </div>
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-gray-500">Aktuell keine Vorschlaege erkannt.</p>
            ) : (
              suggestions.map((suggestion, index) => (
                <motion.div key={`${suggestion.projectId}-${suggestion.title}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{suggestion.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{suggestion.projectName} · {suggestion.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {suggestion.feedbackStatus !== 'open' && <span className="text-[11px] rounded-full bg-blue-500/10 px-2 py-1 text-blue-300">{suggestion.feedbackStatus}</span>}
                      <span className={`text-[11px] px-2 py-1 rounded-full ${suggestion.priority === 'high' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{suggestion.priority}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mt-3">{suggestion.reason}</p>
                  <p className="text-sm text-blue-100 mt-2">{suggestion.recommendation}</p>
                  {suggestion.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestion.sources.map(source => <span key={source} className="rounded-full bg-gray-800 px-2 py-1 text-[11px] text-gray-300">{source}</span>)}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => feedbackMutation.mutate({ projectId: suggestion.projectId, type: suggestion.type, title: suggestion.title, status: 'accepted' })} className="btn-ghost px-3 py-2 text-xs">
                      <Check className="mr-1 h-3.5 w-3.5" /> Uebernehmen
                    </button>
                    <button onClick={() => feedbackMutation.mutate({ projectId: suggestion.projectId, type: suggestion.type, title: suggestion.title, status: 'rejected' })} className="btn-ghost px-3 py-2 text-xs">
                      <X className="mr-1 h-3.5 w-3.5" /> Verwerfen
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <select
                      value={applyTargets[`${suggestion.projectId}-${suggestion.title}`] ?? getDefaultTarget(suggestion)}
                      onChange={e => setApplyTargets(prev => ({ ...prev, [`${suggestion.projectId}-${suggestion.title}`]: e.target.value as 'task' | 'risk' | 'decision' }))}
                      className="input h-10 min-w-[140px] text-sm"
                    >
                      <option value="task">Als Task</option>
                      <option value="risk">Als Risiko</option>
                      <option value="decision">Als Entscheidung</option>
                    </select>
                    <button
                      onClick={() => applyMutation.mutate({
                        projectId: suggestion.projectId,
                        type: suggestion.type,
                        title: suggestion.title,
                        recommendation: suggestion.recommendation,
                        targetType: applyTargets[`${suggestion.projectId}-${suggestion.title}`] ?? getDefaultTarget(suggestion),
                      })}
                      className="btn-primary px-3 py-2 text-xs"
                    >
                      Freigeben und anlegen
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">Intelligente Nutzung</h2>
          </div>
          <p className="text-sm text-gray-300">
            {selectedProject
              ? `${selectedProject.name} nutzt jetzt neben Live-Projektdaten auch eine Knowledge Base. Die KI kann dadurch Vorschlaege mit Quellen erzeugen und du kannst diese aktiv uebernehmen oder verwerfen.`
              : 'Die aktuelle Ausbaustufe verbindet Live-Projektdaten mit projektbezogenem Wissen über ein RAG-System. Der Chat behält den Gesprächsverlauf über mehrere Nachrichten hinweg und zeigt Quellen zu jeder Antwort.'}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span>Echtzeit-Updates via SignalR · Embedding-Backfill läuft automatisch</span>
          </div>
        </div>
      </div>
    </div>
  )
}
