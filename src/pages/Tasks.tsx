import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Star, Circle, User, Filter, ArrowUpDown, Search, ChevronDown, Plus, X,
  ExternalLink, Loader2, Database, Trash2, ArrowUp, ArrowDown, ChevronRight,
  MoreHorizontal, GripVertical, Pencil, Check, AlertTriangle, Type, Hash,
  Calendar, ToggleLeft
} from 'lucide-react'
import {
  DndContext, DragEndEvent, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter, DragOverlay, DragStartEvent
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { generateKeyBetween } from 'fractional-indexing'
import clsx from 'clsx'
import { dbApi, propertyApi, rowApi, cellApi } from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Property {
  id: string; name: string; order: string
  type: 'TEXT' | 'STATUS' | 'SELECT' | 'NUMBER' | 'DATE' | 'MULTI_SELECT' | 'RELATION' | 'CHECKBOX' | 'URL' | 'EMAIL' | 'PHONE'
  config?: Record<string, any>; width?: number
}
interface Cell  { id: string; propertyId: string; value: Record<string, any> }
interface Row   { id: string; order: string; cells: Cell[] }
interface Db    { id: string; title: string; iconValue?: string; description?: string; order: string }

type ViewMode = 'all' | 'status' | 'mine'
type Panel    = 'search' | 'filter' | 'sort' | null

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['Not started', 'In progress', 'Done']

const STATUS_STYLE: Record<string, { bg: string; dot: string; text: string }> = {
  'Done':        { bg: 'bg-[#1b4332]', dot: 'bg-[#4caf82]', text: 'text-[#4caf82]' },
  'In progress': { bg: 'bg-[#1a3a5c]', dot: 'bg-[#4b9cd3]', text: 'text-[#4b9cd3]' },
  'Not started': { bg: 'bg-[#2d2d2d]', dot: 'bg-[#787878]', text: 'text-[#787878]' },
}

const SELECT_COLORS: Record<string, string> = {
  High: 'bg-[#4b1c1c] text-[#eb5757]', Medium: 'bg-[#3d2a0a] text-[#e9a94b]',
  Low: 'bg-[#1a3327] text-[#4caf82]',  Bug: 'bg-[#4b1c1c] text-[#eb5757]',
  'Feature request': 'bg-[#1a3327] text-[#4caf82]', Polish: 'bg-[#2a1f40] text-[#9b59b6]',
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  TEXT: <Type size={11} />, STATUS: <ToggleLeft size={11} />, SELECT: <ChevronDown size={11} />,
  MULTI_SELECT: <ChevronDown size={11} />, NUMBER: <Hash size={11} />,
  DATE: <Calendar size={11} />, RELATION: <ExternalLink size={11} />,
}

const DEFAULT_COL_WIDTH = 180
const NAME_COL_WIDTH    = 280

const ICONS = ['✅','📋','📝','🗒️','📌','🎯','🚀','💼','📊','📈','🗓️','⚡','🔥','💡','🏆','🎨','🔧','📦','🌟','💎','🗂️','📁','⭐','🏗️','🧩','🌈','🎪','🔑','🛠️','📐','🎲','🧠']

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCellRawValue(cell?: Cell): any {
  if (!cell) return ''
  const value = cell.value
  if (value && typeof value === 'object' && 'value' in value) return value.value
  if (value && typeof value === 'object') {
    return value.value ?? value.text ?? value.option ?? value.status ?? value.date ?? value.number ?? value.checked ?? value.url ?? value.email ?? value.phone ?? value.name ?? value.start ?? value.options ?? value.rowIds ?? ''
  }
  return value
}

function cellVal(cell?: Cell): string {
  const raw = getCellRawValue(cell)
  if (Array.isArray(raw)) return raw.join(', ')
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'boolean') return raw ? 'true' : 'false'
  return String(raw)
}

function normalizeDateValue(val: unknown): string {
  if (typeof val !== 'string') return ''
  if (!val) return ''
  if (val.includes('T')) return val
  const match = val.match(/^\d{4}-\d{2}-\d{2}$/)
  if (match) return new Date(`${val}T00:00:00.000Z`).toISOString()
  return val
}

function getDateInputValue(val: unknown): string {
  if (typeof val !== 'string') return ''
  if (!val) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const parsed = new Date(val)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return ''
}

function buildValue(type: Property['type'], val: unknown): Record<string, any> {
  switch (type) {
    case 'NUMBER': return { value: Number(val) || 0 }
    case 'DATE': return { value: normalizeDateValue(val) }
    case 'MULTI_SELECT': {
      if (Array.isArray(val)) return { value: val }
      if (typeof val === 'string') return { value: val.split(',').map((item) => item.trim()).filter(Boolean) }
      return { value: [] }
    }
    case 'CHECKBOX': return { value: val === true || val === 'true' || val === '1' }
    default: return { value: val }
  }
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index])
  }
  return a === b
}

function getCellByProp(cells: Cell[], propId: string) {
  return cells.find((c) => c.propertyId === propId)
}

function getOptionNames(property?: Property): string[] {
  const options = property?.config?.options
  if (!Array.isArray(options)) return []
  return options
    .map((option: any) => {
      if (typeof option === 'string') return option
      if (option && typeof option === 'object' && typeof option.name === 'string') return option.name
      return ''
    })
    .filter(Boolean)
}

