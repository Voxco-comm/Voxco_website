import React from 'react'
import { Building2, Globe, Lock, ShieldAlert, Sparkles, Tag } from 'lucide-react'
import { formatDecimal, formatPricePerUnit } from '@/lib/utils/formatNumber'
import {
  DetailPill,
  DetailSectionHeader,
  EmptyValue,
  PriceTile,
  RateRow,
  detailIconFor,
  type DetailTone,
} from './ui/NumberDetails'

// Admin inventory "Details" panel (expanded row / mobile card). Purely
// presentational: every value below is formatted exactly as it was in
// AdminDashboard's original inventoryPricingDetailContent.

export interface InventoryDetailsNumber {
  mrc: number
  nrc: number
  currency: string
  other_charges?: any
  features?: any
  supplier_mrc?: number | null
  supplier_nrc?: number | null
  supplier_currency?: string | null
  supplier_other_charges?: any
}

// Each card is its own size container so its rate list can go two-up when
// the card is wide (stacked layout) and stay single-column side by side.
const CARD = 'min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] [container-type:inline-size] sm:p-5'

const RATES_GRID =
  'grid grid-cols-1 gap-x-8 [&>*]:border-b [&>*]:border-slate-100 [&>*:last-child]:border-0 [@container(min-width:700px)]:grid-cols-2 [@container(min-width:700px)]:[&>*:nth-last-child(2)]:border-0'

function CurrencyAside({ label, value, tone }: { label: string; value: string; tone: DetailTone }) {
  return (
    <>
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {value && value !== '—' ? <DetailPill tone={tone}>{value}</DetailPill> : <EmptyValue />}
    </>
  )
}

function UsageRates({
  charges,
  qualifier,
  labels,
}: {
  charges: any
  qualifier: string
  labels: { call: string; fixed: string; mobile: string }
}) {
  return (
    <div className={RATES_GRID}>
      <RateRow icon={detailIconFor('inbound_call')} label={labels.call} qualifier={qualifier} value={formatPricePerUnit(charges.inbound_call, '', '/min')} />
      <RateRow icon={detailIconFor('outbound_call_fixed')} label={labels.fixed} qualifier={qualifier} value={formatPricePerUnit(charges.outbound_call_fixed, '', '/min')} />
      <RateRow icon={detailIconFor('outbound_call_mobile')} label={labels.mobile} qualifier={qualifier} value={formatPricePerUnit(charges.outbound_call_mobile, '', '/min')} />
      <RateRow icon={detailIconFor('inbound_sms')} label="Inbound SMS" qualifier={qualifier} value={formatPricePerUnit(charges.inbound_sms, '', ' per SMS')} />
      <RateRow icon={detailIconFor('outbound_sms')} label="Outbound SMS" qualifier={qualifier} value={formatPricePerUnit(charges.outbound_sms, '', ' per SMS')} />
      <RateRow
        icon={detailIconFor('other_fees')}
        label="Other fees"
        qualifier={qualifier}
        value={charges.other_fees != null && charges.other_fees !== '' ? String(charges.other_fees) : ''}
      />
    </div>
  )
}

export default function InventoryNumberDetails({ num }: { num: InventoryDetailsNumber }) {
  const otherCharges =
    typeof num.other_charges === 'object' && num.other_charges !== null ? (num.other_charges as any) : {}
  const supOther =
    typeof num.supplier_other_charges === 'object' && num.supplier_other_charges !== null
      ? (num.supplier_other_charges as any)
      : {}

  const reach = (num.features as any)?.reach || '—'
  const emergency = (num.features as any)?.emergency_services || '—'

  return (
    <div className="[container-type:inline-size]">
      <div className="grid grid-cols-1 gap-3 [@container(min-width:860px)]:grid-cols-2 [@container(min-width:860px)]:gap-4">
        {/* Supplier (admin-only) */}
        <section className={CARD} aria-label="Supplier rates and fees">
          <DetailSectionHeader
            icon={Building2}
            tone="supplier"
            title="Supplier rates & fees"
            badge={
              <DetailPill tone="supplier" icon={Lock}>
                Admin
              </DetailPill>
            }
            aside={<CurrencyAside label="Supplier currency" value={num.supplier_currency || '—'} tone="supplier" />}
          />
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <PriceTile tone="supplier" label="Supplier MRC" value={num.supplier_mrc != null ? formatDecimal(num.supplier_mrc, 2) : '—'} />
            <PriceTile tone="supplier" label="Supplier NRC" value={num.supplier_nrc != null ? formatDecimal(num.supplier_nrc, 2) : '—'} />
          </div>
          <div className="mt-3">
            <UsageRates
              charges={supOther}
              qualifier="(supplier)"
              labels={{ call: 'Inbound Call', fixed: 'Outbound Call Fixed', mobile: 'Outbound Call Mobile' }}
            />
          </div>
        </section>

        {/* Customer-facing */}
        <section className={CARD} aria-label="Customer pricing">
          <DetailSectionHeader
            icon={Tag}
            tone="customer"
            title="Customer pricing"
            aside={<CurrencyAside label="Customer currency" value={num.currency} tone="customer" />}
          />
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <PriceTile tone="customer" label="Customer MRC" value={formatDecimal(num.mrc, 2)} />
            <PriceTile tone="customer" label="Customer NRC" value={formatDecimal(num.nrc, 2)} />
          </div>
          <div className="mt-3">
            <UsageRates
              charges={otherCharges}
              qualifier="(customer)"
              labels={{ call: 'Inbound Call', fixed: 'Outbound Call (Fixed)', mobile: 'Outbound Call (Mobile)' }}
            />
          </div>
        </section>

        {/* Features */}
        <section
          className={`${CARD} flex flex-col gap-3 [@container(min-width:860px)]:col-span-2 [@container(min-width:600px)]:flex-row [@container(min-width:600px)]:items-center [@container(min-width:600px)]:gap-8`}
          aria-label="Features"
        >
          <DetailSectionHeader icon={Sparkles} title="Features" />
          <dl className="grid grid-cols-1 gap-3 [@container(min-width:420px)]:grid-cols-2 [@container(min-width:600px)]:flex [@container(min-width:600px)]:flex-wrap [@container(min-width:600px)]:items-center [@container(min-width:600px)]:gap-x-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Reach</dt>
              <dd className="min-w-0">
                {reach !== '—' ? <DetailPill icon={Globe}>{reach}</DetailPill> : <EmptyValue />}
              </dd>
            </div>
            <div className="flex min-w-0 items-center gap-2.5">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Emergency services</dt>
              <dd className="min-w-0">
                {emergency !== '—' ? <DetailPill icon={ShieldAlert}>{emergency}</DetailPill> : <EmptyValue />}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
