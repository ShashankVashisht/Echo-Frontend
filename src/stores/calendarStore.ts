import { create } from 'zustand'
import { format, addDays, startOfWeek } from 'date-fns'
import { CalendarEvent, CalendarAccount } from '../types'
import { calendarApi } from '../lib/api'

// Google Calendar colorId → hex
const GCal_COLORS: Record<string, string> = {
  '1': '#e74c3c', '2': '#e67e22', '3': '#f39c12', '4': '#f1c40f',
  '5': '#27ae60', '6': '#16a085', '7': '#3498db', '8': '#2c3e50',
  '9': '#9b59b6', '10': '#8e44ad', '11': '#7f8c8d',
}

function transformGoogleEvent(raw: any, accountId: string, accountColor: string): CalendarEvent | null {
  if (!raw?.id) return null
  const startDt = raw.start?.dateTime || raw.start?.date
  const endDt = raw.end?.dateTime || raw.end?.date
  if (!startDt) return null

  const isAllDay = !raw.start?.dateTime
  const startDate = new Date(startDt)
  const endDate = new Date(endDt || startDt)

  const pad = (n: number) => String(n).padStart(2, '0')
  const startTime = isAllDay ? '00:00' : `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`
  const endTime = isAllDay ? '23:59' : `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`

  return {
    id: raw.id,
    title: raw.summary || '(No title)',
    date: format(startDate, 'yyyy-MM-dd'),
    startTime,
    endTime,
    color: (raw.colorId ? GCal_COLORS[raw.colorId] : null) || accountColor,
    calendarId: accountId,
    isAllDay,
  }
}

function getWeekStart(d: Date) {
  return startOfWeek(d, { weekStartsOn: 0 })
}

interface CreateEventData {
  title: string
  startTime: string  // ISO string
  endTime: string    // ISO string
  description?: string
  location?: string
  accountId?: string
}

interface CalendarStore {
  // Connection state
  connected: boolean
  accounts: CalendarAccount[]
  statusLoading: boolean

  // Event state
  events: CalendarEvent[]
  eventsLoading: boolean
  error: string | null

  // Navigation
  currentWeekStart: Date
  view: 'week'

  // Actions
  init: () => Promise<void>
  loadEvents: () => Promise<void>
  connect: () => Promise<void>
  disconnectAccount: (accountId: string) => Promise<void>
  toggleAccount: (accountId: string) => void
  createEvent: (data: CreateEventData) => Promise<void>
  deleteEvent: (eventId: string, accountId: string) => Promise<void>
  nextWeek: () => void
  prevWeek: () => void
  goToToday: () => void
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  connected: false,
  accounts: [],
  statusLoading: true,
  events: [],
  eventsLoading: false,
  error: null,
  currentWeekStart: getWeekStart(new Date()),
  view: 'week',

  init: async () => {
    set({ statusLoading: true, error: null })
    try {
      const res = await calendarApi.getStatus()
      const raw = res.data
      const accounts: CalendarAccount[] = (raw.accounts || []).map((a: any) => ({
        id: a.accountId,
        accountId: a.accountId,
        name: a.email,
        email: a.email,
        color: a.color,
        isVisible: a.isVisible,
      }))
      set({ connected: raw.connected, accounts, statusLoading: false })
      if (raw.connected) get().loadEvents()
    } catch (err: any) {
      set({ statusLoading: false, error: err.message })
    }
  },

  loadEvents: async () => {
    const { currentWeekStart } = get()
    set({ eventsLoading: true })
    try {
      const startDate = format(currentWeekStart, 'yyyy-MM-dd')
      const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd')
      const res = await calendarApi.getEvents(startDate, endDate)
      const rawEvents: any[] = res.data || []

      // Build an accountColor map
      const accountColorMap: Record<string, string> = {}
      get().accounts.forEach((a) => { accountColorMap[a.accountId] = a.color })

      const events = rawEvents
        .map((raw) => transformGoogleEvent(raw, raw._accountId, raw._accountColor || accountColorMap[raw._accountId] || '#2383e2'))
        .filter((e): e is CalendarEvent => e !== null)

      set({ events, eventsLoading: false })
    } catch (err: any) {
      set({ eventsLoading: false, error: err.message })
    }
  },

  connect: async () => {
    try {
      const callbackUrl = `${window.location.origin}/calendar`
      const res = await calendarApi.connect(callbackUrl)
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl
      }
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  disconnectAccount: async (accountId: string) => {
    try {
      await calendarApi.disconnectAccount(accountId)
      set((s) => ({
        accounts: s.accounts.filter((a) => a.accountId !== accountId),
        events: s.events.filter((e) => e.calendarId !== accountId),
      }))
      const remaining = get().accounts
      if (remaining.length === 0) set({ connected: false })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  toggleAccount: (accountId: string) => {
    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.accountId === accountId ? { ...a, isVisible: !a.isVisible } : a
      ),
    }))
    // Persist visibility preference
    calendarApi.updateAccountPreference(accountId, {
      isVisible: !get().accounts.find((a) => a.accountId === accountId)?.isVisible,
    }).catch(console.error)
  },

  createEvent: async (data: CreateEventData) => {
    try {
      const res = await calendarApi.createEvent(data)
      // Reload events to include the newly created one
      get().loadEvents()
      return res.data
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  deleteEvent: async (eventId: string, accountId: string) => {
    try {
      await calendarApi.deleteEvent(eventId, accountId)
      set((s) => ({ events: s.events.filter((e) => e.id !== eventId) }))
    } catch (err: any) {
      set({ error: err.message })
      throw err
    }
  },

  nextWeek: () => {
    const next = addDays(get().currentWeekStart, 7)
    set({ currentWeekStart: next })
    get().loadEvents()
  },

  prevWeek: () => {
    const prev = addDays(get().currentWeekStart, -7)
    set({ currentWeekStart: prev })
    get().loadEvents()
  },

  goToToday: () => {
    const today = getWeekStart(new Date())
    set({ currentWeekStart: today })
    get().loadEvents()
  },
}))
