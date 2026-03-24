'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, Check, FileText, Loader2, Send, ShieldAlert, Sparkles, User, Wand2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { AiSuggestion, PortfolioSummary, WeeklyStatus } from '@/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: Date
}

const SUGGESTIONS = ['Portfolio Ueberblick', 'Kritische Risiken zeigen', 'Welche Entscheidungen sind offen?', 'Was braucht Governance?', 'Welches Wissen sollte ich in Aktionen umsetzen?']

export default function AIPage() {
  const qc = useQueryClient()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hallo! Ich bin Ihr KI-Projektassistent.\n\nIch greife auf Live-Projektdaten und die projektbezogene Knowledge Base zu und liefere Vorschlaege, Status und Handlungsempfehlungen.', ts: new Date() },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [applyTargets, setApplyTargets] = useState<Record<string, 'task' | 'risk' | 'decision'>>({})
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
      await qc.invalidateQueries({ queryKey: ['project-tasks', result.projectId] })
      await qc.invalidateQueries({ queryKey: ['project-risks', result.projectId] })
      toast.success(`Als ${result.targetType} angelegt`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const selectedProject = useMemo(
    () => portfolio?.projects.find(project => project.id === selectedProjectId),
    [portfolio?.projects, selectedProjectId]
  )

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', content: text, ts: new Date() }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.ai.chat(text, selectedProjectId || undefined)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, ts: new Date() }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.message || 'Die Antwort konnte nicht geladen werden.', ts: new Date() }])
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
      <div className="flex flex-col gap-4 min-h-[calc(100vh-140px)]">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center"><Brain className="w-5 h-5 text-blue-400" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Projektassistent</h1>
            <p className="text-gray-400 text-sm">Chat, Wochenstatus und intelligente Vorschlaege aus Live-Projektdaten und Knowledge Base</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} className="input max-w-sm">
            <option value="">Alle Projekte</option>
            {portfolio?.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <p className="text-xs text-gray-500">Optional auf ein Projekt fokussieren, um Briefing, Vorschlaege und Wissenskontext zu verdichten.</p>
        </div>

        <div className="flex-1 card p-4 overflow-y-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-blue-600/20'}`}>{msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-blue-400" />}</div>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                  {msg.content.split('\n').map((line, lineIndex) => <p key={lineIndex} className={`text-sm leading-relaxed ${lineIndex > 0 ? 'mt-0.5' : ''}`}>{line || '\u00A0'}</p>)}
                  <p className="text-xs opacity-50 mt-2">{msg.ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center"><Sparkles className="w-4 h-4 text-blue-400" /></div><div className="bg-gray-800 rounded-xl px-4 py-3"><Loader2 className="w-4 h-4 text-gray-400 animate-spin" /></div></div>}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {SUGGESTIONS.map(suggestion => <button key={suggestion} onClick={() => send(suggestion)} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full border border-gray-700 transition-colors">{suggestion}</button>)}
        </div>

        <div className="flex gap-3 flex-shrink-0">
          <input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && !event.shiftKey && send(input)} placeholder="Fragen Sie mich zu Ihren Projekten..." className="input flex-1" disabled={loading} />
          <button onClick={() => send(input)} disabled={!input.trim() || loading} className="btn-primary px-4"><Send className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="space-y-6">
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
                      onChange={event => setApplyTargets(prev => ({ ...prev, [`${suggestion.projectId}-${suggestion.title}`]: event.target.value as 'task' | 'risk' | 'decision' }))}
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

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">Intelligente Nutzung</h2>
          </div>
          <p className="text-sm text-gray-300">
            {selectedProject
              ? `${selectedProject.name} nutzt jetzt neben Live-Projektdaten auch eine Knowledge Base. Die KI kann dadurch Vorschlaege mit Quellen erzeugen und du kannst diese aktiv uebernehmen oder verwerfen.`
              : 'Die aktuelle Ausbaustufe verbindet Live-Projektdaten mit projektbezogenem Wissen. Der naechste Ausbau kann Teams-Meetings, SharePoint-Dokumente und spaeter echte LLM-basierte Extraktion anbinden.'}
          </p>
        </div>
      </div>
    </div>
  )
}
