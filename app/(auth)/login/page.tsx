'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { getEntraAccount, getEntraIdToken, handleEntraRedirect, isEntraConfigured, startEntraLogin } from '@/lib/entra/client'
import { useAuthStore } from '@/lib/store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('berkcan@realcore.de')
  const [password, setPassword] = useState('demo1234')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [entraLoading, setEntraLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isEntraConfigured || isAuthenticated) return

    let cancelled = false

    const syncEntraLogin = async () => {
      try {
        setEntraLoading(true)
        await handleEntraRedirect()

        const account = await getEntraAccount()
        if (!account || cancelled) return

        const idToken = await getEntraIdToken()
        if (!idToken || cancelled) return

        const res: any = await api.auth.exchangeEntraToken(idToken)
        if (cancelled) return

        login(res.token, {
          id: res.userId,
          name: res.userName,
          email: res.email,
          role: res.role,
          tenantId: res.tenantId,
        }, 'entra')

        toast.success(`Microsoft-Login aktiv: ${res.userName}`)
        router.replace('/')
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Microsoft-Login fehlgeschlagen')
        }
      } finally {
        if (!cancelled) {
          setEntraLoading(false)
        }
      }
    }

    syncEntraLogin()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, login, router])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res: any = await api.auth.login(email, password)

      login(res.token, {
        id: res.userId,
        name: res.userName,
        email: res.email,
        role: res.role,
        tenantId: res.tenantId,
      }, 'local')

      toast.success(`Willkommen, ${res.userName}!`)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Login fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const handleEntraLogin = async () => {
    setError('')
    setEntraLoading(true)

    try {
      await startEntraLogin()
    } catch (err: any) {
      setError(err.message || 'Microsoft-Login konnte nicht gestartet werden')
      setEntraLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-4 h-16 w-16 overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 dark:bg-white/95">
            <Image src="/realcorelogo.png" alt="RealCore Logo" fill className="object-contain p-2" sizes="64px" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white">realcore PM</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Projektmanagement · RealCore</p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white mb-6">Anmelden</h2>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800 rounded-lg mb-4"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          {isEntraConfigured && (
            <>
              <button
                type="button"
                onClick={handleEntraLogin}
                disabled={entraLoading || loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {entraLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Mit Entra ID anmelden
              </button>
              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-gray-400">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                Oder lokal anmelden
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              </div>
            </>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="input pl-9"
                  placeholder="name@realcore.de"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="Passwort"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-950 dark:hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || entraLoading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-gray-100 p-3 dark:bg-gray-800/50">
            <p className="text-center text-xs text-gray-500">Demo-Zugangsdaten</p>
            <p className="mt-1 text-center text-xs text-gray-400">berkcan@realcore.de · demo1234</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
