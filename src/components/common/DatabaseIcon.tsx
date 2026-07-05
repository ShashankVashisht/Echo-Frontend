import {
  BarChart3, Brain, Briefcase, CalendarDays, CheckSquare2,
  ClipboardList, Code2, Database, Dices, FileText, Flame, Folder,
  FolderKanban, Gem, Hammer, KeyRound, Lightbulb, LucideIcon, Package,
  Palette, Paintbrush, Pin, Puzzle, Rocket, Ruler, Settings, Sparkles,
  Star, StickyNote, Target, Trophy, TrendingUp, Wand2, Wrench, Zap
} from 'lucide-react'
import clsx from 'clsx'

export const DEFAULT_DATABASE_ICON = 'check-square'

export interface DatabaseIconOption {
  value: string
  label: string
  icon: LucideIcon
  color: string
}

export const DATABASE_ICONS: DatabaseIconOption[] = [
  { value: 'check-square', label: 'Tasks', icon: CheckSquare2, color: '#4caf82' },
  { value: 'clipboard', label: 'List', icon: ClipboardList, color: '#8ab4f8' },
  { value: 'file-text', label: 'Notes', icon: FileText, color: '#e8e8e8' },
  { value: 'sticky-note', label: 'Memo', icon: StickyNote, color: '#e9a94b' },
  { value: 'pin', label: 'Pinned', icon: Pin, color: '#eb5757' },
  { value: 'target', label: 'Goal', icon: Target, color: '#ff6b6b' },
  { value: 'rocket', label: 'Launch', icon: Rocket, color: '#8ab4f8' },
  { value: 'briefcase', label: 'Work', icon: Briefcase, color: '#c6a15b' },
  { value: 'bar-chart', label: 'Metrics', icon: BarChart3, color: '#4b9cd3' },
  { value: 'trending-up', label: 'Growth', icon: TrendingUp, color: '#4caf82' },
  { value: 'calendar', label: 'Schedule', icon: CalendarDays, color: '#8ab4f8' },
  { value: 'zap', label: 'Fast', icon: Zap, color: '#f2c94c' },
  { value: 'flame', label: 'Hot', icon: Flame, color: '#ff7a59' },
  { value: 'lightbulb', label: 'Ideas', icon: Lightbulb, color: '#f2c94c' },
  { value: 'trophy', label: 'Wins', icon: Trophy, color: '#e9a94b' },
  { value: 'palette', label: 'Design', icon: Palette, color: '#bb86fc' },
  { value: 'wrench', label: 'Tools', icon: Wrench, color: '#a0a0a0' },
  { value: 'package', label: 'Shipping', icon: Package, color: '#c6a15b' },
  { value: 'sparkles', label: 'Polish', icon: Sparkles, color: '#bb86fc' },
  { value: 'gem', label: 'Premium', icon: Gem, color: '#69d2e7' },
  { value: 'folder-kanban', label: 'Project', icon: FolderKanban, color: '#4b9cd3' },
  { value: 'folder', label: 'Folder', icon: Folder, color: '#e9a94b' },
  { value: 'star', label: 'Favorite', icon: Star, color: '#f2c94c' },
  { value: 'hammer', label: 'Build', icon: Hammer, color: '#a0a0a0' },
  { value: 'puzzle', label: 'Puzzle', icon: Puzzle, color: '#7ed6df' },
  { value: 'paintbrush', label: 'Creative', icon: Paintbrush, color: '#ff8fab' },
  { value: 'key', label: 'Access', icon: KeyRound, color: '#f2c94c' },
  { value: 'settings', label: 'System', icon: Settings, color: '#a0a0a0' },
  { value: 'ruler', label: 'Plan', icon: Ruler, color: '#8ab4f8' },
  { value: 'dice', label: 'Experiment', icon: Dices, color: '#bb86fc' },
  { value: 'brain', label: 'Thinking', icon: Brain, color: '#ff8fab' },
  { value: 'database', label: 'Database', icon: Database, color: '#4caf82' },
  { value: 'code', label: 'Code', icon: Code2, color: '#69d2e7' },
  { value: 'magic', label: 'Magic', icon: Wand2, color: '#bb86fc' },
]

export function getDatabaseIcon(value?: string) {
  return DATABASE_ICONS.find((item) => item.value === value) || DATABASE_ICONS[0]
}

export function DatabaseIconGlyph({ value, size = 16, className }: {
  value?: string
  size?: number
  className?: string
}) {
  const option = getDatabaseIcon(value)
  const Icon = option.icon

  return (
    <Icon
      size={size}
      strokeWidth={2}
      color={option.color}
      className={clsx('flex-shrink-0', className)}
    />
  )
}
