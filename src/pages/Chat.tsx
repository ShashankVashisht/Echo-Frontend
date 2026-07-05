import { useState, useRef, useEffect } from 'react'
import { Send, Plus, Mic, Bell, Loader2, MessageCircleMore } from 'lucide-react'
import clsx from 'clsx'
import { chatApi } from '../lib/api'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const INITIAL: Msg[] = []

const SUGGESTIONS = [
  'Remind me tomorrow at 2pm about the meeting',
  'Show my upcoming reminders',
  'Remind me every Monday at 10am',
  'Cancel my daily reminder',
]

const Avatar = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
  const sizeClass = size === 'md' ? 'w-8 h-8' : 'w-7 h-7'
  return (
    <div className={`${sizeClass} rounded-full flex-shrink-0 flex items-center justify-center bg-[#2d2d2d] text-[#e8e8e8]`}>
      <MessageCircleMore size={size === 'md' ? 16 : 14} />
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await chatApi.getHistory()
        const historyMessages: Msg[] = (res.data?.messages ?? []).map((m: any, index: number) => ({
          id: `${m.timestamp || index}`,
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content ?? '',
          timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
        }))

        if (historyMessages.length) {
          setMessages((prev) => {
            if (prev.length === 0) {
            return historyMessages
          }
          return prev
          })
        }
      } catch (err) {
        console.error('Failed to load chat history', err)
      }
    }

    loadHistory()
  }, [])

  const send = async (text?: string) => {
    const content = (text || input).trim()
    if (!content) return

    const userMsg: Msg = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }

    const history = messages
      .filter((m) => m.id !== '0')
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const res = await chatApi.send(content, history)
      const reply = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ ${err.message || 'Something went wrong. Please try again.'}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#191919]">
      {/* Header */}
      <div className="border-b border-[#2d2d2d] px-6 py-3 flex items-center gap-3">
        <Avatar size="md" />
        <div>
          <div className="text-sm font-semibold text-[#e8e8e8]">Chat</div>
          <div className="text-xs text-[#0f9453]">● Online</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setMessages(INITIAL)}
            className="p-1.5 hover:bg-[#2d2d2d] rounded text-[#787878] text-xs"
            title="New chat"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className="max-w-[72%] space-y-1">
              <div className={clsx(
                'px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-[#2383e2] text-white rounded-tr-sm'
                  : 'bg-[#2d2d2d] text-[#e8e8e8] rounded-tl-sm'
              )}>
                {msg.content}
              </div>
              <div className={clsx('text-[10px] text-[#787878] px-1', msg.role === 'user' && 'text-right')}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <Avatar size="sm" />
            <div className="px-4 py-3 bg-[#2d2d2d] rounded-2xl rounded-tl-sm">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-[#787878] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length < 3 && (
        <div className="px-6 py-2 flex gap-2 flex-wrap">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)}
              className="text-xs px-3 py-1.5 border border-[#404040] rounded-full text-[#787878] hover:text-[#e8e8e8] hover:border-[#787878] transition">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#2d2d2d] px-4 py-3">
        <div className="flex items-center gap-3 bg-[#2d2d2d] rounded-xl px-4 py-2.5">
          <input
            className="flex-1 bg-transparent text-[#e8e8e8] text-sm outline-none placeholder-[#787878]"
            placeholder="Ask Echo anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={isTyping}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || isTyping}
            className={clsx('p-1.5 rounded-lg transition flex-shrink-0',
              input.trim() && !isTyping ? 'bg-[#2383e2] text-white' : 'text-[#787878]')}
          >
            {isTyping ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}