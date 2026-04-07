import axios from 'axios'
import type { AccessMatrix, Activity, AiLearningSummary, AiSuggestion, AiSuggestionFeedback, ApplyAiSuggestionResponse, AuditEntry, BulkSaveRequest, EntraIntegrationStatus, GovernanceOverview, GraphAuthStart, GraphIntegrationStatus, ImportAnalyzeResponse, ImportCommitResponse, JiraIntegrationStatus, JiraProjectTickets, MeetingAnalyzeResponse, MeetingCommitResponse, MyProjectDto, PortfolioBriefing, PortfolioEscalationOverview, PortfolioSummary, Project, ProjectAiAnswer, ProjectApproval, ProjectDecision, ProjectDetail, ProjectDocument, ProjectForecast, ProjectForecastSnapshot, ProjectGovernanceCheck, ProjectJiraLink, ProjectKnowledgeHub, ProjectKnowledgeItem, ProjectLeadTask, ProjectMilestone, ProjectNote, ProjectStageGate, ProjectStageGateCheck, ProjectTeamMember, ProjectTeamsLink, Risk, RiskSignal, SubmitTimeRequest, Task, TeamMember, TimeEntriesResponse, TimeEntryDashboardRow, TimeEntryNotificationDto, WeeklyStatus } from '@/types'

interface LoginResponse {
  token: string
  userName: string
  email: string
  role: string
  userId: string
  tenantId: string
}

interface EntraExchangeResponse extends LoginResponse {}

const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (envUrl) {
    return envUrl
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL is required in production.')
  }

  return 'http://localhost:5000/api/v1'
}

const BASE_URL = getBaseUrl()

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const get = <T>(url: string, config?: object) => apiClient.get<T, T>(url, config)
const post = <T>(url: string, data?: unknown, config?: object) => apiClient.post<T, T>(url, data, config)
const put = <T>(url: string, data?: unknown, config?: object) => apiClient.put<T, T>(url, data, config)
const patch = <T>(url: string, data?: unknown, config?: object) => apiClient.patch<T, T>(url, data, config)
const del = <T>(url: string, config?: object) => apiClient.delete<T, T>(url, config)

apiClient.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('pm-auth')
      if (raw) {
        const state = JSON.parse(raw)
        const token = state?.state?.token
        if (token) config.headers.Authorization = `Bearer ${token}`
      }
    } catch {}
  }
  return config
})

apiClient.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('pm-auth')
      window.location.href = '/login'
    }
    return Promise.reject(new Error(err.response?.data?.message || err.message))
  }
)

