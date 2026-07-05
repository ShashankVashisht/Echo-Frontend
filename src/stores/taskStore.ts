import { create } from 'zustand'
import { Task, TaskStatus, TaskPriority, TaskType } from '../types'

const INITIAL_TASKS: Task[] = [
  { id: '1', name: 'Improve website copy', status: 'Done', assignee: 'Shashank', dueDate: '02/03/2025', priority: 'High', taskType: 'Polish', description: 'Change header text to be more compelling' },
  { id: '2', name: 'Update help center & FAQ', status: 'In progress', assignee: 'Shashank', dueDate: '02/20/2025', priority: 'Medium', taskType: 'Feature request', description: 'Update support documentation' },
  { id: '3', name: 'Publish release notes', status: 'Not started', assignee: null, dueDate: '02/28/2025', priority: 'Low', taskType: 'Feature request', description: 'Include product updates' },
  { id: '4', name: 'Fix login bug on mobile', status: 'In progress', assignee: 'Shashank', dueDate: '06/25/2026', priority: 'High', taskType: 'Bug', description: '' },
  { id: '5', name: 'Design new onboarding flow', status: 'Not started', assignee: null, dueDate: '06/30/2026', priority: 'Medium', taskType: 'Feature request', description: '' },
  { id: '6', name: '', status: 'Not started', assignee: null, dueDate: '06/17/2026', priority: null, taskType: null, description: '' },
]

interface TaskStore {
  tasks: Task[]
  activeView: string
  addTask: () => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  setActiveView: (view: string) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: INITIAL_TASKS,
  activeView: 'all',

  addTask: () => set((s) => ({
    tasks: [...s.tasks, {
      id: Date.now().toString(),
      name: '',
      status: 'Not started',
      assignee: null,
      dueDate: null,
      priority: null,
      taskType: null,
      description: '',
    }],
  })),

  updateTask: (id, updates) => set((s) => ({
    tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),

  deleteTask: (id) => set((s) => ({
    tasks: s.tasks.filter((t) => t.id !== id),
  })),

  setActiveView: (view) => set({ activeView: view }),
}))
