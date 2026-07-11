import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { countryCodes } from '../../lib/countryCodes'
import { Eye, EyeOff, ChevronDown, CheckCircle2 } from "lucide-react";

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



function getTimezoneOptions(): { value: string; label: string }[] {
  const timezones = (Intl as any).supportedValuesOf('timeZone') as string[];
  const now = new Date();

  return timezones.map((tz: string) => {
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset'
    });
    const offset = offsetFormatter.formatToParts(now)
      .find((p: Intl.DateTimeFormatPart) => p.type === 'timeZoneName')?.value || '';

    return {
      value: tz,
      label: `(${offset}) ${tz.replace(/_/g, ' ')}`
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
}

function TimezoneSelect({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const options = getTimezoneOptions();
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-1.5 text-left">
       <label className="text-[11px] font-semibold text-[#808090] tracking-wide uppercase pl-1">Timezone</label>
       <select 
         value={value || detectedTz} 
         onChange={(e) => onChange(e.target.value)}
         className="w-full h-11 px-4 text-sm rounded-xl outline-none transition-all appearance-none"
         style={{
           background: "rgba(255,255,255,0.05)",
           border: "1px solid rgba(255,255,255,0.09)",
           color: "#e8e8ee",
           backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a0a0b0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
           backgroundPosition: "right 12px center",
           backgroundRepeat: "no-repeat",
           backgroundSize: "16px"
         }}
         onFocus={(e) => {
           e.target.style.borderColor = "rgba(255,255,255,0.28)";
           e.target.style.backgroundColor = "rgba(255,255,255,0.07)";
         }}
         onBlur={(e) => {
           e.target.style.borderColor = "rgba(255,255,255,0.09)";
           e.target.style.backgroundColor = "rgba(255,255,255,0.05)";
         }}
       >
         {options.map(opt => (
           <option key={opt.value} value={opt.value} className="bg-[#1a1a24] text-[#e8e8ee]">{opt.label}</option>
         ))}
       </select>
    </div>
  );
}

function BrandCanvas() {
  return (
    <div className="relative w-full h-full flex flex-col p-10 overflow-hidden select-none" style={{ background: "#0a0a0c" }}>
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 0% 0%, rgba(35, 131, 226, 0.08) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(15, 148, 83, 0.05) 0%, transparent 50%)"
        }}
      />
      
      {/* Fake Header */}
      <div className="mt-6 mb-10 z-10 animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
        <h1 className="text-3xl font-bold text-[#e8e8e8] mb-2 tracking-tight">Good morning, Alex</h1>
        <p className="text-[#787878] text-sm font-medium">Monday, October 24</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 z-10 w-full max-w-[380px] animate-fade-in-up" style={{ animationDuration: '1s' }}>
        {[
          { label: 'Upcoming', value: '12', color: '#4b9cd3' },
          { label: 'Total Tasks', value: '48', color: '#0f9453' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#141416] border border-[#222226] rounded-2xl p-5 shadow-lg relative overflow-hidden transition-transform duration-300 hover:-translate-y-1">
             <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-[0.07]" style={{ backgroundColor: stat.color }} />
             <div className="text-xs text-[#787878] mb-3 font-medium tracking-wide uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                {stat.label}
             </div>
             <div className="text-4xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity Mock */}
      <div className="bg-[#141416] border border-[#222226] rounded-2xl p-6 flex-1 z-10 shadow-lg w-full max-w-[380px] animate-fade-in-up" style={{ animationDuration: '1.2s' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-[#e8e8e8] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2383e2]"></div>
            Upcoming Reminders
          </h3>
          <div className="w-5 h-1 flex gap-0.5 opacity-50">
            <div className="w-1 h-1 rounded-full bg-[#787878]" />
            <div className="w-1 h-1 rounded-full bg-[#787878]" />
            <div className="w-1 h-1 rounded-full bg-[#787878]" />
          </div>
        </div>
        
        <div className="space-y-5">
          {[
            { title: 'Team Sync', time: '10:00 AM', tag: 'Meeting' },
            { title: 'Review Q3 Deck', time: '2:30 PM', tag: 'Work' },
            { title: 'Doctor Appointment', time: '4:15 PM', tag: 'Personal' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 group cursor-default">
              <div className="w-10 h-10 rounded-xl bg-[#1c1c1f] flex flex-col items-center justify-center text-[#e8e8e8] border border-[#2a2a2e] group-hover:border-[#3a3a3e] transition-colors">
                <span className="text-[10px] font-medium leading-none text-[#787878]">{item.time.split(':')[0]}</span>
                <span className="text-[8px] font-bold leading-none mt-0.5 text-[#555]">{item.time.split(' ')[1]}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-[#d0d0d0] font-medium group-hover:text-white transition-colors">{item.title}</div>
                <div className="text-[11px] text-[#606060] mt-0.5 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-[#444]" />
                  {item.time}
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-[6px] text-[9px] uppercase tracking-wider font-semibold" style={{ background: 'rgba(255,255,255,0.03)', color: '#808080', border: '1px solid rgba(255,255,255,0.06)' }}>
                {item.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom fade out overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0c] to-transparent z-20 pointer-events-none" />
    </div>
  )
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
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
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
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
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
      await register(name, email, password, fullPhone, timezone)
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


  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    color: "#e8e8ee",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,0.28)";
    e.target.style.background = "rgba(255,255,255,0.07)";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,0.09)";
    e.target.style.background = "rgba(255,255,255,0.05)";
  };

  return (
    <div className="min-h-screen w-full flex font-[Inter,sans-serif]" style={{ background: "#0d0d11" }}>
      <div
        className="hidden lg:flex flex-col w-[460px] shrink-0 relative"
        style={{
          background: "linear-gradient(160deg, #111118 0%, #0d0d12 60%, #0f1014 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <BrandCanvas />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 60% at 60% 45%, rgba(80,90,130,0.07) 0%, transparent 80%)",
          }}
        />

        <div className="relative w-full max-w-[380px] space-y-9">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <img src="/android-chrome-192x192.png" alt="Echo logo" className="w-6 h-6 object-contain" />
              </div>
              <span className="text-white text-lg font-semibold tracking-tight">Echo</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight">
                {mode === 'register' ? 'Create an account' :
                 mode === 'register-verify' ? 'Verify your phone' :
                 mode === 'otp-send' ? 'Sign in with OTP' :
                 mode === 'otp-verify' ? 'Enter your OTP' :
                 mode === 'verify-phone' ? 'Verify your phone' :
                 'Welcome back'}
              </h1>
              <p className="text-sm" style={{ color: "#6b6b80" }}>
                {mode === 'register' ? 'Start managing your work in one place' :
                 mode === 'register-verify' ? `We sent a code to ${fullPhone}` :
                 mode === 'otp-verify' ? `We sent a code to ${fullPhone}` :
                 mode === 'verify-phone' ? 'Complete phone verification' :
                 'Sign in to your Echo workspace'}
              </p>
            </div>
          </div>

          {err && (
            <div className="px-4 py-3 bg-[#eb5757]/10 border border-[#eb5757]/30 rounded-[12px] text-sm text-[#eb5757]">
              {err}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <PhoneField label="Mobile Number" value={phone} onChange={setPhone} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="Phone number" error={getValidationError('phone', phone)} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Enter password" error={getValidationError('password', password)} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} 
                rightLabel={
                  <button type="button" className="text-[11px] font-medium transition-colors" style={{ color: "#6b6b80" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a0a0bc")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b6b80")}>Forgot password?</button>
                }
              />
              <button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                style={{ background: "#fff", color: "#0d0d11", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8e8f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
              
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                <span className="text-[11px] tracking-widest uppercase font-medium" style={{ color: "#3d3d50" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
              </div>
              
              <button type="button" onClick={() => { resetForm(); setMode('otp-send') }} className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#9090a8" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.08)"; el.style.color = "#c0c0d4"; el.style.borderColor = "rgba(255,255,255,0.15)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.05)"; el.style.color = "#9090a8"; el.style.borderColor = "rgba(255,255,255,0.09)"; }}
              >
                Sign in with OTP
              </button>
              
              <div className="space-y-3 text-center pt-1 mt-6">
                <button type="button" onClick={() => { resetForm(); setMode('verify-phone') }} className="text-xs transition-colors block w-full" style={{ color: "#3d3d50" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b6b80")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3d3d50")}>Verify your phone number?</button>
                <p className="text-xs" style={{ color: "#3d3d50" }}>Don't have an account? <button type="button" onClick={() => { resetForm(); navigate('/register') }} className="font-semibold transition-colors" style={{ color: "#7070a0" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a0a0c4")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7070a0")}>Sign up</button></p>
              </div>
            </form>
          )}

          {mode === 'otp-send' && (
            <form onSubmit={handleSendOtpLogin} className="space-y-4">
              <PhoneField label="Mobile Number" value={phone} onChange={setPhone} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="Phone number" error={getValidationError('phone', phone)} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                style={{ background: "#fff", color: "#0d0d11", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8e8f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}
              >
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
              <div className="space-y-3 text-center pt-1 mt-6">
                <button type="button" onClick={() => { resetForm(); navigate('/login') }} className="text-xs transition-colors block w-full" style={{ color: "#3d3d50" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b6b80")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3d3d50")}>Back to login</button>
                <p className="text-xs" style={{ color: "#3d3d50" }}>Don't have an account? <button type="button" onClick={() => { resetForm(); navigate('/register') }} className="font-semibold transition-colors" style={{ color: "#7070a0" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a0a0c4")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7070a0")}>Sign up</button></p>
              </div>
            </form>
          )}

          {mode === 'otp-verify' && (
            <form onSubmit={handleVerifyOtpLogin} className="space-y-4">
              <Field label="OTP Code" type="text" value={otp} onChange={setOtp} placeholder="Enter 6-digit code" error={getValidationError('otp', otp)} maxLength={6} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                style={{ background: "#fff", color: "#0d0d11", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8e8f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}
              >
                {isLoading ? 'Verifying...' : 'Verify & Sign in'}
              </button>
              <div className="space-y-3 text-center pt-1 mt-6">
                <button type="button" onClick={() => { setOtp(''); setMode('otp-send') }} className="text-xs transition-colors block w-full" style={{ color: "#3d3d50" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b6b80")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3d3d50")}>Resend OTP</button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Full Name" type="text" value={name} onChange={setName} placeholder="John Doe" error={getValidationError('name', name)} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <PhoneField label="Mobile Number" value={phone} onChange={setPhone} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="Phone number" error={getValidationError('phone', phone)} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" error={getValidationError('email', email)} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Create password" error={getValidationError('password', password)} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <TimezoneSelect value={timezone} onChange={setTimezone} />
              <button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                style={{ background: "#fff", color: "#0d0d11", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8e8f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
              <div className="space-y-3 text-center pt-1 mt-6">
                <p className="text-xs" style={{ color: "#3d3d50" }}>Already have an account? <button type="button" onClick={() => { resetForm(); navigate('/login') }} className="font-semibold transition-colors" style={{ color: "#7070a0" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a0a0c4")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#7070a0")}>Sign in</button></p>
              </div>
            </form>
          )}

          {mode === 'register-verify' && (
            <form onSubmit={handleVerifyRegister} className="space-y-4">
              <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#b0b0c4" }}>
                We sent a verification code to <span className="text-white font-medium">{fullPhone}</span>
              </div>
              <Field label="OTP Code" type="text" value={otp} onChange={setOtp} placeholder="Enter 6-digit code" error={getValidationError('otp', otp)} maxLength={6} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                style={{ background: "#fff", color: "#0d0d11", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8e8f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}
              >
                {isLoading ? 'Verifying...' : 'Verify & Complete'}
              </button>
              <div className="space-y-3 text-center pt-1 mt-6">
                <button type="button" onClick={() => { setPhone(''); setOtp(''); navigate('/register') }} className="text-xs transition-colors block w-full" style={{ color: "#3d3d50" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b6b80")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3d3d50")}>Back</button>
              </div>
            </form>
          )}

          {mode === 'verify-phone' && !verifyPhoneOtpSent && (
            <form onSubmit={handleSendVerifyPhoneOtp} className="space-y-4">
              <PhoneField label="Mobile Number" value={phone} onChange={setPhone} countryCode={countryCode} onCountryCodeChange={setCountryCode} placeholder="Phone number" error={getValidationError('phone', phone)} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                style={{ background: "#fff", color: "#0d0d11", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8e8f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}
              >
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
              <div className="space-y-3 text-center pt-1 mt-6">
                <button type="button" onClick={() => { resetForm(); navigate('/login') }} className="text-xs transition-colors block w-full" style={{ color: "#3d3d50" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b6b80")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3d3d50")}>Back to login</button>
              </div>
            </form>
          )}

          {mode === 'verify-phone' && verifyPhoneOtpSent && (
            <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
              <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#b0b0c4" }}>
                We sent a verification code to <span className="text-white font-medium">{fullPhone}</span>
              </div>
              <Field label="OTP Code" type="text" value={otp} onChange={setOtp} placeholder="Enter 6-digit code" error={getValidationError('otp', otp)} maxLength={6} inputStyle={inputStyle} inputFocus={inputFocus} inputBlur={inputBlur} />
              <button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mt-2"
                style={{ background: "#fff", color: "#0d0d11", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8e8f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}
              >
                {isLoading ? 'Verifying...' : 'Verify & Complete'}
              </button>
              <div className="space-y-3 text-center pt-1 mt-6">
                <button type="button" onClick={() => { setOtp(''); setVerifyPhoneOtpSent(false) }} className="text-xs transition-colors block w-full" style={{ color: "#3d3d50" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b6b80")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3d3d50")}>Resend OTP</button>
              </div>
            </form>
          )}
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
  rightLabel?: React.ReactNode
  inputStyle?: React.CSSProperties
  inputFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  inputBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

interface PhoneFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  countryCode: string
  onCountryCodeChange: (v: string) => void
  placeholder: string
  error?: string | null
  inputStyle?: React.CSSProperties
  inputFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  inputBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

import { useState as useReactState } from "react";

function PhoneField({ label, value, onChange, countryCode, onCountryCodeChange, placeholder, error, inputStyle, inputFocus, inputBlur }: PhoneFieldProps) {
  const [dropdownOpen, setDropdownOpen] = useReactState(false);
  
  // Custom list of countries exactly as requested
  const COUNTRIES = [
    { code: "IN", dial: "+91", flag: "🇮🇳" },
    { code: "US", dial: "+1",  flag: "🇺🇸" },
    { code: "GB", dial: "+44", flag: "🇬🇧" },
    { code: "AE", dial: "+971", flag: "🇦🇪" },
    { code: "SG", dial: "+65", flag: "🇸🇬" },
    { code: "AU", dial: "+61", flag: "🇦🇺" },
  ];
  
  const selectedCountry = COUNTRIES.find(c => c.dial.replace('+', '') === countryCode || c.dial === countryCode) || COUNTRIES[0];

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "#6b6b80" }}>
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 h-11 px-3 rounded-xl text-sm text-white transition-all focus:outline-none"
            style={{ ...inputStyle, minWidth: "86px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = dropdownOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.09)")}
          >
            <span className="text-base">{selectedCountry.flag}</span>
            <span className="font-medium text-xs" style={{ color: "#b0b0c4" }}>{selectedCountry.dial}</span>
            <ChevronDown size={12} style={{ color: "#555568" }} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute z-50 rounded-xl overflow-hidden py-1 shadow-2xl"
              style={{
                top: "calc(100% + 6px)",
                left: 0,
                minWidth: "150px",
                background: "#17171f",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
              }}
            >
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onCountryCodeChange(c.dial.replace('+', '')); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                  style={{ color: "#c8c8d8", background: "transparent" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <span>{c.flag}</span>
                  <span className="text-xs" style={{ color: "#6b6b80" }}>{c.code}</span>
                  <span className="ml-auto text-xs font-medium" style={{ color: "#9090a8" }}>{c.dial}</span>
                  {c.dial === selectedCountry.dial && (
                    <CheckCircle2 size={12} style={{ color: "#9090b8" }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-11 px-4 rounded-xl text-sm focus:outline-none transition-all placeholder:text-[#404050]"
          style={error ? { ...inputStyle, borderColor: "#eb5757" } : inputStyle}
          onFocus={inputFocus}
          onBlur={(e) => {
            if (inputBlur) inputBlur(e);
            if (error) e.target.style.borderColor = "#eb5757";
          }}
        />
      </div>
      {error && <p className="text-xs text-[#eb5757] mt-1">{error}</p>}
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, error, maxLength, rightLabel, inputStyle, inputFocus, inputBlur }: FieldProps) {
  const [showPassword, setShowPassword] = useReactState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "#6b6b80" }}>{label}</label>
        {rightLabel}
      </div>
      <div className="relative">
        <input
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full h-11 px-4 ${isPassword ? 'pr-11' : ''} rounded-xl text-sm focus:outline-none transition-all placeholder:text-[#404050]`}
          style={error ? { ...inputStyle, borderColor: "#eb5757" } : inputStyle}
          onFocus={inputFocus}
          onBlur={(e) => {
            if (inputBlur) inputBlur(e);
            if (error) e.target.style.borderColor = "#eb5757";
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "#404050" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#707085")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#404050")}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-[#eb5757] mt-1">{error}</p>}
    </div>
  )
}
