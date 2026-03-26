'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Settings, User, Bell, Shield, Palette, Save, CheckCircle, PlugZap, ExternalLink, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'

const TABS = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'notify', label: 'Benachrichtigungen', icon: Bell },
  { id: 'security', label: 'Sicherheit', icon: Shield },
  { id: 'display', label: 'Darstellung', icon: Palette },
  { id: 'integrations', label: 'Integrationen', icon: PlugZap },
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? '',
    phone: '+49 40 1234567',
    company: 'RealCore',
  })
  const [notifications, setNotifications] = useState({
    deadlineReminder: true,
    riskAlert: true,
    taskAssigned: true,
    weeklyReport: true,
    emailNotify: true,
    browserNotify: false,
  })
  const { data: graphStatus } = useQuery({
    queryKey: ['graph-status'],
    queryFn: () => api.integrations.getGraphStatus(),
  })
  const { data: jiraStatus } = useQuery({
    queryKey: ['jira-status'],
    queryFn: () => api.integrations.getJiraStatus(),
  })
  const graphAuthStartMutation = useMutation({
    mutationFn: () => api.integrations.getGraphAuthStart(),
    onSuccess: data => {
      window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer')
      toast.success('Microsoft-Login in neuem Tab geoeffnet')
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 500))
    setSaved(true)
    toast.success('Einstellungen gespeichert!')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" /> Einstellungen
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Konto und Praeferenzen verwalten</p>
      </div>

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${tab === id ? 'bg-blue-600/15 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 card p-6">
          {tab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="font-semibold text-white mb-4">Profil bearbeiten</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
                  {profile.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-white">{profile.name}</p>
                  <p className="text-sm text-gray-400">{profile.role}</p>
                </div>
              </div>
              {[
                { label: 'Vollstaendiger Name', key: 'name', type: 'text' },
                { label: 'E-Mail Adresse', key: 'email', type: 'email' },
                { label: 'Telefon', key: 'phone', type: 'tel' },
                { label: 'Unternehmen', key: 'company', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">{label}</label>
                  <input
                    type={type}
                    value={(profile as any)[key]}
                    onChange={e => setProfile(f => ({ ...f, [key]: e.target.value }))}
                    className="input"
                  />
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'notify' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h2 className="font-semibold text-white mb-4">Benachrichtigungen</h2>
              {[
                {
                  key: 'deadlineReminder',
                  label: 'Deadline-Erinnerung',
                  desc: '3 Tage vor Faelligkeit',
                },
                {
                  key: 'riskAlert',
                  label: 'Risiko-Alarm',
                  desc: 'Bei kritischen Risiken',
                },
                {
                  key: 'taskAssigned',
                  label: 'Task zugewiesen',
                  desc: 'Wenn dir ein Task zugewiesen wird',
                },
                {
                  key: 'weeklyReport',
                  label: 'Woechentlicher Report',
                  desc: 'Jeden Montag um 8:00 Uhr',
                },
                {
                  key: 'emailNotify',
                  label: 'E-Mail Benachrichtigungen',
                  desc: 'Per E-Mail informiert werden',
                },
                {
                  key: 'browserNotify',
                  label: 'Browser-Benachrichtigungen',
                  desc: 'Push-Benachrichtigungen im Browser',
                },
              ].map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications(n => ({ ...n, [key]: !(n as any)[key] }))}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${(notifications as any)[key] ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${(notifications as any)[key] ? 'left-6' : 'left-1'}`}
                    />
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="font-semibold text-white mb-4">Sicherheit</h2>
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Konto ist gesichert</p>
                  <p className="text-xs text-gray-400">Letzter Login: heute</p>
                </div>
              </div>
              {['Aktuelles Passwort', 'Neues Passwort', 'Passwort bestaetigen'].map((label, i) => (
                <div key={i}>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">{label}</label>
                  <input type="password" className="input" placeholder="••••••••" />
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'display' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="font-semibold text-white mb-4">Darstellung</h2>
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <p className="text-sm font-medium text-white mb-3">Farbschema</p>
                <div className="flex gap-3">
                  <div className="w-24 h-16 rounded-lg bg-gray-950 border-2 border-blue-500 flex items-end justify-center pb-2 cursor-pointer">
                    <span className="text-xs font-medium text-blue-400">Dark</span>
                  </div>
                  <div className="w-24 h-16 rounded-lg bg-gray-100 border-2 border-gray-700 flex items-end justify-center pb-2 cursor-pointer">
                    <span className="text-xs font-medium text-gray-600">Light</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <p className="text-sm font-medium text-white mb-2">Sprache</p>
                <select className="input mt-1">
                  <option>Deutsch</option>
                  <option>English</option>
                </select>
              </div>
            </motion.div>
          )}

          {tab === 'integrations' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="font-semibold text-white mb-4">Microsoft Graph / Teams</h2>
              <div className={`rounded-xl border p-4 ${graphStatus?.isConfigured ? 'border-emerald-800/50 bg-emerald-950/30' : 'border-amber-800/50 bg-amber-950/20'}`}>
                <p className="text-sm font-medium text-white">{graphStatus?.isConfigured ? 'Graph ist vorbereitet' : 'Graph ist noch nicht konfiguriert'}</p>
                <p className="text-xs text-gray-400 mt-1">{graphStatus?.setupHint}</p>
              </div>
              <div className="rounded-xl bg-gray-800/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">OAuth-Startpfad</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Nach dem Klick oeffnet sich der Microsoft-Consent-Screen. Die Redirect URI muss in Azure exakt mit diesem Wert hinterlegt sein.
                    </p>
                  </div>
                  <button
                    onClick={() => graphAuthStartMutation.mutate()}
                    disabled={!graphStatus?.isConfigured || graphAuthStartMutation.isPending}
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {graphAuthStartMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Starte OAuth
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" /> Microsoft Login starten
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-gray-800/60 p-4">
                  <p className="text-xs text-gray-500 mb-1">Client ID</p>
                  <p className="text-white break-all">{graphStatus?.clientId || 'Nicht gesetzt'}</p>
                </div>
                <div className="rounded-lg bg-gray-800/60 p-4">
                  <p className="text-xs text-gray-500 mb-1">Tenant ID</p>
                  <p className="text-white break-all">{graphStatus?.tenantId || 'Nicht gesetzt'}</p>
                </div>
                <div className="rounded-lg bg-gray-800/60 p-4 md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Redirect URI</p>
                  <p className="text-white break-all">{graphStatus?.redirectUri || 'Nicht gesetzt'}</p>
                </div>
                <div className="rounded-lg bg-gray-800/60 p-4 md:col-span-2">
                  <p className="text-xs text-gray-500 mb-2">Scopes</p>
                  <div className="flex flex-wrap gap-2">
                    {graphStatus?.scopes.map(scope => <span key={scope} className="rounded-full bg-blue-600/10 px-2 py-1 text-xs text-blue-200">{scope}</span>)}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
                <p className="text-sm font-medium text-white">Azure App Registration</p>
                <p className="text-xs text-gray-400 mt-1">
                  Trage in Azure dieselbe Redirect URI ein und hinterlege danach `ClientId`, `TenantId`, `ClientSecret` und `RedirectUri` in der Backend-Konfiguration.
                </p>
              </div>
              <div className={`rounded-xl border p-4 ${jiraStatus?.isConfigured ? 'border-emerald-800/50 bg-emerald-950/30' : 'border-amber-800/50 bg-amber-950/20'}`}>
                <p className="text-sm font-medium text-white">{jiraStatus?.isConfigured ? 'Jira ist vorbereitet' : 'Jira ist noch nicht konfiguriert'}</p>
                <p className="text-xs text-gray-400 mt-1">{jiraStatus?.setupHint}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-gray-800/60 p-4">
                  <p className="text-xs text-gray-500 mb-1">Base URL</p>
                  <p className="text-white break-all">{jiraStatus?.baseUrl || 'Nicht gesetzt'}</p>
                </div>
                <div className="rounded-lg bg-gray-800/60 p-4">
                  <p className="text-xs text-gray-500 mb-1">Auth Mode</p>
                  <p className="text-white break-all">{jiraStatus?.authMode || 'Nicht gesetzt'}</p>
                </div>
                <div className="rounded-lg bg-gray-800/60 p-4 md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Jira Account</p>
                  <p className="text-white break-all">{jiraStatus?.accountEmail || 'Nicht gesetzt'}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-800">
            <button onClick={handleSave} className="btn-primary">
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Gespeichert!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
