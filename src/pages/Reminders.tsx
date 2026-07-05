import { useState, useEffect } from 'react'
import { Bell, Plus, RefreshCw, Check, Trash2, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { reminderApi } from '../lib/api'

interface Reminder {
  id: string
  message: string
  remindAt: string
  remindAtUTC?: string
  isRecurring: boolean
  recurringType?: string
  isSent: boolean
  channel?: string
}

const CHANNEL_ICON: Record<string, string> = {
  whatsapp: '📱',
  telegram: '✈️',
  app: '🔔',
}

const RECURRING_COLORS: Record<string, string> = {
  DAILY:   'text-[#2383e2] bg-[#1a3a5c]',
  WEEKLY:  'text-[#9b59b6] bg-[#2a1f40]',
  MONTHLY: 'text-[#e9a94b] bg-[#3d2a0a]',
  HOURLY:  'text-[#0f9453] bg-[#1b4332]',
  CUSTOM:  'text-[#787878] bg-[#2d2d2d]',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

interface CreateForm {
  message: string
  reminderDate: string
  reminderTime: string
  isRecurring: boolean
  recurringType: string
  recurringInterval: number
}

const DEFAULT_FORM: CreateForm = {
  message: '',
  reminderDate: new Date().toISOString().split('T')[0],
  reminderTime: '09:00',
  isRecurring: false,
  recurringType: 'DAILY',
  recurringInterval: 1,
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'recurring'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await reminderApi.getAll()
      setReminders(res.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      await reminderApi.create({
        message: form.message,
        reminderDate: form.reminderDate,
        reminderTime: form.reminderTime,
        ...(form.isRecurring && {
          isRecurring: true,
          recurringType: form.recurringType,
          recurringInterval: form.recurringInterval,
        }),
      })
      setShowCreate(false)
      setForm(DEFAULT_FORM)
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await reminderApi.delete(id)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const filtered = reminders.filter((r) => {
    if (filter === 'upcoming') return !r.isSent
    if (filter === 'recurring') return r.isRecurring
    return true
  })

  return (
    <div className="h-full overflow-auto px-12 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#e8e8e8] mb-1 flex items-center gap-3">
            <Bell size={28} className="text-[#e9a94b]" />
            Reminders
          </h1>
          {!loading && (
            <p className="text-[#787878] text-sm">
              {reminders.filter((r) => !r.isSent).length} upcoming &middot; {reminders.filter((r) => r.isRecurring).length} recurring
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} /> New Reminder
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-[#eb5757]/10 border border-[#eb5757]/30 rounded-lg text-sm text-[#eb5757] flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#202020] border border-[#2d2d2d] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[#e8e8e8]">New Reminder</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#787878] hover:text-[#e8e8e8]"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-[#787878] mb-1.5">Message</label>
                <input
                  className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] placeholder-[#505050] outline-none focus:border-[#2383e2] transition"
                  placeholder="What to remind you about?"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#787878] mb-1.5">Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2] transition"
                    value={form.reminderDate}
                    onChange={(e) => setForm({ ...form, reminderDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#787878] mb-1.5">Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2] transition"
                    value={form.reminderTime}
                    onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#2383e2]"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                />
                <span className="text-sm text-[#e8e8e8]">Recurring reminder</span>
              </label>

              {form.isRecurring && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <label className="block text-xs text-[#787878] mb-1.5">Pattern</label>
                    <select
                      className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none"
                      value={form.recurringType}
                      onChange={(e) => setForm({ ...form, recurringType: e.target.value })}
                    >
                      <option>HOURLY</option>
                      <option>DAILY</option>
                      <option>WEEKLY</option>
                      <option>MONTHLY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#787878] mb-1.5">Every</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none"
                      value={form.recurringInterval}
                      onChange={(e) => setForm({ ...form, recurringInterval: +e.target.value })}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-[#eb5757]">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-[#404040] hover:bg-[#2d2d2d] text-[#e8e8e8] rounded-lg text-sm transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {creating ? 'Creating...' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6">
        {(['all', 'upcoming', 'recurring'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx('px-4 py-1.5 rounded text-sm capitalize font-medium transition',
              filter === f ? 'bg-[#2d2d2d] text-[#e8e8e8]' : 'text-[#787878] hover:text-[#e8e8e8]')}>
            {f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-[#787878]">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading reminders...
        </div>
      )}

      {/* Reminder cards */}
      {!loading && (
        <div className="space-y-2">
          {filtered.map((reminder) => (
            <div key={reminder.id}
              className={clsx('flex items-center gap-4 p-4 bg-[#202020] border rounded-xl group transition',
                reminder.isSent ? 'border-[#2d2d2d] opacity-50' : 'border-[#2d2d2d] hover:border-[#404040]')}>
              <div className="text-xl flex-shrink-0">
                {reminder.channel ? CHANNEL_ICON[reminder.channel] || '🔔' : '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx('text-sm font-medium', reminder.isSent ? 'line-through text-[#787878]' : 'text-[#e8e8e8]')}>
                    {reminder.message}
                  </span>
                  {reminder.isRecurring && reminder.recurringType && (
                    <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1', RECURRING_COLORS[reminder.recurringType] || RECURRING_COLORS.CUSTOM)}>
                      <RefreshCw size={9} /> {reminder.recurringType}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#787878]">
                  {formatDate(reminder.remindAt || reminder.remindAtUTC || '')}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => handleDelete(reminder.id)}
                  className="p-1.5 hover:bg-[#2d2d2d] rounded text-[#eb5757]" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-[#787878]">
              <Bell size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">No reminders found</p>
              <p className="text-xs mt-1">Use the Chat page to create reminders with natural language</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
