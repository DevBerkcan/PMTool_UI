'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, ArrowLeft, Calendar, CheckCircle, ChevronRight, ClipboardList, DollarSign, FileText, Loader2, Plus, TrendingUp, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Activity as ActivityItem, ProjectDetail } from '@/types'

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

  const createNote = useMutation({
    mutationFn: () => api.projects.createNote(id, { title: noteTitle, content: noteContent }),
    onSuccess: async () => {
      setNoteTitle('')
      setNoteContent('')
      await qc.invalidateQueries({ queryKey: ['project', id] })
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
      await qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Projektleiter-Aufgabe erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleLeadTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => api.projects.updateLeadTaskStatus(id, taskId, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project', id] })
    },
  })

  if (isLoading || !project) {
    return <div className="card p-6 flex items-center justify-center text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Projekt wird geladen...</div>
  }

  const openTasks = tasks.filter(task => task.status !== 'done')
  const budgetPct = Math.round((project.budgetSpent / project.budgetTotal) * 100)
  const fmtMoney = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const statusBadge = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' }[project.status]
  const statusLabel = { green: 'On Track', yellow: 'At Risk', red: 'Kritisch' }[project.status]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <span className="text-gray-500 text-sm">Portfolio</span>
        <ChevronRight className="w-4 h-4 text-gray-600" />
        <span className="text-white text-sm font-medium">{project.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <span className={statusBadge}>{statusLabel}</span>
          </div>
          <p className="text-gray-400 text-sm">{project.description}</p>
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
          { icon: AlertTriangle, label: 'Risiken', value: risks.filter(risk => risk.status === 'open').length.toString(), sub: `${risks.filter(risk => risk.score >= 12).length} priorisiert`, color: 'text-red-400', bg: 'bg-red-500/10' },
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
            <div className="flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-blue-400" /><h2 className="font-semibold text-white">Projektinformationen</h2></div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
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
