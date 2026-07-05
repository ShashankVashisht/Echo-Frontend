import { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Search, LayoutGrid,
  Plus, ChevronDown, X, Loader2, Trash2, Calendar as CalIcon,
  AlertCircle, ExternalLink,
} from 'lucide-react'
import { format, addDays, isSameDay, isToday } from 'date-fns'
import clsx from 'clsx'
import { useCalendarStore } from '../stores/calendarStore'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SLOT_H = 60

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ currentDate, onSelect }: { currentDate: Date; onSelect: (d: Date) => void }) {
  const [viewing, setViewing] = useState(new Date(currentDate))
  const year = viewing.getFullYear()
  const month = viewing.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const today = new Date()
  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewing(new Date(year, month - 1))} className="p-0.5 hover:bg-[#2d2d2d] rounded text-[#787878]">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-medium text-[#e8e8e8]">{format(viewing, 'MMMM yyyy')}</span>
        <button onClick={() => setViewing(new Date(year, month + 1))} className="p-0.5 hover:bg-[#2d2d2d] rounded text-[#787878]">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] text-[#787878] py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const date = new Date(year, month, d)
          const isT = isToday(date)
          const isSelected = isSameDay(date, currentDate)
          return (
            <button key={i} onClick={() => onSelect(date)}
              className={clsx(
                'text-[11px] py-0.5 rounded-full mx-auto w-6 h-6 flex items-center justify-center',
                isT && !isSelected && 'text-[#2383e2] font-bold',
                isSelected && 'bg-[#2383e2] text-white font-bold',
                !isT && !isSelected && 'text-[#e8e8e8] hover:bg-[#2d2d2d]'
              )}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Event Block ───────────────────────────────────────────────────────────────
function EventBlock({
  event, top, height, onClick,
}: { event: any; top: number; height: number; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="absolute left-1 right-1 rounded px-1.5 py-0.5 text-white text-[11px] overflow-hidden cursor-pointer hover:brightness-110 transition"
      style={{ top, height: Math.max(height, 20), backgroundColor: event.color }}
      title={`${event.title}\n${event.startTime}–${event.endTime}`}>
      <div className="font-medium leading-tight truncate">{event.title}</div>
      {height > 28 && <div className="opacity-80">{event.startTime}–{event.endTime}</div>}
    </div>
  )
}

// ── Current Time Line ─────────────────────────────────────────────────────────
function CurrentTimeLine() {
  const [topPx, setTopPx] = useState(0)
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTopPx((now.getHours() + now.getMinutes() / 60) * SLOT_H)
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: topPx }}>
      <div className="w-2 h-2 rounded-full bg-[#eb5757] -ml-1 flex-shrink-0" />
      <div className="flex-1 border-t border-[#eb5757]" />
    </div>
  )
}

