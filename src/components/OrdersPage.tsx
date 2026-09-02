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

const NETWORK_NODES = [
  { x: 50, y: 8 },
  { x: 85, y: 29 },
  { x: 85, y: 71 },
  { x: 50, y: 92 },
  { x: 15, y: 71 },
  { x: 15, y: 29 },
]

const ACCENT_NODE_INDEX = 2

function nodePath(x: number, y: number) {
  const dx = x - 50
  const dy = y - 50
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const cx = 50 + dx / 2 + px * 6
  const cy = 50 + dy / 2 + py * 6
  return `M 50 50 Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x} ${y}`
}

function NetworkVisual() {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-8 sm:p-10">
      <div className="relative mx-auto aspect-square w-full max-w-md">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" stroke="#E2E8F0" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="26" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="1 4" />
          {NETWORK_NODES.map((n, i) => (
            <path key={`path-${i}`} d={nodePath(n.x, n.y)} stroke="#BFDBFE" strokeWidth="0.5" />
          ))}
          {NETWORK_NODES.map((n, i) =>
            i === ACCENT_NODE_INDEX ? (
              <circle
                key={`halo-${i}`}
                cx={n.x}
                cy={n.y}
                r="6"
                fill="#F97316"
                opacity="0.15"
                className="motion-safe:animate-pulse"
              />
            ) : null
          )}
          {NETWORK_NODES.map((n, i) => (
            <circle
              key={`node-${i}`}
              cx={n.x}
              cy={n.y}
              r={i === ACCENT_NODE_INDEX ? 3.6 : 3}
              fill="white"
              stroke={i === ACCENT_NODE_INDEX ? '#F97316' : '#215F9A'}
              strokeWidth="1.4"
            />
          ))}
          {NETWORK_NODES.map((n, i) => (
            <circle
              key={`dot-${i}`}
              cx={n.x}
              cy={n.y}
              r={i === ACCENT_NODE_INDEX ? 1.4 : 1}
              fill={i === ACCENT_NODE_INDEX ? '#F97316' : '#215F9A'}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#215F9A] shadow-sm ring-4 ring-blue-50">
            <Globe className="h-9 w-9 text-white" strokeWidth={1.5} />
          </div>
        </div>
      </div>
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
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pt-6">
          <DraftOrdersBanner />
        </div>

        {/* Hero */}
        <section className="grid items-center gap-8 pt-10 pb-8 sm:gap-10 sm:pt-12 sm:pb-10 lg:grid-cols-2 lg:gap-14 lg:pt-16 lg:pb-12">
          <div>
            <div className="mb-5 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#215F9A]">
                Voxco Number Portal
              </span>
            </div>

            <h1 className="text-[2.25rem] font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
              Welcome back,
              <br />
              <span className="text-[#215F9A]">{userName}</span>
            </h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:max-w-lg sm:text-lg">
              Search and order phone numbers across multiple countries, then track
              everything in one streamlined place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleNumbersClick}
                disabled={loadingNumbers}
                className="group inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#215F9A] px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-[#1b4e80] hover:shadow-md active:scale-[0.98] active:bg-[#163f68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
              >
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
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <button
                onClick={handleViewOrdersClick}
                disabled={loadingOrders}
                className="inline-flex items-center justify-center gap-2.5 rounded-lg px-6 py-3 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
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
                    <FileText className="h-[18px] w-[18px]" strokeWidth={2} />
                    View My Orders
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <NetworkVisual />
          </div>
        </section>
      </div>

      {/* Benefits */}
      <div className="border-y border-slate-100 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="pt-10 pb-14 sm:pt-12 sm:pb-16">
            <div className="mb-8 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#215F9A]">
                Why Voxco
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                Designed for global number provisioning
              </h2>
            </div>

            <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
              {BENEFITS.map((benefit, i) => (
                <div
                  key={benefit.title}
                  className={`group flex flex-col gap-3 border-slate-200/70 sm:pl-8 ${i > 0 ? 'sm:border-l' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#215F9A] transition-colors group-hover:border-[#215F9A]/40">
                      <benefit.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </div>
                    <span className="font-mono text-[11px] tracking-wider text-slate-300">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{benefit.title}</h3>
                  <p className="max-w-xs text-sm leading-relaxed text-slate-600">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Get started */}
        <section className="py-14 sm:py-16">
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-8 sm:p-10 lg:p-12">
            <div className="mb-8 max-w-2xl">
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
                  <CheckCircle className="h-4 w-4 text-[#215F9A]" />
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
