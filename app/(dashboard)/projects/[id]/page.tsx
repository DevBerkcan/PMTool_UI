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
  GitMerge,
  Lightbulb,
  Loader2,
  Mail,
  MessageSquare,
  Mic,
  Pencil,
  Phone,
  Pin,
  Plus,
  Scale,
  ShieldCheck,
  Stamp,
  Trash2,
  TrendingUp,
  Users,
  UserSquare2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAccessMatrix } from '@/lib/hooks/useAccessMatrix'
import { AiCopilot } from '@/components/ai/AiCopilot'
import type { Activity as ActivityItem, AuditEntry, ProjectContact, ProjectDetail, ProjectForecastSnapshot, ProjectMeeting, ProjectNote } from '@/types'

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

function buildTrendPath(values: number[], width: number, height: number) {
  if (values.length === 0) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export default function ProjectDetailPage() {
  const { can } = useAccessMatrix()
  const canEditProject = can('editProject')
  const canManagePmo = can('managePmo')
  const canDecideApproval = can('decideApproval')
  const canConfigureIntegrations = can('configureIntegrations')
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState('general')
  const [noteParticipants, setNoteParticipants] = useState('')
  const [noteMeetingDate, setNoteMeetingDate] = useState('')
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null)
  // contacts
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState<ProjectContact | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactCompany, setContactCompany] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [contactSupervisor, setContactSupervisor] = useState('')
  const [contactNotes, setContactNotes] = useState('')
  // meetings
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<ProjectMeeting | null>(null)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingParticipants, setMeetingParticipants] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')
  const [meetingTeamsUrl, setMeetingTeamsUrl] = useState('')
  const [meetingTeamsId, setMeetingTeamsId] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [transcriptInputId, setTranscriptInputId] = useState<string | null>(null)
  const [transcriptText, setTranscriptText] = useState('')
  const [extractingMeetingId, setExtractingMeetingId] = useState<string | null>(null)
  const [extractResult, setExtractResult] = useState<Record<string, { tasks: number; decisions: number; risks: number; knowledge: number; summary: string }>>({})
  const [leadTaskTitle, setLeadTaskTitle] = useState('')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [decisionTitle, setDecisionTitle] = useState('')
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [governanceTitle, setGovernanceTitle] = useState('')
  const [stageGateTitle, setStageGateTitle] = useState('')
  const [stageGateCheckTitles, setStageGateCheckTitles] = useState<Record<string, string>>({})
  const [approvalTitle, setApprovalTitle] = useState('')
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

  const { data: forecast } = useQuery({
    queryKey: ['project-forecast', id],
    queryFn: () => api.projects.getForecast(id),
    enabled: !!id,
  })

  const { data: forecastSnapshots = [] } = useQuery<ProjectForecastSnapshot[]>({
    queryKey: ['project-forecast-snapshots', id],
    queryFn: () => api.projects.getForecastSnapshots(id),
    enabled: !!id,
  })

  const { data: auditEntries = [] } = useQuery<AuditEntry[]>({
    queryKey: ['project-audit', id],
    queryFn: () => api.activities.getProjectAudit(id),
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
    mutationFn: () => api.projects.createNote(id, {
      title: noteTitle, content: noteContent,
      category: noteCategory,
      participants: noteParticipants,
      meetingDate: noteMeetingDate || null,
    }),
    onSuccess: async () => {
      setNoteTitle(''); setNoteContent(''); setNoteCategory('general')
      setNoteParticipants(''); setNoteMeetingDate('')
      await invalidateProject()
      toast.success('Notiz erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateNote = useMutation({
    mutationFn: (note: ProjectNote) => api.projects.updateNote(id, note.id, {
      title: note.title, content: note.content,
      category: note.category, participants: note.participants,
      meetingDate: note.meetingDate || null, isPinned: note.isPinned,
    }),
    onSuccess: async () => { setEditingNote(null); await invalidateProject(); toast.success('Notiz gespeichert') },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => api.projects.deleteNote(id, noteId),
    onSuccess: async () => { await invalidateProject(); toast.success('Notiz gelöscht') },
    onError: (err: Error) => toast.error(err.message),
  })

  const togglePin = useMutation({
    mutationFn: (note: ProjectNote) => api.projects.updateNote(id, note.id, {
      title: note.title, content: note.content, category: note.category,
      participants: note.participants, meetingDate: note.meetingDate || null, isPinned: !note.isPinned,
    }),
    onSuccess: async () => { await invalidateProject() },
  })

  function resetContactForm() {
    setContactName(''); setContactEmail(''); setContactPhone('')
    setContactCompany(''); setContactRole(''); setContactSupervisor(''); setContactNotes('')
    setEditingContact(null); setShowContactForm(false)
  }

  function openEditContact(c: ProjectContact) {
    setContactName(c.name); setContactEmail(c.email); setContactPhone(c.phone)
    setContactCompany(c.company); setContactRole(c.role); setContactSupervisor(c.supervisor)
    setContactNotes(c.notes); setEditingContact(c); setShowContactForm(true)
  }

  const saveContact = useMutation({
    mutationFn: () => {
      const data = { name: contactName, email: contactEmail, phone: contactPhone,
        company: contactCompany, role: contactRole, supervisor: contactSupervisor, notes: contactNotes }
      return editingContact
        ? api.projects.updateContact(id, editingContact.id, data)
        : api.projects.createContact(id, data)
    },
    onSuccess: async () => { resetContactForm(); await invalidateProject(); toast.success('Kontakt gespeichert') },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteContact = useMutation({
    mutationFn: (contactId: string) => api.projects.deleteContact(id, contactId),
    onSuccess: async () => { await invalidateProject(); toast.success('Kontakt gelöscht') },
    onError: (err: Error) => toast.error(err.message),
  })

  const { data: meetings = [], refetch: refetchMeetings } = useQuery<ProjectMeeting[]>({
    queryKey: ['project-meetings', id],
    queryFn: () => api.projects.getMeetings(id),
    enabled: !!id,
  })

  const { data: graphTokenStatus } = useQuery<{ hasValidToken: boolean }>({
    queryKey: ['graph-token-status'],
    queryFn: () => api.integrations.getGraphTokenStatus(),
  })

  function resetMeetingForm() {
    setMeetingTitle(''); setMeetingDate(''); setMeetingParticipants('')
    setMeetingLocation(''); setMeetingTeamsUrl(''); setMeetingTeamsId(''); setMeetingNotes('')
    setEditingMeeting(null); setShowMeetingForm(false)
  }

  function openEditMeeting(m: ProjectMeeting) {
    setMeetingTitle(m.title)
    setMeetingDate(m.meetingDate.slice(0, 16))
    setMeetingParticipants(m.participants)
    setMeetingLocation(m.location)
    setMeetingTeamsUrl(m.teamsJoinUrl)
    setMeetingTeamsId(m.teamsOnlineMeetingId)
    setMeetingNotes(m.notes)
    setEditingMeeting(m)
    setShowMeetingForm(true)
  }

  const saveMeeting = useMutation({
    mutationFn: () => {
      const data = {
        title: meetingTitle,
        meetingDate: meetingDate ? new Date(meetingDate).toISOString() : new Date().toISOString(),
        participants: meetingParticipants,
        location: meetingLocation,
        teamsJoinUrl: meetingTeamsUrl,
        teamsOnlineMeetingId: meetingTeamsId,
        notes: meetingNotes,
      }
      return editingMeeting
        ? api.projects.updateMeeting(id, editingMeeting.id, data)
        : api.projects.createMeeting(id, data)
    },
    onSuccess: async () => { resetMeetingForm(); await refetchMeetings(); toast.success('Termin gespeichert') },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMeeting = useMutation({
    mutationFn: (meetingId: string) => api.projects.deleteMeeting(id, meetingId),
    onSuccess: async () => { await refetchMeetings(); toast.success('Termin gelöscht') },
    onError: (err: Error) => toast.error(err.message),
  })

  const addTranscript = useMutation({
    mutationFn: ({ meetingId, text }: { meetingId: string; text: string }) =>
      api.projects.addTranscript(id, meetingId, text),
    onSuccess: async () => {
      setTranscriptInputId(null); setTranscriptText('')
      await refetchMeetings(); toast.success('Transkript gespeichert')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const fetchTranscript = useMutation({
    mutationFn: (meetingId: string) => api.projects.fetchTranscript(id, meetingId),
    onSuccess: async () => { await refetchMeetings(); toast.success('Transkript von Teams geladen') },
    onError: (err: Error) => toast.error(err.message),
  })

  const extractMeeting = useMutation({
    mutationFn: (meetingId: string) => api.projects.extractMeeting(id, meetingId),
    onMutate: (meetingId) => setExtractingMeetingId(meetingId),
    onSuccess: async (result, meetingId) => {
      setExtractingMeetingId(null)
      setExtractResult(prev => ({ ...prev, [meetingId]: { tasks: result.createdTasks, decisions: result.createdDecisions, risks: result.createdRisks, knowledge: result.createdKnowledgeItems, summary: result.summary } }))
      await refetchMeetings()
      await invalidateProject()
      toast.success('Analyse abgeschlossen')
    },
    onError: (err: Error) => { setExtractingMeetingId(null); toast.error(err.message) },
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
      category: 'general',
      sourceFileName: '',
      parentKnowledgeItemId: null,
      linkedEntityType: '',
      linkedEntityId: null,
      meetingReference: '',
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

  const createStageGate = useMutation({
    mutationFn: () => api.projects.createStageGate(id, {
      title: stageGateTitle,
      stageKey: project?.stage ?? 'delivery',
      dueDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
      notes: 'Neues PMO-Gate aus dem Projektcockpit.',
      approvalSummary: 'Freigabe fuer den naechsten Projektabschnitt.',
    }),
    onSuccess: async () => {
      setStageGateTitle('')
      await invalidateProject()
      toast.success('Stage Gate erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createApproval = useMutation({
    mutationFn: () => api.projects.createApproval(id, {
      title: approvalTitle,
      approvalType: 'Steering Freigabe',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      decisionNotes: 'Entscheidung im Steering erforderlich.',
    }),
    onSuccess: async () => {
      setApprovalTitle('')
      await invalidateProject()
      toast.success('Freigabe angefordert')
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

  const toggleStageGate = useMutation({
    mutationFn: ({ gateId, status }: { gateId: string; status: string }) => api.projects.updateStageGateStatus(id, gateId, status),
    onSuccess: invalidateProject,
  })

  const createStageGateCheck = useMutation({
    mutationFn: ({ gateId, title }: { gateId: string; title: string }) => api.projects.createStageGateCheck(id, gateId, {
      title,
      requirementType: 'Pflichtartefakt',
      isMandatory: true,
      notes: 'Pflichtnachweis fuer das Gate.',
    }),
    onSuccess: async (_, variables) => {
      setStageGateCheckTitles(prev => ({ ...prev, [variables.gateId]: '' }))
      await invalidateProject()
      toast.success('Gate-Check erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleStageGateCheck = useMutation({
    mutationFn: ({ gateId, checkId, status }: { gateId: string; checkId: string; status: string }) =>
      api.projects.updateStageGateCheckStatus(id, gateId, checkId, status),
    onSuccess: invalidateProject,
  })

  const toggleApproval = useMutation({
    mutationFn: ({ approvalId, status }: { approvalId: string; status: string }) =>
      api.projects.updateApprovalStatus(id, approvalId, status, status === 'approved' ? 'Freigabe erteilt.' : 'Freigabe abgelehnt.'),
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
  const openStageGates = project.stageGates.filter(item => item.status !== 'approved')
  const pendingApprovals = project.approvals.filter(item => item.status === 'pending')

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
          <Link href={`/projects/${id}/knowledge`} className="btn-ghost">Knowledge</Link>
          <Link href={`/projects/${id}/resources`} className="btn-primary">Ressourcen</Link>
          <Link href={`/projects/${id}/time`} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Zeiten erfassen
          </Link>
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

          {forecast && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-emerald-400" /><h2 className="font-semibold text-white">Budget Forecast & Earned Value</h2></div>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">BAC</p><p className="text-white">{fmtMoney(forecast.budgetAtCompletion)}</p></div>
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">AC</p><p className="text-white">{fmtMoney(forecast.actualCost)}</p></div>
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">EAC</p><p className="text-white">{fmtMoney(forecast.estimateAtCompletion)}</p></div>
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">EV</p><p className="text-white">{fmtMoney(forecast.earnedValue)}</p></div>
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">PV</p><p className="text-white">{fmtMoney(forecast.plannedValue)}</p></div>
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">ETC</p><p className="text-white">{fmtMoney(forecast.estimateToComplete)}</p></div>
              </div>
              <div className="grid md:grid-cols-4 gap-3 text-sm mt-3">
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">CPI</p><p className={`${forecast.costPerformanceIndex < 1 ? 'text-red-300' : 'text-emerald-300'}`}>{forecast.costPerformanceIndex.toFixed(2)}</p></div>
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">SPI</p><p className={`${forecast.schedulePerformanceIndex < 1 ? 'text-amber-300' : 'text-emerald-300'}`}>{forecast.schedulePerformanceIndex.toFixed(2)}</p></div>
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">Restaufwand</p><p className="text-white">{forecast.remainingHours}h</p></div>
                <div className="rounded-lg bg-gray-800/60 p-4"><p className="text-xs text-gray-500 mb-1">Gebuchte Stunden</p><p className="text-white">{forecast.loggedHours}h / {forecast.totalEstimatedHours}h</p></div>
              </div>
              <p className="mt-4 text-sm text-gray-300">{forecast.forecastComment}</p>
            </div>
          )}

          {forecastSnapshots.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-blue-400" /><h2 className="font-semibold text-white">Forecast-Trend</h2></div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 mb-4">
                <svg viewBox="0 0 320 120" className="w-full h-32">
                  <path d={buildTrendPath([...forecastSnapshots].reverse().map(snapshot => Number(snapshot.estimateAtCompletion)), 320, 120)} fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
                  <path d={buildTrendPath([...forecastSnapshots].reverse().map(snapshot => Number(snapshot.earnedValue)), 320, 120)} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                </svg>
                <div className="mt-3 flex gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-400" /> EAC</span>
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> EV</span>
                </div>
              </div>
              <div className="space-y-3">
                {forecastSnapshots.map(snapshot => (
                  <div key={snapshot.id} className="rounded-lg bg-gray-800/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{new Date(snapshot.snapshotDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <span className="text-xs text-gray-500">CPI {snapshot.costPerformanceIndex.toFixed(2)} · SPI {snapshot.schedulePerformanceIndex.toFixed(2)}</span>
                    </div>
                    <div className="mt-3 grid md:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg bg-gray-900/60 px-3 py-2 text-gray-300">AC {fmtMoney(snapshot.actualCost)}</div>
                      <div className="rounded-lg bg-gray-900/60 px-3 py-2 text-gray-300">EV {fmtMoney(snapshot.earnedValue)}</div>
                      <div className="rounded-lg bg-gray-900/60 px-3 py-2 text-gray-300">EAC {fmtMoney(snapshot.estimateAtCompletion)}</div>
                      <div className="rounded-lg bg-gray-900/60 px-3 py-2 text-gray-300">Rest {snapshot.remainingHours}h</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              {canEditProject && (
                <div className="flex gap-2 mb-4">
                  <input value={milestoneTitle} onChange={event => setMilestoneTitle(event.target.value)} placeholder="Neuer Meilenstein..." className="input text-sm" />
                  <button onClick={() => milestoneTitle.trim() && createMilestone.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
                </div>
              )}
              <div className="space-y-2">
                {project.milestones.map(item => (
                  <button key={item.id} onClick={() => canEditProject && toggleMilestone.mutate({ milestoneId: item.id, status: item.status === 'done' ? 'planned' : 'done' })} className={`w-full text-left rounded-lg p-3 border ${item.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/60'}`}>
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
              {canEditProject && (
                <div className="flex gap-2 mb-4">
                  <input value={decisionTitle} onChange={event => setDecisionTitle(event.target.value)} placeholder="Neue Entscheidung..." className="input text-sm" />
                  <button onClick={() => decisionTitle.trim() && createDecision.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
                </div>
              )}
              <div className="space-y-2">
                {project.decisions.map(item => (
                  <button key={item.id} onClick={() => canEditProject && toggleDecision.mutate({ decisionId: item.id, status: item.status === 'done' ? 'open' : 'done' })} className={`w-full text-left rounded-lg p-3 border ${item.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/60'}`}>
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
            {canManagePmo && (
              <div className="flex gap-2 mb-4">
                <input value={governanceTitle} onChange={event => setGovernanceTitle(event.target.value)} placeholder="Neuer Governance-Check..." className="input text-sm" />
                <button onClick={() => governanceTitle.trim() && createGovernanceCheck.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {project.governanceChecks.map(check => (
                <button key={check.id} onClick={() => canManagePmo && toggleGovernance.mutate({ checkId: check.id, status: check.status === 'done' ? 'open' : 'done' })} className={`text-left rounded-lg p-4 border ${check.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/60'}`}>
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

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><GitMerge className="w-4 h-4 text-violet-400" /> Stage Gates</h2><span className="text-xs text-gray-500">{openStageGates.length} offen</span></div>
              {canManagePmo && (
                <div className="flex gap-2 mb-4">
                  <input value={stageGateTitle} onChange={event => setStageGateTitle(event.target.value)} placeholder="Neues Stage Gate..." className="input text-sm" />
                  <button onClick={() => stageGateTitle.trim() && createStageGate.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
                </div>
              )}
              <div className="space-y-3">
                {project.stageGates.map(gate => (
                  <div key={gate.id} className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{gate.gateOrder}. {gate.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{gate.stageKey} · {gate.ownerName} · {new Date(gate.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</p>
                      </div>
                      <select value={gate.status} onChange={event => canManagePmo && toggleStageGate.mutate({ gateId: gate.id, status: event.target.value })} className="input h-9 w-36 text-xs" disabled={!canManagePmo}>
                        <option value="planned">planned</option>
                        <option value="in_review">in_review</option>
                        <option value="approved">approved</option>
                        <option value="blocked">blocked</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-300 mt-3">{gate.notes || gate.approvalSummary}</p>
                    <div className="mt-3 space-y-2">
                      {gate.checks.map(check => (
                        <button key={check.id} onClick={() => canManagePmo && toggleStageGateCheck.mutate({ gateId: gate.id, checkId: check.id, status: check.status === 'done' ? 'open' : 'done' })} className={`w-full text-left rounded-lg px-3 py-2 border ${check.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gray-700 bg-gray-900/50'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <p className={`text-sm ${check.status === 'done' ? 'text-emerald-300' : 'text-gray-200'}`}>{check.title}</p>
                            <span className="text-[11px] text-gray-500">{check.requirementType}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {canManagePmo && (
                      <div className="mt-3 flex gap-2">
                        <input value={stageGateCheckTitles[gate.id] ?? ''} onChange={event => setStageGateCheckTitles(prev => ({ ...prev, [gate.id]: event.target.value }))} placeholder="Neuer Gate-Check..." className="input text-sm" />
                        <button onClick={() => (stageGateCheckTitles[gate.id] ?? '').trim() && createStageGateCheck.mutate({ gateId: gate.id, title: stageGateCheckTitles[gate.id] })} className="btn-ghost px-3 text-xs">Check</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white flex items-center gap-2"><Stamp className="w-4 h-4 text-emerald-400" /> Freigaben</h2><span className="text-xs text-gray-500">{pendingApprovals.length} pending</span></div>
              {canEditProject && (
                <div className="flex gap-2 mb-4">
                  <input value={approvalTitle} onChange={event => setApprovalTitle(event.target.value)} placeholder="Neue Freigabe..." className="input text-sm" />
                  <button onClick={() => approvalTitle.trim() && createApproval.mutate()} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
                </div>
              )}
              <div className="space-y-3">
                {project.approvals.map(approval => (
                  <div key={approval.id} className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{approval.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{approval.approvalType} · angefragt von {approval.requestedByName}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] ${approval.status === 'approved' ? 'bg-emerald-500/10 text-emerald-300' : approval.status === 'rejected' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>{approval.status}</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-3">{approval.decisionNotes || 'Noch keine Entscheidungsnotiz.'}</p>
                    {canDecideApproval && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => toggleApproval.mutate({ approvalId: approval.id, status: 'approved' })} className="btn-ghost px-3 py-2 text-xs">Genehmigen</button>
                        <button onClick={() => toggleApproval.mutate({ approvalId: approval.id, status: 'rejected' })} className="btn-ghost px-3 py-2 text-xs">Ablehnen</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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

          {/* ── NOTIZEN ─────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold text-white">Notizen</h2>
              <span className="ml-auto text-xs text-gray-500">{project.notes.length} Einträge</span>
            </div>

            {/* Create form */}
            <div className="space-y-2 mb-5 border border-gray-700 rounded-lg p-3 bg-gray-800/40">
              <div className="flex gap-2">
                <select value={noteCategory} onChange={e => setNoteCategory(e.target.value)} className="input text-sm flex-1">
                  <option value="general">📝 Allgemein</option>
                  <option value="meeting">👥 Meeting-Protokoll</option>
                  <option value="status">📊 Statusupdate</option>
                  <option value="decision">✅ Entscheidung</option>
                </select>
                {noteCategory === 'meeting' && (
                  <input type="date" value={noteMeetingDate} onChange={e => setNoteMeetingDate(e.target.value)} className="input text-sm w-40" />
                )}
              </div>
              <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Titel..." className="input text-sm" />
              {noteCategory === 'meeting' && (
                <input value={noteParticipants} onChange={e => setNoteParticipants(e.target.value)} placeholder="Teilnehmer (kommagetrennt)..." className="input text-sm" />
              )}
              <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Notiz festhalten..." className="input min-h-24 py-3" />
              <button onClick={() => noteTitle.trim() && noteContent.trim() && createNote.mutate()} disabled={createNote.isPending} className="btn-primary w-full text-sm">
                {createNote.isPending ? 'Wird erstellt...' : 'Notiz erstellen'}
              </button>
            </div>

            {/* Note list */}
            <div className="space-y-3">
              {project.notes.map(note => (
                <div key={note.id} className={`rounded-lg p-4 border ${note.isPinned ? 'border-yellow-500/40 bg-yellow-900/10' : 'border-gray-700/50 bg-gray-800/60'}`}>
                  {editingNote?.id === note.id ? (
                    /* Inline edit mode */
                    <div className="space-y-2">
                      <select value={editingNote.category} onChange={e => setEditingNote({...editingNote, category: e.target.value})} className="input text-sm w-full">
                        <option value="general">📝 Allgemein</option>
                        <option value="meeting">👥 Meeting-Protokoll</option>
                        <option value="status">📊 Statusupdate</option>
                        <option value="decision">✅ Entscheidung</option>
                      </select>
                      <input value={editingNote.title} onChange={e => setEditingNote({...editingNote, title: e.target.value})} className="input text-sm w-full" />
                      {editingNote.category === 'meeting' && (
                        <input value={editingNote.participants} onChange={e => setEditingNote({...editingNote, participants: e.target.value})} placeholder="Teilnehmer..." className="input text-sm w-full" />
                      )}
                      <textarea value={editingNote.content} onChange={e => setEditingNote({...editingNote, content: e.target.value})} className="input text-sm w-full min-h-20" />
                      <div className="flex gap-2">
                        <button onClick={() => updateNote.mutate(editingNote)} disabled={updateNote.isPending} className="btn-primary text-xs px-3 py-1.5">Speichern</button>
                        <button onClick={() => setEditingNote(null)} className="btn-ghost text-xs px-3 py-1.5">Abbrechen</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                            {note.category === 'meeting' ? '👥 Meeting' : note.category === 'status' ? '📊 Status' : note.category === 'decision' ? '✅ Entscheidung' : '📝 Allgemein'}
                          </span>
                          {note.isPinned && <span className="text-xs text-yellow-400">📌 Angepinnt</span>}
                          <p className="text-sm font-medium text-white">{note.title}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => togglePin.mutate(note)} title={note.isPinned ? 'Entpinnen' : 'Anpinnen'} className="p-1 text-gray-500 hover:text-yellow-400 transition-colors">
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingNote(note)} className="p-1 text-gray-500 hover:text-blue-400 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteNote.mutate(note.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {note.category === 'meeting' && note.participants && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {note.participants}
                          {note.meetingDate && <span className="ml-2">· {new Date(note.meetingDate).toLocaleDateString('de-DE')}</span>}
                        </p>
                      )}
                      <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-gray-600 mt-2">{note.authorName} · {new Date(note.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── PROJEKTKONTAKTE ──────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserSquare2 className="w-4 h-4 text-blue-400" />
                <h2 className="font-semibold text-white">Projektkontakte</h2>
                <span className="text-xs text-gray-500">{project.contacts.length} Kontakte</span>
              </div>
              {!showContactForm && (
                <button onClick={() => setShowContactForm(true)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Hinzufügen
                </button>
              )}
            </div>

            {/* Contact form */}
            {showContactForm && (
              <div className="mb-5 border border-gray-700 rounded-lg p-4 bg-gray-800/40 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-white">{editingContact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</p>
                  <button onClick={resetContactForm} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Name *" className="input text-sm col-span-2" />
                  <input value={contactRole} onChange={e => setContactRole(e.target.value)} placeholder="Rolle / Position" className="input text-sm" />
                  <input value={contactCompany} onChange={e => setContactCompany(e.target.value)} placeholder="Firma" className="input text-sm" />
                  <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="E-Mail" type="email" className="input text-sm" />
                  <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Telefon" className="input text-sm" />
                  <input value={contactSupervisor} onChange={e => setContactSupervisor(e.target.value)} placeholder="Vorgesetzter" className="input text-sm col-span-2" />
                  <textarea value={contactNotes} onChange={e => setContactNotes(e.target.value)} placeholder="Notiz zum Kontakt..." className="input text-sm col-span-2 min-h-16" />
                </div>
                <button onClick={() => contactName.trim() && saveContact.mutate()} disabled={saveContact.isPending || !contactName.trim()} className="btn-primary w-full text-sm">
                  {saveContact.isPending ? 'Wird gespeichert...' : editingContact ? 'Speichern' : 'Kontakt hinzufügen'}
                </button>
              </div>
            )}

            {/* Contact list */}
            {project.contacts.length === 0 && !showContactForm ? (
              <p className="text-sm text-gray-500 text-center py-4">Noch keine Kontakte gepflegt.</p>
            ) : (
              <div className="space-y-3">
                {project.contacts.map(c => (
                  <div key={c.id} className="rounded-lg border border-gray-700/50 bg-gray-800/60 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">{c.name}</p>
                          {c.role && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">{c.role}</span>}
                          {c.company && <span className="text-xs text-gray-400">{c.company}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                              <Mail className="w-3 h-3" />{c.email}
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                              <Phone className="w-3 h-3" />{c.phone}
                            </a>
                          )}
                          {c.supervisor && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MessageSquare className="w-3 h-3" />Vorgesetzter: {c.supervisor}
                            </span>
                          )}
                        </div>
                        {c.notes && <p className="text-xs text-gray-500 mt-2 italic">{c.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditContact(c)} className="p-1 text-gray-500 hover:text-blue-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteContact.mutate(c.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Termine ─── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" /> Termine
              </h2>
              <button onClick={() => { resetMeetingForm(); setShowMeetingForm(true) }} className="btn-ghost text-xs flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Neu
              </button>
            </div>

            {showMeetingForm && (
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/60 p-4 mb-4 space-y-2">
                <input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="Titel des Termins..." className="input text-sm" />
                <input type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="input text-sm" />
                <input value={meetingParticipants} onChange={e => setMeetingParticipants(e.target.value)} placeholder="Teilnehmer (kommagetrennt)..." className="input text-sm" />
                <input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="Ort / Raum..." className="input text-sm" />
                <input value={meetingTeamsUrl} onChange={e => setMeetingTeamsUrl(e.target.value)} placeholder="Teams Join-URL (optional)..." className="input text-sm" />
                <input value={meetingTeamsId} onChange={e => setMeetingTeamsId(e.target.value)} placeholder="Teams Meeting-ID (für Transkript)..." className="input text-sm" />
                <textarea value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)} placeholder="Notizen..." rows={2} className="input text-sm resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => meetingTitle.trim() && saveMeeting.mutate()} disabled={saveMeeting.isPending || !meetingTitle.trim()} className="btn-primary text-sm flex-1">
                    {saveMeeting.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Speichern'}
                  </button>
                  <button onClick={resetMeetingForm} className="btn-ghost text-sm"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}

            {meetings.length === 0 && !showMeetingForm ? (
              <p className="text-sm text-gray-500 text-center py-4">Noch keine Termine angelegt.</p>
            ) : (
              <div className="space-y-3">
                {meetings.map(m => (
                  <div key={m.id} className="rounded-lg border border-gray-700/50 bg-gray-800/60 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">{m.title}</p>
                          <span className="text-xs text-gray-400">
                            {new Date(m.meetingDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {m.transcriptSource !== 'none' && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${m.transcriptSource === 'graph' ? 'bg-green-900/40 text-green-300' : 'bg-blue-900/40 text-blue-300'}`}>
                              {m.transcriptSource === 'graph' ? '📥 Teams' : '✏️ Manuell'}
                            </span>
                          )}
                          {m.extractionStatus === 'extracted' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">Analysiert</span>
                          )}
                        </div>
                        {m.participants && <p className="text-xs text-gray-500 mt-1">👥 {m.participants}</p>}
                        {m.location && <p className="text-xs text-gray-500">📍 {m.location}</p>}
                        {m.teamsJoinUrl && (
                          <a href={m.teamsJoinUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">🔗 Teams-Link</a>
                        )}
                        {m.notes && <p className="text-xs text-gray-500 mt-1 italic">{m.notes}</p>}

                        {/* Transcript & Extract actions */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {/* Manual transcript */}
                          {transcriptInputId !== m.id && (
                            <button onClick={() => { setTranscriptInputId(m.id); setTranscriptText(m.hasTranscript ? '' : '') }} className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
                              ✏️ Transkript {m.hasTranscript ? 'ersetzen' : 'eingeben'}
                            </button>
                          )}
                          {/* Graph fetch */}
                          {m.teamsOnlineMeetingId && graphTokenStatus?.hasValidToken && (
                            <button
                              onClick={() => fetchTranscript.mutate(m.id)}
                              disabled={fetchTranscript.isPending}
                              className="text-xs px-2 py-1 rounded bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 transition-colors"
                            >
                              {fetchTranscript.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '📥'} Von Teams laden
                            </button>
                          )}
                          {/* Extract */}
                          {m.hasTranscript && m.extractionStatus !== 'extracted' && (
                            <button
                              onClick={() => extractMeeting.mutate(m.id)}
                              disabled={extractingMeetingId === m.id}
                              className="text-xs px-2 py-1 rounded bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 transition-colors"
                            >
                              {extractingMeetingId === m.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <Mic className="w-3 h-3 inline" />} Analysieren
                            </button>
                          )}
                        </div>

                        {/* Inline transcript input */}
                        {transcriptInputId === m.id && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={transcriptText}
                              onChange={e => setTranscriptText(e.target.value)}
                              placeholder="Transkript einfügen (z.B. aus Teams, Word, o.Ä.)..."
                              rows={5}
                              className="input text-xs resize-none w-full"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => transcriptText.trim() && addTranscript.mutate({ meetingId: m.id, text: transcriptText })}
                                disabled={addTranscript.isPending || !transcriptText.trim()}
                                className="btn-primary text-xs"
                              >
                                {addTranscript.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Speichern'}
                              </button>
                              <button onClick={() => { setTranscriptInputId(null); setTranscriptText('') }} className="btn-ghost text-xs"><X className="w-3 h-3" /></button>
                            </div>
                          </div>
                        )}

                        {/* Extraction result summary */}
                        {extractResult[m.id] && (
                          <div className="mt-3 rounded bg-purple-900/20 border border-purple-700/30 p-3 text-xs text-purple-200">
                            {extractResult[m.id].summary}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditMeeting(m)} className="p-1 text-gray-500 hover:text-blue-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMeeting.mutate(m.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {canConfigureIntegrations && <button onClick={() => updateTeamsLink.mutate()} className="btn-primary w-full">Teams-Link speichern</button>}
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
            {canConfigureIntegrations && <button onClick={() => updateJiraLink.mutate()} className="btn-primary w-full mb-4">Jira-Link speichern</button>}
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

          <div className="card p-5">
            <h2 className="font-semibold text-white flex items-center gap-2 mb-4"><Stamp className="w-4 h-4 text-blue-400" /> Audit-Historie</h2>
            <div className="space-y-3">
              {auditEntries.length === 0 ? (
                <p className="text-sm text-gray-500">Noch keine Audit-Eintraege fuer dieses Projekt.</p>
              ) : (
                auditEntries.map(entry => (
                  <div key={entry.id} className="rounded-lg bg-gray-800/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{entry.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{entry.userName} · {entry.entityType} · {entry.changeType}</p>
                      </div>
                      <span className="text-xs text-gray-500">{timeAgo(entry.createdAt)}</span>
                    </div>
                    {(entry.fromValue || entry.toValue) && (
                      <p className="text-xs text-gray-300 mt-3">{entry.fromValue || 'leer'} → {entry.toValue || 'leer'}</p>
                    )}
                    {entry.detail && <p className="text-xs text-gray-400 mt-1">{entry.detail}</p>}
                  </div>
                ))
              )}
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

      <AiCopilot projectId={id} projectName={project?.name} />
    </div>
  )
}
