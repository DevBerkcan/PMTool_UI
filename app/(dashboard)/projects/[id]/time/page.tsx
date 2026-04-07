'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Send, Save, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { TimeEntriesResponse, TimeEntryDayDto } from '@/types'

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

const SERVICE_TYPES = [
  'J - Remote',
  'V - Vor Ort',
  'U - Urlaub',
  'K - Krank',
]

export default function ProjectTimePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [serviceType, setServiceType] = useState('J - Remote')
  const [localDays, setLocalDays] = useState<Record<number, { geleistetHours: number; fakturiertHours: number; comment: string }>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const { data, isLoading, isFetching } = useQuery<TimeEntriesResponse>({
    queryKey: ['time-entries', id, year, month],
    queryFn: () => api.timeEntries.getEntries(id, year, month),
  })

  // Sync server data into local state on load/month change
  useEffect(() => {
    if (!data) return
    const map: Record<number, { geleistetHours: number; fakturiertHours: number; comment: string }> = {}
    for (const d of data.days) {
      map[d.day] = { geleistetHours: d.geleistetHours, fakturiertHours: d.fakturiertHours, comment: d.comment }
    }
    setLocalDays(map)
    if (data.serviceType) setServiceType(data.serviceType)
    setIsDirty(false)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => api.timeEntries.saveBulk({
      projectId: id,
      year,
      month,
      serviceType,
      days: Object.entries(localDays).map(([day, val]) => ({
        day: Number(day),
        ...val
      }))
    }),
    onSuccess: () => {
      toast.success('Gespeichert.')
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ['time-entries', id, year, month] })
    },
    onError: (e: Error) => toast.error(e.message || 'Fehler beim Speichern.'),
  })

  const submitMutation = useMutation({
    mutationFn: () => api.timeEntries.submit({ projectId: id, year, month }),
    onSuccess: () => {
      toast.success('Zeiten erfolgreich eingereicht!')
      setShowSubmitModal(false)
      queryClient.invalidateQueries({ queryKey: ['time-entries', id, year, month] })
      queryClient.invalidateQueries({ queryKey: ['time-notifications'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Fehler beim Einreichen.'),
  })

  const clearMutation = useMutation({
    mutationFn: () => api.timeEntries.saveBulk({
      projectId: id,
      year,
      month,
      serviceType,
      days: (data?.days ?? []).map(d => ({ day: d.day, geleistetHours: 0, fakturiertHours: 0, comment: '' }))
    }),
    onSuccess: () => {
      toast.success('Einträge gelöscht.')
      queryClient.invalidateQueries({ queryKey: ['time-entries', id, year, month] })
    },
  })

  function updateDay(day: number, field: 'geleistetHours' | 'fakturiertHours' | 'comment', value: string | number) {
    setLocalDays(prev => ({
      ...prev,
      [day]: { ...(prev[day] ?? { geleistetHours: 0, fakturiertHours: 0, comment: '' }), [field]: value }
    }))
    setIsDirty(true)
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isSubmitted = data?.status === 'submitted'
  const totalGeleistet = Object.values(localDays).reduce((s, d) => s + (Number(d.geleistetHours) || 0), 0)
  const totalFakturiert = Object.values(localDays).reduce((s, d) => s + (Number(d.fakturiertHours) || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 mr-3" />
        Lade Zeiterfassung...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {/* Info Header (like screenshot) */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-5 py-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <span className="font-semibold text-gray-900 dark:text-white">Projekt:</span>{' '}
        {data?.projectName ?? '...'}
        {'  '}
        <span className="mx-2 text-gray-400">•</span>
        <span className="font-semibold">Kunde:</span>{' '}{data?.customer ?? ''}
        {'  '}
        <span className="mx-2 text-gray-400">•</span>
        <span className="font-semibold">Leistungsart:</span>{' '}
        <select
          value={serviceType}
          onChange={e => { setServiceType(e.target.value); setIsDirty(true) }}
          disabled={isSubmitted}
          className="ml-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-0.5 text-sm disabled:opacity-60"
        >
          {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {'  '}
        <span className="mx-2 text-gray-400">•</span>
        <span className="font-semibold">Periode:</span>{' '}{month}.{year}
        {'  '}
        <span className="mx-2 text-gray-400">•</span>
        <span className="font-semibold">Geleistet:</span>{' '}<span className="text-blue-600 dark:text-blue-400 font-mono">{totalGeleistet.toFixed(1)}h</span>
        {'  '}
        <span className="mx-2 text-gray-400">•</span>
        <span className="font-semibold">Fakturiert:</span>{' '}<span className="text-green-600 dark:text-green-400 font-mono">{totalFakturiert.toFixed(1)}h</span>
        {'  '}
        <span className="mx-2 text-gray-400">•</span>
        <span className="font-semibold">Budget:</span>{' '}
        {data?.budgetTotal ? `${data.budgetTotal.toLocaleString('de-DE')} €` : 'kein Budget zugewiesen'}
        {'  '}
        {isSubmitted && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" /> Eingereicht
          </span>
        )}
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-base font-semibold text-gray-900 dark:text-white min-w-[130px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
        {isFetching && <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />}
      </div>

      {/* Time Entry Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-12">Woche</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-10">Ta.</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-10"></th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">Geleistet</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-28">Fakturiert</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Kommentar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(data?.days ?? []).map((d, idx) => {
              const local = localDays[d.day] ?? { geleistetHours: 0, fakturiertHours: 0, comment: '' }
              // Show week number only on first day of that week
              const prev = data?.days[idx - 1]
              const showWeek = !prev || prev.weekNumber !== d.weekNumber
              const isWeekend = d.isWeekend

              return (
                <tr
                  key={d.day}
                  className={isWeekend
                    ? 'bg-yellow-50 dark:bg-yellow-900/10'
                    : 'bg-white dark:bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/30'}
                >
                  <td className="px-3 py-1.5 text-xs text-gray-400 font-mono">
                    {showWeek ? <span className="font-semibold text-gray-600 dark:text-gray-300">{d.weekNumber}</span> : ''}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 font-mono">{d.day}</td>
                  <td className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 w-10">{d.weekday}</td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={local.geleistetHours || ''}
                      onChange={e => updateDay(d.day, 'geleistetHours', parseFloat(e.target.value) || 0)}
                      disabled={isWeekend || isSubmitted}
                      placeholder="0"
                      className="w-full rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-right text-xs font-mono disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={local.fakturiertHours || ''}
                      onChange={e => updateDay(d.day, 'fakturiertHours', parseFloat(e.target.value) || 0)}
                      disabled={isWeekend || isSubmitted}
                      placeholder="0"
                      className="w-full rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-right text-xs font-mono disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={local.comment || ''}
                      onChange={e => updateDay(d.day, 'comment', e.target.value)}
                      disabled={isWeekend || isSubmitted}
                      placeholder={isWeekend ? '' : 'Kommentar...'}
                      className="w-full rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Totals row */}
          <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
            <tr>
              <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Gesamt</td>
              <td className="px-3 py-2.5 text-right text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{totalGeleistet.toFixed(1)}h</td>
              <td className="px-3 py-2.5 text-right text-sm font-bold font-mono text-green-600 dark:text-green-400">{totalFakturiert.toFixed(1)}h</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
            Schließen
          </button>
          {!isSubmitted && (
            <button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          )}
        </div>

        {!isSubmitted && (
          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !isDirty}
              className="flex items-center gap-2 rounded-lg bg-gray-800 dark:bg-gray-700 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Speichern...' : 'Speichern'}
            </button>
            <button
              onClick={() => {
                if (isDirty) {
                  toast.error('Bitte zuerst speichern, dann einreichen.')
                  return
                }
                setShowSubmitModal(true)
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4 w-4" />
              Einreichen
            </button>
          </div>
        )}

        {isSubmitted && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="h-5 w-5" />
            Eingereicht am{' '}
            {data?.submittedAt
              ? new Date(data.submittedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : ''}
          </div>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-blue-500 shrink-0" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Zeiten einreichen</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Möchtest du die Zeiten für <strong>{MONTH_NAMES[month - 1]} {year}</strong> einreichen?
              Das Projektleiter-Team wird benachrichtigt. <strong>Dies kann nicht rückgängig gemacht werden.</strong>
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitMutation.isPending ? 'Wird eingereicht...' : 'Ja, einreichen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
