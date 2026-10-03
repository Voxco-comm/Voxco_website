import React, { ReactNode } from 'react'
import {
  Globe,
  MessageSquare,
  MessageSquareReply,
  PhoneIncoming,
  PhoneOutgoing,
  Receipt,
  ShieldAlert,
  Smartphone,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Presentation-only building blocks for number pricing/feature details,
// shared by the Admin inventory expanded row and the client Numbers modals.
// Nothing here fetches, computes prices, or reads state — every value is
// passed in already formatted by the caller.

export type DetailTone = 'supplier' | 'customer' | 'neutral'

const TONE = {
  supplier: {
    icon: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70',
    accent: 'bg-amber-400',
    tile: 'bg-amber-50/50 ring-1 ring-inset ring-amber-100',
  },
  customer: {
    icon: 'bg-[#215F9A]/10 text-[#215F9A] ring-1 ring-inset ring-[#215F9A]/15',
    accent: 'bg-[#215F9A]',
    tile: 'bg-[#215F9A]/[0.04] ring-1 ring-inset ring-[#215F9A]/10',
  },
  neutral: {
    icon: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/70',
    accent: 'bg-slate-300',
    tile: 'bg-slate-50 ring-1 ring-inset ring-slate-100',
  },
} as const

/** Quiet, intentional placeholder for an empty value. */
export function EmptyValue() {
  return (
    <span className="font-normal text-slate-300">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not set</span>
    </span>
  )
}

const isEmpty = (v: ReactNode) => v === null || v === undefined || v === '' || v === '—'

/** Small pill for categorical values (currency, reach, …). */
export function DetailPill({
  children,
  tone = 'neutral',
  icon: Icon,
}: {
  children: ReactNode
  tone?: DetailTone
  icon?: LucideIcon
}) {
  const toneClass =
    tone === 'supplier'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : tone === 'customer'
        ? 'border-[#215F9A]/20 bg-[#215F9A]/[0.06] text-[#1C4F80]'
        : 'border-slate-200 bg-white text-slate-700'
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}>
      {Icon && <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  )
}

/** Section header: tinted icon, title, optional badge and right-aligned slot. */
export function DetailSectionHeader({
  icon: Icon,
  title,
  tone = 'neutral',
  badge,
  aside,
}: {
  icon: LucideIcon
  title: ReactNode
  tone?: DetailTone
  badge?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE[tone].icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h4 className="truncate text-[13px] font-semibold text-slate-900">{title}</h4>
        {badge}
      </div>
      {aside && <div className="flex items-center gap-2">{aside}</div>}
    </div>
  )
}

/** Headline monetary value (MRC / NRC). */
export function PriceTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: ReactNode
  value: ReactNode
  tone?: DetailTone
}) {
  return (
    <div className={`min-w-0 rounded-lg px-3.5 py-3 ${TONE[tone].tile}`}>
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold leading-tight tracking-tight tabular-nums text-slate-900">
        {isEmpty(value) ? <EmptyValue /> : value}
      </p>
    </div>
  )
}

/** One label/value line in a usage-rate list. */
export function RateRow({
  icon: Icon,
  label,
  qualifier,
  sublabel,
  value,
}: {
  icon: LucideIcon
  label: ReactNode
  /** Muted trailing text kept from the original label, e.g. "(supplier)". */
  qualifier?: ReactNode
  sublabel?: ReactNode
  value: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[13px] leading-5 text-slate-600">
            {label}
            {qualifier && <span className="ml-1 text-slate-400">{qualifier}</span>}
          </p>
          {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
        </div>
      </div>
      <p className="max-w-[60%] shrink-0 break-words text-right text-[13px] font-semibold leading-5 tabular-nums text-slate-900">
        {isEmpty(value) ? <EmptyValue /> : value}
      </p>
    </div>
  )
}

export function RateList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-slate-100">{children}</div>
}

/** Small uppercase caption above a group. */
export function DetailCaption({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{children}</p>
}

/** Icon for a charge/feature key (inbound_call, outbound_sms, reach…). */
export function detailIconFor(key: string): LucideIcon {
  const k = key.toLowerCase()
  if (k.includes('sms')) return k.includes('inbound') ? MessageSquareReply : MessageSquare
  if (k.includes('mobile')) return Smartphone
  if (k.includes('call') || k.includes('voice')) return k.includes('inbound') ? PhoneIncoming : PhoneOutgoing
  if (k.includes('fee') || k.includes('charge')) return Receipt
  if (k.includes('reach')) return Globe
  if (k.includes('emergency')) return ShieldAlert
  return Zap
}
