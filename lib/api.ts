import axios from 'axios'
import type { Activity, AiSuggestion, AiSuggestionFeedback, GovernanceOverview, ImportAnalyzeResponse, ImportCommitResponse, MeetingAnalyzeResponse, MeetingCommitResponse, PortfolioSummary, Project, ProjectDecision, ProjectDetail, ProjectDocument, ProjectGovernanceCheck, ProjectKnowledgeItem, ProjectLeadTask, ProjectMilestone, ProjectNote, ProjectTeamMember, Risk, Task, TeamMember, WeeklyStatus } from '@/types'

interface LoginResponse {
  token: string
  userName: string
  email: string
  role: string
  userId: string
  tenantId: string
}

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
  },
  projects: {
    getPortfolio: () => get<PortfolioSummary>('/projects/portfolio'),
    getAll: (params?: Record<string, string>) => get<Project[]>('/projects', { params }),
    getById: (id: string) => get<ProjectDetail>(`/projects/${id}`),
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
    getKnowledgeItems: (id: string) => get<ProjectKnowledgeItem[]>(`/projects/${id}/knowledge-items`),
    createKnowledgeItem: (id: string, data: unknown) => post<ProjectKnowledgeItem>(`/projects/${id}/knowledge-items`, data),
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
  },
  notifications: {
    getAll: () => get('/notifications'),
    markRead: (id: string) => patch(`/notifications/${id}/read`),
    markAllRead: () => patch('/notifications/read-all'),
  },
  governance: {
    getOverview: () => get<GovernanceOverview>('/governance/overview'),
  },
  ai: {
    chat: (message: string, projectId?: string) =>
      post<{ reply: string }>('/ai/chat', { message, projectId }),
    getSuggestions: (projectId?: string) =>
      get<AiSuggestion[]>('/ai/suggestions', { params: projectId ? { projectId } : undefined }),
    getWeeklyStatus: (projectId: string) =>
      get<WeeklyStatus>(`/ai/weekly-status/${projectId}`),
    getFeedback: (projectId?: string) =>
      get<AiSuggestionFeedback[]>('/ai/feedback', { params: projectId ? { projectId } : undefined }),
    submitFeedback: (data: unknown) =>
      post<AiSuggestionFeedback>('/ai/feedback', data),
  },
  imports: {
    analyze: (data: unknown) => post<ImportAnalyzeResponse>('/imports/analyze', data),
    commit: (data: unknown) => post<ImportCommitResponse>('/imports/commit', data),
    analyzeMeeting: (data: unknown) => post<MeetingAnalyzeResponse>('/imports/meetings/analyze', data),
    commitMeeting: (data: unknown) => post<MeetingCommitResponse>('/imports/meetings/commit', data),
  },
  reports: {
    exportPdf: (pid: string) =>
      get<Blob>(`/reports/${pid}/pdf`, { responseType: 'blob' }),
    portfolioReport: () =>
      get<Blob>('/reports/portfolio', { responseType: 'blob' }),
  },
}
