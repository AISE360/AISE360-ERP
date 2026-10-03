import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import '../../styles/fonts.css'

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4'
const POSTER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60'

// Normalize Indian 10-digit numbers to E.164, pass through +E.164 as-is.
function toE164(raw: string): string | null {
  const t = raw.replace(/[\s-]/g, '')
  if (/^\+\d{7,15}$/.test(t)) return t
  const digits = t.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return null
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuthStore()
  const from = (location.state as { from?: string })?.from ?? '/dashboard'

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (!authLoading && user) {
    return <Navigate to={from} replace />
  }

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    setInfo('')
    const e164 = toE164(phone)
    if (!fullName.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!e164) {
      setError('Enter a valid phone number (10-digit mobile or +country code).')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: {
          data: { full_name: fullName.trim() },
          channel: 'sms',
        },
      })
      if (error) {
        setError(
          error.message +
            (error.message.toLowerCase().includes('provider') ||
            error.message.toLowerCase().includes('sms') ||
            error.message.toLowerCase().includes('sender')
              ? ' — Ask admin to add the Twilio sender number in Supabase Auth → SMS settings.'
              : '')
        )
      } else {
        setPhone(e164)
        setStep('otp')
        setCooldown(30)
        setInfo(`OTP sent to ${e164}. Enter the 6-digit code.`)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send OTP. Check connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (otp.trim().length < 6) {
      setError('Enter the 6-digit OTP.')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp.trim(),
        type: 'sms',
      })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        // Ensure profile row exists with name + phone (trigger usually does this).
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            full_name:
              fullName.trim() ||
              (data.user.user_metadata as any)?.full_name ||
              phone,
            phone,
          },
          { onConflict: 'id' }
        )
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      setError(err?.message ?? 'Verification failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <video
        ref={(v) => {
          if (v) {
            v.muted = true
            ;(v as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true
            v.play().catch(() => {})
          }
        }}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        src={BG_VIDEO}
        poster={POSTER}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disableRemotePlayback
        {...({ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' } as Record<string, string>)}
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-medium text-white shadow-sm backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[#ef4d23]" />
          AISE360 Executive Hub
        </span>
        <h1
          className="mt-4 text-white"
          style={{ fontSize: 'clamp(30px, 6vw, 44px)', lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.02em' }}
        >
          Welcome{' '}
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
            back.
          </span>
        </h1>

        <div className="card mt-6 p-6 text-left relative">
          <span className="sticker sticker-pink rotate-3 absolute -top-3 right-6">
            OTP login
          </span>
          <div className="mb-4 flex items-center gap-3">
            <img
              src="/logo.png"
              alt="AISE360 PVT LTD"
              className="h-10 w-10 rounded-xl object-contain shadow-sm"
            />
            <div>
              <p className="text-sm font-bold text-gray-900">AISE360 PVT LTD</p>
              <p className="text-xs text-gray-500">
                {step === 'phone' ? 'Enter name + mobile to get OTP' : 'Enter the OTP'}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}
          {info && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{info}</div>
          )}

          {step === 'phone' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="label">Your Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Jitendra Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="label">Mobile Number</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="10-digit mobile or +9198XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  inputMode="tel"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Indian numbers auto-format to +91. OTP arrives by SMS.
                </p>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="label">OTP sent to {phone}</label>
                <input
                  type="text"
                  className="input text-center text-2xl tracking-[0.5em]"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-gray-500 hover:underline"
                  onClick={() => {
                    setStep('phone')
                    setOtp('')
                    setError('')
                    setInfo('')
                  }}
                >
                  ← Change number
                </button>
                <button
                  type="button"
                  className="text-brand-600 hover:underline font-medium disabled:opacity-50"
                  disabled={loading || cooldown > 0}
                  onClick={() => sendOtp()}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