// ── Create Event Modal ────────────────────────────────────────────────────────
function CreateEventModal({ accounts, onClose, initialDate }: {
  accounts: any[]
  onClose: () => void
  initialDate?: Date
}) {
  const createEvent = useCalendarStore((s) => s.createEvent)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
  const [startH, setStartH] = useState('09')
  const [startM, setStartM] = useState('00')
  const [endH, setEndH] = useState('10')
  const [endM, setEndM] = useState('00')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.accountId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true); setError('')
    try {
      await createEvent({
        title: title.trim(),
        startTime: `${date}T${startH}:${startM}:00`,
        endTime: `${date}T${endH}:${endM}:00`,
        description: description.trim() || undefined,
        accountId: accountId || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const HOURS_OPT = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const MINS_OPT = ['00', '15', '30', '45']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#202020] border border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#e8e8e8]">New Event</h2>
          <button onClick={onClose} className="text-[#787878] hover:text-[#e8e8e8]"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input autoFocus required
            className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2] placeholder:text-[#505050]"
            placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div>
            <label className="block text-xs text-[#787878] mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#787878] mb-1.5">Start time</label>
              <div className="flex gap-1">
                <select value={startH} onChange={(e) => setStartH(e.target.value)}
                  className="flex-1 px-2 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none">
                  {HOURS_OPT.map((h) => <option key={h}>{h}</option>)}
                </select>
                <span className="text-[#787878] self-center">:</span>
                <select value={startM} onChange={(e) => setStartM(e.target.value)}
                  className="flex-1 px-2 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none">
                  {MINS_OPT.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#787878] mb-1.5">End time</label>
              <div className="flex gap-1">
                <select value={endH} onChange={(e) => setEndH(e.target.value)}
                  className="flex-1 px-2 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none">
                  {HOURS_OPT.map((h) => <option key={h}>{h}</option>)}
                </select>
                <span className="text-[#787878] self-center">:</span>
                <select value={endM} onChange={(e) => setEndM(e.target.value)}
                  className="flex-1 px-2 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none">
                  {MINS_OPT.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#787878] mb-1.5">Description (optional)</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2] resize-none placeholder:text-[#505050]"
              placeholder="Add description…" />
          </div>

          {accounts.length > 1 && (
            <div>
              <label className="block text-xs text-[#787878] mb-1.5">Calendar</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none">
                {accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>{a.email}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-xs text-[#eb5757]">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-[#404040] hover:bg-[#2d2d2d] text-[#e8e8e8] rounded-lg text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading || !title.trim()}
              className="flex-1 py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? 'Creating…' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Event Detail Panel ────────────────────────────────────────────────────────
function EventDetailPanel({ event, accounts, onClose, onDelete }: {
  event: any; accounts: any[]; onClose: () => void; onDelete: () => void
}) {
  const account = accounts.find((a) => a.accountId === event.calendarId)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60" onClick={onClose}>
      <div className="bg-[#202020] border border-[#333] rounded-2xl p-5 w-full max-w-sm shadow-2xl mb-4 sm:mb-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: event.color }} />
            <h3 className="text-base font-semibold text-[#e8e8e8]">{event.title}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onDelete} className="p-1.5 hover:bg-[#2d2d2d] rounded text-[#787878] hover:text-[#eb5757]">
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-[#2d2d2d] rounded text-[#787878]">
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-[#a0a0a0]">
            <CalIcon size={13} className="flex-shrink-0" />
            <span>{event.date} · {event.startTime} – {event.endTime}</span>
          </div>
          {account && (
            <div className="flex items-center gap-2 text-[#a0a0a0]">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: account.color }} />
              <span>{account.email}</span>
            </div>
          )}
          {event.htmlLink && (
            <a href={event.htmlLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-[#2383e2] hover:underline">
              <ExternalLink size={13} />
              Open in Google Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Connect Banner ────────────────────────────────────────────────────────────
function ConnectBanner({ onConnect, loading }: { onConnect: () => void; loading: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#2383e2]/10 flex items-center justify-center mx-auto mb-4">
          <CalIcon size={32} className="text-[#2383e2]" />
        </div>
        <h2 className="text-xl font-semibold text-[#e8e8e8] mb-2">Connect Google Calendar</h2>
        <p className="text-[#787878] text-sm mb-6 leading-relaxed">
          Connect your Google Calendar to see and manage events directly in Echo.
          You can connect multiple Google accounts.
        </p>
        <button onClick={onConnect} disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-xl text-sm font-medium mx-auto disabled:opacity-50 transition-colors">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {loading ? 'Connecting…' : 'Connect Google Calendar'}
        </button>
      </div>
    </div>
  )
}

// ── Main Calendar Page ────────────────────────────────────────────────────────
export default function Calendar() {
  const {
    connected, accounts, statusLoading, events, eventsLoading, error,
    currentWeekStart, init, connect, disconnectAccount, toggleAccount,
    deleteEvent, nextWeek, prevWeek, goToToday,
  } = useCalendarStore()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showCreate, setShowCreate] = useState(false)
  const [createDate, setCreateDate] = useState<Date | undefined>()
  const [detailEvent, setDetailEvent] = useState<any | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [connectingMore, setConnectingMore] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load status + events on mount
  useEffect(() => { init() }, [])

  // Scroll to 8am on mount
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * SLOT_H - 40
  }, [])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  const today = new Date()

  const visibleAccountIds = new Set(accounts.filter((a) => a.isVisible).map((a) => a.accountId))

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter((e) => e.date === dateStr && visibleAccountIds.has(e.calendarId))
  }

  const timeToTop = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return (h + m / 60) * SLOT_H
  }
  const timeToHeight = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return ((eh * 60 + em - (sh * 60 + sm)) / 60) * SLOT_H
  }
  const formatHour = (h: number) => {
    if (h === 0) return ''
    const ampm = h < 12 ? 'AM' : 'PM'
    const display = h % 12 === 0 ? 12 : h % 12
    return `${display}${ampm}`
  }

  const handleAddAccount = async () => {
    setConnectingMore(true)
    try {
      const { calendarApi } = await import('../lib/api')
      const callbackUrl = `${window.location.origin}/calendar`
      const res = await calendarApi.connect(callbackUrl)
      if (res.data?.redirectUrl) window.location.href = res.data.redirectUrl
    } catch (err: any) {
      console.error('Connect error:', err.message)
    } finally {
      setConnectingMore(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!detailEvent) return
    try {
      await deleteEvent(detailEvent.id, detailEvent.calendarId)
      setDetailEvent(null)
    } catch {}
  }

  if (statusLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#191919]">
        <Loader2 size={24} className="animate-spin text-[#787878]" />
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-[#191919] overflow-hidden">

      {/* Modals */}
      {showCreate && (
        <CreateEventModal
          accounts={accounts}
          initialDate={createDate}
          onClose={() => { setShowCreate(false); setCreateDate(undefined) }}
        />
      )}
      {detailEvent && (
        <EventDetailPanel
          event={detailEvent}
          accounts={accounts}
          onClose={() => setDetailEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Left Sidebar */}
      <div className="w-[220px] flex-shrink-0 border-r border-[#2d2d2d] bg-[#191919] flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2d2d2d]">
          <button onClick={prevWeek} className="p-1 hover:bg-[#2d2d2d] rounded text-[#787878]">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-[#787878]">{format(currentWeekStart, 'MMM yyyy')}</span>
          <button onClick={nextWeek} className="p-1 hover:bg-[#2d2d2d] rounded text-[#787878]">
            <ChevronRight size={14} />
          </button>
        </div>

        <MiniCalendar currentDate={selectedDate} onSelect={(d) => { setSelectedDate(d); setCreateDate(d) }} />

        <div className="border-t border-[#2d2d2d] my-1" />

        {/* Create event button */}
        <div className="px-3 py-2">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 w-full px-3 py-2 bg-[#2383e2] hover:bg-[#1a72d4] rounded-lg text-xs text-white font-medium transition-colors">
            <Plus size={13} />
            New event
          </button>
        </div>

        <div className="border-t border-[#2d2d2d] my-1" />

        {/* Calendar accounts */}
        <div className="px-3 py-2 flex-1">
          {accounts.length > 0 && (
            <>
              <div className="text-[10px] text-[#505050] uppercase tracking-widest font-semibold mb-2 px-1">My calendars</div>
              {accounts.map((account) => (
                <div key={account.accountId} className="group flex items-center gap-2 w-full py-1 text-xs hover:bg-[#2d2d2d] rounded px-1">
                  <button onClick={() => toggleAccount(account.accountId)}
                    className={clsx('w-3 h-3 rounded-sm flex-shrink-0 transition-opacity', account.isVisible ? 'opacity-100' : 'opacity-30')}
                    style={{ backgroundColor: account.color }}
                  />
                  <span className="text-[#e8e8e8] truncate flex-1 text-left">{account.email}</span>
                  <button onClick={() => disconnectAccount(account.accountId)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-[#eb5757] text-[#787878] transition-opacity">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </>
          )}

          {eventsLoading && (
            <div className="flex items-center gap-2 py-2 px-1 text-xs text-[#505050]">
              <Loader2 size={11} className="animate-spin" />
              Loading events…
            </div>
          )}

          {connected && (
            <button onClick={handleAddAccount} disabled={connectingMore}
              className="flex items-center gap-2 w-full py-1.5 text-xs text-[#787878] hover:text-[#e8e8e8] mt-2 px-1 disabled:opacity-50">
              {connectingMore ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Add Google account
            </button>
          )}

          {error && (
            <div className="flex items-start gap-1.5 mt-2 px-1 text-[10px] text-[#eb5757]">
              <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
              <span className="leading-tight">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2d2d2d] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#2383e2] flex items-center justify-center text-white text-xs font-bold">
              {format(today, 'd')}
            </div>
            <button className="flex items-center gap-1.5 text-sm text-[#e8e8e8] hover:bg-[#2d2d2d] rounded px-2 py-1">
              Week <ChevronDown size={14} className="text-[#787878]" />
            </button>
            <button onClick={goToToday}
              className="px-3 py-1 text-sm text-[#e8e8e8] border border-[#404040] hover:bg-[#2d2d2d] rounded">
              Today
            </button>
            <button onClick={prevWeek} className="p-1 hover:bg-[#2d2d2d] rounded text-[#787878]">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextWeek} className="p-1 hover:bg-[#2d2d2d] rounded text-[#787878]">
              <ChevronRight size={16} />
            </button>
            <span className="text-sm font-medium text-[#e8e8e8]">{format(currentWeekStart, 'MMMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs text-[#787878] hover:bg-[#2d2d2d] rounded px-2 py-1">
              <Search size={13} /> Search
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded text-xs font-medium">
              <Plus size={13} /> Event
            </button>
            <button onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-1.5 hover:bg-[#2d2d2d] rounded text-[#787878]">
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* Calendar body */}
        {!connected ? (
          <ConnectBanner onConnect={connect} loading={false} />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Day headers */}
              <div className="flex border-b border-[#2d2d2d] flex-shrink-0">
                <div className="w-14 flex-shrink-0" />
                {weekDays.map((day, i) => {
                  const isT = isSameDay(day, today)
                  return (
                    <div key={i} className="flex-1 text-center py-2">
                      <div className={clsx('text-xs text-[#787878] uppercase', isT && 'text-[#e8e8e8]')}>
                        {format(day, 'EEE')}
                      </div>
                      <button onClick={() => { setCreateDate(day); setShowCreate(true) }}
                        className={clsx(
                          'text-base font-medium w-8 h-8 rounded-full mx-auto flex items-center justify-center mt-0.5 transition-colors',
                          isT ? 'bg-[#eb5757] text-white' : 'text-[#e8e8e8] hover:bg-[#2d2d2d]'
                        )}>
                        {format(day, 'd')}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* All-day row */}
              <div className="flex border-b border-[#2d2d2d] flex-shrink-0">
                <div className="w-14 flex-shrink-0 text-[10px] text-[#787878] flex items-center justify-end pr-2">All-day</div>
                {weekDays.map((day, i) => {
                  const allDayEvents = getEventsForDay(day).filter((e) => e.isAllDay)
                  return (
                    <div key={i} className="flex-1 border-l border-[#2d2d2d] min-h-[32px] py-0.5 px-0.5">
                      {allDayEvents.map((e) => (
                        <div key={e.id} onClick={() => setDetailEvent(e)}
                          className="text-[11px] px-1.5 py-0.5 rounded mb-0.5 text-white truncate cursor-pointer hover:brightness-110"
                          style={{ backgroundColor: e.color }}>
                          {e.title}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Time grid */}
              <div ref={scrollRef} className="flex-1 overflow-auto">
                <div className="flex relative" style={{ height: HOURS.length * SLOT_H }}>
                  <div className="w-14 flex-shrink-0 relative">
                    {HOURS.map((h) => (
                      <div key={h} className="absolute right-2 text-[10px] text-[#787878]" style={{ top: h * SLOT_H - 7 }}>
                        {formatHour(h)}
                      </div>
                    ))}
                  </div>
                  {weekDays.map((day, dayIdx) => {
                    const dayEvents = getEventsForDay(day).filter((e) => !e.isAllDay)
                    const isT = isSameDay(day, today)
                    return (
                      <div key={dayIdx}
                        className={clsx('flex-1 border-l border-[#2d2d2d] relative', isT && 'bg-[#ffffff02]')}>
                        {HOURS.map((h) => (
                          <div key={h}
                            className="absolute left-0 right-0 border-t border-[#2d2d2d] cursor-pointer hover:bg-[#ffffff04]"
                            style={{ top: h * SLOT_H, height: SLOT_H }}
                            onClick={() => { setCreateDate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h)); setShowCreate(true) }}
                          />
                        ))}
                        {isT && <CurrentTimeLine />}
                        {dayEvents.map((event) => (
                          <EventBlock key={event.id} event={event}
                            top={timeToTop(event.startTime)}
                            height={timeToHeight(event.startTime, event.endTime)}
                            onClick={() => setDetailEvent(event)}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Shortcuts panel */}
            {showShortcuts && (
              <div className="w-52 flex-shrink-0 border-l border-[#2d2d2d] px-4 py-4">
                <div className="text-sm font-medium text-[#e8e8e8] mb-4">Useful shortcuts</div>
                {[
                  { action: 'New event', key: 'N' },
                  { action: 'Go to today', key: 'T' },
                  { action: 'Previous week', key: '←' },
                  { action: 'Next week', key: '→' },
                  { action: 'Toggle shortcuts', key: '?' },
                ].map(({ action, key }) => (
                  <div key={action} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[#787878]">{action}</span>
                    <span className="text-xs text-[#505050] bg-[#2d2d2d] px-1.5 py-0.5 rounded font-mono">{key}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
