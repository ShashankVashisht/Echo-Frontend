const BASE = 'https://echo-585564066532.asia-south2.run.app/api'

function getToken() {
  return localStorage.getItem('echo_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw Object.assign(new Error(err.message || 'Request failed'), { status: res.status, data: err })
  }

  return res.json()
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (phone: string, password: string) =>
    request<{ data: { token: string; user: any } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  register: (name: string, email: string, password: string, phone: string) =>
    request<{ data: { token: string; user: any } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    }),

  sendOtp: (phone: string) =>
    request<{ data: any }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  loginWithOtp: (phone: string, otp: string) =>
    request<{ data: { token: string; user: any } }>('/auth/login-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),
}

// ── User ─────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => request<{ data: any }>('/users/profile'),
  updateProfile: (data: any) =>
    request<{ data: any }>('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
}

// ── Reminders ────────────────────────────────────────────────────────────────
export const reminderApi = {
  getAll: () => request<{ data: any[] }>('/reminders'),
  create: (data: any) =>
    request<{ data: any }>('/reminders', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ data: any }>(`/reminders/${id}`, { method: 'DELETE' }),
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (message: string, chatHistory: any[] = []) =>
    request<{ data: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ content: message, chatHistory }),
    }),
}

// ── Task Databases ─────────────────────────────────────────────────────────
export const dbApi = {
  getAll: () => request<{ data: any[] }>('/tasks/databases'),
  create: (data: any) =>
    request<{ data: any }>('/tasks/databases', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<{ data: any }>(`/tasks/databases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ data: any }>(`/tasks/databases/${id}`, { method: 'DELETE' }),
}

// ── Properties ────────────────────────────────────────────────────────────
export const propertyApi = {
  getAll: (dbId: string) => request<{ data: any[] }>(`/tasks/databases/${dbId}/properties`),
  create: (dbId: string, data: any) =>
    request<{ data: any }>(`/tasks/databases/${dbId}/properties`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<{ data: any }>(`/tasks/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ data: any }>(`/tasks/properties/${id}`, { method: 'DELETE' }),
}

// ── Rows ──────────────────────────────────────────────────────────────────
export const rowApi = {
  getAll: (dbId: string) => request<{ data: any[] }>(`/tasks/databases/${dbId}/rows`),
  create: (dbId: string, data?: any) =>
    request<{ data: any }>(`/tasks/databases/${dbId}/rows`, { method: 'POST', body: JSON.stringify(data || {}) }),
  update: (id: string, data: any) =>
    request<{ data: any }>(`/tasks/rows/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ data: any }>(`/tasks/rows/${id}`, { method: 'DELETE' }),
}

// ── Cells ──────────────────────────────────────────────────────────────────
export const cellApi = {
  getByRow: (rowId: string) => request<{ data: any[] }>(`/tasks/rows/${rowId}/cells`),
  create: (rowId: string, data: any) =>
    request<{ data: any }>(`/tasks/rows/${rowId}/cells`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<{ data: any }>(`/tasks/cells/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ── Views ──────────────────────────────────────────────────────────────────
export const viewApi = {
  getAll: (dbId: string) => request<{ data: any[] }>(`/tasks/databases/${dbId}/views`),
  create: (dbId: string, data: any) =>
    request<{ data: any }>(`/tasks/databases/${dbId}/views`, { method: 'POST', body: JSON.stringify(data) }),
}

// ── Calendar ────────────────────────────────────────────────────────────────
export const calendarApi = {
  getStatus: () =>
    request<{ data: { connected: boolean; accounts: any[] } }>('/calendar/status'),

  getAccounts: () =>
    request<{ data: any[] }>('/calendar/accounts'),

  connect: (callbackUrl?: string) =>
    request<{ data: { redirectUrl: string | null } }>('/calendar/connect', {
      method: 'POST',
      body: JSON.stringify({ callbackUrl }),
    }),

  disconnectAccount: (accountId: string) =>
    request<{ success: boolean }>(`/calendar/accounts/${accountId}`, { method: 'DELETE' }),

  updateAccountPreference: (accountId: string, data: { color?: string; isVisible?: boolean }) =>
    request<{ success: boolean }>(`/calendar/accounts/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getEvents: (startDate: string, endDate: string, accountId?: string) => {
    const params = new URLSearchParams({ startDate, endDate })
    if (accountId) params.set('accountId', accountId)
    return request<{ data: any[] }>(`/calendar/events?${params}`)
  },

  createEvent: (data: {
    title: string; startTime: string; endTime: string
    description?: string; location?: string; accountId?: string
  }) =>
    request<{ data: any }>('/calendar/events', { method: 'POST', body: JSON.stringify(data) }),

  deleteEvent: (eventId: string, accountId?: string) => {
    const params = accountId ? `?accountId=${accountId}` : ''
    return request<{ success: boolean }>(`/calendar/events/${eventId}${params}`, { method: 'DELETE' })
  },
}
