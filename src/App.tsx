import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'

// App layout
import AppLayout from '@/components/layout/AppLayout'

// App pages
import DashboardPage from '@/pages/DashboardPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProjectDetailPage from '@/pages/ProjectDetailPage'
import TasksPage from '@/pages/TasksPage'
import DailyLogPage from '@/pages/DailyLogPage'
import ClientsPage from '@/pages/ClientsPage'
import FinancePage from '@/pages/FinancePage'
import ExpensesPage from '@/pages/ExpensesPage'
import InvoicesPage from '@/pages/InvoicesPage'
import FollowUpsPage from '@/pages/FollowUpsPage'
import NetworkingPage from '@/pages/NetworkingPage'
import BNIPage from '@/pages/BNIPage'
import CampaignsPage from '@/pages/CampaignsPage'
import ReconciliationPage from '@/pages/ReconciliationPage'
import TeamPage from '@/pages/TeamPage'
import FinancialPerformancePage from '@/pages/FinancialPerformancePage'
import IdeasPage from '@/pages/IdeasPage'
import CredentialsPage from '@/pages/CredentialsPage'
import LandingPage from '@/pages/LandingPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()
  const [stuck, setStuck] = useState(false)

  // Failsafe: if auth check hangs (slow network / blocked storage /
  // missing env), never leave the user on an infinite spinner. After 7s
  // offer a way out; after 10s force-stop loading so the redirect below runs.
  useEffect(() => {
    if (!loading) {
      setStuck(false)
      return
    }
    const warnTimer = setTimeout(() => setStuck(true), 7000)
    const forceTimer = setTimeout(() => useAuthStore.getState().setLoading(false), 10000)
    return () => {
      clearTimeout(warnTimer)
      clearTimeout(forceTimer)
    }
  }, [loading])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      {stuck && (
        <div className="text-center">
          <p className="text-sm text-gray-500">Taking too long to verify login…</p>
          <Link to="/login" state={{ from: location.pathname }} replace className="text-sm text-brand-600 hover:underline font-medium">
            Go to Login
          </Link>
        </div>
      )}
    </div>
  )
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

function CatchAll() {
  const { user, loading } = useAuthStore()
  if (loading) return null
  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

async function fetchProfile(userId: string, email: string, fullNameFallback: string) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (profile) return profile
    // Auto-create profile if missing (trigger may have been dropped)
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ id: userId, email, full_name: fullNameFallback })
      .select()
      .single()
    return newProfile
  } catch (err) {
    console.error('Failed to fetch profile:', err)
    return null
  }
}

// Race any promise against a timeout so a hung Supabase request
// (offline, blocked third-party storage, bad env) can't hang auth forever.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!)) as Promise<T>
}

export default function App() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Absolute failsafe: never stay in `loading` forever. If Supabase hangs
    // (offline, blocked storage, missing env on Netlify), force auth
    // resolution so ProtectedRoute can redirect to /login instead of
    // spinning infinitely on a deep link like /financial-performance.
    const failsafe = setTimeout(() => {
      if (mounted && useAuthStore.getState().loading) {
        console.warn('Auth init failsafe fired — forcing loading=false')
        setLoading(false)
      }
    }, 8000)

    const init = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Misconfigured deploy — go straight to login, don't spin.
          if (mounted) setLoading(false)
          return
        }
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          7000,
          'getSession'
        )
        if (!mounted) return
        if (session?.user) {
          const profile = await withTimeout(
            fetchProfile(
              session.user.id,
              session.user.email!,
              session.user.user_metadata?.full_name || session.user.email!.split('@')[0]
            ),
            7000,
            'fetchProfile'
          )
          if (mounted) setUser(profile ?? null)
        }
      } catch (err) {
        console.error('Auth init failed:', err)
      } finally {
        if (mounted) {
          setLoading(false)
          clearTimeout(failsafe)
        }
      }
    }
    init()

    // Listen for auth changes
    let subscription: { unsubscribe: () => void } | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
          if (session?.user) {
            const profile = await withTimeout(
              fetchProfile(
                session.user.id,
                session.user.email!,
                session.user.user_metadata?.full_name || session.user.email!.split('@')[0]
              ),
              7000,
              'fetchProfile'
            )
            if (mounted) setUser(profile ?? null)
          } else {
            if (mounted) setUser(null)
          }
        } catch (err) {
          console.error('Auth state change failed:', err)
        } finally {
          if (mounted) setLoading(false)
        }
      })
      subscription = data.subscription
    } catch (err) {
      console.error('Failed to subscribe to auth changes:', err)
      if (mounted) setLoading(false)
    }

    return () => {
      mounted = false
      clearTimeout(failsafe)
      subscription?.unsubscribe()
    }
  }, [setUser, setLoading])

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Public landing */}
        <Route path="/" element={<LandingPage />} />

        {/* App */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="daily-log" element={<DailyLogPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="financial-performance" element={<FinancialPerformancePage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="follow-ups" element={<FollowUpsPage />} />
          <Route path="networking" element={<NetworkingPage />} />
          <Route path="bni" element={<BNIPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="reconciliation" element={<ReconciliationPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="ideas" element={<IdeasPage />} />
          <Route path="credentials" element={<CredentialsPage />} />
        </Route>

        <Route path="*" element={<CatchAll />} />
      </Routes>
    </BrowserRouter>
  )
}
