import { useState } from 'react'
import { ChevronDown, ChevronRight, ShoppingCart, Menu } from 'lucide-react'

function FlowerMark() {
  const petals = Array.from({ length: 8 }, (_, k) => {
    const angle = (k / 8) * Math.PI * 2
    return { cx: 16 + 10 * Math.cos(angle), cy: 16 + 10 * Math.sin(angle) }
  })
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" aria-hidden="true">
      {petals.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={3.5} fill="#ef4d23" />
      ))}
      <circle cx={16} cy={16} r={3.5} fill="#ef4d23" />
    </svg>
  )
}

const LINKS = ['Home', 'Features', 'About', 'Pages']

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
      <nav className="relative w-full max-w-[760px] rounded-full border border-neutral-200 bg-white py-2 pl-2 pr-2 shadow-sm">
        <div className="flex items-center">
          <a href="#" className="flex shrink-0 items-center" aria-label="Convix home">
            <FlowerMark />
          </a>

          {/* Desktop links */}
          <div className="hidden items-center gap-6 pl-6 text-[14px] font-medium text-neutral-800 md:flex">
            {LINKS.map((link) =>
              link === 'Home' ? (
                <a key={link} href="#" className="flex items-center gap-1.5 text-neutral-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-black" />
                  {link}
                </a>
              ) : link === 'Pages' ? (
                <a key={link} href="#" className="flex items-center gap-1 text-[#ef4d23]">
                  {link}
                  <ChevronDown className="h-3.5 w-3.5" />
                </a>
              ) : (
                <a key={link} href="#" className="transition-colors hover:text-neutral-950">
                  {link}
                </a>
              ),
            )}
          </div>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" aria-label="Cart" className="hidden p-2 text-neutral-700 transition-colors hover:text-neutral-950 sm:block">
              <ShoppingCart className="h-5 w-5" />
            </button>
            <a
              href="#"
              className="flex items-center gap-2 rounded-full bg-[#ef4d23] py-1.5 pl-4 pr-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              <span className="hidden sm:inline">Get early access</span>
              <span className="sm:hidden">Early access</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <ChevronRight className="h-4 w-4" />
              </span>
            </a>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className="rounded-full p-2 text-neutral-800 transition-colors hover:bg-neutral-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="absolute left-2 right-2 top-full z-20 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-lg md:hidden">
            <div className="flex flex-col">
              {LINKS.map((link) => (
                <a
                  key={link}
                  href="#"
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-100 ${
                    link === 'Pages' ? 'text-[#ef4d23]' : 'text-neutral-800'
                  }`}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  )
}