export const api = {
  auth: {
    login: (email: string, password: string) =>
      post<LoginResponse>('/auth/login', { email, password }),
    exchangeEntraToken: (idToken: string) =>
      post<EntraExchangeResponse>('/auth/entra/exchange', { idToken }),
    getEntraStatus: () => get<EntraIntegrationStatus>('/auth/entra/status'),
    getAccessMatrix: () => get<AccessMatrix>('/auth/access-matrix'),
  },
  projects: {
    getPortfolio: () => get<PortfolioSummary>('/projects/portfolio'),
    getAll: (params?: Record<string, string>) => get<Project[]>('/projects', { params }),
    getById: (id: string) => get<ProjectDetail>(`/projects/${id}`),
    getForecast: (id: string) => get<ProjectForecast>(`/projects/${id}/forecast`),
    getForecastSnapshots: (id: string) => get<ProjectForecastSnapshot[]>(`/projects/${id}/forecast/snapshots`),
    create: (data: unknown) => post('/projects', data),
    update: (id: string, data: unknown) => put(`/projects/${id}`, data),
    delete: (id: string) => del(`/projects/${id}`),
    getTeam: (id: string) => get<ProjectTeamMember[]>(`/projects/${id}/team`),
    addTeamMember: (id: string, data: unknown) => post<ProjectTeamMember>(`/projects/${id}/team`, data),
    updateTeamMember: (id: string, userId: string, data: unknown) => put<void>(`/projects/${id}/team/${userId}`, data),
    removeTeamMember: (id: string, userId: string) => del<void>(`/projects/${id}/team/${userId}`),
    getNotes: (id: string) => get<ProjectNote[]>(`/projects/${id}/notes`),
    createNote: (id: string, data: unknown) => post<ProjectNote>(`/projects/${id}/notes`, data),
    getLeadTasks: (id: string) => get<ProjectLeadTask[]>(`/projects/${id}/lead-tasks`),
    createLeadTask: (id: string, data: unknown) => post<ProjectLeadTask>(`/projects/${id}/lead-tasks`, data),
    updateLeadTaskStatus: (id: string, taskId: string, status: string) =>
      patch<void>(`/projects/${id}/lead-tasks/${taskId}/status`, { status }),
    getMilestones: (id: string) => get<ProjectMilestone[]>(`/projects/${id}/milestones`),
    createMilestone: (id: string, data: unknown) => post<ProjectMilestone>(`/projects/${id}/milestones`, data),
    updateMilestoneStatus: (id: string, milestoneId: string, status: string) =>
      patch<void>(`/projects/${id}/milestones/${milestoneId}/status`, { status }),
    getDecisions: (id: string) => get<ProjectDecision[]>(`/projects/${id}/decisions`),
    createDecision: (id: string, data: unknown) => post<ProjectDecision>(`/projects/${id}/decisions`, data),
    updateDecisionStatus: (id: string, decisionId: string, status: string) =>
      patch<void>(`/projects/${id}/decisions/${decisionId}/status`, { status }),
    getDocuments: (id: string) => get<ProjectDocument[]>(`/projects/${id}/documents`),
    createDocument: (id: string, data: unknown) => post<ProjectDocument>(`/projects/${id}/documents`, data),
    getGovernanceChecks: (id: string) => get<ProjectGovernanceCheck[]>(`/projects/${id}/governance-checks`),
    createGovernanceCheck: (id: string, data: unknown) => post<ProjectGovernanceCheck>(`/projects/${id}/governance-checks`, data),
    updateGovernanceCheckStatus: (id: string, checkId: string, status: string) =>
      patch<void>(`/projects/${id}/governance-checks/${checkId}/status`, { status }),
    getStageGates: (id: string) => get<ProjectStageGate[]>(`/projects/${id}/stage-gates`),
    createStageGate: (id: string, data: unknown) => post<ProjectStageGate>(`/projects/${id}/stage-gates`, data),
    updateStageGateStatus: (id: string, gateId: string, status: string) =>
      patch<void>(`/projects/${id}/stage-gates/${gateId}/status`, { status }),
    createStageGateCheck: (id: string, gateId: string, data: unknown) =>
      post<ProjectStageGateCheck>(`/projects/${id}/stage-gates/${gateId}/checks`, data),
    updateStageGateCheckStatus: (id: string, gateId: string, checkId: string, status: string) =>
      patch<void>(`/projects/${id}/stage-gates/${gateId}/checks/${checkId}/status`, { status }),
    getApprovals: (id: string) => get<ProjectApproval[]>(`/projects/${id}/approvals`),
    createApproval: (id: string, data: unknown) => post<ProjectApproval>(`/projects/${id}/approvals`, data),
    updateApprovalStatus: (id: string, approvalId: string, status: string, decisionNotes = '') =>
      patch<void>(`/projects/${id}/approvals/${approvalId}/status`, { status, decisionNotes }),
    getKnowledgeItems: (id: string) => get<ProjectKnowledgeItem[]>(`/projects/${id}/knowledge-items`),
    getKnowledgeHub: (id: string, params?: { query?: string; sourceType?: string; minImportance?: number; limit?: number }) =>
      get<ProjectKnowledgeHub>(`/projects/${id}/knowledge-hub`, { params }),
    createKnowledgeItem: (id: string, data: unknown) => post<ProjectKnowledgeItem>(`/projects/${id}/knowledge-items`, data),
    uploadKnowledgeDocument: (id: string, data: unknown) => post<ProjectKnowledgeItem>(`/projects/${id}/knowledge-documents`, data),
    getTeamsLink: (id: string) => get<ProjectTeamsLink | null>(`/projects/${id}/teams-link`),
    upsertTeamsLink: (id: string, data: unknown) => put<ProjectTeamsLink>(`/projects/${id}/teams-link`, data),
    getJiraLink: (id: string) => get<ProjectJiraLink | null>(`/projects/${id}/jira-link`),
    upsertJiraLink: (id: string, data: unknown) => put<ProjectJiraLink>(`/projects/${id}/jira-link`, data),
  },
  tasks: {
    getByProject: (pid: string) => get<Task[]>(`/projects/${pid}/tasks`),
    create: (pid: string, data: unknown) => post<Task>(`/projects/${pid}/tasks`, data),
    update: (pid: string, tid: string, data: unknown) =>
      put(`/projects/${pid}/tasks/${tid}`, data),
    updateStatus: (pid: string, tid: string, status: string) =>
      patch(`/projects/${pid}/tasks/${tid}/status`, { status }),
    delete: (pid: string, tid: string) =>
      del(`/projects/${pid}/tasks/${tid}`),
    getComments: (pid: string, tid: string) =>
      get(`/projects/${pid}/tasks/${tid}/comments`),
    addComment: (pid: string, tid: string, content: string) =>
      post(`/projects/${pid}/tasks/${tid}/comments`, { content }),
  },
  risks: {
    getAll: () => get<Risk[]>('/risks'),
    getByProject: (pid: string) => get<Risk[]>(`/projects/${pid}/risks`),
    create: (pid: string, data: unknown) => post(`/projects/${pid}/risks`, data),
    update: (pid: string, rid: string, data: unknown) =>
      put(`/projects/${pid}/risks/${rid}`, data),
    delete: (pid: string, rid: string) =>
      del(`/projects/${pid}/risks/${rid}`),
  },
  team: {
    getAll: () => get<TeamMember[]>('/team'),
    invite: (data: unknown) => post<TeamMember>('/team/invite', data),
    update: (uid: string, data: unknown) => put<void>(`/team/${uid}`, data),
    remove: (uid: string) => del<void>(`/team/${uid}`),
  },
  activities: {
    getAll: () => get<Activity[]>('/activities'),
    getByProject: (pid: string) => get<Activity[]>(`/projects/${pid}/activities`),
    getAudit: (params?: { entityType?: string; projectId?: string; userRole?: string; changeType?: string; dateFrom?: string; dateTo?: string }) =>
      get<AuditEntry[]>('/audit', { params }),
    getProjectAudit: (pid: string) => get<AuditEntry[]>(`/projects/${pid}/audit`),
  },
  notifications: {
    getAll: () => get('/notifications'),
    markRead: (id: string) => patch(`/notifications/${id}/read`),
    markAllRead: () => patch('/notifications/read-all'),
  },
  governance: {
    getOverview: () => get<GovernanceOverview>('/governance/overview'),
    getEscalations: () => get<PortfolioEscalationOverview>('/governance/escalations'),
  },
  ai: {
    chat: (message: string, projectId?: string) =>
      post<{ reply: string }>('/ai/chat', { message, projectId }),
    getSuggestions: (projectId?: string) =>
      get<AiSuggestion[]>('/ai/suggestions', { params: projectId ? { projectId } : undefined }),
    getWeeklyStatus: (projectId: string) =>
      get<WeeklyStatus>(`/ai/weekly-status/${projectId}`),
    getPortfolioBriefing: () =>
      get<PortfolioBriefing>('/ai/portfolio-briefing'),
    getRiskSignals: (projectId?: string) =>
      get<RiskSignal[]>('/ai/risk-signals', { params: projectId ? { projectId } : undefined }),
    getLearningSummary: () =>
      get<AiLearningSummary>('/ai/learning-summary'),
    getFeedback: (projectId?: string) =>
      get<AiSuggestionFeedback[]>('/ai/feedback', { params: projectId ? { projectId } : undefined }),
    submitFeedback: (data: unknown) =>
      post<AiSuggestionFeedback>('/ai/feedback', data),
    applySuggestion: (data: unknown) =>
      post<ApplyAiSuggestionResponse>('/ai/apply-suggestion', data),
    askProjectQuestion: (projectId: string, question: string) =>
      post<ProjectAiAnswer>('/ai/project-question', { projectId, question }),
  },
  integrations: {
    getGraphStatus: () => get<GraphIntegrationStatus>('/integrations/graph/status'),
    getGraphAuthStart: () => get<GraphAuthStart>('/integrations/graph/auth/start'),
    getJiraStatus: () => get<JiraIntegrationStatus>('/integrations/jira/status'),
  },
  jira: {
    getProjectTickets: (projectId: string, maxResults = 50) =>
      get<JiraProjectTickets>(`/jira/projects/${projectId}/tickets`, { params: { maxResults } }),
  },
  imports: {
    analyze: (data: unknown) => post<ImportAnalyzeResponse>('/imports/analyze', data),
    commit: (data: unknown) => post<ImportCommitResponse>('/imports/commit', data),
    analyzeMeeting: (data: unknown) => post<MeetingAnalyzeResponse>('/imports/meetings/analyze', data),
    commitMeeting: (data: unknown) => post<MeetingCommitResponse>('/imports/meetings/commit', data),
  },
  timeEntries: {
    getEntries: (projectId: string, year: number, month: number) =>
      get<TimeEntriesResponse>(`/time-entries?projectId=${projectId}&year=${year}&month=${month}`),
    saveBulk: (data: BulkSaveRequest) =>
      put<{ message: string }>('/time-entries/bulk', data),
    submit: (data: SubmitTimeRequest) =>
      post<{ message: string }>('/time-entries/submit', data),
    getDashboard: (year: number, month: number) =>
      get<TimeEntryDashboardRow[]>(`/time-entries/dashboard?year=${year}&month=${month}`),
    getMyProjects: () =>
      get<MyProjectDto[]>('/time-entries/my-projects'),
    getNotifications: () =>
      get<TimeEntryNotificationDto[]>('/time-entries/notifications'),
    markRead: (id: string) =>
      post<void>(`/time-entries/notifications/${id}/read`, {}),
    markAllRead: () =>
      post<{ count: number }>('/time-entries/notifications/read-all', {}),
  },
  reports: {
    exportAuditCsv: (params?: { entityType?: string; projectId?: string; userRole?: string; changeType?: string; dateFrom?: string; dateTo?: string }) =>
      get<Blob>('/reports/audit.csv', { params, responseType: 'blob' }),
    exportAuditPdf: (params?: { entityType?: string; projectId?: string; userRole?: string; changeType?: string; dateFrom?: string; dateTo?: string }) =>
      get<Blob>('/reports/audit.pdf', { params, responseType: 'blob' }),
    exportForecastCsv: (pid: string) =>
      get<Blob>(`/reports/projects/${pid}/forecast.csv`, { responseType: 'blob' }),
    exportForecastPdf: (pid: string) =>
      get<Blob>(`/reports/projects/${pid}/forecast.pdf`, { responseType: 'blob' }),
    exportTimeEntriesCsv: (params: { projectId?: string; year?: number; month?: number }) =>
      get<Blob>('/reports/time-entries.csv', { params, responseType: 'blob' }),
    exportTimeEntriesPdf: (params: { projectId?: string; year?: number; month?: number }) =>
      get<Blob>('/reports/time-entries.pdf', { params, responseType: 'blob' }),
  },
}
