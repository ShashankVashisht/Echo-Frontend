import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { authApi } from '../../lib/api'
import clsx from 'clsx'

type Mode = 'login' | 'otp-send' | 'otp-verify' | 'register'

export default function Login() {
  const navigate = useNavigate()
  const { login, loginWithOtp, register, isLoading, error, clearError } = useAuthStore()

  const [mode, setMode] = useState<Mode>('login')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [localErr, setLocalErr] = useState('')

  const err = localErr || error

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError(); setLocalErr('')
    try {
      await login(phone, password)
      navigate('/')
    } catch {}
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError(); setLocalErr('')
    try {
      await authApi.sendOtp(phone)
      setMode('otp-verify')
    } catch (err: any) {
      setLocalErr(err.message)
    }
  }

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError(); setLocalErr('')
    try {
      await loginWithOtp(phone, otp)
      navigate('/')
    } catch {}
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError(); setLocalErr('')
    try {
      await register(name, email, password, phone)
      navigate('/')
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <span className="text-2xl font-bold text-[#e8e8e8]">Echo</span>
        </div>

        <div className="bg-[#202020] border border-[#2d2d2d] rounded-2xl p-8">
          {/* Title */}
          <h1 className="text-xl font-semibold text-[#e8e8e8] mb-1 text-center">
            {mode === 'register' ? 'Create your account' :
             mode === 'otp-send' ? 'Sign in with OTP' :
             mode === 'otp-verify' ? 'Enter your OTP' :
             'Sign in to Echo'}
          </h1>
          <p className="text-sm text-[#787878] text-center mb-6">
            {mode === 'register' ? 'Start managing your work in one place' :
             mode === 'otp-verify' ? `We sent a code to ${phone}` :
             'Your all-in-one workspace'}
          </p>

          {/* Error */}
          {err && (
            <div className="mb-4 px-3 py-2.5 bg-[#eb5757]/10 border border-[#eb5757]/30 rounded-lg text-sm text-[#eb5757]">
              {err}
            </div>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Mobile Number" type="tel" value={phone} onChange={setPhone} placeholder="+91 9999999999" />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 border-t border-[#333]" />
                <span className="text-xs text-[#787878]">or</span>
                <div className="flex-1 border-t border-[#333]" />
              </div>
              <button type="button" onClick={() => { clearError(); setLocalErr(''); setMode('otp-send') }}
                className="w-full py-2.5 border border-[#404040] hover:bg-[#2d2d2d] text-[#e8e8e8] rounded-lg text-sm transition">
                Sign in with OTP
              </button>
            </form>
          )}

          {/* OTP send form */}
          {mode === 'otp-send' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Field label="Mobile Number" type="tel" value={phone} onChange={setPhone} placeholder="+91 9999999999" />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* OTP verify form */}
          {mode === 'otp-verify' && (
            <form onSubmit={handleOtpLogin} className="space-y-4">
              <Field label="OTP Code" type="text" value={otp} onChange={setOtp} placeholder="Enter 6-digit code" />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Verifying...' : 'Verify & Sign in'}
              </button>
              <button type="button" onClick={() => setMode('otp-send')}
                className="w-full text-xs text-[#787878] hover:text-[#e8e8e8] transition">
                ← Resend OTP
              </button>
            </form>
          )}

          {/* Register form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Full Name" type="text" value={name} onChange={setName} placeholder="Shashank Vashisht" />
              <Field label="Mobile Number" type="tel" value={phone} onChange={setPhone} placeholder="+91 9999999999" />
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          {/* Footer toggle */}
          <p className="mt-6 text-center text-sm text-[#787878]">
            {mode === 'register' ? (
              <>Already have an account?{' '}
                <button onClick={() => { clearError(); setLocalErr(''); setMode('login') }} className="text-[#2383e2] hover:underline">Sign in</button>
              </>
            ) : (
              <>Don't have an account?{' '}
                <button onClick={() => { clearError(); setLocalErr(''); setMode('register') }} className="text-[#2383e2] hover:underline">Sign up</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label className="block text-xs text-[#787878] mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full px-3 py-2.5 bg-[#2d2d2d] border border-[#404040] rounded-lg text-sm text-[#e8e8e8] placeholder-[#505050] outline-none focus:border-[#2383e2] transition"
      />
    </div>
  )
}
