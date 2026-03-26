'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  Flag,
  Lightbulb,
  Loader2,
  Plus,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Activity as ActivityItem, ProjectDetail } from '@/types'

const CATEGORY_LABEL: Record<string, string> = {
  product: 'Produkt',
  delivery: 'Delivery',
  rollout: 'Rollout',
  governance: 'Governance',
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'gerade eben'
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)} Min.`
  if (seconds < 86400) return `vor ${Math.floor(seconds / 3600)} Std.`
  return `vor ${Math.floor(seconds / 86400)} Tagen`
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [leadTaskTitle, setLeadTaskTitle] = useState('')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [decisionTitle, setDecisionTitle] = useState('')
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [governanceTitle, setGovernanceTitle] = useState('')
  const [knowledgeTitle, setKnowledgeTitle] = useState('')
  const [knowledgeContent, setKnowledgeContent] = useState('')
  const [knowledgeSource, setKnowledgeSource] = useState('meeting')
  const [teamsTeamName, setTeamsTeamName] = useState('')
  const [teamsChannelName, setTeamsChannelName] = useState('')
  const [teamsTeamId, setTeamsTeamId] = useState('')
  const [teamsChannelId, setTeamsChannelId] = useState('')
  const [teamsTenantDomain, setTeamsTenantDomain] = useState('')
  const [teamsSyncStatus, setTeamsSyncStatus] = useState('planned')
  const [jiraBoardName, setJiraBoardName] = useState('')
  const [jiraProjectKey, setJiraProjectKey] = useState('')
  const [jiraBoardId, setJiraBoardId] = useState('')
  const [jiraJqlFilter, setJiraJqlFilter] = useState('')
  const [jiraSyncStatus, setJiraSyncStatus] = useState('planned')

  const { data: project, isLoading } = useQuery<ProjectDetail>({
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

  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ['project-activities', id],
    queryFn: () => api.activities.getByProject(id),
    enabled: !!id,
  })

  const { data: jiraOverview, isLoading: jiraLoading } = useQuery({
    queryKey: ['jira-project-tickets', id],
    queryFn: () => api.jira.getProjectTickets(id),
    enabled: !!id && !!project?.jiraLink && (!!project.jiraLink.projectKey || !!project.jiraLink.jqlFilter),
  })

  const invalidateProject = async () => {
    await qc.invalidateQueries({ queryKey: ['project', id] })
    await qc.invalidateQueries({ queryKey: ['portfolio'] })
    await qc.invalidateQueries({ queryKey: ['governance-overview'] })
  }

  const createNote = useMutation({
    mutationFn: () => api.projects.createNote(id, { title: noteTitle, content: noteContent }),
    onSuccess: async () => {
      setNoteTitle('')
      setNoteContent('')
      await invalidateProject()
      toast.success('Notiz erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createLeadTask = useMutation({
    mutationFn: () => api.projects.createLeadTask(id, {
      title: leadTaskTitle,
      description: 'Neu im Projekt erstellt.',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    }),
    onSuccess: async () => {
      setLeadTaskTitle('')
      await invalidateProject()
      toast.success('Projektleiter-Aufgabe erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createMilestone = useMutation({
    mutationFn: () => api.projects.createMilestone(id, {
      title: milestoneTitle,
      description: 'Neuer Meilenstein aus dem Projektcockpit.',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    }),
    onSuccess: async () => {
      setMilestoneTitle('')
      await invalidateProject()
      toast.success('Meilenstein erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createDecision = useMutation({
    mutationFn: () => api.projects.createDecision(id, {
      title: decisionTitle,
      context: 'Neue Entscheidung aus dem Projektcockpit.',
      decision: 'Noch offen.',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    }),
    onSuccess: async () => {
      setDecisionTitle('')
      await invalidateProject()
      toast.success('Entscheidung angelegt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createDocument = useMutation({
    mutationFn: () => api.projects.createDocument(id, {
      title: documentTitle,
      category: 'Projektakte',
      url: documentUrl,
      status: 'draft',
    }),
    onSuccess: async () => {
      setDocumentTitle('')
      setDocumentUrl('')
      await invalidateProject()
      toast.success('Dokument referenziert')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createGovernanceCheck = useMutation({
    mutationFn: () => api.projects.createGovernanceCheck(id, {
      title: governanceTitle,
      area: 'Governance',
      notes: 'Neu aus dem Projektcockpit angelegt.',
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    }),
    onSuccess: async () => {
      setGovernanceTitle('')
      await invalidateProject()
      toast.success('Governance-Check erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createKnowledgeItem = useMutation({
    mutationFn: () => api.projects.createKnowledgeItem(id, {
      title: knowledgeTitle,
      sourceType: knowledgeSource,
      sourceLabel: 'Projektcockpit',
      content: knowledgeContent,
      tags: [knowledgeSource, project?.category ?? 'project'],
      importance: 4,
    }),
    onSuccess: async () => {
      setKnowledgeTitle('')
      setKnowledgeContent('')
      setKnowledgeSource('meeting')
      await invalidateProject()
      toast.success('Knowledge-Eintrag erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateTeamsLink = useMutation({
    mutationFn: () => api.projects.upsertTeamsLink(id, {
      teamName: teamsTeamName,
      channelName: teamsChannelName,
      teamId: teamsTeamId,
      channelId: teamsChannelId,
      tenantDomain: teamsTenantDomain,
      syncStatus: teamsSyncStatus,
    }),
    onSuccess: async () => {
      await invalidateProject()
      toast.success('Teams-Link gespeichert')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateJiraLink = useMutation({
    mutationFn: () => api.projects.upsertJiraLink(id, {
      boardName: jiraBoardName,
      projectKey: jiraProjectKey,
      boardId: jiraBoardId,
      jqlFilter: jiraJqlFilter,
      syncStatus: jiraSyncStatus,
    }),
    onSuccess: async () => {
      await invalidateProject()
      await qc.invalidateQueries({ queryKey: ['jira-project-tickets', id] })
      toast.success('Jira-Link gespeichert')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleLeadTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => api.projects.updateLeadTaskStatus(id, taskId, status),
    onSuccess: invalidateProject,
  })

  const toggleMilestone = useMutation({
    mutationFn: ({ milestoneId, status }: { milestoneId: string; status: string }) => api.projects.updateMilestoneStatus(id, milestoneId, status),
    onSuccess: invalidateProject,
  })

  const toggleDecision = useMutation({
    mutationFn: ({ decisionId, status }: { decisionId: string; status: string }) => api.projects.updateDecisionStatus(id, decisionId, status),
    onSuccess: invalidateProject,
  })

  const toggleGovernance = useMutation({
    mutationFn: ({ checkId, status }: { checkId: string; status: string }) => api.projects.updateGovernanceCheckStatus(id, checkId, status),
    onSuccess: invalidateProject,
  })

  useEffect(() => {
    if (!project?.teamsLink) return

    setTeamsTeamName(project.teamsLink.teamName)
    setTeamsChannelName(project.teamsLink.channelName)
    setTeamsTeamId(project.teamsLink.teamId)
    setTeamsChannelId(project.teamsLink.channelId)
    setTeamsTenantDomain(project.teamsLink.tenantDomain)
    setTeamsSyncStatus(project.teamsLink.syncStatus)
  }, [project?.teamsLink])

  useEffect(() => {
    if (!project?.jiraLink) return

    setJiraBoardName(project.jiraLink.boardName)
    setJiraProjectKey(project.jiraLink.projectKey)
    setJiraBoardId(project.jiraLink.boardId)
    setJiraJqlFilter(project.jiraLink.jqlFilter)
    setJiraSyncStatus(project.jiraLink.syncStatus)
  }, [project?.jiraLink])

  if (isLoading || !project) {
    return <div className="card p-6 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Projekt wird geladen...</div>
  }

  const openTasks = tasks.filter(task => task.status !== 'done')
  const budgetPct = project.budgetTotal > 0 ? Math.round((project.budgetSpent / project.budgetTotal) * 100) : 0
  const fmtMoney = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const statusBadge = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' }[project.status]
  const statusLabel = { green: 'On Track', yellow: 'At Risk', red: 'Kritisch' }[project.status]
  const openGovernanceChecks = project.governanceChecks.filter(item => item.status !== 'done')
  const openDecisions = project.decisions.filter(item => item.status !== 'done')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <span className="text-gray-500 text-sm">Portfolio</span>
        <ChevronRight className="w-4 h-4 text-gray-600" />
        <span className="text-white text-sm font-medium">{project.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <span className={statusBadge}>{statusLabel}</span>
            <span className="px-2 py-1 rounded-full bg-gray-800 text-xs text-gray-300">{CATEGORY_LABEL[project.category] ?? project.category}</span>
            <span className="px-2 py-1 rounded-full bg-gray-800 text-xs text-gray-300 capitalize">{project.stage.replaceAll('_', ' ')}</span>
          </div>
          <p className="text-gray-400 text-sm">{project.description}</p>
          <p className="text-xs text-gray-500 mt-3">{project.executiveSummary}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/projects/${id}/tasks`} className="btn-ghost">Tasks</Link>
          <Link href={`/projects/${id}/risks`} className="btn-ghost">Risiken</Link>
          <Link href={`/projects/${id}/gantt`} className="btn-ghost">Gantt</Link>
          <Link href={`/projects/${id}/resources`} className="btn-primary">Ressourcen</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: 'Fortschritt', value: `${project.progressPercent}%`, sub: `${tasks.filter(task => task.status === 'done').length}/${tasks.length} Tasks fertig`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: DollarSign, label: 'Budget', value: `${budgetPct}%`, sub: `${fmtMoney(project.budgetSpent)} / ${fmtMoney(project.budgetTotal)}`, color: budgetPct > 85 ? 'text-red-400' : 'text-emerald-400', bg: budgetPct > 85 ? 'bg-red-500/10' : 'bg-emerald-500/10' },
          { icon: Calendar, label: 'Deadline', value: new Date(project.endDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }), sub: `Naechster Meilenstein: ${project.nextMilestone}`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: AlertTriangle, label: 'Governance', value: `${openGovernanceChecks.length}`, sub: `${openDecisions.length} Entscheidungen offen`, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(({ icon: Icon, label, value, sub, color, bg }, index) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-blue-400" /><h2 className="font-semibold text-white">Management Snapshot</h2></div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800/60 rounded-lg p-4"><p className="text-gray-500 text-xs mb-1">Sponsor</p><p className="text-white">{project.sponsor}</p></div>
              <div className="bg-gray-800/60 rounded-lg p-4"><p className="text-gray-500 text-xs mb-1">Delivery Modell</p><p className="text-white">{project.deliveryModel}</p></div>
              <div className="bg-gray-800/60 rounded-lg p-4 md:col-span-2"><p className="text-gray-500 text-xs mb-1">Health Summary</p><p className="text-white">{project.healthSummary}</p></div>
              <div className="bg-gray-800/60 rounded-lg p-4"><p className="text-gray-500 text-xs mb-1">Ziel</p><p className="text-white">{project.objective}</p></div>
              <div className="bg-gray-800/60 rounded-lg p-4"><p className="text-gray-500 text-xs mb-1">Scope</p><p className="text-white">{project.scope}</p></div>
              <div className="bg-gray-800/60 rounded-lg p-4"><p className="text-gray-500 text-xs mb-1">Erfolgskriterium</p><p className="text-white">{project.successMetric}</p></div>
              <div className="bg-gray-800/60 rounded-lg p-4"><p className="text-gray-500 text-xs mb-1">Kommunikation</p><p className="text-white">{project.communication}</p></div>
              <div className="bg-gray-800/60 rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-2">Stakeholder</p>
                <div className="flex flex-wrap gap-2">{project.stakeholders.map(stakeholder => <span key={stakeholder} className="px-2 py-1 rounded-full bg-gray-700 text-xs text-gray-200">{stakeholder}</span>)}</div>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-2">Technologien</p>
                <div className="flex flex-wrap gap-2">{project.technologies.map(technology => <span key={technology} className="px-2 py-1 rounded-full bg-blue-500/10 text-xs text-blue-300">{technology}</span>)}</div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400" /> Knowledge Base</h2>
              <span className="text-xs text-gray-500">{project.knowledgeItems.length} Eintraege</span>
            </div>
            <div className="grid md:grid-cols-[180px_1fr] gap-2 mb-4">
              <select value={knowledgeSource} onChange={event => setKnowledgeSource(event.target.value)} className="input text-sm">
                <option value="meeting">Meeting</option>
                <option value="import">Import</option>
                <option value="delivery_note">Delivery Note</option>
                <option value="decision_log">Decision Log</option>
              </select>
              <input value={knowledgeTitle} onChange={event => setKnowledgeTitle(event.target.value)} placeholder="Titel des Wissenseintrags..." className="input text-sm" />
            </div>
            <textarea value={knowledgeContent} onChange={event => setKnowledgeContent(event.target.value)} placeholder="Wichtige Erkenntnisse, Meetingpunkte, importierte Hinweise oder Steuerungswissen festhalten..." className="input min-h-28 py-3 mb-3" />
            <button onClick={() => knowledgeTitle.trim() && knowledgeContent.trim() && createKnowledgeItem.mutate()} className="btn-primary w-full mb-4">Knowledge speichern</button>
            <div className="space-y-3">
              {project.knowledgeItems.map(item => (
                <div key={item.id} className="rounded-lg border border-gray-800 bg-gray-800/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.sourceType} · {item.sourceLabel || item.authorName}</p>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">Prio {item.importance}/5</span>
                  </div>
                  <p className="mt-3 text-sm text-gray-300">{item.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map(tag => <span key={tag} className="rounded-full bg-gray-700 px-2 py-1 text-[11px] text-gray-300">{tag}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Projektteam</h2><span className="text-xs text-gray-500">{project.teamMembers.length} Personen</span></div>
            <div className="grid md:grid-cols-2 gap-3">
              {project.teamMembers.map(member => (
                <div key={member.userId} className="bg-gray-800/60 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-xs text-gray-400">{member.projectRole}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-200">{Math.round((member.allocatedHours / member.totalCapacityHours) * 100)}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{member.responsibility}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><Flag className="w-4 h-4 text-amber-400" /> Meilensteine</h2><span className="text-xs text-gray-500">{project.milestones.length}</span></div>
              <div className="flex gap-2 mb-4">
                <input value={milestoneTitle} onChange={event => setMilestoneTitle(event.target.value)} placeholder="Neuer Meilenstein..." className="input text-sm" />
                <button onClick={() => milestoneTitle.trim() && createMilestone.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {project.milestones.map(item => (
                  <button key={item.id} onClick={() => toggleMilestone.mutate({ milestoneId: item.id, status: item.status === 'done' ? 'planned' : 'done' })} className={`w-full text-left rounded-lg p-3 border ${item.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/60'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><p className={`text-sm font-medium ${item.status === 'done' ? 'text-emerald-300 line-through' : 'text-white'}`}>{item.title}</p><p className="text-xs text-gray-500 mt-1">{item.description}</p></div>
                      <span className="text-xs text-gray-500">{new Date(item.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><Scale className="w-4 h-4 text-violet-400" /> Entscheidungen</h2><span className="text-xs text-gray-500">{project.decisions.filter(item => item.status !== 'done').length} offen</span></div>
              <div className="flex gap-2 mb-4">
                <input value={decisionTitle} onChange={event => setDecisionTitle(event.target.value)} placeholder="Neue Entscheidung..." className="input text-sm" />
                <button onClick={() => decisionTitle.trim() && createDecision.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {project.decisions.map(item => (
                  <button key={item.id} onClick={() => toggleDecision.mutate({ decisionId: item.id, status: item.status === 'done' ? 'open' : 'done' })} className={`w-full text-left rounded-lg p-3 border ${item.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/60'}`}>
                    <p className={`text-sm font-medium ${item.status === 'done' ? 'text-emerald-300' : 'text-white'}`}>{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.context}</p>
                    <p className="text-xs text-gray-300 mt-2">{item.decision}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-400" /> Governance Checks</h2><span className="text-xs text-gray-500">{openGovernanceChecks.length} offen</span></div>
            <div className="flex gap-2 mb-4">
              <input value={governanceTitle} onChange={event => setGovernanceTitle(event.target.value)} placeholder="Neuer Governance-Check..." className="input text-sm" />
              <button onClick={() => governanceTitle.trim() && createGovernanceCheck.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {project.governanceChecks.map(check => (
                <button key={check.id} onClick={() => toggleGovernance.mutate({ checkId: check.id, status: check.status === 'done' ? 'open' : 'done' })} className={`text-left rounded-lg p-4 border ${check.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-medium ${check.status === 'done' ? 'text-emerald-300' : 'text-white'}`}>{check.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{check.area}</p>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(check.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-3">{check.notes}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> Offene Projektaufgaben</h2><Link href={`/projects/${id}/tasks`} className="text-xs text-blue-400 hover:text-blue-300">Alle anzeigen</Link></div>
            <div className="space-y-2">
              {openTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-500'}`} />
                  <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">{task.title}</p><p className="text-xs text-gray-500">{task.assigneeName ?? 'Nicht zugewiesen'}</p></div>
                  {task.dueDate && <span className="text-xs text-gray-500">{new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-400" /> Projektleiter-Aufgaben</h2><span className="text-xs text-gray-500">{project.leadTasks.filter(task => task.status !== 'done').length} offen</span></div>
            <div className="flex gap-2 mb-4">
              <input value={leadTaskTitle} onChange={event => setLeadTaskTitle(event.target.value)} placeholder="Neue PL-Aufgabe..." className="input text-sm" />
              <button onClick={() => leadTaskTitle.trim() && createLeadTask.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {project.leadTasks.map(task => (
                <button key={task.id} onClick={() => toggleLeadTask.mutate({ taskId: task.id, status: task.status === 'done' ? 'todo' : 'done' })} className={`w-full text-left rounded-lg p-3 border transition-colors ${task.status === 'done' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/60 hover:border-gray-600'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className={`text-sm font-medium ${task.status === 'done' ? 'text-emerald-300 line-through' : 'text-white'}`}>{task.title}</p><p className="text-xs text-gray-500 mt-1">{task.description}</p></div>
                    <span className="text-xs text-gray-500">{new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-blue-400" /><h2 className="font-semibold text-white">Notizen</h2></div>
            <div className="space-y-2 mb-4">
              <input value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="Titel..." className="input text-sm" />
              <textarea value={noteContent} onChange={event => setNoteContent(event.target.value)} placeholder="Projektinformation oder Notiz festhalten..." className="input min-h-28 py-3" />
              <button onClick={() => noteTitle.trim() && noteContent.trim() && createNote.mutate()} className="btn-primary w-full">Notiz erstellen</button>
            </div>
            <div className="space-y-3">
              {project.notes.map(note => (
                <div key={note.id} className="bg-gray-800/60 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-medium text-white">{note.title}</p><p className="text-xs text-gray-500 mt-1">{note.authorName}</p></div>
                    <span className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-3">{note.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><CalendarClock className="w-4 h-4 text-blue-400" /> Dokumente</h2><span className="text-xs text-gray-500">{project.documents.length} Eintraege</span></div>
            <div className="space-y-2 mb-4">
              <input value={documentTitle} onChange={event => setDocumentTitle(event.target.value)} placeholder="Dokumenttitel..." className="input text-sm" />
              <input value={documentUrl} onChange={event => setDocumentUrl(event.target.value)} placeholder="https://..." className="input text-sm" />
              <button onClick={() => documentTitle.trim() && documentUrl.trim() && createDocument.mutate()} className="btn-primary w-full">Dokument verlinken</button>
            </div>
            <div className="space-y-2">
              {project.documents.map(document => (
                <a key={document.id} href={document.url} target="_blank" rel="noreferrer" className="block rounded-lg bg-gray-800/60 p-3 hover:bg-gray-800">
                  <p className="text-sm font-medium text-white">{document.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{document.category} · {document.status} · {document.ownerName}</p>
                </a>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Teams / Graph Link</h2>
              <span className="text-xs text-gray-500">{project.teamsLink?.syncStatus ?? 'not linked'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-3">
              <input value={teamsTeamName} onChange={event => setTeamsTeamName(event.target.value)} placeholder="Teams Team Name..." className="input text-sm" />
              <input value={teamsChannelName} onChange={event => setTeamsChannelName(event.target.value)} placeholder="Channel Name..." className="input text-sm" />
              <input value={teamsTeamId} onChange={event => setTeamsTeamId(event.target.value)} placeholder="Team ID..." className="input text-sm" />
              <input value={teamsChannelId} onChange={event => setTeamsChannelId(event.target.value)} placeholder="Channel ID..." className="input text-sm" />
              <input value={teamsTenantDomain} onChange={event => setTeamsTenantDomain(event.target.value)} placeholder="Tenant Domain..." className="input text-sm" />
              <select value={teamsSyncStatus} onChange={event => setTeamsSyncStatus(event.target.value)} className="input text-sm">
                <option value="planned">planned</option>
                <option value="configured">configured</option>
                <option value="connected">connected</option>
              </select>
            </div>
            <button onClick={() => updateTeamsLink.mutate()} className="btn-primary w-full">Teams-Link speichern</button>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-400" /> Jira Board</h2>
              <span className="text-xs text-gray-500">{project.jiraLink?.syncStatus ?? 'not linked'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-3">
              <input value={jiraBoardName} onChange={event => setJiraBoardName(event.target.value)} placeholder="Board Name..." className="input text-sm" />
              <input value={jiraProjectKey} onChange={event => setJiraProjectKey(event.target.value.toUpperCase())} placeholder="Project Key, z. B. POS..." className="input text-sm" />
              <input value={jiraBoardId} onChange={event => setJiraBoardId(event.target.value)} placeholder="Board ID optional..." className="input text-sm" />
              <textarea value={jiraJqlFilter} onChange={event => setJiraJqlFilter(event.target.value)} placeholder="Optionaler JQL Filter..." className="input min-h-24 py-3 text-sm" />
              <select value={jiraSyncStatus} onChange={event => setJiraSyncStatus(event.target.value)} className="input text-sm">
                <option value="planned">planned</option>
                <option value="configured">configured</option>
                <option value="connected">connected</option>
              </select>
            </div>
            <button onClick={() => updateJiraLink.mutate()} className="btn-primary w-full mb-4">Jira-Link speichern</button>
            {jiraLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Jira-Tickets werden geladen...
              </div>
            ) : jiraOverview ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-800/60 p-3">
                  <p className="text-sm font-medium text-white">{jiraOverview.totalTickets} Tickets im Projekt</p>
                  <p className="text-xs text-gray-500 mt-1">Nicht zugewiesen: {jiraOverview.unassignedTickets}</p>
                  <p className="text-xs text-gray-500 mt-1 break-all">{jiraOverview.jql}</p>
                </div>
                {jiraOverview.assignees.map(assignee => (
                  <div key={`${assignee.assigneeName}-${assignee.assigneeEmail}`} className="rounded-lg border border-gray-800 bg-gray-800/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{assignee.assigneeName}</p>
                        <p className="text-xs text-gray-500">{assignee.assigneeEmail || 'Keine Jira-Mail'}</p>
                      </div>
                      <span className="rounded-full bg-blue-600/10 px-2 py-1 text-[11px] text-blue-300">{assignee.totalTickets} Tickets</span>
                    </div>
                    <div className="mt-3 flex gap-2 text-[11px]">
                      <span className="rounded-full bg-gray-700 px-2 py-1 text-gray-300">Todo {assignee.todoTickets}</span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-300">In Arbeit {assignee.inProgressTickets}</span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">Done {assignee.doneTickets}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {assignee.tickets.slice(0, 4).map(ticket => (
                        <a key={ticket.key} href={ticket.url} target="_blank" rel="noreferrer" className="block rounded-lg bg-gray-900/40 p-3 hover:bg-gray-900/70">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-medium text-blue-300">{ticket.key}</p>
                              <p className="text-sm text-white mt-1">{ticket.summary}</p>
                            </div>
                            <span className="text-[11px] text-gray-400">{ticket.status}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Lege einen Project Key oder JQL an, dann werden die Jira-Tickets je Mitarbeiter geladen.</p>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-white flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-blue-400" /> Aktivitaeten</h2>
            <div className="space-y-3">
              {activities.map(activity => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{activity.userName.split(' ').map(part => part[0]).join('').slice(0, 2)}</div>
                  <div className="min-w-0"><p className="text-xs text-gray-200"><span className="font-medium">{activity.userName}</span> <span className="text-gray-400">{activity.action}</span></p><p className="text-xs text-gray-600">{timeAgo(activity.createdAt)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {risks.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Risiken</h2><Link href={`/projects/${id}/risks`} className="text-xs text-blue-400 hover:text-blue-300">Risikomatrix</Link></div>
          <div className="space-y-2">
            {risks.map(risk => {
              const cls = risk.score >= 15 ? 'badge-red' : risk.score >= 8 ? 'badge-yellow' : 'badge-green'
              return <div key={risk.id} className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg"><div className="flex-1"><p className="text-sm font-medium text-white">{risk.title}</p><p className="text-xs text-gray-500">{risk.description}</p></div><div className="flex items-center gap-2"><span className={cls}>Score {risk.score}</span><span className="text-xs text-gray-500">{risk.ownerName}</span></div></div>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
