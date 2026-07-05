export type TaskStatus = 'Not started' | 'In progress' | 'Done'
export type TaskPriority = 'High' | 'Medium' | 'Low' | null
export type TaskType = 'Feature request' | 'Bug' | 'Polish' | 'Documentation' | null

export interface Task {
  id: string
  name: string
  status: TaskStatus
  assignee: string | null
  dueDate: string | null
  priority: TaskPriority
  taskType: TaskType
  description: string
}

export interface TaskView {
  id: string
  label: string
  icon: string
}

export interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  date: string
  color: string
  calendarId: string
  isAllDay?: boolean
}

export interface CalendarAccount {
  id: string        // same as accountId, kept for compat
  accountId: string // Composio connected-account ID
  name: string
  email: string
  color: string
  isVisible: boolean
}

export interface Reminder {
  id: string
  message: string
  remindAt: string
  isRecurring: boolean
  recurringType?: string
  isSent: boolean
  channel: 'whatsapp' | 'telegram' | 'app'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolResult?: string
}
