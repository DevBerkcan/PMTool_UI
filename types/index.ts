export type ProjectStatus = 'green' | 'yellow' | 'red'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Project {
  id: string
  name: string
  description: string
  customer: string
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

export interface ProjectDetail extends Project {
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
}
