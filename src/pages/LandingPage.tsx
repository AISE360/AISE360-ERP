import { ChevronRight } from 'lucide-react'
import '../styles/fonts.css'
import Navbar from '../components/landing/Navbar'
import DashboardPreview from '../components/landing/DashboardPreview'

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4'
const POSTER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60'

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#ededed] p-3 sm:p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="relative h-[calc(100vh-24px)] w-full overflow-hidden rounded-2xl bg-[#d9d9d9] sm:h-[calc(100vh-32px)] sm:rounded-3xl">
        {/* Background video */}
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
        <div className="absolute inset-0 bg-white/10" />

        {/* Foreground */}
        <div className="relative z-10">
          <Navbar />

          {/* Hero content */}
          <div className="flex flex-col items-center px-4 pb-8 pt-10 text-center sm:pb-12 sm:pt-16">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-neutral-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#ef4d23]" />
              Convix Software
            </span>
            <h1
              className="mt-5 max-w-4xl text-neutral-900 sm:mt-6"
              style={{ fontSize: 'clamp(36px, 8vw, 72px)', lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.02em' }}
            >
              Shaping{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
                Agencies
              </span>
              <br />
              of tomorrow
            </h1>
            <p
              className="mt-4 px-2 text-neutral-700 sm:mt-6"
              style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}
            >
              The All-In-One Software Powering the Future of PR Agencies
            </p>
            <a
              href="#"
              className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#0b0f1a] py-2 pl-6 pr-2 text-[14px] font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 sm:mt-8 sm:py-2.5 sm:pl-7"
            >
              Get Started
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 sm:h-7 sm:w-7">
                <ChevronRight className="h-4 w-4" />
              </span>
            </a>
          </div>

          {/* Dashboard preview (bleeds off the bottom edge) */}
          <div className="px-3 pb-0 sm:px-4">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </div>
  )
}
