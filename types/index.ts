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

export interface ProjectStageGateCheck {
  id: string
  title: string
  requirementType: string
  status: 'open' | 'done' | 'waived' | string
  isMandatory: boolean
  notes: string
}

export interface ProjectStageGate {
  id: string
  title: string
  stageKey: string
  gateOrder: number
  status: 'planned' | 'in_review' | 'approved' | 'blocked' | string
  dueDate: string
  ownerName: string
  notes: string
  approvalSummary: string
  checks: ProjectStageGateCheck[]
}

export interface ProjectApproval {
  id: string
  stageGateId?: string | null
  title: string
  approvalType: string
  status: 'pending' | 'approved' | 'rejected' | string
  dueDate: string
  requestedByName: string
  decidedByName: string
  decisionNotes: string
}

export interface ProjectForecast {
  projectId: string
  projectName: string
  budgetAtCompletion: number
  actualCost: number
  earnedValue: number
  plannedValue: number
  costVariance: number
  scheduleVariance: number
  estimateAtCompletion: number
  estimateToComplete: number
  costPerformanceIndex: number
  schedulePerformanceIndex: number
  totalEstimatedHours: number
  loggedHours: number
  remainingHours: number
  forecastComment: string
}

export interface ProjectForecastSnapshot {
  id: string
  snapshotDate: string
  budgetAtCompletion: number
  actualCost: number
  earnedValue: number
  plannedValue: number
  estimateAtCompletion: number
  estimateToComplete: number
  costPerformanceIndex: number
  schedulePerformanceIndex: number
  remainingHours: number
}

export interface ProjectKnowledgeItem {
  id: string
  title: string
  sourceType: string
  sourceLabel: string
  category: string
  sourceFileName: string
  version: number
  parentKnowledgeItemId?: string | null
  linkedEntityType: string
  linkedEntityId?: string | null
  meetingReference: string
  content: string
  tags: string[]
  authorName: string
  importance: number
  createdAt: string
}

export interface KnowledgeSourceStat {
  key: string
  count: number
  highImportanceCount: number
}

export interface KnowledgeTagStat {
  tag: string
  count: number
}

export interface KnowledgeChunk {
  knowledgeItemId: string
  knowledgeTitle: string
  sourceType: string
  category: string
  chunkIndex: number
  text: string
  semanticScore: number
}

export interface ProjectKnowledgeHubItem extends ProjectKnowledgeItem {
  excerpt: string
  relevanceScore: number
}

export interface ProjectKnowledgeHub {
  projectId: string
  projectName: string
  totalItems: number
  highImportanceItems: number
  sources: KnowledgeSourceStat[]
  topTags: KnowledgeTagStat[]
  items: ProjectKnowledgeHubItem[]
  semanticMatches: KnowledgeChunk[]
}

export interface ProjectTeamsLink {
  projectId: string
  teamName: string
  channelName: string
  teamId: string
  channelId: string
  tenantDomain: string
  syncStatus: string
  lastSyncAt?: string | null
}

export interface ProjectJiraLink {
  projectId: string
  boardName: string
  projectKey: string
  boardId: string
  jqlFilter: string
  syncStatus: string
  lastSyncAt?: string | null
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
  stageGates: ProjectStageGate[]
  approvals: ProjectApproval[]
  knowledgeItems: ProjectKnowledgeItem[]
  teamsLink?: ProjectTeamsLink | null
  jiraLink?: ProjectJiraLink | null
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

export interface AuditEntry {
  id: string
  projectId?: string | null
  userName: string
  userRole: string
  entityType: string
  changeType: string
  title: string
  fromValue: string
  toValue: string
  detail: string
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
  forecastBudget: number
  forecastVariance: number
  totalTasks: number
  overdueTasks: number
  openDecisions: number
  overdueMilestones: number
  openGovernanceItems: number
  overloadedMembers: number
  nearCapacityMembers: number
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
  openStageGates: number
  blockedStageGates: number
  pendingApprovals: number
}

export interface GovernanceOverview {
  projects: GovernanceOverviewProject[]
  totalProjects: number
  openGovernanceChecks: number
  openDecisions: number
  overdueMilestones: number
  openStageGates: number
  blockedStageGates: number
  pendingApprovals: number
}

export interface PortfolioEscalationItem {
  projectId: string
  projectName: string
  severity: 'critical' | 'warning' | string
  category: 'budget' | 'capacity' | 'stage_gate' | 'approval' | string
  title: string
  detail: string
  metric: string
  recommendedAction: string
}

export interface PortfolioEscalationOverview {
  totalItems: number
  criticalItems: number
  warningItems: number
  budgetWarnings: number
  capacityWarnings: number
  items: PortfolioEscalationItem[]
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

export interface AiAnswerSource {
  type: string
  title: string
  detail: string
  relevanceScore: number
}

export interface ProjectAiAnswer {
  projectId: string
  projectName: string
  question: string
  answer: string
  confidence: 'low' | 'medium' | 'high' | string
  sources: AiAnswerSource[]
  suggestedActions: string[]
}

export interface ApplyAiSuggestionResponse {
  projectId: string
  targetType: 'task' | 'risk' | 'decision'
  entityId: string
  entityTitle: string
  feedbackStatus: 'accepted'
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

export interface GraphIntegrationStatus {
  isConfigured: boolean
  clientId: string
  tenantId: string
  redirectUri: string
  scopes: string[]
  setupHint: string
}

export interface GraphAuthStart {
  authorizationUrl: string
  state: string
  redirectUri: string
}

export interface AccessMatrix {
  currentRole: string
  availableRoles: string[]
  permissions: Record<string, boolean>
}

export interface JiraIntegrationStatus {
  isConfigured: boolean
  baseUrl: string
  authMode: string
  accountEmail: string
  setupHint: string
}

export interface JiraTicket {
  key: string
  summary: string
  status: string
  statusCategory: string
  priority: string
  issueType: string
  assigneeName: string
  assigneeEmail: string
  url: string
  updatedAt?: string | null
  dueDate?: string | null
}

export interface JiraAssigneeTickets {
  assigneeName: string
  assigneeEmail: string
  totalTickets: number
  todoTickets: number
  inProgressTickets: number
  doneTickets: number
  tickets: JiraTicket[]
}

export interface JiraProjectTickets {
  projectId: string
  projectName: string
  boardName: string
  projectKey: string
  jql: string
  totalTickets: number
  unassignedTickets: number
  assignees: JiraAssigneeTickets[]
  tickets: JiraTicket[]
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

export interface PortfolioBriefingProject {
  projectId: string
  projectName: string
  status: ProjectStatus | string
  progressPercent: number
  openTasks: number
  criticalRisks: number
  openDecisions: number
  openGovernanceChecks: number
  headline: string
}

export interface PortfolioBriefing {
  summary: string
  highlights: string[]
  escalations: string[]
  projects: PortfolioBriefingProject[]
}

export interface RiskSignal {
  projectId: string
  projectName: string
  severity: 'high' | 'medium' | 'low' | string
  title: string
  detail: string
  sources: string[]
  score: number
}

export interface AiLearningByType {
  suggestionType: string
  accepted: number
  rejected: number
  edited: number
}

export interface AiLearningByProject {
  projectId: string
  projectName: string
  accepted: number
  rejected: number
  edited: number
}

export interface AiLearningSummary {
  totalFeedback: number
  accepted: number
  rejected: number
  edited: number
  byType: AiLearningByType[]
  byProject: AiLearningByProject[]
  insights: string[]
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
