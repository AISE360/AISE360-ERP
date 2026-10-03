import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import '../../styles/fonts.css'

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4'
const POSTER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60'

// Normalize Indian 10-digit numbers to E.164, pass through +E.164 as-is.
// Empty input stays empty (mobile is optional — saved to profile only).
function toE164(raw: string): string | null {
  const t = raw.trim().replace(/[\s-]/g, '')
  if (!t) return null
  if (/^\+\d{7,15}$/.test(t)) return t
  const digits = t.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return null
}

// Supabase Auth sometimes returns an empty `{}` body on SMS/provider 500s.
// Never show raw `{}` to the user — map it to something actionable.
function friendlySendError(message: string): string {
  const m = (message || '').trim()
  if (!m || m === '{}') {
    return 'Could not send the code (auth server error). Phone-SMS is not set up yet — use email OTP instead, or ask the admin to add an SMS sender in Supabase.'
  }
  const low = m.toLowerCase()
  if (low.includes('phone provider') || low.includes('sms') || low.includes('sender') || low.includes('twilio')) {
    return `${m} — Phone-SMS is not set up yet. Use email OTP instead, or ask the admin to add a Twilio sender number in Supabase Auth → SMS settings.`
  }
  return m
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuthStore()
  const from = (location.state as { from?: string })?.from ?? '/dashboard'

  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
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
    const cleanEmail = email.trim().toLowerCase()
    if (!fullName.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address — the OTP will arrive there.')
      return
    }
    let e164: string | null = null
    if (phone.trim()) {
      e164 = toE164(phone)
      if (!e164) {
        setError('Mobile looks invalid (10-digit mobile or +country code) — fix it or leave it blank.')
        return
      }
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          data: { full_name: fullName.trim(), phone: e164 },
        },
      })
      if (error) {
        setError(friendlySendError(error.message))
      } else {
        setEmail(cleanEmail)
        if (e164) setPhone(e164)
        setStep('otp')
        setCooldown(30)
        setInfo(`OTP sent to ${cleanEmail}. Enter the 6-digit code.`)
      }
    } catch (err: any) {
      setError(friendlySendError(err?.message ?? ''))
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
        email,
        token: otp.trim(),
        type: 'email',
      })
      if (error) {
        setError(error.message && error.message !== '{}' ? error.message : 'Invalid or expired code. Resend and try again.')
      } else if (data.user) {
        // Ensure profile row exists with name + email + phone (trigger usually does this).
        const e164 = phone.startsWith('+') ? phone : toE164(phone)
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email,
            full_name:
              fullName.trim() ||
              (data.user.user_metadata as any)?.full_name ||
              email.split('@')[0],
            phone: e164,
          },
          { onConflict: 'id' }
        )
        // Log the sign-in so contact@aise.com gets an alert email.
        // Best-effort: never block login if this fails.
        try {
          await supabase.from('login_events').insert({
            user_id: data.user.id,
            email,
            phone: e164,
          })
        } catch {
          /* alert is best-effort */
        }
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      setError(err?.message && err.message !== '{}' ? err.message : 'Verification failed. Try again.')
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
                {step === 'details' ? 'Enter name + email to get OTP' : 'Enter the OTP'}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
          )}
          {info && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{info}</div>
          )}

          {step === 'details' ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="label">Your Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Sufiyaan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The 6-digit OTP arrives by email.
                </p>
              </div>
              <div>
                <label className="label">Mobile Number (optional)</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="10-digit mobile or +9198XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Saved to your profile. SMS OTP activates once a sender is added.
                </p>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="label">OTP sent to {email}</label>
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
                    setStep('details')
                    setOtp('')
                    setError('')
                    setInfo('')
                  }}
                >
                  ← Change details
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