// ── Select / Status Dropdown ──────────────────────────────────────────────────
function CellDropdown({ options, onSelect, children }: {
  options: string[]; onSelect: (v: string) => void; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{children}</div>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-[#252525] border border-[#3a3a3a] rounded-lg shadow-2xl py-1 min-w-[150px]">
          {options.map((o) => (
            <button key={o} onClick={() => { onSelect(o); setOpen(false) }}
              className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-[#2d2d2d] text-[#e8e8e8]">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Cell Editor ───────────────────────────────────────────────────────────────
function CellEditor({ property, cell, rowId, onSaved, compact = true }: {
  property: Property; cell: Cell | undefined; rowId: string
  onSaved: (c: Cell) => void; compact?: boolean
}) {
  const [local, setLocal] = useState(() => property.type === 'DATE' ? getDateInputValue(getCellRawValue(cell)) : cellVal(cell))
  useEffect(() => {
    setLocal(property.type === 'DATE' ? getDateInputValue(getCellRawValue(cell)) : cellVal(cell))
  }, [cell?.id, property.type]) // eslint-disable-line

  const save = async (val: unknown) => {
    const savedVal = cellVal(cell)
    const payload = buildValue(property.type, val)
    if (cell?.id && valuesEqual(getCellRawValue(cell), payload.value)) return
    if (payload.value === '' && !cell?.id) return
    try {
      const res = cell?.id
        ? await cellApi.update(cell.id, payload)
        : await cellApi.create(rowId, { propertyId: property.id, ...payload })
      onSaved(res.data)
      setLocal(cellVal(res.data))
    } catch (err: any) {
      console.error('Cell save failed:', err?.message ?? err)
      setLocal(savedVal)
    }
  }

  if (property.type === 'STATUS') {
    const s = STATUS_STYLE[local] ?? STATUS_STYLE['Not started']
    return (
      <CellDropdown options={STATUS_OPTIONS} onSelect={(v) => { setLocal(v); save(v) }}>
        <button className={clsx('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer', s.bg, s.text)}>
          <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
          {local || 'Not started'}
        </button>
      </CellDropdown>
    )
  }

  if (property.type === 'SELECT') {
    const rawOptions = Array.isArray(property.config?.options) ? property.config.options : ['High', 'Medium', 'Low']
    const normalizedOptions = rawOptions[0] && typeof rawOptions[0] === 'string'
      ? rawOptions.map((name: any) => ({ id: name, name, color: 'default' }))
      : rawOptions.map((option: any) => ({
          id: option?.id ?? option?.name ?? '',
          name: option?.name ?? option?.id ?? '',
          color: option?.color ?? 'default',
        }))
    const opts = normalizedOptions.map((option: any) => option.name || option.id || '').filter(Boolean)
    const displayOptions = opts.length ? opts : ['High', 'Medium', 'Low']
    const sty = local ? (SELECT_COLORS[local] ?? 'bg-[#2d2d2d] text-[#a0a0a0]') : ''
    return (
      <CellDropdown options={displayOptions} onSelect={(v) => { setLocal(v); save(v) }}>
        <button className={clsx('px-2 py-0.5 rounded text-xs font-medium cursor-pointer', sty || 'text-[#505050]')}>
          {local || '—'}
        </button>
      </CellDropdown>
    )
  }

  if (property.type === 'DATE') {
    return (
      <input type="date"
        className="cell-input text-sm text-[#e8e8e8] w-full bg-transparent"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => save(e.target.value)}
      />
    )
  }

  if (property.type === 'CHECKBOX') {
    return (
      <input
        type="checkbox"
        checked={String(getCellRawValue(cell)).toLowerCase() === 'true' || Boolean(getCellRawValue(cell))}
        onChange={(e) => save(e.target.checked)}
        className="h-4 w-4 accent-[#2383e2]"
      />
    )
  }

  return (
    <input
      className={clsx('cell-input text-[#e8e8e8] placeholder-[#404040] w-full', compact ? 'text-sm' : 'text-base')}
      value={local}
      placeholder={property.type === 'NUMBER' ? '0' : ''}
      type={property.type === 'NUMBER' ? 'number' : 'text'}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => save(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && save(local)}
    />
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, confirmLabel = 'Delete', onConfirm, onClose, danger = true }: {
  title: string; body: string; confirmLabel?: string
  onConfirm: () => void; onClose: () => void; danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#202020] border border-[#333] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-[#e9a94b] flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-[#e8e8e8]">{title}</h2>
            <p className="text-sm text-[#787878] mt-1">{body}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-[#404040] hover:bg-[#2d2d2d] text-[#e8e8e8] rounded-lg text-sm">Cancel</button>
          <button onClick={onConfirm}
            className={clsx('flex-1 py-2 rounded-lg text-sm font-medium text-white',
              danger ? 'bg-[#eb5757] hover:bg-[#d94f4f]' : 'bg-[#2383e2] hover:bg-[#1a72d4]')}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add / Edit Property Modal ─────────────────────────────────────────────────
function PropertyModal({ dbId, existing, onSaved, onClose }: {
  dbId: string; existing?: Property
  onSaved: (p: Property) => void; onClose: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [type, setType] = useState<Property['type']>(existing?.type ?? 'TEXT')
  const [opts, setOpts] = useState(() => {
    const names = getOptionNames(existing)
    return names.length ? names.join(', ') : 'High, Medium, Low'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError('')
    try {
      const config = (type === 'SELECT' || type === 'MULTI_SELECT')
        ? {
            options: opts.split(',').map((s: string) => s.trim()).filter(Boolean).map((name) => ({
              id: name.toLowerCase().replace(/\s+/g, '_'),
              name,
              color: 'default',
            }))
          }
        : undefined
      const res = existing
        ? await propertyApi.update(existing.id, { name: name.trim(), type, config })
        : await propertyApi.create(dbId, { name: name.trim(), type, config })
      onSaved(res.data)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#202020] border border-[#333] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#e8e8e8]">{existing ? 'Edit Property' : 'Add Property'}</h2>
          <button onClick={onClose} className="text-[#787878] hover:text-[#e8e8e8]"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#787878] mb-1.5">Name</label>
            <input autoFocus className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2]"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-[#787878] mb-1.5">Type</label>
            <select className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none"
              value={type} onChange={(e) => setType(e.target.value as Property['type'])} disabled={!!existing}>
              {['TEXT', 'STATUS', 'SELECT', 'NUMBER', 'DATE', 'MULTI_SELECT'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {(type === 'SELECT' || type === 'MULTI_SELECT') && (
            <div>
              <label className="block text-xs text-[#787878] mb-1.5">Options (comma-separated)</label>
              <input className="w-full px-3 py-2 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2]"
                value={opts} onChange={(e) => setOpts(e.target.value)} />
            </div>
          )}
          {error && <p className="text-xs text-[#eb5757]">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-[#404040] hover:bg-[#2d2d2d] text-[#e8e8e8] rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={12} className="animate-spin" />}
              {existing ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Icon Picker Popover ───────────────────────────────────────────────────────
function IconPickerPopover({ x, y, selected, onSelect, onClose }: {
  x: number; y: number; selected: string
  onSelect: (icon: string) => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return createPortal(
    <div ref={ref}
      style={{ position: 'fixed', top: y, left: x, zIndex: 9999 }}
      className="bg-[#252525] border border-[#3a3a3a] rounded-xl shadow-2xl p-2 w-[228px]">
      <div className="grid grid-cols-8 gap-0.5">
        {ICONS.map((icon) => (
          <button key={icon} onMouseDown={(e) => { e.preventDefault(); onSelect(icon); onClose() }}
            className={clsx(
              'w-7 h-7 rounded-lg text-lg flex items-center justify-center hover:bg-[#3a3a3a] transition-colors',
              selected === icon && 'bg-[#2d2d2d] ring-1 ring-[#2383e2]'
            )}>
            {icon}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )
}

// ── Create DB Modal ───────────────────────────────────────────────────────────
function CreateDbModal({ onCreated, onClose }: { onCreated: (db: Db) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [icon, setIcon] = useState('✅')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconPickerPos, setIconPickerPos] = useState({ x: 0, y: 0 })
  const iconBtnRef = useRef<HTMLButtonElement>(null)

  const openIconPicker = () => {
    if (!iconBtnRef.current) return
    const rect = iconBtnRef.current.getBoundingClientRect()
    setIconPickerPos({ x: rect.left, y: rect.bottom + 6 })
    setIconPickerOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await dbApi.create({ title: title.trim(), description: desc, iconType: 'EMOJI', iconValue: icon })
      const db = res.data
      await Promise.all([
        propertyApi.create(db.id, { name: 'Name', type: 'TEXT' }),
        propertyApi.create(db.id, { name: 'Status', type: 'STATUS' }),
        propertyApi.create(db.id, {
          name: 'Priority',
          type: 'SELECT',
          config: {
            options: [
              { id: 'high', name: 'High', color: 'default' },
              { id: 'medium', name: 'Medium', color: 'default' },
              { id: 'low', name: 'Low', color: 'default' },
            ],
          },
        }),
        propertyApi.create(db.id, { name: 'Due Date', type: 'DATE' }),
      ])
      onCreated(db)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#202020] border border-[#333] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#e8e8e8]">New Database</h2>
          <button onClick={onClose} className="text-[#787878] hover:text-[#e8e8e8]"><X size={18} /></button>
        </div>

        {/* Icon selector */}
        <div className="flex justify-center mb-5">
          <button ref={iconBtnRef} type="button" onClick={openIconPicker}
            title="Choose icon"
            className="w-16 h-16 rounded-2xl bg-[#2d2d2d] hover:bg-[#3a3a3a] border border-[#404040] flex items-center justify-center text-4xl transition-colors">
            {icon}
          </button>
        </div>
        {iconPickerOpen && (
          <IconPickerPopover
            x={iconPickerPos.x} y={iconPickerPos.y}
            selected={icon}
            onSelect={setIcon}
            onClose={() => setIconPickerOpen(false)}
          />
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#787878] mb-1.5">Title</label>
            <input autoFocus className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2]"
              placeholder="e.g. Tasks Tracker" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-[#787878] mb-1.5">Description (optional)</label>
            <input className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2]"
              placeholder="Track all your tasks" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {error && <p className="text-xs text-[#eb5757]">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-[#404040] hover:bg-[#2d2d2d] text-[#e8e8e8] rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Row Detail Panel ──────────────────────────────────────────────────────────
function RowPanel({ row, properties, onCellSaved, onClose, onDelete }: {
  row: Row; properties: Property[]; onCellSaved: (c: Cell) => void
  onClose: () => void; onDelete: () => void
}) {
  const nameProp = properties.find((p) => p.type === 'TEXT') ?? properties[0]
  const title = cellVal(getCellByProp(row.cells, nameProp?.id ?? '')) || 'Untitled'
  return (
    <div className="w-[360px] flex-shrink-0 border-l border-[#2d2d2d] bg-[#1e1e1e] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#2d2d2d]">
        <span className="text-sm font-medium text-[#e8e8e8] truncate max-w-[240px]">{title}</span>
        <div className="flex items-center gap-1">
          <button onClick={onDelete} className="p-1.5 hover:bg-[#2d2d2d] rounded text-[#787878] hover:text-[#eb5757]"><Trash2 size={14} /></button>
          <button onClick={onClose} className="p-1.5 hover:bg-[#2d2d2d] rounded text-[#787878] hover:text-[#e8e8e8]"><X size={15} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {properties.map((p) => (
          <div key={p.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[#787878] w-4 flex items-center">{TYPE_ICON[p.type]}</span>
              <span className="text-xs text-[#787878] font-medium">{p.name}</span>
            </div>
            <div className="pl-6">
              <CellEditor property={p} cell={getCellByProp(row.cells, p.id)}
                rowId={row.id} onSaved={onCellSaved} compact={false} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Column Header Context Menu ─────────────────────────────────────────────────
function ColMenu({ property, isFirst, isLast, onEdit, onDelete, onMoveLeft, onMoveRight, onClose }: {
  property: Property; isFirst: boolean; isLast: boolean
  onEdit: () => void; onDelete: () => void
  onMoveLeft: () => void; onMoveRight: () => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} className="absolute top-full left-0 z-50 mt-1 bg-[#252525] border border-[#3a3a3a] rounded-lg shadow-2xl py-1 w-44">
      <button onClick={() => { onEdit(); onClose() }}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-[#e8e8e8] hover:bg-[#2d2d2d]">
        <Pencil size={13} className="text-[#787878]" /> Rename
      </button>
      {!isFirst && (
        <button onClick={() => { onMoveLeft(); onClose() }}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-[#e8e8e8] hover:bg-[#2d2d2d]">
          <ArrowDown size={13} className="text-[#787878] -rotate-90" /> Move left
        </button>
      )}
      {!isLast && (
        <button onClick={() => { onMoveRight(); onClose() }}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-[#e8e8e8] hover:bg-[#2d2d2d]">
          <ArrowDown size={13} className="text-[#787878] rotate-90" /> Move right
        </button>
      )}
      <div className="my-1 border-t border-[#333]" />
      <button onClick={() => { onDelete(); onClose() }}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-[#eb5757] hover:bg-[#2d2d2d]">
        <Trash2 size={13} /> Delete
      </button>
    </div>
  )
}

// ── Column Header ─────────────────────────────────────────────────────────────
function ColHeader({ property, width, isFirst, isLast, onEdit, onDelete, onMoveLeft, onMoveRight, onResize }: {
  property: Property; width: number; isFirst: boolean; isLast: boolean
  onEdit: () => void; onDelete: () => void
  onMoveLeft: () => void; onMoveRight: () => void
  onResize: (w: number) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameVal, setNameVal] = useState(property.name)
  const resizeStartX = useRef(0)
  const resizeStartW = useRef(0)

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeStartX.current = e.clientX
    resizeStartW.current = width
    const onMove = (ev: MouseEvent) => {
      onResize(Math.max(80, resizeStartW.current + ev.clientX - resizeStartX.current))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const commitRename = () => {
    if (nameVal.trim() && nameVal !== property.name) onEdit()
    setRenaming(false)
  }

  return (
    <th
      className="relative border-r border-[#2d2d2d] bg-[#191919] select-none"
      style={{ width, minWidth: width }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      <div className="flex items-center px-3 py-2 group h-9">
        <span className="text-[#787878] mr-1.5 flex items-center opacity-70">{TYPE_ICON[property.type]}</span>
        {renaming ? (
          <input autoFocus className="flex-1 bg-transparent text-xs text-[#e8e8e8] outline-none border-b border-[#2383e2]"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setNameVal(property.name); setRenaming(false) } }}
          />
        ) : (
          <span className="flex-1 text-xs font-medium text-[#787878] truncate">{property.name}</span>
        )}
        {hovered && !renaming && (
          <button className="ml-1 p-0.5 rounded hover:bg-[#2d2d2d] text-[#787878] hover:text-[#e8e8e8]"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(true) }}>
            <MoreHorizontal size={13} />
          </button>
        )}
      </div>

      {menuOpen && (
        <ColMenu
          property={property} isFirst={isFirst} isLast={isLast}
          onEdit={() => setRenaming(true)}
          onDelete={onDelete}
          onMoveLeft={onMoveLeft}
          onMoveRight={onMoveRight}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#2383e2] opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={startResize}
      />
    </th>
  )
}

// ── Sortable Row ──────────────────────────────────────────────────────────────
function SortableRow({ row, nameProp, otherProps, colWidths, onCellSaved, onOpen, onDelete, openRowId }: {
  row: Row; nameProp: Property | undefined; otherProps: Property[]
  colWidths: Record<string, number>
  onCellSaved: (rowId: string, c: Cell) => void
  onOpen: () => void; onDelete: () => void; openRowId: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const h = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const isOpen = openRowId === row.id

  return (
    <tr ref={setNodeRef} style={style}
      className={clsx('border-b border-[#2d2d2d] group', isOpen && 'bg-[#ffffff08]')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false) }}
    >
      {/* Drag handle */}
      <td className="w-8 border-r border-[#2d2d2d]">
        <div className={clsx('flex items-center justify-center h-9 text-[#505050] transition-opacity', hovered ? 'opacity-100' : 'opacity-0')}
          {...attributes} {...listeners}>
          <GripVertical size={14} className="cursor-grab active:cursor-grabbing" />
        </div>
      </td>

      {/* Name cell */}
      {nameProp && (
        <td className="border-r border-[#2d2d2d]" style={{ width: colWidths[nameProp.id] ?? NAME_COL_WIDTH }}>
          <div className="flex items-center gap-2 px-3 h-9">
            <CellEditor property={nameProp} cell={getCellByProp(row.cells, nameProp.id)}
              rowId={row.id} onSaved={(c) => onCellSaved(row.id, c)} />
            {hovered && (
              <button onClick={onOpen}
                className="flex-shrink-0 flex items-center gap-1 text-[10px] text-[#787878] hover:text-[#e8e8e8] border border-[#404040] hover:border-[#555] rounded px-1.5 py-0.5 transition-colors">
                <ExternalLink size={10} /> OPEN
              </button>
            )}
          </div>
        </td>
      )}

      {/* Other cells */}
      {otherProps.map((p) => (
        <td key={p.id} className="border-r border-[#2d2d2d]" style={{ width: colWidths[p.id] ?? DEFAULT_COL_WIDTH }}>
          <div className="px-3 h-9 flex items-center">
            <CellEditor property={p} cell={getCellByProp(row.cells, p.id)}
              rowId={row.id} onSaved={(c) => onCellSaved(row.id, c)} />
          </div>
        </td>
      ))}

      {/* Row actions (…) */}
      <td className="w-10 relative">
        {hovered && (
          <div className="flex items-center justify-center h-9">
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(true) }}
              className="p-1 rounded hover:bg-[#2d2d2d] text-[#787878] hover:text-[#e8e8e8]">
              <MoreHorizontal size={14} />
            </button>
          </div>
        )}
        {menuOpen && (
          <div ref={menuRef} className="absolute right-1 top-8 z-50 bg-[#252525] border border-[#3a3a3a] rounded-lg shadow-2xl py-1 w-36">
            <button onClick={() => { onOpen(); setMenuOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#e8e8e8] hover:bg-[#2d2d2d]">
              <ExternalLink size={13} className="text-[#787878]" /> Open
            </button>
            <div className="my-1 border-t border-[#333]" />
            <button onClick={() => { onDelete(); setMenuOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#eb5757] hover:bg-[#2d2d2d]">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Status Group ──────────────────────────────────────────────────────────────
function StatusGroup({ status, count, children }: { status: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  const s = STATUS_STYLE[status] ?? STATUS_STYLE['Not started']
  return (
    <>
      <tr className="border-b border-[#2d2d2d] bg-[#1e1e1e]">
        <td colSpan={99} className="px-4 py-1.5">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-2">
            <ChevronRight size={13} className={clsx('text-[#787878] transition-transform', open && 'rotate-90')} />
            <span className={clsx('flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', s.bg, s.text)}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
              {status}
            </span>
            <span className="text-xs text-[#505050]">{count}</span>
          </button>
        </td>
      </tr>
      {open && children}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Tasks() {
  const [databases, setDatabases]   = useState<Db[]>([])
  const [activeDb, setActiveDb]     = useState<Db | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [rows, setRows]             = useState<Row[]>([])
  const [colWidths, setColWidths]   = useState<Record<string, number>>({})
  const [loading, setLoading]       = useState(true)

  // Modals
  const [showCreate, setShowCreate]     = useState(false)
  const [showAddProp, setShowAddProp]   = useState(false)
  const [editProp, setEditProp]         = useState<Property | null>(null)
  const [deletingDb, setDeletingDb]     = useState(false)
  const [deletingPropId, setDeletingPropId] = useState<string | null>(null)

  // UI state
  const [dbPickerOpen, setDbPickerOpen] = useState(false)
  const [openRow, setOpenRow]           = useState<Row | null>(null)
  const [addingRow, setAddingRow]       = useState(false)
  const [activeView, setActiveView]     = useState<ViewMode>('all')
  const [activePanel, setActivePanel]   = useState<Panel>(null)
  const [dragRowId, setDragRowId]       = useState<string | null>(null)

  // Filter/Search/Sort
  const [searchQuery, setSearchQuery]   = useState('')
  const [filterPropId, setFilterPropId] = useState('')
  const [filterValue, setFilterValue]   = useState('')
  const [sortPropId, setSortPropId]     = useState('')
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('asc')

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load databases
  useEffect(() => {
    dbApi.getAll().then((res) => {
      const dbs: Db[] = res.data || []
      setDatabases(dbs)
      if (dbs.length > 0) setActiveDb(dbs[0])
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Load properties + rows on DB change
  useEffect(() => {
    if (!activeDb) return
    setLoading(true); setOpenRow(null)
    Promise.all([propertyApi.getAll(activeDb.id), rowApi.getAll(activeDb.id)])
      .then(([pRes, rRes]) => {
        const props: Property[] = pRes.data || []
        const savedRows: Row[]  = rRes.data || []
        setProperties(props)
        setRows(savedRows)
        setColWidths((prev) => {
          const next = { ...prev }
          props.forEach((p) => { if (!next[p.id]) next[p.id] = p.width ?? (p.type === 'TEXT' ? NAME_COL_WIDTH : DEFAULT_COL_WIDTH) })
          return next
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeDb])

  // Derived property order (server order is the source of truth)
  const nameProp   = properties.find((p) => p.type === 'TEXT') ?? properties[0]
  const otherProps = properties.filter((p) => p.id !== nameProp?.id)
  const statusProp = properties.find((p) => p.type === 'STATUS')

  // ── Cell saved ──────────────────────────────────────────────────────────────
  const handleCellSaved = useCallback((rowId: string, saved: Cell) => {
    const merge = (r: Row): Row => {
      if (r.id !== rowId) return r
      const exists = r.cells.some((c) => c.propertyId === saved.propertyId)
      return { ...r, cells: exists ? r.cells.map((c) => c.propertyId === saved.propertyId ? saved : c) : [...r.cells, saved] }
    }
    setRows((prev) => prev.map(merge))
    setOpenRow((prev) => prev ? merge(prev) : prev)
  }, [])

  // ── Row add ─────────────────────────────────────────────────────────────────
  const handleAddRow = async () => {
    if (!activeDb || addingRow) return
    setAddingRow(true)
    try {
      const res = await rowApi.create(activeDb.id)
      setRows((prev) => [...prev, { ...res.data, cells: res.data.cells ?? [] }])
    } catch (err) { console.error(err) }
    finally { setAddingRow(false) }
  }

  // ── Row delete ──────────────────────────────────────────────────────────────
  const handleRowDelete = async (rowId: string) => {
    try {
      await rowApi.delete(rowId)
      setRows((prev) => prev.filter((r) => r.id !== rowId))
      if (openRow?.id === rowId) setOpenRow(null)
    } catch (err) { console.error(err) }
  }

  // ── Row DnD ─────────────────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => setDragRowId(e.active.id as string)

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragRowId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setRows((prev) => {
      const oldIdx = prev.findIndex((r) => r.id === active.id)
      const newIdx = prev.findIndex((r) => r.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return prev
      const next = arrayMove(prev, oldIdx, newIdx)
      const prevOrder = newIdx > 0 ? next[newIdx - 1].order : null
      const nextOrder = newIdx < next.length - 1 ? next[newIdx + 1].order : null
      const newOrder = generateKeyBetween(prevOrder, nextOrder)
      const final = next.map((r) => r.id === active.id ? { ...r, order: newOrder } : r)
      rowApi.update(active.id as string, { order: newOrder }).catch(console.error)
      return final
    })
  }, [])

  // ── Property operations ─────────────────────────────────────────────────────
  const handlePropSaved = (p: Property) => {
    setProperties((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id)
      return idx >= 0 ? prev.map((x) => x.id === p.id ? p : x) : [...prev, p]
    })
    setColWidths((prev) => ({ ...prev, [p.id]: p.width ?? DEFAULT_COL_WIDTH }))
    setShowAddProp(false); setEditProp(null)
  }

  const handlePropDelete = async () => {
    if (!deletingPropId) return
    try {
      await propertyApi.delete(deletingPropId)
      setProperties((prev) => prev.filter((p) => p.id !== deletingPropId))
    } catch (err) { console.error(err) }
    finally { setDeletingPropId(null) }
  }

  const handlePropRename = async (prop: Property, name: string) => {
    if (!name.trim() || name === prop.name) return
    try {
      const res = await propertyApi.update(prop.id, { name: name.trim() })
      setProperties((prev) => prev.map((p) => p.id === prop.id ? res.data : p))
    } catch (err) { console.error(err) }
  }

  const moveProp = async (propId: string, dir: 'left' | 'right') => {
    const all = [...properties]
    const idx = all.findIndex((p) => p.id === propId)
    const targetIdx = dir === 'left' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= all.length) return
    const newAll = [...all]
    ;[newAll[idx], newAll[targetIdx]] = [newAll[targetIdx], newAll[idx]]
    setProperties(newAll)
    // persist new order for both swapped items
    const prevP = targetIdx > 0 ? newAll[targetIdx - 1] : null
    const nextP = targetIdx < newAll.length - 1 ? newAll[targetIdx + 1] : null
    const newOrder = generateKeyBetween(prevP?.order ?? null, nextP?.order ?? null)
    propertyApi.update(propId, { order: newOrder }).catch(console.error)
  }

  const handleColResize = useCallback((propId: string, width: number) => {
    setColWidths((prev) => ({ ...prev, [propId]: width }))
  }, [])

  const handleColResizeDone = useCallback((propId: string, width: number) => {
    propertyApi.update(propId, { width: Math.round(width) }).catch(console.error)
  }, [])

  // ── DB delete ───────────────────────────────────────────────────────────────
  const handleDbDelete = async () => {
    if (!activeDb) return
    try {
      await dbApi.delete(activeDb.id)
      const remaining = databases.filter((d) => d.id !== activeDb.id)
      setDatabases(remaining)
      setActiveDb(remaining[0] ?? null)
      setRows([]); setProperties([])
    } catch (err) { console.error(err) }
    finally { setDeletingDb(false) }
  }

  // ── DB rename ────────────────────────────────────────────────────────────────
  const [renamingDb, setRenamingDb] = useState(false)
  const [dbTitle, setDbTitle] = useState('')
  const startRenameDb = () => { setDbTitle(activeDb?.title ?? ''); setRenamingDb(true); setDbPickerOpen(false) }
  const commitRenameDb = async () => {
    if (!activeDb || !dbTitle.trim() || dbTitle === activeDb.title) { setRenamingDb(false); return }
    try {
      const res = await dbApi.update(activeDb.id, { title: dbTitle.trim() })
      const updated = { ...activeDb, title: dbTitle.trim() }
      setActiveDb(updated)
      setDatabases((prev) => prev.map((d) => d.id === activeDb.id ? updated : d))
    } catch (err) { console.error(err) }
    finally { setRenamingDb(false) }
  }

  // ── Header icon picker ───────────────────────────────────────────────────────
  const [headerIconPickerOpen, setHeaderIconPickerOpen] = useState(false)
  const [headerIconPickerPos, setHeaderIconPickerPos] = useState({ x: 0, y: 0 })
  const headerIconBtnRef = useRef<HTMLButtonElement>(null)

  const openHeaderIconPicker = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!headerIconBtnRef.current) return
    const rect = headerIconBtnRef.current.getBoundingClientRect()
    setHeaderIconPickerPos({ x: rect.left, y: rect.bottom + 6 })
    setHeaderIconPickerOpen(true)
  }

  const handleHeaderIconSelect = async (icon: string) => {
    if (!activeDb) return
    try {
      await dbApi.update(activeDb.id, { iconType: 'EMOJI', iconValue: icon })
      const updated = { ...activeDb, iconValue: icon }
      setActiveDb(updated)
      setDatabases((prev) => prev.map((d) => d.id === activeDb.id ? updated : d))
    } catch (err) { console.error(err) }
  }

  // ── Derived display rows ────────────────────────────────────────────────────
  let displayRows = [...rows]
  if (searchQuery && nameProp) {
    displayRows = displayRows.filter((r) =>
      cellVal(getCellByProp(r.cells, nameProp.id)).toLowerCase().includes(searchQuery.toLowerCase()))
  }
  if (filterPropId && filterValue) {
    displayRows = displayRows.filter((r) =>
      cellVal(getCellByProp(r.cells, filterPropId)).toLowerCase().includes(filterValue.toLowerCase()))
  }
  if (sortPropId) {
    displayRows.sort((a, b) => {
      const av = cellVal(getCellByProp(a.cells, sortPropId))
      const bv = cellVal(getCellByProp(b.cells, sortPropId))
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }

  const statusGroups: Record<string, Row[]> = {}
  if (activeView === 'status' && statusProp) {
    for (const s of STATUS_OPTIONS) statusGroups[s] = []
    for (const row of displayRows) {
      const s = cellVal(getCellByProp(row.cells, statusProp.id)) || 'Not started'
      const key = STATUS_OPTIONS.includes(s) ? s : 'Not started'
      statusGroups[key].push(row)
    }
  }

  const dbPickerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!dbPickerOpen) return
    const h = (e: MouseEvent) => { if (!dbPickerRef.current?.contains(e.target as Node)) setDbPickerOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [dbPickerOpen])

  const togglePanel = (p: Panel) => setActivePanel((cur) => cur === p ? null : p)

  const renderRowItem = (row: Row) => (
    <SortableRow
      key={row.id} row={row}
      nameProp={nameProp} otherProps={otherProps}
      colWidths={colWidths}
      onCellSaved={handleCellSaved}
      onOpen={() => setOpenRow(openRow?.id === row.id ? null : row)}
      onDelete={() => handleRowDelete(row.id)}
      openRowId={openRow?.id ?? null}
    />
  )

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!loading && databases.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#191919]">
        <Database size={48} className="text-[#787878] mb-4 opacity-30" />
        <h2 className="text-xl font-semibold text-[#e8e8e8] mb-2">No databases yet</h2>
        <p className="text-[#787878] text-sm mb-6">Create your first database to start tracking tasks</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Database
        </button>
        {showCreate && <CreateDbModal onCreated={(db) => { setDatabases([db]); setActiveDb(db); setShowCreate(false) }} onClose={() => setShowCreate(false)} />}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#191919] overflow-hidden">

      {/* ── Modals ── */}
      {showCreate && <CreateDbModal
        onCreated={(db) => { setDatabases((p) => [...p, db]); setActiveDb(db); setShowCreate(false) }}
        onClose={() => setShowCreate(false)} />}

      {(showAddProp || editProp) && activeDb && <PropertyModal
        dbId={activeDb.id} existing={editProp ?? undefined}
        onSaved={handlePropSaved}
        onClose={() => { setShowAddProp(false); setEditProp(null) }} />}

      {deletingDb && activeDb && <ConfirmModal
        title={`Delete "${activeDb.title}"?`}
        body="This will permanently delete the database and all its rows. This action cannot be undone."
        onConfirm={handleDbDelete}
        onClose={() => setDeletingDb(false)} />}

      {deletingPropId && <ConfirmModal
        title="Delete property?"
        body="All cell values for this property will also be deleted permanently."
        onConfirm={handlePropDelete}
        onClose={() => setDeletingPropId(null)} />}

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Page header */}
          <div className="px-12 pt-12 pb-3">
            <div className="relative inline-block" ref={dbPickerRef}>

              {/* Header — icon is a separate clickable button from the DB title/switcher */}
              {renamingDb ? (
                <div className="flex items-center gap-3">
                  <button ref={headerIconBtnRef} type="button" onClick={openHeaderIconPicker}
                    title="Change icon"
                    className="w-10 h-10 rounded-xl bg-[#0f9453]/20 hover:bg-[#0f9453]/30 flex items-center justify-center text-2xl flex-shrink-0 transition-colors">
                    {activeDb?.iconValue || '✅'}
                  </button>
                  <input autoFocus
                    className="text-3xl font-bold text-[#e8e8e8] bg-transparent border-b-2 border-[#2383e2] outline-none min-w-[120px]"
                    value={dbTitle}
                    onChange={(e) => setDbTitle(e.target.value)}
                    onBlur={commitRenameDb}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRenameDb(); if (e.key === 'Escape') setRenamingDb(false) }}
                  />
                </div>
              ) : (
                <div className="group flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-[#ffffff08] transition-colors">
                  <button ref={headerIconBtnRef} type="button" onClick={openHeaderIconPicker}
                    title="Change icon"
                    className="w-10 h-10 rounded-xl bg-[#0f9453]/20 hover:bg-[#0f9453]/40 flex items-center justify-center text-2xl flex-shrink-0 transition-colors">
                    {activeDb?.iconValue || '✅'}
                  </button>
                  <button
                    onClick={() => setDbPickerOpen((o) => !o)}
                    className="flex items-center gap-2"
                  >
                    <h1 className="text-3xl font-bold text-[#e8e8e8] leading-tight">
                      {activeDb?.title || '…'}
                    </h1>
                    <ChevronDown
                      size={18}
                      className={clsx(
                        'text-[#505050] group-hover:text-[#787878] transition-all mt-1 flex-shrink-0',
                        dbPickerOpen && 'rotate-180 text-[#787878]'
                      )}
                    />
                  </button>
                </div>
              )}
              {headerIconPickerOpen && (
                <IconPickerPopover
                  x={headerIconPickerPos.x} y={headerIconPickerPos.y}
                  selected={activeDb?.iconValue || '✅'}
                  onSelect={handleHeaderIconSelect}
                  onClose={() => setHeaderIconPickerOpen(false)}
                />
              )}

              {/* Switcher popover — anchored below the title */}
              {dbPickerOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-[#252525] border border-[#3a3a3a] rounded-xl shadow-2xl overflow-hidden w-64">

                  {/* Database list */}
                  <div className="py-1.5">
                    <div className="px-3 pb-1">
                      <span className="text-[10px] text-[#505050] uppercase tracking-widest font-semibold">Switch database</span>
                    </div>
                    {databases.map((db) => {
                      const isActive = activeDb?.id === db.id
                      return (
                        <button key={db.id}
                          onClick={() => { setActiveDb(db); setDbPickerOpen(false) }}
                          className={clsx(
                            'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors',
                            isActive ? 'bg-[#2d2d2d] text-[#e8e8e8]' : 'text-[#a0a0a0] hover:bg-[#2a2a2a] hover:text-[#e8e8e8]'
                          )}>
                          <span className="text-base leading-none flex-shrink-0">{db.iconValue || '📋'}</span>
                          <span className="flex-1 text-left truncate font-medium">{db.title}</span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2383e2] flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-[#333] py-1.5">
                    <button onClick={() => { setShowCreate(true); setDbPickerOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#787878] hover:bg-[#2a2a2a] hover:text-[#e8e8e8] transition-colors">
                      <Plus size={14} /> New database
                    </button>
                  </div>

                  <div className="border-t border-[#333] py-1.5">
                    <button onClick={() => { startRenameDb(); setDbPickerOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#787878] hover:bg-[#2a2a2a] hover:text-[#e8e8e8] transition-colors">
                      <Pencil size={14} /> Rename
                    </button>
                    <button onClick={() => { setDeletingDb(true); setDbPickerOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[#eb5757] hover:bg-[#2a2a2a] transition-colors">
                      <Trash2 size={14} /> Delete database
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-12 border-b border-[#2d2d2d]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                {([
                  { id: 'all', label: 'All Tasks', icon: Star },
                  { id: 'status', label: 'By Status', icon: Circle },
                ] as { id: ViewMode; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveView(id)}
                    className={clsx('flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors',
                      activeView === id
                        ? 'border-[#e8e8e8] text-[#e8e8e8]'
                        : 'border-transparent text-[#787878] hover:text-[#b0b0b0]')}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 pb-1">
                {([
                  { id: 'filter' as Panel, icon: Filter, label: 'Filter', active: !!(filterPropId && filterValue) },
                  { id: 'sort'   as Panel, icon: ArrowUpDown, label: 'Sort', active: !!sortPropId },
                  { id: 'search' as Panel, icon: Search, label: 'Search', active: !!searchQuery },
                ]).map(({ id, icon: Icon, label, active }) => (
                  <button key={id} onClick={() => togglePanel(id)} title={label}
                    className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition',
                      activePanel === id || active
                        ? 'bg-[#2d2d2d] text-[#e8e8e8]'
                        : 'text-[#787878] hover:bg-[#2d2d2d] hover:text-[#e8e8e8]')}>
                    <Icon size={14} />
                    {(activePanel === id || active) && <span className="text-xs">{label}</span>}
                  </button>
                ))}
                <div className="w-px h-4 bg-[#333] mx-1" />
                <button onClick={handleAddRow} disabled={addingRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white text-sm rounded font-medium disabled:opacity-50">
                  {addingRow ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  New
                </button>
              </div>
            </div>

            {/* Inline panels */}
            {activePanel === 'search' && (
              <div className="py-2 flex items-center gap-2 border-t border-[#2d2d2d]">
                <Search size={13} className="text-[#787878]" />
                <input autoFocus className="flex-1 bg-transparent text-sm text-[#e8e8e8] outline-none placeholder-[#505050]"
                  placeholder="Search by name…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="text-[#787878] hover:text-[#e8e8e8]"><X size={13} /></button>}
              </div>
            )}
            {activePanel === 'filter' && (
              <div className="py-2 flex items-center gap-2 border-t border-[#2d2d2d]">
                <span className="text-xs text-[#787878]">Where</span>
                <select className="bg-[#2d2d2d] border border-[#404040] rounded px-2 py-1 text-sm text-[#e8e8e8] outline-none"
                  value={filterPropId} onChange={(e) => setFilterPropId(e.target.value)}>
                  <option value="">Property…</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <span className="text-xs text-[#787878]">contains</span>
                <input className="bg-[#2d2d2d] border border-[#404040] rounded px-2 py-1 text-sm text-[#e8e8e8] outline-none w-36"
                  placeholder="value…" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} />
                {(filterPropId || filterValue) && (
                  <button onClick={() => { setFilterPropId(''); setFilterValue('') }} className="text-xs text-[#eb5757] hover:underline">Clear</button>
                )}
              </div>
            )}
            {activePanel === 'sort' && (
              <div className="py-2 flex items-center gap-2 border-t border-[#2d2d2d]">
                <span className="text-xs text-[#787878]">Sort by</span>
                <select className="bg-[#2d2d2d] border border-[#404040] rounded px-2 py-1 text-sm text-[#e8e8e8] outline-none"
                  value={sortPropId} onChange={(e) => setSortPropId(e.target.value)}>
                  <option value="">Property…</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1 px-2 py-1 bg-[#2d2d2d] border border-[#404040] rounded text-sm text-[#e8e8e8] hover:bg-[#373737]">
                  {sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {sortDir === 'asc' ? 'A → Z' : 'Z → A'}
                </button>
                {sortPropId && <button onClick={() => setSortPropId('')} className="text-xs text-[#eb5757] hover:underline">Clear</button>}
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center flex-1 text-[#787878] gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <table className="task-table border-collapse" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                  <colgroup>
                    <col style={{ width: 32 }} />
                    {nameProp && <col style={{ width: colWidths[nameProp.id] ?? NAME_COL_WIDTH }} />}
                    {otherProps.map((p) => <col key={p.id} style={{ width: colWidths[p.id] ?? DEFAULT_COL_WIDTH }} />)}
                    <col style={{ width: 40 }} />
                    <col />
                  </colgroup>
                  <thead className="sticky top-0 z-20">
                    <tr className="border-b border-[#2d2d2d]">
                      <th className="w-8 border-r border-[#2d2d2d] bg-[#191919]" />
                      {nameProp && (
                        <ColHeader
                          property={nameProp}
                          width={colWidths[nameProp.id] ?? NAME_COL_WIDTH}
                          isFirst={true}
                          isLast={otherProps.length === 0}
                          onEdit={() => setEditProp(nameProp)}
                          onDelete={() => setDeletingPropId(nameProp.id)}
                          onMoveLeft={() => {}}
                          onMoveRight={() => moveProp(nameProp.id, 'right')}
                          onResize={(w) => { handleColResize(nameProp.id, w); handleColResizeDone(nameProp.id, w) }}
                        />
                      )}
                      {otherProps.map((p, i) => (
                        <ColHeader
                          key={p.id} property={p}
                          width={colWidths[p.id] ?? DEFAULT_COL_WIDTH}
                          isFirst={i === 0 && !nameProp}
                          isLast={i === otherProps.length - 1}
                          onEdit={() => setEditProp(p)}
                          onDelete={() => setDeletingPropId(p.id)}
                          onMoveLeft={() => moveProp(p.id, 'left')}
                          onMoveRight={() => moveProp(p.id, 'right')}
                          onResize={(w) => { handleColResize(p.id, w); handleColResizeDone(p.id, w) }}
                        />
                      ))}
                      {/* Add property */}
                      <th className="w-10 bg-[#191919] border-r border-[#2d2d2d]">
                        <button onClick={() => setShowAddProp(true)}
                          className="w-full h-9 flex items-center justify-center text-[#505050] hover:text-[#e8e8e8] hover:bg-[#2d2d2d] transition-colors">
                          <Plus size={14} />
                        </button>
                      </th>
                      <th className="bg-[#191919]" />
                    </tr>
                  </thead>

                  <SortableContext items={displayRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {activeView === 'status' && statusProp
                        ? STATUS_OPTIONS.map((status) => {
                            const grpRows = statusGroups[status] ?? []
                            if (grpRows.length === 0) return null
                            return (
                              <StatusGroup key={status} status={status} count={grpRows.length}>
                                {grpRows.map(renderRowItem)}
                              </StatusGroup>
                            )
                          })
                        : displayRows.map(renderRowItem)
                      }
                    </tbody>
                  </SortableContext>
                </table>

                <DragOverlay>
                  {dragRowId && (
                    <table className="task-table" style={{ opacity: 0.9 }}>
                      <tbody>
                        <tr className="bg-[#252525] border border-[#404040] rounded shadow-2xl">
                          {properties.map((p) => (
                            <td key={p.id} className="px-3 py-2 text-sm text-[#787878]">
                              {cellVal(getCellByProp(rows.find((r) => r.id === dragRowId)?.cells ?? [], p.id))}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  )}
                </DragOverlay>
              </DndContext>

              <button onClick={handleAddRow} disabled={addingRow}
                className="flex items-center gap-2 px-14 py-2 w-full text-sm text-[#505050] hover:text-[#787878] hover:bg-[#ffffff04] border-b border-[#2d2d2d] disabled:opacity-50 transition-colors">
                {addingRow ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                New row
              </button>
            </div>
          )}
        </div>

        {/* Side panel */}
        {openRow && (
          <RowPanel
            row={openRow}
            properties={properties}
            onCellSaved={(c) => handleCellSaved(openRow.id, c)}
            onClose={() => setOpenRow(null)}
            onDelete={() => handleRowDelete(openRow.id)}
          />
        )}
      </div>
    </div>
  )
}
