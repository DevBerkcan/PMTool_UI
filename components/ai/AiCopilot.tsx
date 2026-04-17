'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, BookOpen, Brain, CheckSquare, ChevronRight,
  FileText, Loader2, Send, Sparkles, Terminal, X,
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useSignalR } from '@/lib/useSignalR'
import type { AiAnswerSource, AiChatResponse, CommandAction, CommandItem, CommandResult, CommandSection } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type CopilotMessage =
  | { kind: 'chat'; role: 'user' | 'assistant'; content: string; sources?: AiAnswerSource[]; ts: Date }
  | { kind: 'command'; input: string; result: CommandResult; ts: Date }

interface MeetingExtractedPayload {
  projectId: string; meetingTitle: string
  tasksCreated: number; decisionsCreated: number; risksCreated: number
  sentiment: string; confidence: number; requiresReview: boolean
}

// ─── Commands list ────────────────────────────────────────────────────────────

const COMMANDS = [
  { cmd: '/today',          desc: 'Prioritäten, Meetings & Tasks von heute' },
  { cmd: '/tomorrow',       desc: 'Planung für morgen' },
  { cmd: '/nextdays',       desc: 'Nächste 7 Tage — Konflikte & Bottlenecks' },
  { cmd: '/priority',       desc: 'Top Tasks über alle Projekte mit Begründung' },
  { cmd: '/risks',          desc: 'Kritische Risiken & Blocker' },
  { cmd: '/meetings',       desc: 'Heutige Meetings & ausstehende Follow-ups' },
  { cmd: '/projects',       desc: 'Alle aktiven Projekte auf einen Blick' },
  { cmd: '/focus',          desc: 'Was soll ich JETZT tun?' },
  { cmd: '/summary',        desc: '/summary [Projekt] — Kompaktübersicht' },
  { cmd: '/followups',      desc: 'Offene Follow-ups aus Meetings' },
  { cmd: '/overdue',        desc: 'Alle überfälligen Items' },
  { cmd: '/whatdidimiss',   desc: 'Was habe ich seit gestern verpasst?' },
  { cmd: '/escalations',    desc: 'Management-relevante Eskalationen' },
  { cmd: '/statusmail',     desc: '/statusmail [Projekt] — E-Mail-Entwurf' },
  { cmd: '/teamload',       desc: 'Auslastung pro Teammitglied' },
  { cmd: '/decisionlog',    desc: 'Entscheidungsprotokoll' },
  { cmd: '/preparemeeting', desc: '/preparemeeting [Projekt] — Meeting-Vorbereitung' },
  { cmd: '/customerpulse',  desc: '/customerpulse [Projekt] — Kundenstatus' },
  { cmd: '/weekreview',     desc: 'Was wurde diese Woche erledigt?' },
  { cmd: '/nextbestaction', desc: 'Die eine wichtigste Aktion jetzt' },
  { cmd: '/stucktasks',     desc: 'Tasks die 5+ Tage nicht bewegt wurden' },
]

const QUICK_COMMANDS = ['/today', '/focus', '/risks', '/priority', '/overdue']

// ─── Severity styling ─────────────────────────────────────────────────────────

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-500/5',
  warning:  'border-l-amber-500 bg-amber-500/5',
  ok:       'border-l-emerald-500 bg-emerald-500/5',
  info:     'border-l-blue-500/50 bg-blue-500/5',
}
const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  warning:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  ok:       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  info:     'bg-blue-500/15 text-blue-300 border-blue-500/30',
}
const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-400', warning: 'bg-amber-400', ok: 'bg-emerald-400', info: 'bg-blue-400',
}

const ENTITY_ICON: Record<string, React.ReactNode> = {
  task:     <CheckSquare className="w-3 h-3 text-blue-400" />,
  risk:     <AlertTriangle className="w-3 h-3 text-amber-400" />,
  decision: <CheckSquare className="w-3 h-3 text-purple-400" />,
  knowledge:<BookOpen className="w-3 h-3 text-emerald-400" />,
  retro:    <FileText className="w-3 h-3 text-gray-400" />,
}

// ─── CommandCard ──────────────────────────────────────────────────────────────

function ActionButton({ action, onChatAction }: { action: CommandAction; onChatAction: (text: string) => void }) {
  const router = useRouter()
  const handle = () => {
    if (action.actionType === 'openProject' && action.projectId)
      router.push(`/projects/${action.projectId}`)
    else if (action.actionType === 'navigate' && action.payload)
      router.push(action.payload)
    else if (action.actionType === 'chat' && action.payload)
      onChatAction(action.payload)
  }
  return (
    <button onClick={handle} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
      {action.label}
    </button>
  )
}

