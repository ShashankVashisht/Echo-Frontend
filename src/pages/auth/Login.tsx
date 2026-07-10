import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { countryCodes } from '../../lib/countryCodes'

type Mode = 'login' | 'otp-send' | 'otp-verify' | 'register' | 'register-verify' | 'verify-phone'

// Validation utilities
const validate = {
  email: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  password: (pwd: string) => pwd.length >= 6,
  otp: (otp: string) => /^\d{6}$/.test(otp),
  name: (name: string) => name.trim().length >= 2,
}

const getValidationError = (field: string, value: string): string | null => {
  if (!value) return null;

  switch (field) {
    case 'name':
      return value.trim().length < 2 ? 'Name must be at least 2 characters' : null
    case 'email':
      return !validate.email(value) ? 'Enter a valid email address' : null
    case 'password':
      return !validate.password(value) ? 'Password must be at least 6 characters' : null
    case 'otp':
      return !validate.otp(value) ? 'OTP must be exactly 6 digits' : null
    default:
      return null
  }
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithOtp, register, verifyNumber, generateOtp, isLoading, error, clearError } = useAuthStore()

  const isRegisterRoute = location.pathname === '/register'
  const [mode, setMode] = useState<Mode>(isRegisterRoute ? 'register' : 'login')

  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register')
    } else if (location.pathname === '/login') {
      setMode('login')
    }
  }, [location.pathname])
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [localErr, setLocalErr] = useState('')
  const [validationErr, setValidationErr] = useState('')
  const [verifyPhoneOtpSent, setVerifyPhoneOtpSent] = useState(false)

  const fullPhone = `${countryCode}${phone}`
  const err = localErr || error || validationErr

  const resetForm = () => {
    setPhone('')
    setEmail('')
    setPassword('')
    setOtp('')
    setName('')
    setVerifyPhoneOtpSent(false)
    clearError()
    setLocalErr('')
    setValidationErr('')
  }

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErr('')
    clearError()
    setLocalErr('')

    if (!validate.password(password)) {
      setValidationErr('Password must be at least 6 characters')
      return
    }

    try {
      await login(fullPhone, password)
      navigate('/')
    } catch (err: any) {
      if (err?.response?.data?.code === 'PHONE_NOT_VERIFIED') {
        clearError()
        setMode('verify-phone')
        return
      }
    }
  }

  // OTP LOGIN - SEND
  const handleSendOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErr('')
    clearError()
    setLocalErr('')

    try {
      await generateOtp(fullPhone)
      setOtp('')
      setMode('otp-verify')
    } catch (err: any) {
      setLocalErr(err.message)
    }
  }

  // OTP LOGIN - VERIFY
  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErr('')
    clearError()
    setLocalErr('')

    if (!validate.otp(otp)) {
      setValidationErr('OTP must be exactly 6 digits')
      return
    }

    try {
      await loginWithOtp(fullPhone, otp)
      navigate('/')
    } catch { }
  }

  // REGISTER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErr('')
    clearError()
    setLocalErr('')

    if (!validate.name(name)) {
      setValidationErr('Name must be at least 2 characters')
      return
    }
    if (!validate.email(email)) {
      setValidationErr('Enter a valid email address')
      return
    }
    if (!validate.password(password)) {
      setValidationErr('Password must be at least 6 characters')
      return
    }

    try {
      await register(name, email, password, fullPhone)
      setOtp('')
      setMode('register-verify')
    } catch (err: any) {
      setLocalErr(err.message)
    }
  }

  // REGISTER VERIFY
  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErr('')
    clearError()
    setLocalErr('')

    if (!validate.otp(otp)) {
      setValidationErr('OTP must be exactly 6 digits')
      return
    }

    try {
      await verifyNumber(fullPhone, otp)
      resetForm()
      setMode('login')
    } catch (err: any) {
      setLocalErr(err.message)
    }
  }

  // VERIFY PHONE (for unverified users)
  const handleSendVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErr('')
    clearError()
    setLocalErr('')

    try {
      await generateOtp(fullPhone)
      setOtp('')
      setVerifyPhoneOtpSent(true)
    } catch (err: any) {
      setLocalErr(err.message)
    }
  }

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErr('')
    clearError()
    setLocalErr('')

    if (!validate.otp(otp)) {
      setValidationErr('OTP must be exactly 6 digits')
      return
    }

    try {
      await verifyNumber(fullPhone, otp)
      resetForm()
      setMode('login')
    } catch (err: any) {
      setLocalErr(err.message)
    }
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
              mode === 'register-verify' ? 'Verify your phone' :
                mode === 'otp-send' ? 'Sign in with OTP' :
                  mode === 'otp-verify' ? 'Enter your OTP' :
                    mode === 'verify-phone' ? 'Verify your phone' :
                      'Sign in to Echo'}
          </h1>
          <p className="text-sm text-[#787878] text-center mb-6">
            {mode === 'register' ? 'Start managing your work in one place' :
              mode === 'register-verify' ? `We sent a code to ${fullPhone}` :
                mode === 'otp-verify' ? `We sent a code to ${fullPhone}` :
                  mode === 'verify-phone' ? 'Complete your phone verification to access your account' :
                    'Your all-in-one workspace'}
          </p>

          {/* Error */}
          {err && (
            <div className="mb-4 px-3 py-2.5 bg-[#eb5757]/10 border border-[#eb5757]/30 rounded-lg text-sm text-[#eb5757]">
              {err}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <PhoneField label="Mobile Number" value={phone} onChange={setPhone} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="9999999999" error={getValidationError('phone', phone)} />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" error={getValidationError('password', password)} />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 border-t border-[#333]" />
                <span className="text-xs text-[#787878]">or</span>
                <div className="flex-1 border-t border-[#333]" />
              </div>
              <button type="button" onClick={() => { resetForm(); setMode('otp-send') }} className="w-full py-2.5 border border-[#404040] hover:bg-[#2d2d2d] text-[#e8e8e8] rounded-lg text-sm transition">
                Sign in with OTP
              </button>
              <button type="button" onClick={() => { resetForm(); setMode('verify-phone') }} className="w-full text-xs text-[#2383e2] hover:underline text-center py-2">
                Verify your phone number?
              </button>
            </form>
          )}

          {/* OTP SEND FORM */}
          {mode === 'otp-send' && (
            <form onSubmit={handleSendOtpLogin} className="space-y-4">
              <PhoneField label="Mobile Number" value={phone} onChange={setPhone} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="9999999999" error={getValidationError('phone', phone)} />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
              <button type="button" onClick={() => { resetForm(); setMode('login') }} className="w-full text-xs text-[#787878] hover:text-[#e8e8e8] transition py-2">
                Back to login
              </button>
            </form>
          )}

          {/* OTP VERIFY FORM */}
          {mode === 'otp-verify' && (
            <form onSubmit={handleVerifyOtpLogin} className="space-y-4">
              <Field label="OTP Code" type="text" value={otp} onChange={setOtp} placeholder="Enter 6-digit code" error={getValidationError('otp', otp)} maxLength={6} />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Verifying...' : 'Verify & Sign in'}
              </button>
              <button type="button" onClick={() => { setOtp(''); setMode('otp-send') }} className="w-full text-xs text-[#787878] hover:text-[#e8e8e8] transition py-2">
                Resend OTP
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Full Name" type="text" value={name} onChange={setName} placeholder="John Doe" error={getValidationError('name', name)} />
              <PhoneField label="Mobile Number" value={phone} onChange={setPhone} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="9999999999" error={getValidationError('phone', phone)} />
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" error={getValidationError('email', email)} />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" error={getValidationError('password', password)} />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          {/* REGISTER VERIFY FORM */}
          {mode === 'register-verify' && (
            <form onSubmit={handleVerifyRegister} className="space-y-4">
              <div className="rounded-lg border border-[#2d2d2d] bg-[#2a2a2a] p-3 text-sm text-[#e8e8e8]">
                We sent a verification code to <span className="text-[#2383e2]">{fullPhone}</span>
              </div>
              <Field label="OTP Code" type="text" value={otp} onChange={setOtp} placeholder="Enter 6-digit code" error={getValidationError('otp', otp)} maxLength={6} />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Verifying...' : 'Verify & Complete'}
              </button>
              <button type="button" onClick={() => { setPhone(''); setOtp(''); setMode('register') }} className="w-full text-xs text-[#787878] hover:text-[#e8e8e8] transition py-2">
                Back
              </button>
            </form>
          )}

          {/* VERIFY PHONE FORM - SEND OTP */}
          {mode === 'verify-phone' && !verifyPhoneOtpSent && (
            <form onSubmit={handleSendVerifyPhoneOtp} className="space-y-4">
              <p className="text-sm text-[#787878] mb-4">
                Enter your phone number to receive a verification code and complete your account setup.
              </p>
              <PhoneField label="Mobile Number" value={phone} onChange={setPhone} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="9999999999" error={getValidationError('phone', phone)} />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
              <button type="button" onClick={() => { resetForm(); setMode('login') }} className="w-full text-xs text-[#787878] hover:text-[#e8e8e8] transition py-2">
                Back to login
              </button>
            </form>
          )}

          {/* VERIFY PHONE FORM - VERIFY OTP */}
          {mode === 'verify-phone' && verifyPhoneOtpSent && (
            <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
              <div className="rounded-lg border border-[#2d2d2d] bg-[#2a2a2a] p-3 text-sm text-[#e8e8e8]">
                We sent a verification code to <span className="text-[#2383e2]">{fullPhone}</span>
              </div>
              <Field label="OTP Code" type="text" value={otp} onChange={setOtp} placeholder="Enter 6-digit code" error={getValidationError('otp', otp)} maxLength={6} />
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a72d4] text-white rounded-lg font-medium text-sm transition disabled:opacity-50">
                {isLoading ? 'Verifying...' : 'Verify & Complete'}
              </button>
              <button type="button" onClick={() => { setOtp(''); setVerifyPhoneOtpSent(false) }} className="w-full text-xs text-[#787878] hover:text-[#e8e8e8] transition py-2">
                Resend OTP
              </button>
            </form>
          )}

          {/* Footer toggle */}
          <p className="mt-6 text-center text-sm text-[#787878]">
            {mode === 'register' ? (
              <>Already have an account?{' '}
                <button type="button" onClick={() => { resetForm(); navigate('/login') }} className="text-[#2383e2] hover:underline">Sign in</button>
              </>
            ) : (
              <>Don't have an account?{' '}
                <button type="button" onClick={() => { resetForm(); navigate('/register') }} className="text-[#2383e2] hover:underline">Sign up</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  error?: string | null
  maxLength?: number
}

interface PhoneFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  countryCode: string
  onCountryCodeChange: (v: string) => void
  placeholder: string
  error?: string | null
}

function PhoneField({ label, value, onChange, countryCode, onCountryCodeChange, placeholder, error }: PhoneFieldProps) {
  return (
    <div>
      <label className="block text-xs text-[#787878] mb-1.5 font-medium">{label}</label>
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className={`w-[110px] px-2 py-2.5 bg-[#2d2d2d] border rounded-lg text-sm text-[#e8e8e8] outline-none focus:border-[#2383e2] transition cursor-pointer ${error ? 'border-[#eb5757]' : 'border-[#404040]'}`}
        >
          {countryCodes.map((c) => (
            <option key={`${c.country}-${c.code}`} value={c.code}>
              {c.country} ({c.code})
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2.5 bg-[#2d2d2d] border rounded-lg text-sm text-[#e8e8e8] placeholder-[#505050] outline-none focus:border-[#2383e2] transition ${error ? 'border-[#eb5757]' : 'border-[#404040]'
            }`}
        />
      </div>
      {error && <p className="text-xs text-[#eb5757] mt-1">{error}</p>}
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, error, maxLength }: FieldProps) {
  return (
    <div>
      <label className="block text-xs text-[#787878] mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-3 py-2.5 bg-[#2d2d2d] border rounded-lg text-sm text-[#e8e8e8] placeholder-[#505050] outline-none focus:border-[#2383e2] transition ${error ? 'border-[#eb5757]' : 'border-[#404040]'
          }`}
      />
      {error && <p className="text-xs text-[#eb5757] mt-1">{error}</p>}
    </div>
  )
}
