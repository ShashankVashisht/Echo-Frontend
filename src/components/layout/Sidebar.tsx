import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Home, MessageSquare, Bell, User,
  ChevronDown, Plus, Search, PanelLeft,
  MoreHorizontal, Pencil, Trash2, AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'
import { dbApi } from '../../lib/api'
import {
  DATABASE_ICONS,
  DEFAULT_DATABASE_ICON,
  DatabaseIconGlyph,
} from '../common/DatabaseIcon'

const NAV = [
  { to: '/',          icon: Home,           label: 'Home'      },
  { to: '/chat',      icon: MessageSquare,  label: 'Chat'      },
  { to: '/search',    icon: Search,         label: 'Search'    },
  // { to: '/calendar',  icon: Calendar,       label: 'Calendar'  }, // temporarily disabled
  { to: '/reminders', icon: Bell,           label: 'Reminders' },
]

interface Db { id: string; title: string; iconValue?: string }
interface SidebarProps { collapsed: boolean; onToggle: () => void }

// ── Tiny confirm dialog ────────────────────────────────────────────────────────
function MiniConfirm({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      onMouseDown={(e) => e.stopPropagation()}>
      <div className="bg-[#202020] border border-[#333] rounded-2xl p-5 w-72 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={18} className="text-[#e9a94b] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#e8e8e8]">{message}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-1.5 border border-[#404040] hover:bg-[#2d2d2d] text-[#e8e8e8] rounded-lg text-sm">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-1.5 bg-[#eb5757] hover:bg-[#d94f4f] text-white rounded-lg text-sm font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DB row with inline rename + context menu ───────────────────────────────────
function DbRow({ db, isActive, onSelect, onRenamed, onDeleted }: {
  db: Db; isActive: boolean
  onSelect: () => void
  onRenamed: (id: string, title: string) => void
  onDeleted: (id: string) => void
}) {
  const [menuOpen, setMenuOpen]     = useState(false)
  const [menuPos, setMenuPos]       = useState({ x: 0, y: 0 })
  const [renaming, setRenaming]     = useState(false)
  const [nameVal, setNameVal]       = useState(db.title)
  const [confirming, setConfirming] = useState(false)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const h = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = btnRef.current!.getBoundingClientRect()
    setMenuPos({ x: rect.right + 4, y: rect.top })
    setMenuOpen((o) => !o)
  }

  const commitRename = async () => {
    setRenaming(false)
    const trimmed = nameVal.trim()
    if (!trimmed || trimmed === db.title) { setNameVal(db.title); return }
    try {
      await dbApi.update(db.id, { title: trimmed })
      onRenamed(db.id, trimmed)
    } catch { setNameVal(db.title) }
  }

  const confirmDelete = async () => {
    setConfirming(false)
    try {
      await dbApi.delete(db.id)
      onDeleted(db.id)
    } catch (err) { console.error(err) }
  }

  return (
    <>
      {confirming && (
        <MiniConfirm
          message={`Delete "${db.title}"? This removes all rows and cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(false)}
        />
      )}

      <div
        onClick={renaming ? undefined : onSelect}
        className={clsx(
          'flex items-center gap-2 px-2 py-1.5 rounded text-sm w-full group cursor-pointer select-none',
          isActive ? 'bg-[#373737] text-[#e8e8e8]' : 'text-[#e8e8e8] hover:bg-[#2d2d2d]'
        )}>
        <DatabaseIconGlyph value={db.iconValue} size={16} />

        {renaming ? (
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm text-[#e8e8e8] outline-none border-b border-[#2383e2]"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setNameVal(db.title); setRenaming(false) }
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-sm">{db.title}</span>
        )}

        {/* Context menu trigger */}
        {!renaming && (
          <>
            <button
              ref={btnRef}
              onClick={openMenu}
              className="p-0.5 rounded text-[#505050] hover:text-[#e8e8e8] hover:bg-[#444] flex-shrink-0"
            >
              <MoreHorizontal size={15} />
            </button>

            {menuOpen && createPortal(
              <div
                ref={menuRef}
                style={{ position: 'fixed', top: menuPos.y, left: menuPos.x, zIndex: 9999 }}
                className="bg-[#252525] border border-[#3a3a3a] rounded-lg shadow-2xl py-1 w-36"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setRenaming(true); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#e8e8e8] hover:bg-[#2d2d2d]">
                  <Pencil size={13} className="text-[#787878]" /> Rename
                </button>
                <div className="my-0.5 border-t border-[#333]" />
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(true); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#eb5757] hover:bg-[#2d2d2d]">
                  <Trash2 size={13} /> Delete
                </button>
              </div>,
              document.body
            )}
          </>
        )}
      </div>
    </>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [pagesOpen, setPagesOpen]   = useState(true)
  const [databases, setDatabases]   = useState<Db[]>([])
  const [activeDbId, setActiveDbId] = useState<string | null>(null)
  const [creating, setCreating]         = useState(false)
  const [newTitle, setNewTitle]         = useState('')
  const [newIcon, setNewIcon]           = useState(DEFAULT_DATABASE_ICON)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconPickerPos, setIconPickerPos]   = useState({ x: 0, y: 0 })
  const createInputRef  = useRef<HTMLInputElement>(null)
  const iconBtnRef      = useRef<HTMLButtonElement>(null)
  const iconPickerRef   = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedDbId = searchParams.get('db')

  // close icon picker on outside click
  useEffect(() => {
    if (!iconPickerOpen) return
    const h = (e: MouseEvent) => {
      if (!iconPickerRef.current?.contains(e.target as Node) &&
          !iconBtnRef.current?.contains(e.target as Node)) {
        setIconPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [iconPickerOpen])

  const openIconPicker = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = iconBtnRef.current!.getBoundingClientRect()
    setIconPickerPos({ x: rect.right + 6, y: rect.top })
    setIconPickerOpen((o) => !o)
  }

  const startCreate = () => {
    setNewTitle('')
    setNewIcon(DEFAULT_DATABASE_ICON)
    setCreating(true)
    setIconPickerOpen(false)
    setPagesOpen(true)
    setTimeout(() => createInputRef.current?.focus(), 0)
  }

  const commitCreate = async () => {
    const title = newTitle.trim()
    setCreating(false)
    setNewTitle('')
    setIconPickerOpen(false)
    if (!title) return
    try {
      const res = await dbApi.create({ title, iconType: 'EMOJI', iconValue: newIcon })
      const db: Db = res.data
      setDatabases((prev) => [...prev, db])
      setActiveDbId(db.id)
      navigate(`/tasks?db=${encodeURIComponent(db.id)}`)
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    dbApi.getAll()
      .then((res) => {
        const dbs: Db[] = res.data || []
        setDatabases(dbs)
        if (dbs.length > 0) setActiveDbId(selectedDbId || dbs[0].id)
      })
      .catch(() => {})
  }, [selectedDbId])

  const handleSelect = (db: Db) => {
    setActiveDbId(db.id)
    navigate(`/tasks?db=${encodeURIComponent(db.id)}`)
  }

  const handleRenamed = (id: string, title: string) => {
    setDatabases((prev) => prev.map((d) => d.id === id ? { ...d, title } : d))
  }

  const handleDeleted = (id: string) => {
    setDatabases((prev) => {
      const remaining = prev.filter((d) => d.id !== id)
      if (activeDbId === id) setActiveDbId(remaining[0]?.id ?? null)
      return remaining
    })
  }

  return (
    <div className={clsx(
      'flex flex-col h-full bg-[#202020] border-r border-[#333] transition-all duration-200 select-none',
      collapsed ? 'w-0 overflow-hidden' : 'w-[240px]'
    )}>
      {/* Workspace header */}
      <div className="flex items-center justify-between px-3 py-3 h-12">
        <button className="flex items-center gap-2 hover:bg-[#2d2d2d] rounded px-2 py-1 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src="/android-chrome-192x192.png"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-sm font-medium text-[#e8e8e8] truncate">Echo's Space</span>
          <ChevronDown size={14} className="text-[#787878] flex-shrink-0" />
        </button>
        <button onClick={onToggle} className="p-1 hover:bg-[#2d2d2d] rounded ml-1 text-[#787878]">
          <PanelLeft size={16} />
        </button>
      </div>

      {/* Top nav */}
      <div className="px-2 space-y-[2px]">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to + label} to={to} end={to === '/'}
            className={({ isActive }) =>
              clsx('flex items-center gap-2 px-2 py-1.5 rounded text-sm w-full',
                isActive ? 'bg-[#373737] text-[#e8e8e8]' : 'text-[#787878] hover:bg-[#2d2d2d] hover:text-[#e8e8e8]')}>
            <Icon size={16} />{label}
          </NavLink>
        ))}
      </div>

      <div className="mx-3 my-2 border-t border-[#333]" />

      {/* Databases section */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="flex items-center justify-between px-2 py-1 mb-1 group">
          <button
            className="text-xs text-[#787878] hover:text-[#e8e8e8] uppercase tracking-wide font-medium"
            onClick={() => setPagesOpen((o) => !o)}>
            Databases
          </button>
          <button
            onClick={startCreate}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#787878] hover:text-[#e8e8e8] hover:bg-[#2d2d2d] transition-opacity">
            <Plus size={14} />
          </button>
        </div>

        {pagesOpen && (
          <div className="space-y-[2px]">
            {databases.length === 0 && !creating && (
              <button onClick={startCreate}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm w-full text-[#505050] hover:bg-[#2d2d2d] hover:text-[#787878]">
                <Plus size={14} /> Add database
              </button>
            )}

            {databases.map((db) => (
              <DbRow
                key={db.id} db={db}
                isActive={activeDbId === db.id}
                onSelect={() => handleSelect(db)}
                onRenamed={handleRenamed}
                onDeleted={handleDeleted}
              />
            ))}

            {/* Inline create row */}
            {creating && (
              <>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#2d2d2d]">
                  {/* Clickable icon */}
                  <button
                    ref={iconBtnRef}
                    onMouseDown={openIconPicker}
                    title="Choose icon"
                    className="text-base leading-none rounded hover:bg-[#444] p-0.5 transition-colors flex-shrink-0"
                  >
                    <DatabaseIconGlyph value={newIcon} size={16} />
                  </button>
                  <input
                    ref={createInputRef}
                    className="flex-1 bg-transparent text-sm text-[#e8e8e8] outline-none placeholder-[#505050]"
                    placeholder="Database name…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={(e) => {
                      // don't commit if icon picker is opening
                      if (iconPickerOpen) return
                      commitCreate()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { setIconPickerOpen(false); commitCreate() }
                      if (e.key === 'Escape') { setCreating(false); setNewTitle(''); setIconPickerOpen(false) }
                    }}
                  />
                </div>

                {/* Icon picker portal */}
                {iconPickerOpen && createPortal(
                  <div
                    ref={iconPickerRef}
                    style={{ position: 'fixed', top: iconPickerPos.y, left: iconPickerPos.x, zIndex: 9999 }}
                    className="bg-[#252525] border border-[#3a3a3a] rounded-xl shadow-2xl p-2 w-[196px]"
                  >
                    <p className="text-[10px] text-[#505050] uppercase tracking-wider font-medium px-1 pb-1.5">
                      Choose icon
                    </p>
                    <div className="grid grid-cols-8 gap-0.5">
                      {DATABASE_ICONS.map((icon) => (
                        <button
                          key={icon.value}
                          title={icon.label}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setNewIcon(icon.value)
                            setIconPickerOpen(false)
                            createInputRef.current?.focus()
                          }}
                          className={clsx(
                            'w-6 h-6 rounded flex items-center justify-center hover:bg-[#373737] transition-colors',
                            newIcon === icon.value && 'bg-[#373737] ring-1 ring-[#2383e2]'
                          )}
                        >
                          <DatabaseIconGlyph value={icon.value} size={15} />
                        </button>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-2 pb-3 space-y-[2px]">
        <div className="mx-1 mb-2 border-t border-[#333]" />
        <NavLink to="/chat"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm w-full text-[#787878] hover:bg-[#2d2d2d] hover:text-[#e8e8e8]">
          <MessageSquare size={16} /> New chat
          <span className="ml-auto text-xs text-[#787878]">⌘0</span>
        </NavLink>
        <NavLink to="/profile"
          className={({ isActive }) =>
            clsx('flex items-center gap-2 px-2 py-1.5 rounded text-sm w-full',
              isActive ? 'bg-[#373737] text-[#e8e8e8]' : 'text-[#787878] hover:bg-[#2d2d2d] hover:text-[#e8e8e8]')}>
          <User size={16} /> Profile
        </NavLink>
      </div>
    </div>
  )
}
