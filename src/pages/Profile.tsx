import { useEffect, useState } from 'react'
import { ChevronRight, LogOut, Loader2, Save } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { userApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'

const INTEGRATIONS = [
  { name: 'WhatsApp', icon: '📱', status: 'Connected', color: '#0f9453' },
  { name: 'Telegram', icon: '✈️', status: 'Not connected', color: '#787878' },
]

export default function Profile() {
  const { user, logout, fetchProfile } = useAuthStore()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (user) setName(user.name)
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await userApi.updateProfile({ name })
      await fetchProfile()
      setEditing(false)
      setMsg('Profile updated!')
      setTimeout(() => setMsg(''), 2000)
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-[#787878]">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading profile...
      </div>
    )
  }

  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="h-full overflow-auto px-12 py-12">
      <h1 className="text-3xl font-bold text-[#e8e8e8] mb-8">Profile & Settings</h1>

      {msg && (
        <div className="mb-4 px-4 py-2.5 bg-[#0f9453]/10 border border-[#0f9453]/30 rounded-lg text-sm text-[#0f9453]">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 max-w-3xl">
        {/* User card */}
        <div className="col-span-2 bg-[#202020] border border-[#2d2d2d] rounded-xl p-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
            <div className="flex-1">
              {editing ? (
                <input
                  className="text-xl font-bold bg-[#2d2d2d] border border-[#404040] rounded-lg px-3 py-1 text-[#e8e8e8] outline-none focus:border-[#2383e2] mb-1 w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              ) : (
                <h2 className="text-xl font-bold text-[#e8e8e8]">{user.name}</h2>
              )}
              <p className="text-[#787878] text-sm">{user.email}</p>
              <p className="text-xs text-[#787878] mt-1">{user.timezone || 'Asia/Kolkata'}</p>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)}
                    className="px-3 py-1.5 border border-[#404040] text-sm text-[#787878] hover:bg-[#2d2d2d] rounded-lg transition">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2383e2] text-white text-sm rounded-lg transition disabled:opacity-50">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Save
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 border border-[#404040] text-sm text-[#e8e8e8] hover:bg-[#2d2d2d] rounded-lg transition">
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-[#202020] border border-[#2d2d2d] rounded-xl p-5">
          <h3 className="font-semibold text-[#e8e8e8] mb-4">Integrations</h3>
          <div className="space-y-2">
            {INTEGRATIONS.map((integration) => (
              <div key={integration.name}
                className="flex items-center gap-3 p-3 hover:bg-[#2d2d2d] rounded-lg transition cursor-pointer group">
                <span className="text-2xl">{integration.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#e8e8e8]">{integration.name}</div>
                  <div className="text-xs" style={{ color: integration.color }}>{integration.status}</div>
                </div>
                <ChevronRight size={14} className="text-[#787878] opacity-0 group-hover:opacity-100 transition" />
              </div>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="bg-[#202020] border border-[#2d2d2d] rounded-xl p-5">
          <h3 className="font-semibold text-[#e8e8e8] mb-4">Account</h3>
          <div className="space-y-3">
            {[
              { label: 'Email', value: user.email },
              { label: 'Phone', value: user.phone || '—' },
              { label: 'Timezone', value: user.timezone || 'Asia/Kolkata' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-[#2d2d2d] last:border-0">
                <span className="text-sm text-[#787878]">{label}</span>
                <span className="text-sm text-[#e8e8e8]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="col-span-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-[#eb5757] hover:bg-[#eb575710] px-4 py-2 rounded-lg transition"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
