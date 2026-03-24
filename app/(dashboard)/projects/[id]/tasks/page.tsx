'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Loader2, MessageSquare, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { ProjectDetail, Task, TaskStatus } from '@/types'

const COLS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'border-gray-600' },
  { id: 'in_progress', label: 'In Progress', color: 'border-blue-600' },
  { id: 'review', label: 'Review', color: 'border-amber-600' },
  { id: 'done', label: 'Fertig', color: 'border-emerald-600' },
]

export default function TasksPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState<TaskStatus | null>(null)
  const [newTitle, setNewTitle] = useState('')

  const { data: project } = useQuery<ProjectDetail>({
    queryKey: ['project', id],
    queryFn: () => api.projects.getById(id),
  })

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['project-tasks', id],
    queryFn: () => api.tasks.getByProject(id),
  })

  const addTask = useMutation({
    mutationFn: async (status: TaskStatus) => {
      const created = await api.tasks.create(id, { title: newTitle, description: '', priority: 'medium', estimatedHours: 0 })
      if (status !== 'todo') {
        await api.tasks.updateStatus(id, created.id, status)
      }
      return created
    },
    onSuccess: async () => {
      setNewTitle('')
      setShowForm(null)
      await qc.invalidateQueries({ queryKey: ['project-tasks', id] })
      toast.success('Task erstellt')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const moveTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) => api.tasks.updateStatus(id, taskId, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-tasks', id] })
    },
  })

  const byStatus = (status: TaskStatus) => tasks.filter(task => task.status === status)

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-white">{project?.name ?? 'Projekt'}</h1>
        <p className="text-gray-400 text-sm">Task Board - {tasks.length} Tasks</p>
      </div>

      {isLoading && <div className="card p-5 text-gray-400 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Tasks werden geladen...</div>}

      <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
        {COLS.map(col => (
          <div key={col.id} className={`flex-shrink-0 w-72 flex flex-col rounded-xl bg-gray-900/50 border-t-2 ${col.color} border-x border-b border-gray-800`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-200">{col.label}</span>
                <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">{byStatus(col.id).length}</span>
              </div>
              <button onClick={() => setShowForm(col.id)} className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-16">
              <AnimatePresence>
                {showForm === col.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <input autoFocus value={newTitle} onChange={event => setNewTitle(event.target.value)} onKeyDown={event => event.key === 'Enter' && newTitle.trim() && addTask.mutate(col.id)} placeholder="Task-Titel..." className="input text-xs py-1.5" />
                    <div className="flex gap-2">
                      <button onClick={() => newTitle.trim() && addTask.mutate(col.id)} className="flex-1 btn-primary text-xs py-1">Hinzufuegen</button>
                      <button onClick={() => setShowForm(null)} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {byStatus(col.id).map((task, index) => (
                <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.03 }} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-all group cursor-pointer">
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-500'}`} />
                    <p className="text-sm text-white font-medium leading-tight">{task.title}</p>
                  </div>
                  {task.assigneeName && <p className="text-xs text-gray-500 mb-2 ml-3.5">{task.assigneeName}</p>}
                  <div className="flex items-center justify-between ml-3.5">
                    <div className="flex items-center gap-2">
                      {task.dueDate && <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>}
                      {task.commentCount > 0 && <span className="flex items-center gap-1 text-xs text-gray-500"><MessageSquare className="w-3 h-3" />{task.commentCount}</span>}
                    </div>
                  </div>
                  <div className="hidden group-hover:flex gap-1 mt-2 ml-3.5 flex-wrap">
                    {COLS.filter(next => next.id !== task.status).map(next => (
                      <button key={next.id} onClick={() => moveTask.mutate({ taskId: task.id, status: next.id })} className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
                        → {next.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
