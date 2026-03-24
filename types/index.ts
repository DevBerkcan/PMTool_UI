export type ProjectStatus = 'green' | 'yellow' | 'red'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Project {
  id: string
  name: string
  description: string
  customer: string
  category: 'product' | 'delivery' | 'rollout' | 'governance'
  stage: string
  status: ProjectStatus
  progressPercent: number
  budgetTotal: number
  budgetSpent: number
  startDate: string
  endDate: string
  teamSize: number
  ownerName: string
  createdAt: string
}

export interface ProjectTeamMember {
  userId: string
  name: string
  email: string
  role: string
  projectRole: string
  responsibility: string
  allocatedHours: number
  totalCapacityHours: number
}

export interface ProjectNote {
  id: string
  title: string
  content: string
  authorName: string
  createdAt: string
}

export interface ProjectLeadTask {
  id: string
  title: string
  description: string
  ownerName: string
  dueDate: string
  status: 'todo' | 'in_progress' | 'done'
}

export interface ProjectMilestone {
  id: string
  title: string
  description: string
  ownerName: string
  dueDate: string
  status: 'planned' | 'in_progress' | 'done'
}

export interface ProjectDecision {
  id: string
  title: string
  context: string
  decision: string
  ownerName: string
  dueDate: string
  status: 'open' | 'review' | 'done'
}

export interface ProjectDocument {
  id: string
  title: string
  category: string
  url: string
  status: string
  ownerName: string
  createdAt: string
}

export interface ProjectGovernanceCheck {
  id: string
  title: string
  area: string
  notes: string
  ownerName: string
  dueDate: string
  status: 'open' | 'in_progress' | 'done'
}

export interface ProjectKnowledgeItem {
  id: string
  title: string
  sourceType: string
  sourceLabel: string
  content: string
  tags: string[]
  authorName: string
  importance: number
  createdAt: string
}

export interface ProjectDetail extends Project {
  deliveryModel: string
  sponsor: string
  executiveSummary: string
  healthSummary: string
  objective: string
  scope: string
  successMetric: string
  communication: string
  nextMilestone: string
  stakeholders: string[]
  technologies: string[]
  teamMembers: ProjectTeamMember[]
  notes: ProjectNote[]
  leadTasks: ProjectLeadTask[]
  milestones: ProjectMilestone[]
  decisions: ProjectDecision[]
  documents: ProjectDocument[]
  governanceChecks: ProjectGovernanceCheck[]
  knowledgeItems: ProjectKnowledgeItem[]
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assigneeId?: string
  assigneeName?: string
  dueDate?: string
  estimatedHours: number
  loggedHours: number
  commentCount: number
  createdAt: string
}

export interface Risk {
  id: string
  projectId: string
  title: string
  description: string
  impact: number
  probability: number
  score: number
  status: 'open' | 'mitigated' | 'closed'
  mitigation: string
  ownerName: string
  identifiedAt: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  allocatedHours: number
  totalCapacityHours: number
}

export interface Activity {
  id: string
  userName: string
  action: string
  entityType: string
  createdAt: string
}

export interface PortfolioSummary {
  projects: Project[]
  totalProjects: number
  greenCount: number
  yellowCount: number
  redCount: number
  totalBudget: number
  spentBudget: number
  totalTasks: number
  overdueTasks: number
  openDecisions: number
  overdueMilestones: number
  openGovernanceItems: number
}

export interface GovernanceOverviewProject {
  projectId: string
  projectName: string
  category: string
  stage: string
  status: ProjectStatus
  openGovernanceChecks: number
  openDecisions: number
  overdueMilestones: number
}

export interface GovernanceOverview {
  projects: GovernanceOverviewProject[]
  totalProjects: number
  openGovernanceChecks: number
  openDecisions: number
  overdueMilestones: number
}

export interface AiSuggestion {
  projectId: string
  projectName: string
  type: string
  title: string
  reason: string
  recommendation: string
  priority: 'high' | 'medium' | 'low'
  sources: string[]
  feedbackStatus: 'open' | 'accepted' | 'rejected' | 'edited'
}

export interface AiSuggestionFeedback {
  id: string
  projectId: string
  suggestionType: string
  suggestionTitle: string
  status: 'accepted' | 'rejected' | 'edited'
  notes: string
  userName: string
  createdAt: string
}

export interface WeeklyStatus {
  projectId: string
  projectName: string
  summary: string
  deliveryFocus: string
  riskFocus: string
  governanceFocus: string
  highlights: string[]
  nextActions: string[]
}

export interface ImportPreviewRow {
  rowNumber: number
  values: string[]
}

export interface ImportAnalyzeResponse {
  projectId: string
  sourceType: string
  rowCount: number
  columnCount: number
  headers: string[]
  rows: ImportPreviewRow[]
  summary: string
}

export interface ImportCommitResponse {
  projectId: string
  title: string
  sourceType: string
  importedRows: number
  summary: string
}

export interface MeetingExtractedItem {
  type: string
  title: string
  detail: string
}

export interface MeetingAnalyzeResponse {
  projectId: string
  sourceType: string
  title: string
  summary: string
  actions: MeetingExtractedItem[]
  decisions: MeetingExtractedItem[]
  risks: MeetingExtractedItem[]
  knowledge: MeetingExtractedItem[]
}

export interface MeetingCommitResponse {
  projectId: string
  title: string
  createdTasks: number
  createdDecisions: number
  createdRisks: number
  createdKnowledgeItems: number
  summary: string
}
