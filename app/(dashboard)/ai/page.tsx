'use client'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Brain, Loader2, Send, Sparkles, User } from 'lucide-react'
import { api } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: Date
}

const SUGGESTIONS = ['Status G-Share?', 'Status AI Briefing Tool?', 'Kritische Risiken zeigen', 'Portfolio Uebersicht', 'Teamauslastung?']

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hallo! Ich bin Ihr KI-Projektassistent.\n\nIch greife auf die aktuellen Projektdaten aus dem Backend zu. Was moechten Sie wissen?', ts: new Date() },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', content: text, ts: new Date() }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.ai.chat(text)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, ts: new Date() }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.message || 'Die Antwort konnte nicht geladen werden.', ts: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4" style={{ height: 'calc(100vh - 140px)' }}>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center"><Brain className="w-5 h-5 text-purple-400" /></div>
        <div><h1 className="text-xl font-bold text-white">AI Projektassistent</h1><p className="text-gray-400 text-sm">Fragen Sie zu Projekten, Risiken und Ressourcen</p></div>
      </div>
      <div className="flex-1 card p-4 overflow-y-auto space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600/30'}`}>{msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-purple-400" />}</div>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                {msg.content.split('\n').map((line, lineIndex) => <p key={lineIndex} className={`text-sm leading-relaxed ${lineIndex > 0 ? 'mt-0.5' : ''}`}>{line || '\u00A0'}</p>)}
                <p className="text-xs opacity-50 mt-2">{msg.ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-purple-400" /></div><div className="bg-gray-800 rounded-xl px-4 py-3"><Loader2 className="w-4 h-4 text-gray-400 animate-spin" /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 flex-wrap flex-shrink-0">
        {SUGGESTIONS.map(suggestion => <button key={suggestion} onClick={() => send(suggestion)} className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full border border-gray-700 transition-colors">{suggestion}</button>)}
      </div>
      <div className="flex gap-3 flex-shrink-0">
        <input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && !event.shiftKey && send(input)} placeholder="Fragen Sie mich zu Ihren Projekten..." className="input flex-1" disabled={loading} />
        <button onClick={() => send(input)} disabled={!input.trim() || loading} className="btn-primary px-4"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  )
}
