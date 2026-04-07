'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ChevronLeft, Clock, CheckCircle2, FileText, Bell, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { useAccessMatrix } from '@/lib/hooks/useAccessMatrix'
import type { TimeEntryDashboardRow, TimeEntryNotificationDto } from '@/types'

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

export default function TimeDashboardPage() {
  const user = useAuthStore(s => s.user)
  const isManager = ['Admin', 'Management', 'PMO', 'Projektleiter'].includes(user?.role ?? '')
  const { can } = useAccessMatrix()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [exportProjectId, setExportProjectId] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)

  const queryClient = useQueryClient()

  const { data: rows = [], isLoading } = useQuery<TimeEntryDashboardRow[]>({
    queryKey: ['time-dashboard', year, month],
    queryFn: () => api.timeEntries.getDashboard(year, month),
    enabled: isManager,
  })

  const { data: notifications = [] } = useQuery<TimeEntryNotificationDto[]>({
    queryKey: ['time-notifications'],
    queryFn: () => api.timeEntries.getNotifications(),
    refetchInterval: 60_000,
    enabled: isManager,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.timeEntries.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.timeEntries.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-notifications'] })
      toast.success('Alle Benachrichtigungen als gelesen markiert.')
    },
  })

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  async function handleExport(format: 'csv' | 'pdf') {
    setIsExporting(true)
    try {
      const params = {
        ...(exportProjectId ? { projectId: exportProjectId } : {}),
        year,
        month,
      }
      const blob = format === 'csv'
        ? await api.reports.exportTimeEntriesCsv(params)
        : await api.reports.exportTimeEntriesPdf(params)
      const projectName = exportProjectId
        ? (rows.find(r => r.projectId === exportProjectId)?.projectName ?? 'projekt')
        : 'alle'
      const monthStr = String(month).padStart(2, '0')
      downloadBlob(blob as unknown as Blob, `zeiten-${projectName.replace(/\s+/g, '-')}-${year}-${monthStr}.${format}`)
      toast.success(`${format.toUpperCase()} Export erfolgreich.`)
    } catch {
      toast.error('Export fehlgeschlagen.')
    } finally {
      setIsExporting(false)
    }
  }

  const filtered = rows.filter(r => {
    const matchUser = !filterUser || r.userName.toLowerCase().includes(filterUser.toLowerCase())
    const matchProject = !filterProject || r.projectName.toLowerCase().includes(filterProject.toLowerCase())
    return matchUser && matchProject
  })

  if (!isManager) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <Clock className="mx-auto mb-3 h-10 w-10 opacity-40" />
        <p>Für die Zeiterfassung bitte das Projekt öffnen und "Zeiten erfassen" klicken.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Zeiterfassung
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Übersicht aller eingereichten Stunden</p>
        </div>

        {/* Notification Bell */}
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="relative flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span>{unreadCount} neue Einreichung{unreadCount > 1 ? 'en' : ''}</span>
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          </button>
        )}
      </div>

      {/* Recent Notifications */}
      {notifications.filter(n => !n.isRead).length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">Neue Einreichungen</p>
          {notifications.filter(n => !n.isRead).slice(0, 5).map(n => (
            <div key={n.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-700 dark:text-gray-300">{n.message}</span>
              <button
                onClick={() => markReadMutation.mutate(n.id)}
                className="shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Gelesen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[140px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Mitarbeiter filtern..."
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Projekt filtern..."
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Export Section – PMO only */}
      {can('managePmo') && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
          <Download className="h-4 w-4 text-gray-500 shrink-0" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Export:</span>

          {/* Project filter for export */}
          <select
            value={exportProjectId}
            onChange={e => setExportProjectId(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Projekte</option>
            {Array.from(new Map(rows.map(r => [r.projectId, r.projectName])).entries()).map(([pid, name]) => (
              <option key={pid} value={pid}>{name}</option>
            ))}
          </select>

          <span className="text-sm text-gray-500 dark:text-gray-400">{MONTH_NAMES[month - 1]} {year}</span>

          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          {isExporting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 mr-3" />
          Lade Zeiteinträge...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-16 text-center text-gray-400">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Keine Zeiteinträge für {MONTH_NAMES[month - 1]} {year}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 w-8"></th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Mitarbeiter</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Projekt</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Geleistet</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Fakturiert</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Eingereicht am</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(row => {
                const key = `${row.userId}-${row.projectId}`
                const isExpanded = expandedKey === key
                return (
                  <>
                    <tr
                      key={key}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.userName}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.projectName}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{row.totalGeleistet.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{row.totalFakturiert.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-center">
                        {row.status === 'submitted' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> Eingereicht
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                            Entwurf
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'}
                      </td>
                    </tr>

                    {/* Expanded detail rows */}
                    {isExpanded && row.dayEntries.map(d => (
                      <tr key={`${key}-${d.day}`} className="bg-gray-50/50 dark:bg-gray-900/50">
                        <td></td>
                        <td colSpan={2} className="px-8 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                          Tag {d.day} ({d.weekday})
                        </td>
                        <td className="px-4 py-1.5 text-right text-xs font-mono text-gray-700 dark:text-gray-300">{d.geleistetHours.toFixed(1)}h</td>
                        <td className="px-4 py-1.5 text-right text-xs font-mono text-gray-700 dark:text-gray-300">{d.fakturiertHours.toFixed(1)}h</td>
                        <td colSpan={2} className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400 italic">{d.comment}</td>
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Gesamt</td>
                <td className="px-4 py-3 text-right text-sm font-bold font-mono text-gray-900 dark:text-white">
                  {filtered.reduce((s, r) => s + r.totalGeleistet, 0).toFixed(1)}h
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold font-mono text-gray-900 dark:text-white">
                  {filtered.reduce((s, r) => s + r.totalFakturiert, 0).toFixed(1)}h
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
