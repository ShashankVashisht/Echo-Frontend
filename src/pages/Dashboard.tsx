import { useEffect, useState } from 'react'
import { CheckSquare2, Bell, Calendar, MessageSquare, ArrowRight, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { reminderApi, dbApi } from '../lib/api'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [reminders, setReminders] = useState<any[]>([])
  const [databases, setDatabases] = useState<any[]>([])

  useEffect(() => {
    reminderApi.getAll().then((r) => setReminders(r.data || [])).catch(() => {})
    dbApi.getAll().then((r) => setDatabases(r.data || [])).catch(() => {})
  }, [])

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const upcomingReminders = reminders.filter((r) => !r.isSent)
  const recurringReminders = reminders.filter((r) => r.isRecurring)

  return (
    <div className="h-full overflow-auto px-16 py-16">
      {/* Greeting */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#e8e8e8] mb-1">
          {greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-[#787878]">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Databases', value: databases.length, color: '#2383e2', icon: CheckSquare2 },
          { label: 'Upcoming', value: upcomingReminders.length, color: '#4b9cd3', icon: TrendingUp },
          { label: 'Recurring', value: recurringReminders.length, color: '#0f9453', icon: CheckSquare2 },
          { label: 'Total Reminders', value: reminders.length, color: '#e9a94b', icon: Bell },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[#202020] border border-[#2d2d2d] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#787878]">{label}</span>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-3xl font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming reminders */}
        <div className="bg-[#202020] border border-[#2d2d2d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#e8e8e8]">Upcoming Reminders</h3>
            <Link to="/reminders" className="text-xs text-[#787878] hover:text-[#2383e2] flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingReminders.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-[#2383e2] flex-shrink-0" />
                <span className="text-sm text-[#e8e8e8] truncate flex-1">{r.message}</span>
                {r.isRecurring && (
                  <span className="text-[10px] text-[#787878] bg-[#2d2d2d] px-1.5 py-0.5 rounded">{r.recurringType}</span>
                )}
              </div>
            ))}
            {upcomingReminders.length === 0 && (
              <p className="text-sm text-[#787878] py-2">No upcoming reminders</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-[#202020] border border-[#2d2d2d] rounded-xl p-5">
          <h3 className="font-semibold text-[#e8e8e8] mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { to: '/tasks', icon: CheckSquare2, label: 'Open Tasks', desc: 'View and manage databases', color: '#0f9453' },
              { to: '/calendar', icon: Calendar, label: 'Open Calendar', desc: 'Check your week', color: '#2383e2' },
              { to: '/chat', icon: MessageSquare, label: 'Chat with Echo', desc: 'Create reminders with AI', color: '#9b59b6' },
              { to: '/reminders', icon: Bell, label: 'View Reminders', desc: 'See upcoming reminders', color: '#e9a94b' },
            ].map(({ to, icon: Icon, label, desc, color }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 p-3 hover:bg-[#2d2d2d] rounded-lg transition group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#e8e8e8]">{label}</div>
                  <div className="text-xs text-[#787878]">{desc}</div>
                </div>
                <ArrowRight size={14} className="ml-auto text-[#787878] opacity-0 group-hover:opacity-100 transition" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
