'use client'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { ProjectDetail, Task } from '@/types'

const STATUS_COLOR: Record<string, string> = { done: 'bg-emerald-600', in_progress: 'bg-blue-600', review: 'bg-amber-600', todo: 'bg-gray-600' }
const STATUS_LABEL: Record<string, string> = { done: 'Fertig', in_progress: 'In Progress', review: 'Review', todo: 'To Do' }

export default function GanttPage() {
  const { id } = useParams<{ id: string }>()
  const { data: project } = useQuery<ProjectDetail>({ queryKey: ['project', id], queryFn: () => api.projects.getById(id) })
  const { data: tasks = [], isLoading } = useQuery<Task[]>({ queryKey: ['project-tasks', id], queryFn: () => api.tasks.getByProject(id) })

  if (isLoading || !project) {
    return <div className="card p-6 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Timeline wird geladen...</div>
  }

  const tasksWithDates = tasks.filter(task => task.dueDate)
  const totalDays = Math.max(1, Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / 86400000))
  const today = new Date().toISOString().split('T')[0]
  const todayOff = Math.max(0, Math.min(100, (Math.ceil((new Date(today).getTime() - new Date(project.startDate).getTime()) / 86400000) / totalDays) * 100))

  const weeks: { label: string; left: number }[] = []
  const start = new Date(project.startDate)
  for (let i = 0; i < totalDays; i += 14) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    weeks.push({ label: d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }), left: (i / totalDays) * 100 })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Gantt Timeline</h1>
        <p className="text-gray-400 text-sm">{project.name} · {new Date(project.startDate).toLocaleDateString('de-DE')} - {new Date(project.endDate).toLocaleDateString('de-DE')}</p>
      </div>
      <div className="card p-5 overflow-x-auto">
        <div className="flex mb-4 pl-48">
          <div className="flex-1 relative h-6">{weeks.map(week => <span key={week.label} className="absolute text-xs text-gray-500 transform -translate-x-1/2" style={{ left: `${week.left}%` }}>{week.label}</span>)}</div>
        </div>
        <div className="space-y-3">
          {tasksWithDates.map(task => {
            const endOff = Math.min(100, (Math.ceil((new Date(task.dueDate!).getTime() - new Date(project.startDate).getTime()) / 86400000) / totalDays) * 100)
            return (
              <div key={task.id} className="flex items-center gap-4">
                <div className="w-44 flex-shrink-0"><p className="text-xs font-medium text-white truncate">{task.title}</p><p className="text-xs text-gray-500">{task.assigneeName ?? '-'}</p></div>
                <div className="flex-1 relative h-8 bg-gray-800 rounded-lg overflow-hidden">
                  <div className="absolute top-0 bottom-0 w-px bg-blue-500/60 z-10" style={{ left: `${todayOff}%` }} />
                  <div className={`absolute top-1 bottom-1 rounded ${STATUS_COLOR[task.status]} flex items-center px-2`} style={{ left: '2%', width: `${Math.max(2, endOff - 2)}%` }}>
                    <span className="text-xs text-white font-medium truncate">{STATUS_LABEL[task.status]}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0 w-16 text-right">{new Date(task.dueDate!).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
