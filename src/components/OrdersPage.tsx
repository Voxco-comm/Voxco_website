'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'
import {
  Hash,
  Globe,
  Search,
  Zap,
  Upload,
  CheckCircle,
  Check,
  ArrowRight,
  FileText,
} from 'lucide-react'
import DraftOrdersBanner from './DraftOrdersBanner'

const BENEFITS = [
  {
    icon: Globe,
    title: 'Global Coverage',
    description: 'Access phone numbers from multiple countries worldwide.',
  },
  {
    icon: Search,
    title: 'Easy Ordering',
    description: 'Simple search and order process with real-time tracking.',
  },
  {
    icon: Zap,
    title: 'Fast Processing',
    description: 'Quick approval and provisioning of your number orders.',
  },
] as const

const STEPS = [
  {
    num: '01',
    icon: Search,
    title: 'Browse numbers',
    description: 'Explore our extensive catalog of phone numbers across multiple countries.',
  },
  {
    num: '02',
    icon: Hash,
    title: 'Select & order',
    description: 'Choose your preferred country and number type, then place your order.',
  },
  {
    num: '03',
    icon: Upload,
    title: 'Upload requirements',
    description: 'Provide the required documents to complete your submission.',
  },
  {
    num: '04',
    icon: CheckCircle,
    title: 'Review & processing',
    description: 'Our team reviews your request and processes it promptly.',
  },
] as const

const HIGHLIGHTS = ['No setup fees', '24/7 Support', 'Fast Approval']

// Hero background: a premium network/node photo (public/Hero-background.png)
// as a full-bleed cover image, biased toward showing its glowing node
// cluster on the right, with a dark navy gradient layered on top so the
// left-side text keeps strong contrast. Purely decorative — no state,
// behavior, or content of its own.
function HeroNetworkMap() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: 'url(/Hero-background.png)',
          backgroundPosition: '75% 42%',
        }}
      />
    </div>
  )
}

export default function OrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loadingNumbers, setLoadingNumbers] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)

  const handleNumbersClick = () => {
    setLoadingNumbers(true)
    router.push('/numbers')
  }

  const handleViewOrdersClick = () => {
    setLoadingOrders(true)
    router.push('/orders')
  }

  const userName = (user?.user_metadata as { name?: string })?.name || user?.email

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#050B18]">
        <HeroNetworkMap />

        {/* Dark navy gradient over the photo, strongest on the left so the
            headline/body copy stays highly readable, easing off toward the
            node cluster on the right. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#050B18] via-[#050B18]/88 to-[#050B18]/25 sm:via-[#050B18]/78 sm:to-[#050B18]/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#050B18]/40 via-transparent to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050B18] to-transparent"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl pt-12 sm:max-w-2xl sm:pt-16 lg:pt-20">
            <div className="mb-5 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]">
                Voxco Number Portal
              </span>
            </div>

            <h1 className="text-[2.25rem] font-bold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
              Welcome back,
              <br />
              <span className="text-[#4FA0F0]">{userName}</span>
            </h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300 sm:max-w-lg sm:text-lg">
              Search and order phone numbers across multiple countries, then track
              everything in one streamlined place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleNumbersClick}
                disabled={loadingNumbers}
                className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-lg bg-gradient-to-b from-[#2C74B3] to-[#1C4F80] px-6 py-3 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_14px_-4px_rgba(8,22,42,0.65)] transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 hover:from-[#3A87CE] hover:to-[#215F9A] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_12px_30px_-8px_rgba(79,160,240,0.6)] motion-safe:active:translate-y-0 active:scale-[0.98] active:from-[#245D93] active:to-[#163f68] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),0_2px_8px_-3px_rgba(8,22,42,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4FA0F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B18] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
              >
                {/* Soft one-shot light sweep on hover */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-safe:group-hover:animate-[shimmer_1.15s_ease]"
                  style={{
                    backgroundImage: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.32) 50%, transparent 65%)',
                    backgroundSize: '250% 100%',
                  }}
                />
                {loadingNumbers ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <Hash className="h-[18px] w-[18px]" strokeWidth={2} />
                    Search &amp; Order Numbers
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out motion-safe:group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <button
                onClick={handleViewOrdersClick}
                disabled={loadingOrders}
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-[15px] font-semibold text-white backdrop-blur-sm transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.12] hover:shadow-[0_10px_28px_-10px_rgba(79,160,240,0.45)] motion-safe:active:translate-y-0 active:scale-[0.98] active:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B18] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
              >
                {loadingOrders ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <FileText className="h-[18px] w-[18px] text-white/90 transition-all duration-300 ease-out group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(126,178,255,0.65)]" strokeWidth={2} />
                    View My Orders
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Glass feature strip */}
          <div className="relative mt-12 pb-10 sm:mt-14 sm:pb-12 lg:mt-16 lg:pb-14">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
              <div className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {BENEFITS.map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-4 p-6 sm:p-7">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#7EB2FF]">
                      <benefit.icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{benefit.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pt-8">
          <DraftOrdersBanner />
        </div>

        {/* Get started */}
        <section className="py-14 sm:py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="mb-10 max-w-2xl">
              <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                Get started in minutes
              </h2>
              <p className="leading-relaxed text-slate-600">
                Browse our extensive catalog of phone numbers, select your preferred
                country and number type, upload required documents, and place your
                order. Our team will review and process your request promptly.
              </p>
            </div>

            {/* Desktop: horizontal steps with a connecting rail */}
            <div className="mb-10 hidden sm:flex sm:items-start">
              {STEPS.map((step, i) => (
                <React.Fragment key={step.title}>
                  <div className="flex flex-1 flex-col">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-[#215F9A] bg-white text-[#215F9A]">
                      <step.icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="mt-4">
                      <span className="block font-mono text-[11px] tracking-wider text-slate-400">
                        {step.num}
                      </span>
                      <h3 className="mt-1 font-semibold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="relative flex w-10 shrink-0 items-center pt-[22px] sm:w-14">
                      <div className="h-px w-full bg-blue-100" />
                      <ArrowRight className="absolute left-1/2 top-[22px] h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-blue-300" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Mobile: vertical steps */}
            <div className="mb-10 flex flex-col gap-6 sm:hidden">
              {STEPS.map((step) => (
                <div key={step.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#215F9A] bg-white text-[#215F9A]">
                    <step.icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[11px] tracking-wider text-slate-400">
                        {step.num}
                      </span>
                      <h3 className="font-semibold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-200 pt-6">
              {HIGHLIGHTS.map((highlight) => (
                <div key={highlight} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#215F9A]">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </span>
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
