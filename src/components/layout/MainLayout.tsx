import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { PanelLeft } from 'lucide-react'

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#191919]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Toggle button when sidebar is collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute top-3 left-3 z-10 p-1.5 hover:bg-[#2d2d2d] rounded text-[#787878] hover:text-[#e8e8e8]"
          >
            <PanelLeft size={16} />
          </button>
        )}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
