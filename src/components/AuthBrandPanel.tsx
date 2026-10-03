import { Globe, ShieldCheck, Zap } from 'lucide-react'

// Brand / visual side of the authentication pages. Purely decorative and
// presentational — no state, behavior, or auth logic lives here.

const CAPABILITIES = [
  { icon: Globe, label: 'International number coverage' },
  { icon: ShieldCheck, label: 'Compliance-ready provisioning' },
  { icon: Zap, label: 'Fast approval & real-time tracking' },
] as const

// Shared network photo (same asset as the dashboard hero) under navy
// gradients, so the auth pages and the portal read as one product.
function NetworkBackdrop({ position }: { position: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{ backgroundImage: 'url(/Hero-background.png)', backgroundPosition: position }}
      />
    </div>
  )
}

// Faint wireframe globe with a few routed connections between points of
// presence. One orange "origin" node carries the brand accent.
function ConnectivityGlobe({ id, className = '' }: { id: string; className?: string }) {
  const fillId = `${id}-globe-fill`
  const routeId = `${id}-route`
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 520 520"
      fill="none"
      className={`pointer-events-none ${className}`}
    >
      <defs>
        <radialGradient id={fillId} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#4FA0F0" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#215F9A" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#050B18" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={routeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4FA0F0" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <circle cx="260" cy="260" r="236" fill={`url(#${fillId})`} />

      {/* Meridians + parallels */}
      <g stroke="#9CC7F5" strokeOpacity="0.16" strokeWidth="1">
        <circle cx="260" cy="260" r="236" strokeOpacity="0.28" />
        <ellipse cx="260" cy="260" rx="176" ry="236" />
        <ellipse cx="260" cy="260" rx="104" ry="236" />
        <ellipse cx="260" cy="260" rx="34" ry="236" />
        <ellipse cx="260" cy="260" rx="236" ry="78" />
        <ellipse cx="260" cy="260" rx="236" ry="160" strokeOpacity="0.1" />
        <path d="M24 260h472" />
      </g>

      {/* Routes */}
      <g stroke={`url(#${routeId})`} strokeWidth="1.4" strokeLinecap="round">
        <path d="M150 196 C 210 120, 300 110, 366 168" />
        <path d="M150 196 C 196 260, 268 316, 344 330" strokeOpacity="0.7" />
        <path d="M150 196 C 150 290, 186 362, 230 398" strokeOpacity="0.55" />
      </g>
      <path
        d="M366 168 C 400 220, 392 286, 344 330"
        stroke="#4FA0F0"
        strokeOpacity="0.45"
        strokeWidth="1"
        strokeDasharray="3 5"
      />

      {/* Points of presence */}
      <g fill="#CFE5FF">
        <circle cx="366" cy="168" r="3.5" />
        <circle cx="344" cy="330" r="3.5" />
        <circle cx="230" cy="398" r="3" />
        <circle cx="300" cy="96" r="2" fillOpacity="0.6" />
        <circle cx="430" cy="262" r="2" fillOpacity="0.6" />
        <circle cx="96" cy="300" r="2" fillOpacity="0.5" />
      </g>
      <g stroke="#4FA0F0" strokeOpacity="0.5">
        <circle cx="366" cy="168" r="9" />
        <circle cx="344" cy="330" r="9" />
      </g>

      {/* Origin node */}
      <circle cx="150" cy="196" r="14" fill="#F97316" fillOpacity="0.14" className="motion-safe:animate-pulse" />
      <circle cx="150" cy="196" r="5" fill="#F97316" />
    </svg>
  )
}

export function AuthBrandPanel() {
  return (
    // Sticky on desktop so it stays in view while a longer form (Sign Up) scrolls.
    <aside className="relative hidden overflow-hidden bg-[#050B18] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <NetworkBackdrop position="62% 40%" />

      {/* Navy wash: lets the node cluster glow through at the top while
          giving the copy at the bottom a solid, readable base. */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#050B18]/70 via-[#050B18]/45 to-[#050B18]" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#050B18]/80 via-transparent to-transparent" />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-[#215F9A]/25 blur-[110px]"
      />

      <ConnectivityGlobe id="auth-panel" className="absolute -bottom-[12%] -right-32 w-[min(540px,60%)] opacity-75 xl:-right-20" />

      {/* Hairline separating the panel from the form side */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      <div className="relative flex flex-1 flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
        <img src="/logo.png" alt="Voxco logo" className="-ml-1 h-12 w-auto self-start" />

        <div className="max-w-lg pb-2 xl:max-w-xl">
          <div className="mb-5 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]">
              Voxco Number Portal
            </span>
          </div>

          <h2 className="text-[2.25rem] font-bold leading-[1.12] tracking-tight text-white xl:text-[2.75rem]">
            Phone numbers for every market,
            <span className="text-[#4FA0F0]"> managed in one place.</span>
          </h2>

          <p className="mt-5 max-w-sm text-base leading-relaxed text-slate-300/90 [@media(max-height:560px)]:hidden">
            Search, order and provision numbers across multiple countries with a reliable,
            compliance-first workflow.
          </p>

          <ul className="mt-9 space-y-3 [@media(max-height:680px)]:hidden">
            {CAPABILITIES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[15px] text-slate-200">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Icon className="h-4 w-4 text-[#7DB8F5]" strokeWidth={2} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}

// Compact brand header for small screens (< lg), sitting above the form.
export function AuthBrandBand() {
  return (
    // On phones this is a header band; from sm up it becomes `static`, so its
    // absolute backdrop layers fill the whole (relative) page behind the card.
    <div className="relative overflow-hidden bg-[#050B18] sm:static sm:bg-transparent lg:hidden">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden sm:bg-[#050B18]">
        <NetworkBackdrop position="72% 40%" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050B18] via-[#050B18]/75 to-[#050B18]/20" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050B18]/70 to-transparent sm:inset-0 sm:h-auto sm:bg-gradient-to-b sm:from-[#050B18]/10 sm:via-[#050B18]/60 sm:to-[#050B18]" />
        <div className="absolute -bottom-32 left-1/2 hidden h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[#215F9A]/25 blur-[110px] sm:block" />
        <ConnectivityGlobe id="auth-band" className="absolute -right-16 -top-10 w-64 opacity-60 sm:-right-10 sm:w-96" />
      </div>

      <div className="relative px-6 pb-16 pt-8 sm:px-10 sm:pb-10 sm:pt-10">
        <img src="/logo.png" alt="Voxco logo" className="-ml-1 h-10 w-auto" />
        <div className="mt-8 flex items-center gap-2 sm:mt-10">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F97316]">
            Voxco Number Portal
          </span>
        </div>
        <p className="mt-3 max-w-xs text-xl font-semibold leading-snug tracking-tight text-white sm:max-w-sm sm:text-2xl">
          Phone numbers for every market, <span className="text-[#4FA0F0]">in one place.</span>
        </p>
      </div>
    </div>
  )
}
