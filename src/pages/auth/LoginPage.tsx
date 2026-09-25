import { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import '../../styles/fonts.css'

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4'
const POSTER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuthStore()
  const from = (location.state as { from?: string })?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already signed in → don't sit on /login, go where they came from.
  // This also handles deep links: /financial-performance → /login → back.
  if (!authLoading && user) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      setError(err?.message ?? 'Sign in failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Video background */}
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

      {/* Foreground */}
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

        <div className="card mt-6 p-6 text-left">
          <div className="mb-4 flex items-center gap-3">
            <img
              src="/logo.png"
              alt="AISE360 PVT LTD"
              className="h-10 w-10 rounded-xl object-contain shadow-sm"
            />
            <div>
              <p className="text-sm font-bold text-gray-900">AISE360 PVT LTD</p>
              <p className="text-xs text-gray-500">Sign in to continue</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