function CommandItemRow({ item, onChatAction }: { item: CommandItem; onChatAction: (text: string) => void }) {
  return (
    <div className={`border-l-2 pl-3 py-2 rounded-r-lg ${SEVERITY_BORDER[item.severity] ?? SEVERITY_BORDER.info}`}>
      <div className="flex items-start gap-2">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white leading-snug">{item.title}</p>
          {item.detail && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.detail}</p>}
          {/* Badges row */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.projectName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{item.projectName}</span>
            )}
            {item.assigneeName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">👤 {item.assigneeName}</span>
            )}
            {item.dueDate && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">📅 {item.dueDate}</span>
            )}
            {item.priority && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{item.priority}</span>
            )}
            {item.score && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[item.severity] ?? SEVERITY_BADGE.info}`}>{item.score}</span>
            )}
          </div>
          {/* Item actions */}
          {item.actions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.actions.map((a, i) => <ActionButton key={i} action={a} onChatAction={onChatAction} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionBlock({ section, onChatAction }: { section: CommandSection; onChatAction: (text: string) => void }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className="text-sm">{section.icon}</span>
        <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">{section.title}</span>
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[section.severity] ?? SEVERITY_BADGE.info}`}>
          {section.items.length}
        </span>
        <ChevronRight className={`w-3 h-3 text-gray-600 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
      </button>
      {!collapsed && (
        <div className="space-y-1.5 pl-1">
          {section.items.map((item, i) => (
            <CommandItemRow key={i} item={item} onChatAction={onChatAction} />
          ))}
        </div>
      )}
    </div>
  )
}

function CommandCard({ result, input, onChatAction }: { result: CommandResult; input: string; onChatAction: (text: string) => void }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${SEVERITY_BADGE[result.severity] ?? SEVERITY_BADGE.info}`}>
            /{result.command}
          </span>
          <p className="text-sm font-semibold text-white truncate">{result.title}</p>
        </div>
      </div>
      {/* Summary */}
      {result.summary && (
        <p className="text-xs text-gray-400 leading-relaxed">{result.summary}</p>
      )}
      {/* Sections */}
      {result.sections.map((section, i) => (
        <SectionBlock key={i} section={section} onChatAction={onChatAction} />
      ))}
      {/* Global actions */}
      {result.suggestedActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-800/60">
          {result.suggestedActions.map((a, i) => (
            <ActionButton key={i} action={a} onChatAction={onChatAction} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  projectId?: string
  projectName?: string
}

export function AiCopilot({ projectId, projectName }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      kind: 'chat', role: 'assistant',
      content: projectName
        ? `Hallo! Ich bin Ihr KI-Assistent für **${projectName}**.\n\nNutzen Sie Slash-Befehle wie /today, /focus, /risks oder stellen Sie einfach eine Frage.`
        : 'Hallo! Ich bin Ihr KI-Projektassistent.\n\nNutzen Sie Slash-Befehle wie /today, /priority, /focus — oder stellen Sie mir eine Frage zu Ihren Projekten.',
      ts: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [liveNotification, setLiveNotification] = useState<string | null>(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // Show autocomplete when typing a /command without spaces yet
  useEffect(() => {
    const trimmed = input.trimStart()
    const isCmd = trimmed.startsWith('/')
    const hasSpace = trimmed.includes(' ')
    setShowAutocomplete(isCmd && !hasSpace && trimmed.length > 0)
  }, [input])

  const filteredCommands = COMMANDS.filter(c =>
    c.cmd.startsWith(input.trimStart().toLowerCase()) || input.trimStart() === '/'
  )

  // SignalR real-time events
  useSignalR(
    {
      MeetingExtracted: useCallback((data: unknown) => {
        const payload = data as MeetingExtractedPayload
        const msg = `📋 Meeting verarbeitet: "${payload.meetingTitle}" — ${payload.tasksCreated} Tasks, ${payload.decisionsCreated} Entscheidungen, ${payload.risksCreated} Risiken erstellt.`
        setLiveNotification(msg)
        setMessages(prev => [...prev, { kind: 'chat', role: 'assistant', content: msg, ts: new Date() }])
        setTimeout(() => setLiveNotification(null), 8000)
      }, []),
      AiNotification: useCallback((data: unknown) => {
        const payload = data as { message: string }
        setLiveNotification(payload.message)
        setTimeout(() => setLiveNotification(null), 6000)
      }, []),
      MondayBriefingReady: useCallback((data: unknown) => {
        const payload = data as { briefing: string; userName: string }
        setMessages(prev => [...prev, {
          kind: 'chat', role: 'assistant',
          content: `📬 Monday Briefing für ${payload.userName}:\n\n${payload.briefing}`,
          ts: new Date(),
        }])
      }, []),
    },
    projectId
  )

  const isCommand = (text: string) => text.trimStart().startsWith('/')

  const commandMutation = useMutation<CommandResult, Error, string>({
    mutationFn: text => api.ai.command(text, projectId),
    onSuccess: (result, text) => {
      setMessages(prev => [...prev, { kind: 'command', input: text, result, ts: new Date() }])
    },
    onError: err => {
      toast.error(err.message)
      setMessages(prev => [...prev, {
        kind: 'chat', role: 'assistant',
        content: `Fehler beim Ausführen des Befehls: ${err.message}`,
        ts: new Date(),
      }])
    },
  })

  const chatMutation = useMutation<AiChatResponse, Error, string>({
    mutationFn: text => api.ai.chat(text, projectId, conversationId),
    onSuccess: res => {
      setConversationId(res.conversationId)
      setMessages(prev => [...prev, {
        kind: 'chat', role: 'assistant',
        content: res.reply, sources: res.sources, ts: new Date(),
      }])
    },
    onError: err => {
      toast.error(err.message)
      setMessages(prev => [...prev, {
        kind: 'chat', role: 'assistant',
        content: 'Entschuldigung, ich konnte keine Antwort generieren.',
        ts: new Date(),
      }])
    },
  })

  const isPending = commandMutation.isPending || chatMutation.isPending

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    setInput('')
    setShowAutocomplete(false)
    setMessages(prev => [...prev, { kind: 'chat', role: 'user', content: trimmed, ts: new Date() }])
    if (isCommand(trimmed)) {
      commandMutation.mutate(trimmed)
    } else {
      chatMutation.mutate(trimmed)
    }
  }

  const handleChatAction = (payload: string) => {
    if (isCommand(payload)) {
      setMessages(prev => [...prev, { kind: 'chat', role: 'user', content: payload, ts: new Date() }])
      commandMutation.mutate(payload)
    } else {
      setInput(payload)
      inputRef.current?.focus()
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 py-3 shadow-lg shadow-blue-600/30 transition-colors"
          >
            <Brain className="w-5 h-5" />
            <span className="text-sm font-medium">KI-Assistent</span>
            {liveNotification && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Copilot panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[calc(100vh-5rem)] flex flex-col bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/95 backdrop-blur flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">PM Copilot</p>
                  {projectName
                    ? <p className="text-xs text-gray-500">{projectName}</p>
                    : <p className="text-xs text-gray-600">Tippen Sie /today zum Starten</p>
                  }
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live notification */}
            <AnimatePresence>
              {liveNotification && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex-shrink-0"
                >
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                  <p className="text-xs text-emerald-300 truncate">{liveNotification}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.kind === 'chat' ? (
                    <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-blue-600/20'}`}>
                        {msg.role === 'user'
                          ? <span className="text-[10px] text-white font-bold">U</span>
                          : <Sparkles className="w-3 h-3 text-blue-400" />
                        }
                      </div>
                      <div className={`max-w-[88%] space-y-1.5 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                        <div className={`rounded-xl px-3 py-2.5 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                          {msg.content.split('\n').map((line, li) => (
                            <p key={li} className={`text-sm leading-relaxed ${li > 0 ? 'mt-0.5' : ''}`}>{line || '\u00A0'}</p>
                          ))}
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-gray-600 uppercase tracking-wide">Quellen</p>
                            {msg.sources.slice(0, 3).map((src, si) => (
                              <div key={si} className="flex items-start gap-1.5 rounded-lg bg-gray-800/50 px-2.5 py-1.5">
                                <span className="mt-0.5 flex-shrink-0">{ENTITY_ICON[src.entityType] ?? <FileText className="w-3 h-3 text-gray-500" />}</span>
                                <p className="text-[11px] text-gray-400 leading-snug flex-1">{src.snippet}</p>
                                <span className="flex-shrink-0 text-[10px] text-gray-600">{Math.round(src.score * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-600 px-1">
                          {msg.ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Command result */
                    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-3">
                      <CommandCard result={msg.result} input={msg.input} onChatAction={handleChatAction} />
                      <p className="text-[10px] text-gray-600">
                        {msg.ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {isPending && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="bg-gray-800 rounded-xl px-3 py-2.5">
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {showAutocomplete && filteredCommands.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mx-4 mb-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto flex-shrink-0"
                >
                  {filteredCommands.map(c => (
                    <button
                      key={c.cmd}
                      onClick={() => { setInput(c.cmd + ' '); setShowAutocomplete(false); inputRef.current?.focus() }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 transition-colors text-left"
                    >
                      <span className="font-mono text-xs text-blue-400 font-semibold w-36 flex-shrink-0">{c.cmd}</span>
                      <span className="text-xs text-gray-400 truncate">{c.desc}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick commands */}
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
              {QUICK_COMMANDS.map(cmd => (
                <button
                  key={cmd}
                  onClick={() => send(cmd)}
                  disabled={isPending}
                  className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-gray-200 rounded-full border border-gray-700/50 transition-colors font-mono"
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 pb-4 flex gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
                    if (e.key === 'Escape') setShowAutocomplete(false)
                  }}
                  placeholder="Frage stellen oder /Befehl eingeben..."
                  className="input w-full text-sm h-9 font-mono"
                  disabled={isPending}
                />
              </div>
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isPending}
                className="btn-primary px-3 h-9 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
