'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import NumberFileUpload from './NumberFileUpload'
import DocumentsModal from './DocumentsModal'
import LoadingSpinner, { TableSkeleton } from './ui/LoadingSpinner'
import { EmptyState } from './ui/Alert'
import { formatDecimal, formatPricePerUnit } from '@/lib/utils/formatNumber'
import SelectWithCustom from './ui/SelectWithCustom'
import DualScrollbar from './ui/DualScrollbar'
import { PaginationBar } from './ui/Pagination'
import InventoryNumberDetails from './InventoryNumberDetails'
import { getCountryFlagEmoji } from '@/lib/utils/countryFlag'
import {
  Package,
  Globe,
  Landmark,
  Search,
  RotateCcw,
  Plus,
  Upload,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  CircleCheckBig,
  CircleX,
  Hourglass,
  FileCheck,
  Clock,
  Ban,
  Users as UsersIcon,
  Settings as SettingsIcon,
  Mail,
  Send,
  Building2,
  MessageSquare,
  Phone,
  ArrowLeft,
  ArrowRightLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Check,
  CreditCard,
  Receipt,
  KeyRound,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Files,
  StickyNote,
  ClipboardList,
  PackagePlus,
  Boxes,
  MapPin,
  UserCircle2,
  ListFilter,
} from 'lucide-react'

// Default options for dropdown fields
const BILL_PULSE_OPTIONS = [
  '7/3',
  '7/7',
  '7/15',
  '15/3',
  '15/7',
  '15/15',
  '30/7',
  '30/15',
  '30/30',
  '30/45',
  'PrePay',
  'None',
]

// Currencies available for supplier/customer pricing. Extend this list to add more.
const CURRENCY_OPTIONS = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'AED',
  'SAR', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'ZAR', 'BRL', 'MXN',
  'RUB', 'TRY', 'PLN', 'THB', 'MYR', 'IDR', 'PHP', 'KRW', 'NGN', 'KES',
  'EGP', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'ILS', 'CZK', 'HUF', 'RON',
]

const FEATURE_OPTIONS = {
  voice: ['Supported', 'Not supported', 'N/A'],
  sms: ['Enabled', 'Disabled', 'N/A'],
  reach: ['International', 'Local', 'N/A'],
  emergency_services: ['Supported', 'Not Available', 'Required', 'Optional', 'N/A'],
}

// Base options for the inventory dropdowns. Custom values can be added on top
// of these via SelectWithCustom.
const NUMBER_TYPE_OPTIONS = ['Geographic', 'National', 'Local', 'Mobile', 'Toll-Free', 'Non-Geographic', '2WV']
const SMS_VOICE_OPTIONS = ['SMS only', 'Voice only', 'Both']
const DIRECTION_OPTIONS = ['Inbound only', 'Outbound only', 'Both']

interface Country {
  id: string
  name: string
  country_code: string
  regulator: string | null
}

interface OtherCharges {
  inbound_call?: number | null
  outbound_call_fixed?: number | null
  outbound_call_mobile?: number | null
  inbound_sms?: number | null
  outbound_sms?: number | null
  other_fees?: string | null
}

// Form-state version: keep user input as strings so decimals like "1." don't get lost
interface OtherChargesForm {
  inbound_call?: string
  outbound_call_fixed?: string
  outbound_call_mobile?: string
  inbound_sms?: string
  outbound_sms?: string
  other_fees?: string
}

interface Features {
  voice?: string | null
  sms?: string | null
  reach?: string | null
  emergency_services?: string | null
}

interface NumberFormData {
  country_id: string
  available_numbers: string  // Store as string to allow empty
  number_type: string
  sms_capability: string
  direction: string
  mrc: string  // Store as string to allow empty/decimal
  nrc: string  // Store as string to allow empty/decimal
  currency: string
  moq: string  // Store as string to allow empty
  supplier_mrc?: string
  supplier_nrc?: string
  supplier_currency?: string
  supplier?: string
  specification?: string
  bill_pulse?: string
  requirements_text?: string
  other_charges: OtherChargesForm
  supplier_other_charges: OtherChargesForm
  features: Features
}

const DECIMAL_INPUT_RE = /^\d*(?:[.,]?\d*)?$/
const normalizeDecimalInput = (value: string) => value.replace(/,/g, '.')

// Helper to convert string to number for saving
const parseNumberField = (value: string, defaultValue: number = 0): number => {
  if (value === '' || value === null || value === undefined) return defaultValue
  const parsed = parseFloat(normalizeDecimalInput(String(value)))
  return isNaN(parsed) ? defaultValue : parsed
}

const parseIntField = (value: string, defaultValue: number = 1): number => {
  if (value === '' || value === null || value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

const parseNullableNumberField = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const s = normalizeDecimalInput(String(value)).trim()
  if (!s) return null
  const parsed = parseFloat(s)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeOtherChargesForDb = (oc: any): OtherCharges => {
  const otherFees = oc?.other_fees
  return {
    inbound_call: parseNullableNumberField(oc?.inbound_call),
    outbound_call_fixed: parseNullableNumberField(oc?.outbound_call_fixed),
    outbound_call_mobile: parseNullableNumberField(oc?.outbound_call_mobile),
    inbound_sms: parseNullableNumberField(oc?.inbound_sms),
    outbound_sms: parseNullableNumberField(oc?.outbound_sms),
    other_fees: otherFees === null || otherFees === undefined || String(otherFees).trim() === '' ? null : String(otherFees),
  }
}

interface CountryFormData {
  name: string
  country_code: string
  regulator: string
}

interface Number {
  id: string
  number?: string
  available_numbers: number
  number_type: string
  sms_capability: string
  direction: string
  mrc: number
  nrc: number
  currency: string
  moq: number
  supplier?: string
  specification?: string
  bill_pulse?: string
  requirements_text?: string
  other_charges?: any
  features?: any
  is_available: boolean
  is_reserved: boolean
  country_name: string
  country_code: string
  country_id: string
  supplier_mrc?: number | null
  supplier_nrc?: number | null
  supplier_currency?: string | null
  supplier_other_charges?: any
}

interface UploadedDocumentInfo {
  requirement_key: string
  title: string
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
}

interface UploadedDocuments {
  documents: UploadedDocumentInfo[]
  customer_type: 'individual' | 'business'
  notes?: string
  documents_deleted?: boolean
  deleted_at?: string
  other_documents?: UploadedDocumentInfo[]
}

interface Order {
  id: string
  customer_id: string
  number_id: string
  quantity: number
  status: string
  mrc_at_order: number
  nrc_at_order: number
  currency_at_order: string
  created_at: string
  customer_name: string
  customer_email: string
  phone_number: string
  country_id?: string
  country_name: string
  country_code?: string
  number_type?: string
  sms_capability?: string
  direction?: string
  moq?: number
  requirements_text?: string
  uploaded_documents?: UploadedDocuments
  admin_request_changes?: string | null
  admin_request_changes_at?: string | null
  supplier_mrc?: number | null
  supplier_nrc?: number | null
  supplier_currency?: string | null
  below_moq_at_order?: boolean
}

interface SignupRequest {
  id: string
  email: string
  name: string
  message: string
  status: string
  created_at: string
  rejected_reason?: string
}

interface AdminSettings {
  notification_email: string
}

type TabType = 'inventory' | 'countries' | 'orders' | 'custom_requests' | 'signup_requests' | 'users' | 'settings'

interface CustomNumberRequest {
  id: string
  customer_id: string
  country_id: string
  number_type: string
  sms_capability: string
  direction: string
  mrc: number
  nrc: number
  currency: string
  moq: number
  specification: string | null
  bill_pulse: string | null
  requirements_text: string | null
  status: string
  admin_notes: string | null
  created_at: string
  customer_name?: string
  customer_email?: string
  country_name?: string
}

interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string
  company_name: string | null
  created_at: string
  is_disabled: boolean
  last_login_at: string | null
  order_count: number
  is_admin: boolean
}

// ---------------------------------------------------------------------------
// Shared presentational primitives for the admin console. These hold no
// state of their own beyond what's passed in, and call nothing except the
// callbacks the caller supplies — every Supabase call, handler, and
// business rule lives where it already did, above and below. Purely a
// shared visual vocabulary so Details/Edit/Delete, status badges, filters,
// and modals look and behave consistently across every tab.
// ---------------------------------------------------------------------------

const BADGE_CLASS =
  'inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-[#215F9A] focus:outline-none focus:ring-2 focus:ring-[#215F9A]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

const INPUT_SM_CLASS =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-[#215F9A] focus:outline-none focus:ring-2 focus:ring-[#215F9A]/20'

const LABEL_CLASS = 'mb-1.5 block text-[13px] font-medium text-slate-600'

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#215F9A] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2c78c0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30 disabled:cursor-not-allowed disabled:opacity-50'

const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:border-[#215F9A]/30 hover:bg-[#215F9A]/5 hover:text-[#215F9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/20 disabled:cursor-not-allowed disabled:opacity-50'

const BTN_SUCCESS =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50'

const BTN_DANGER =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-50'

const BTN_DANGER_SOFT =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50'

function formatMoney(value: number | string | null | undefined, currency?: string | null): string {
  const amount = formatDecimal(value, 2)
  if (!amount) return '—'
  return currency ? `${currency} ${amount}` : amount
}

// Presentational-only status classification shared by Orders, Custom Number
// Requests, and Signup Requests. It never introduces new status values —
// the label always comes from the existing status string; this only maps
// that string to an icon + color tone.
function getStatusMeta(status: string): { icon: React.ComponentType<{ className?: string }>; className: string } {
  switch (status) {
    case 'granted':
    case 'approved':
      return { icon: CircleCheckBig, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
    case 'rejected':
      return { icon: CircleX, className: 'border-red-200 bg-red-50 text-red-700' }
    case 'documentation_review':
      return { icon: FileCheck, className: 'border-blue-200 bg-blue-50 text-blue-700' }
    case 'pending':
      return { icon: Hourglass, className: 'border-amber-200 bg-amber-50 text-amber-700' }
    default:
      return { icon: Clock, className: 'border-slate-200 bg-slate-100 text-slate-600' }
  }
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const meta = getStatusMeta(status)
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  )
}

// Presentational-only: derives an icon for existing SMS/Voice and
// Inbound/Outbound text values via simple keyword matching. The displayed
// text is always the exact original value passed in.
function SmsVoiceIndicator({ value }: { value?: string | null }) {
  const v = value || ''
  const hasSms = /sms/i.test(v)
  const hasVoice = /voice/i.test(v)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {hasSms && !hasVoice ? (
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : hasVoice && !hasSms ? (
        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <span className="flex shrink-0 items-center -space-x-1 text-slate-400">
          <MessageSquare className="h-3.5 w-3.5" />
          <Phone className="h-3.5 w-3.5" />
        </span>
      )}
      {v || '—'}
    </span>
  )
}

function DirectionIndicator({ value }: { value?: string | null }) {
  const v = value || ''
  const hasInbound = /inbound/i.test(v)
  const hasOutbound = /outbound/i.test(v)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {hasInbound && !hasOutbound ? (
        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : hasOutbound && !hasInbound ? (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      )}
      {v || '—'}
    </span>
  )
}

function CountryCell({ name, code }: { name: string; code?: string | null }) {
  const flag = getCountryFlagEmoji(code)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-800">
      {flag && (
        <span aria-hidden="true" className="text-[15px] leading-none">
          {flag}
        </span>
      )}
      {name}
      {code && <span className="font-normal text-slate-400">({code})</span>}
    </span>
  )
}

// Shared row-action visual system: Details is quiet/informational, Edit is
// secondary, Delete is restrained until hovered — never a plain colored
// text link, never a loud default-styled button.
function RowActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = 'quiet',
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'quiet' | 'edit' | 'danger'
  title?: string
}) {
  const variantClass =
    variant === 'danger'
      ? 'text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:ring-red-500/30'
      : variant === 'edit'
        ? 'text-slate-400 hover:bg-[#215F9A]/5 hover:text-[#215F9A] focus-visible:ring-[#215F9A]/30'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-slate-400/30'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40 ${variantClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  shortLabel,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortLabel?: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-[13px] font-semibold transition-colors sm:px-4 ${active
        ? 'border-[#215F9A] text-[#215F9A]'
        : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800'
        }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#215F9A]' : 'text-slate-400'}`} />
      <span className="sm:hidden">{shortLabel || label}</span>
      <span className="hidden sm:inline">{label}</span>
      {!!count && count > 0 && (
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

function TabHeader({
  title,
  count,
  description,
  action,
}: {
  title: string
  count?: number
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {count !== undefined && (
            <span className="inline-flex items-center rounded-full bg-[#215F9A]/10 px-2 py-0.5 text-xs font-semibold text-[#215F9A]">
              {count}
            </span>
          )}
        </div>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2.5">{action}</div>}
    </div>
  )
}

// Purely presentational wrapper around a native <select>: adds a leading
// icon and custom chevron. Forwards every prop straight through.
function FilterSelect({
  icon: Icon,
  children,
  ...selectProps
}: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        {...selectProps}
        className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-[13px] text-slate-900 shadow-sm transition-colors hover:border-slate-400 focus:border-[#215F9A] focus:outline-none focus:ring-2 focus:ring-[#215F9A]/20"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

// Shared chrome for admin modals: backdrop, panel, header (icon + title +
// optional subtitle + close), scrollable body, optional footer. Holds no
// state; calls nothing but the onClose the caller supplies.
function AdminModalShell({
  icon: Icon,
  title,
  subtitle,
  onClose,
  widthClassName = 'max-w-lg',
  footer,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: React.ReactNode
  onClose: () => void
  widthClassName?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out] sm:p-6"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(88vh,100dvh)] w-full ${widthClassName} flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#215F9A]/10 text-[#215F9A]">
              <Icon className="h-[19px] w-[19px]" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-900 sm:text-[17px]">{title}</h3>
              {subtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>
  )
}

// Replaces window.confirm() for destructive actions. The caller still runs
// the exact same mutation on confirm — only how confirmation is collected
// changes (a restrained-but-clear danger dialog instead of a native alert).
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading,
}: {
  isOpen: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
            <div className="mt-1 text-sm text-slate-500">{message}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Replaces window.prompt() for reason-gated actions (reject order / signup /
// custom request). The caller receives the same free-text reason it would
// have gotten from prompt() — the mutation and whether a reason is required
// are unchanged.
function ReasonModal({
  isOpen,
  title,
  message,
  placeholder,
  value,
  onChange,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  loading,
  danger = true,
  requireValue = false,
}: {
  isOpen: boolean
  title: string
  message?: React.ReactNode
  placeholder?: string
  value: string
  onChange: (value: string) => void
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  danger?: boolean
  requireValue?: boolean
}) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50 text-red-600' : 'bg-[#215F9A]/10 text-[#215F9A]'
              }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
            {message && <div className="mt-1 text-sm text-slate-500">{message}</div>}
          </div>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-[#215F9A] focus:outline-none focus:ring-2 focus:ring-[#215F9A]/20"
          rows={3}
          autoFocus
        />
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || (requireValue && !value.trim())}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#215F9A] hover:bg-[#2c78c0]'
              }`}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('inventory')
  const [countries, setCountries] = useState<Country[]>([])
  const [allNumbers, setAllNumbers] = useState<Number[]>([])
  const [inventoryFilters, setInventoryFilters] = useState({
    country: '',
    smsVoice: '',
    inboundOutbound: '',
    supplier: '',
  })
  // Client-side pagination over the already-filtered inventory list — purely
  // a display slice, never touches loading/filtering/business logic.
  const [inventoryPage, setInventoryPage] = useState(1)
  const [inventoryPageSize, setInventoryPageSize] = useState(20)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderForDocs, setSelectedOrderForDocs] = useState<Order | null>(null)
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({ notification_email: '' })
  const [loading, setLoading] = useState(true)
  const [loadingNumbers, setLoadingNumbers] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingSignupRequests, setLoadingSignupRequests] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [showAddNumber, setShowAddNumber] = useState(false)
  const [showAddCountry, setShowAddCountry] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [fetchingRequirements, setFetchingRequirements] = useState(false)
  const [uploadingNumbers, setUploadingNumbers] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingNumber, setEditingNumber] = useState<Number | null>(null)
  const [processingSignup, setProcessingSignup] = useState<string | null>(null)
  const [pendingSignupCount, setPendingSignupCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [pendingCustomRequestsCount, setPendingCustomRequestsCount] = useState(0)
  const [formData, setFormData] = useState<NumberFormData>({
    country_id: '',
    available_numbers: '',
    number_type: '',
    sms_capability: ' ',
    direction: ' ',
    mrc: '',
    nrc: '',
    currency: 'USD',
    moq: '',
    supplier_mrc: '',
    supplier_nrc: '',
    supplier_currency: '',
    supplier: '',
    specification: '',
    bill_pulse: '',
    requirements_text: '',
    other_charges: {},
    supplier_other_charges: {},
    features: {},
  })
  const [countryFormData, setCountryFormData] = useState<CountryFormData>({
    name: '',
    country_code: '',
    regulator: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [processingOrder, setProcessingOrder] = useState<string | null>(null)
  const [orderForRequestChanges, setOrderForRequestChanges] = useState<Order | null>(null)
  const [requestChangesMessage, setRequestChangesMessage] = useState('')

  // UI-only state for the in-app confirmation modals that replace
  // window.confirm()/window.prompt() below. None of these change what gets
  // sent to Supabase — they only change how the admin confirms/enters a
  // reason before the existing handler runs.
  const [numberPendingDelete, setNumberPendingDelete] = useState<Number | null>(null)
  const [userPendingDelete, setUserPendingDelete] = useState<UserProfile | null>(null)
  const [orderPendingReject, setOrderPendingReject] = useState<Order | null>(null)
  const [orderRejectReason, setOrderRejectReason] = useState('')
  const [signupPendingReject, setSignupPendingReject] = useState<SignupRequest | null>(null)
  const [signupRejectReason, setSignupRejectReason] = useState('')
  const [customRequestPendingReject, setCustomRequestPendingReject] = useState<CustomNumberRequest | null>(null)
  const [customRequestRejectReason, setCustomRequestRejectReason] = useState('')
  const [isDeletingNumber, setIsDeletingNumber] = useState(false)

  // Users tab state
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [processingUser, setProcessingUser] = useState<string | null>(null)
  const [selectedUserOrders, setSelectedUserOrders] = useState<Order[] | null>(null)
  const [viewingUserOrders, setViewingUserOrders] = useState<UserProfile | null>(null)
  // Custom number requests tab state
  const [customRequests, setCustomRequests] = useState<CustomNumberRequest[]>([])
  const [loadingCustomRequests, setLoadingCustomRequests] = useState(false)
  const [processingCustomRequest, setProcessingCustomRequest] = useState<string | null>(null)
  const [fulfillCustomRequestModal, setFulfillCustomRequestModal] = useState<CustomNumberRequest | null>(null)
  const [orderForRequirementsModal, setOrderForRequirementsModal] = useState<Order | null>(null)
  const [orderRequirementsData, setOrderRequirementsData] = useState<any>(null)
  const [loadingOrderRequirements, setLoadingOrderRequirements] = useState(false)
  const [fulfillForm, setFulfillForm] = useState({
    mrc: '',
    nrc: '',
    currency: 'USD',
    moq: '1',
    supplier_mrc: '',
    supplier_nrc: '',
    supplier_currency: '',
    specification: '',
    bill_pulse: '',
    requirements_text: '',
  })

  useEffect(() => {
    loadCountries()
    loadPendingSignupCount()
    loadPendingOrdersCount()
    loadPendingCustomRequestsCount()
    if (activeTab === 'inventory') {
      loadAllNumbers()
    } else if (activeTab === 'countries') {
      loadCountries()
    } else if (activeTab === 'orders') {
      loadOrders()
      loadPendingOrdersCount()
    } else if (activeTab === 'custom_requests') {
      loadCustomRequests()
      loadPendingCustomRequestsCount()
    } else if (activeTab === 'signup_requests') {
      loadSignupRequests()
    } else if (activeTab === 'users') {
      loadUsers()
    } else if (activeTab === 'settings') {
      loadAdminSettings()
    }
  }, [activeTab])

  const loadPendingSignupCount = async () => {
    try {
      const { count, error } = await supabase
        .from('signup_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (!error && count !== null) {
        setPendingSignupCount(count)
      } else {
        setPendingSignupCount(0)
      }
    } catch (err) {
      setPendingSignupCount(0)
    }
  }

  const loadPendingOrdersCount = async () => {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'documentation_review')

      if (!error && count !== null) {
        setPendingOrdersCount(count)
      } else {
        setPendingOrdersCount(0)
      }
    } catch (err) {
      setPendingOrdersCount(0)
    }
  }

  const loadPendingCustomRequestsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('custom_number_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (!error && count !== null) {
        setPendingCustomRequestsCount(count)
      } else {
        setPendingCustomRequestsCount(0)
      }
    } catch (err) {
      setPendingCustomRequestsCount(0)
    }
  }

  const loadSignupRequests = async () => {
    setLoadingSignupRequests(true)
    setError(null)
    try {
      // Debug: Check current user and admin status
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id, user?.email)

      // Debug: Check if user is in admin_users
      const { data: adminCheck, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user?.id || '')
      console.log('Admin check:', adminCheck, 'Error:', adminError)

      const { data, error } = await supabase
        .from('signup_requests')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('Signup requests result:', { data, error })

      if (error) {
        console.error('Signup requests error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        setError(`Unable to load signup requests: ${error.message || error.code || 'Permission denied'}`)
        setSignupRequests([])
        return
      }
      setSignupRequests(data || [])
    } catch (err: any) {
      console.error('Error loading signup requests:', err?.message || err)
      setError('Unable to load signup requests.')
      setSignupRequests([])
    } finally {
      setLoadingSignupRequests(false)
    }
  }

  const loadAdminSettings = async () => {
    setLoadingSettings(true)
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')

      console.log('Admin settings result:', { data, error })

      if (error) {
        console.error('Admin settings error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        setError(`Unable to load settings: ${error.message || error.code || 'Permission denied'}`)
        setAdminSettings({ notification_email: '' })
        return
      }

      const settings: AdminSettings = { notification_email: '' }
      data?.forEach((s: any) => {
        if (s.setting_key === 'notification_email') {
          settings.notification_email = s.setting_value
        }
      })
      setAdminSettings(settings)
    } catch (err: any) {
      console.error('Error loading admin settings:', err?.message || err)
      setAdminSettings({ notification_email: '' })
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleApproveSignup = async (requestId: string) => {
    setProcessingSignup(requestId)
    setError(null)

    try {
      const request = signupRequests.find(r => r.id === requestId)
      if (!request) throw new Error('Request not found')

      // Get admin user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Use API route to create user (requires service role key)
      const response = await fetch('/api/approve-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestId,
          adminUserId: adminData?.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve signup request')
      }

      if (result.userAlreadyExists) {
        setSuccess(`Account for ${request.email} has been reactivated with the new password. They can sign in now.`)
      } else {
        setSuccess(`User ${request.email} has been created! A confirmation email has been sent to verify their account.`)
      }

      await loadSignupRequests()
      await loadPendingSignupCount()
    } catch (err: any) {
      setError(err.message || 'Failed to approve signup request')
    } finally {
      setProcessingSignup(null)
    }
  }

  const handleRejectSignup = async (requestId: string, reason?: string) => {
    setProcessingSignup(requestId)
    setError(null)

    try {
      const { error } = await supabase
        .from('signup_requests')
        .update({
          status: 'rejected',
          rejected_reason: reason || 'Application rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) throw error

      setSuccess('Signup request rejected')
      await loadSignupRequests()
      await loadPendingSignupCount()
    } catch (err: any) {
      setError(err.message || 'Failed to reject signup request')
    } finally {
      setProcessingSignup(null)
    }
  }

  const handleSaveSettings = async () => {
    setLoadingSettings(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: 'notification_email',
          setting_value: adminSettings.notification_email,
        }, { onConflict: 'setting_key' })

      if (error) {
        console.error('Save settings error:', error.message || error.code || JSON.stringify(error))
        setError('Failed to save settings. Please check your permissions.')
        return
      }
      setSuccess('Settings saved successfully!')
    } catch (err: any) {
      console.error('Save settings error:', err?.message || err)
      setError('Failed to save settings.')
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true)
    setError(null)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test_notification', data: {} }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`)
      }
      setSuccess('Test email sent. Check the notification inbox (and spam folder).')
    } catch (err: any) {
      setError(err.message || 'Failed to send test email')
    } finally {
      setSendingTestEmail(false)
    }
  }

  // Confirmation is now collected via the in-app ConfirmModal (see
  // numberPendingDelete) instead of window.confirm() — the mutation below
  // is unchanged.
  const handleDeleteNumber = async (numberId: string) => {
    setError(null)

    try {
      // Always soft-delete: mark as unavailable (never hard-delete from DB)
      const { error: updateError } = await supabase
        .from('numbers')
        .update({ is_available: false })
        .eq('id', numberId)

      if (updateError) throw updateError
      setSuccess('Number deleted successfully.')
      await loadAllNumbers()
    } catch (err: any) {
      setError(err.message || 'Failed to delete number')
    }
  }

  const handleUpdateNumber = async (number: Number) => {
    setError(null)

    // Parse numeric fields (they might be strings if user edited them)
    const mrc = parseNumberField(String(number.mrc), 0)
    const nrc = parseNumberField(String(number.nrc), 0)
    const moq = parseIntField(String(number.moq), 1)

    if (moq < 1) {
      setError('MOQ must be at least 1')
      return
    }

    try {
      const { error } = await supabase
        .from('numbers')
        .update({
          number_type: number.number_type,
          sms_capability: number.sms_capability,
          direction: number.direction,
          mrc: mrc,
          nrc: nrc,
          currency: number.currency,
          moq: moq,
          is_available: number.is_available,
          specification: number.specification || null,
          bill_pulse: number.bill_pulse || null,
          other_charges: normalizeOtherChargesForDb(number.other_charges),
          supplier_other_charges: normalizeOtherChargesForDb((number as any).supplier_other_charges),
          features: (number.features && typeof number.features === 'object' && Object.keys(number.features).length > 0)
            ? { voice: (number.features as any).voice || null, sms: (number.features as any).sms || null, reach: (number.features as any).reach || null, emergency_services: (number.features as any).emergency_services || null }
            : {},
          supplier_mrc: parseNullableNumberField((number as any).supplier_mrc),
          supplier_nrc: parseNullableNumberField((number as any).supplier_nrc),
          supplier_currency: (number as any).supplier_currency || null,
          supplier: (number as any).supplier || null,
        })
        .eq('id', number.id)

      if (error) throw error
      setSuccess('Number updated successfully!')
      setEditingNumber(null)
      await loadAllNumbers()
    } catch (err: any) {
      setError(err.message || 'Failed to update number')
    }
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError(null)
    try {
      // Get all customers with their order counts
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          user_id,
          name,
          email,
          company_name,
          created_at,
          is_disabled,
          last_login_at,
          orders:orders(count)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        setError('Unable to load users.')
        setUsers([])
        return
      }

      // Get list of admin user IDs to check which customers are also admins
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('is_active', true)

      const adminUserIds = new Set((adminData || []).map((a: any) => a.user_id))

      // Transform the data to include order_count and admin status
      const transformedUsers: UserProfile[] = (data || []).map((user: any) => ({
        id: user.id,
        user_id: user.user_id,
        name: user.name || 'N/A',
        email: user.email,
        company_name: user.company_name ?? null,
        created_at: user.created_at,
        is_disabled: user.is_disabled || false,
        last_login_at: user.last_login_at,
        order_count: user.orders?.[0]?.count || 0,
        is_admin: adminUserIds.has(user.user_id),
      }))

      setUsers(transformedUsers)
    } catch (err: any) {
      console.error('Error loading users:', err?.message || err)
      setError('Unable to load users.')
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleToggleUserStatus = async (user: UserProfile) => {
    if (processingUser) return

    // Prevent modifying admin users
    if (user.is_admin) {
      setError('Cannot modify admin users. Please use the admin management system.')
      return
    }

    setProcessingUser(user.id)
    setError(null)

    try {
      const newStatus = !user.is_disabled
      const { error } = await supabase
        .from('customers')
        .update({ is_disabled: newStatus })
        .eq('id', user.id)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, is_disabled: newStatus } : u
      ))
      setSuccess(`User ${newStatus ? 'disabled' : 'enabled'} successfully.`)
    } catch (err: any) {
      console.error('Error updating user status:', err)
      setError('Failed to update user status.')
    } finally {
      setProcessingUser(null)
    }
  }

  const handleSendPasswordReset = async (user: UserProfile) => {
    if (processingUser) return

    // Prevent modifying admin users
    if (user.is_admin) {
      setError('Cannot reset password for admin users. Please contact system administrator.')
      return
    }

    setProcessingUser(user.id)
    setError(null)

    try {
      // Use Supabase auth to send password reset
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      setSuccess(`Password reset email sent to ${user.email}`)
    } catch (err: any) {
      console.error('Error sending password reset:', err)
      setError('Failed to send password reset email.')
    } finally {
      setProcessingUser(null)
    }
  }

  // Confirmation is now collected via the in-app ConfirmModal (see
  // userPendingDelete) instead of window.confirm() — the mutation below is
  // unchanged.
  const handleDeleteUser = async (user: UserProfile) => {
    if (processingUser) return

    // Prevent deleting admin users
    if (user.is_admin) {
      setError('Cannot delete admin users. Please use the admin management system.')
      return
    }

    setProcessingUser(user.id)
    setError(null)

    try {
      // Delete customer record (this will cascade delete orders due to FK constraint)
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', user.id)

      if (error) throw error

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setSuccess('User deleted successfully.')
    } catch (err: any) {
      console.error('Error deleting user:', err)
      setError('Failed to delete user.')
    } finally {
      setProcessingUser(null)
    }
  }

  const handleViewUserOrders = async (user: UserProfile) => {
    setViewingUserOrders(user)
    setSelectedUserOrders(null)

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          number:numbers(
            *,
            countries(name, country_code)
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSelectedUserOrders(data || [])
    } catch (err: any) {
      console.error('Error loading user orders:', err)
      setSelectedUserOrders([])
    }
  }

  const loadCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, country_code, regulator')
        .order('name')

      if (error) throw error
      setCountries(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAllNumbers = async () => {
    setLoadingNumbers(true)
    setError(null)
    try {
      // Query numbers table: only show available or reserved (hide soft-deleted/unavailable)
      const { data, error } = await supabase
        .from('numbers')
        .select(`
          id,
          number,
          country_id,
          available_numbers,
          number_type,
          sms_capability,
          direction,
          mrc,
          nrc,
          currency,
          moq,
          supplier_mrc,
          supplier_nrc,
          supplier_currency,
          supplier,
          specification,
          bill_pulse,
          requirements_text,
          other_charges,
          supplier_other_charges,
          features,
          is_available,
          is_reserved,
          countries!inner(name, country_code)
        `)
        .or('is_available.eq.true,is_reserved.eq.true')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Query error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        setError('Failed to load numbers: ' + (error.message || error.details || 'Unknown error'))
        return
      }

      if (data) {
        const formatted: Number[] = data.map((n: any) => ({
          id: n.id,
          number: n.number,
          number_type: n.number_type,
          sms_capability: n.sms_capability,
          direction: n.direction,
          mrc: n.mrc,
          nrc: n.nrc,
          currency: n.currency,
          moq: n.moq,
          supplier_mrc: n.supplier_mrc,
          supplier_nrc: n.supplier_nrc,
          supplier_currency: n.supplier_currency,
          supplier: n.supplier,
          specification: n.specification,
          bill_pulse: n.bill_pulse,
          requirements_text: n.requirements_text,
          other_charges: n.other_charges,
          supplier_other_charges: n.supplier_other_charges,
          features: n.features,
          is_available: n.is_available,
          is_reserved: n.is_reserved,
          country_name: n.countries?.name || 'Unknown',
          country_code: n.countries?.country_code || 'N/A',
          available_numbers: n.available_numbers ?? 0,
          country_id: n.country_id || '',
        }))
        // Sort by country name alphabetically
        formatted.sort((a, b) =>
          a.country_name.localeCompare(b.country_name)
        )
        setAllNumbers(formatted)
      }
    } catch (err: any) {
      console.error('Error loading numbers:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
      })
      setError('Failed to load numbers. Please refresh the page.')
    } finally {
      setLoadingNumbers(false)
    }
  }

  const loadOrders = async () => {
    setLoadingOrders(true)
    setError(null)
    try {
      // Try querying orders directly with joins (more reliable than view)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          number_id,
          quantity,
          status,
          below_moq_at_order,
          mrc_at_order,
          nrc_at_order,
          currency_at_order,
          created_at,
          granted_at,
          rejected_at,
          rejected_reason,
          uploaded_documents,
          admin_request_changes,
          admin_request_changes_at,
          customers!inner(id, name, email),
          numbers!inner(id, number, number_type, sms_capability, direction, moq, requirements_text, other_charges, country_id, supplier_mrc, supplier_nrc, supplier_currency, countries!inner(id, name, country_code))
        `)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Orders query error:', {
          message: ordersError.message,
          details: ordersError.details,
          hint: ordersError.hint,
          code: ordersError.code,
        })
        throw ordersError
      }

      // Format the data
      const formatted = (ordersData || []).map((o: any) => ({
        id: o.id,
        customer_id: o.customer_id,
        number_id: o.number_id,
        quantity: o.quantity,
        status: o.status,
        below_moq_at_order: o.below_moq_at_order ?? false,
        mrc_at_order: o.mrc_at_order,
        nrc_at_order: o.nrc_at_order,
        currency_at_order: o.currency_at_order,
        created_at: o.created_at,
        customer_name: o.customers?.name || 'Unknown',
        customer_email: o.customers?.email || 'Unknown',
        phone_number: o.numbers?.number || 'N/A',
        country_id: o.numbers?.country_id || o.numbers?.countries?.id,
        country_name: o.numbers?.countries?.name || 'Unknown',
        country_code: o.numbers?.countries?.country_code || '',
        number_type: o.numbers?.number_type || 'N/A',
        sms_capability: o.numbers?.sms_capability || 'N/A',
        direction: o.numbers?.direction || 'N/A',
        moq: o.numbers?.moq || 1,
        requirements_text: o.numbers?.requirements_text || '',
        other_charges: o.numbers?.other_charges || {},
        uploaded_documents: o.uploaded_documents || null,
        admin_request_changes: o.admin_request_changes ?? null,
        admin_request_changes_at: o.admin_request_changes_at ?? null,
        supplier_mrc: o.numbers?.supplier_mrc ?? null,
        supplier_nrc: o.numbers?.supplier_nrc ?? null,
        supplier_currency: o.numbers?.supplier_currency ?? null,
      }))

      setOrders(formatted)
    } catch (err: any) {
      console.error('Error loading orders:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
      })
      const errorMessage = err?.message || err?.details || err?.hint || 'Failed to load orders'
      setError('Failed to load orders: ' + errorMessage)
    } finally {
      setLoadingOrders(false)
    }
  }

  const loadCustomRequests = async () => {
    setLoadingCustomRequests(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('custom_number_requests')
        .select(`
          id,
          customer_id,
          country_id,
          number_type,
          sms_capability,
          direction,
          mrc,
          nrc,
          currency,
          moq,
          specification,
          bill_pulse,
          requirements_text,
          status,
          admin_notes,
          created_at,
          customers!inner(name, email),
          countries!inner(name)
        `)
        .order('created_at', { ascending: false })
      if (err) throw err
      const formatted = (data || []).map((r: any) => ({
        id: r.id,
        customer_id: r.customer_id,
        country_id: r.country_id,
        number_type: r.number_type,
        sms_capability: r.sms_capability,
        direction: r.direction,
        mrc: r.mrc,
        nrc: r.nrc,
        currency: r.currency,
        moq: r.moq,
        specification: r.specification,
        bill_pulse: r.bill_pulse,
        requirements_text: r.requirements_text,
        status: r.status,
        admin_notes: r.admin_notes,
        created_at: r.created_at,
        customer_name: r.customers?.name,
        customer_email: r.customers?.email,
        country_name: r.countries?.name,
      }))
      setCustomRequests(formatted)
    } catch (err: any) {
      setError(err.message || 'Failed to load custom number requests')
      setCustomRequests([])
    } finally {
      setLoadingCustomRequests(false)
    }
  }

  const handleCustomRequestStatus = async (requestId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    setProcessingCustomRequest(requestId)
    setError(null)
    try {
      // Fetch request details for notification (before update)
      const { data: reqData } = await supabase
        .from('custom_number_requests')
        .select('customer_id, number_type, moq, countries!inner(name)')
        .eq('id', requestId)
        .single()
      const countryName = (reqData?.countries as { name?: string } | null)?.name || 'Unknown'
      const numberType = reqData?.number_type || 'number'
      const moq = reqData?.moq ?? 1

      const { error: updateError } = await supabase
        .from('custom_number_requests')
        .update({ status, admin_notes: adminNotes ?? null, updated_at: new Date().toISOString() })
        .eq('id', requestId)
      if (updateError) throw updateError

      // Notify customer
      if (reqData?.customer_id) {
        const { data: customerRow } = await supabase
          .from('customers')
          .select('user_id')
          .eq('id', reqData.customer_id)
          .single()
        if (customerRow?.user_id) {
          try {
            await supabase.from('notifications').insert({
              user_id: customerRow.user_id,
              type: status === 'approved' ? 'custom_request_approved' : 'custom_request_rejected',
              title: status === 'approved' ? 'Custom number request approved' : 'Custom number request declined',
              message: status === 'approved'
                ? `Your custom number request for ${moq} ${numberType} number(s) in ${countryName} has been approved.`
                : `Your custom number request for ${moq} ${numberType} number(s) in ${countryName} has been declined.${adminNotes ? ` ${adminNotes}` : ''}`,
              metadata: { request_id: requestId, status, country: countryName, number_type: numberType },
            })
          } catch (e) {
            console.warn('Failed to send custom request notification to customer:', e)
          }
        }
      }

      setSuccess(`Request ${status}.`)
      await loadCustomRequests()
    } catch (err: any) {
      setError(err.message || `Failed to ${status} request`)
    } finally {
      setProcessingCustomRequest(null)
    }
  }

  const handleFulfillCustomRequestSubmit = async () => {
    const req = fulfillCustomRequestModal
    if (!req) return
    const mrc = parseFloat(fulfillForm.mrc)
    const nrc = parseFloat(fulfillForm.nrc)
    const moq = parseInt(fulfillForm.moq, 10)
    if (isNaN(mrc) || mrc < 0) {
      setError('MRC must be a valid number (0 or greater).')
      return
    }
    if (isNaN(nrc) || nrc < 0) {
      setError('NRC must be a valid number (0 or greater).')
      return
    }
    if (isNaN(moq) || moq < 1) {
      setError('MOQ must be at least 1.')
      return
    }
    setProcessingCustomRequest(req.id)
    setError(null)
    try {
      const supplierMrc = fulfillForm.supplier_mrc ? parseFloat(fulfillForm.supplier_mrc) : null
      const supplierNrc = fulfillForm.supplier_nrc ? parseFloat(fulfillForm.supplier_nrc) : null
      const placeholderNumber = `REQ-${req.id}`
      const { data: insertedNumber, error: insertError } = await supabase
        .from('numbers')
        .insert({
          country_id: req.country_id,
          number: placeholderNumber,
          number_type: req.number_type,
          sms_capability: req.sms_capability,
          direction: req.direction,
          mrc,
          nrc,
          currency: fulfillForm.currency,
          moq,
          supplier_mrc: Number.isFinite(supplierMrc) ? supplierMrc : null,
          supplier_nrc: Number.isFinite(supplierNrc) ? supplierNrc : null,
          supplier_currency: fulfillForm.supplier_currency?.trim() || null,
          specification: fulfillForm.specification.trim() || null,
          bill_pulse: fulfillForm.bill_pulse.trim() || null,
          requirements_text: fulfillForm.requirements_text.trim() || null,
          other_charges: {},
          supplier_other_charges: {},
          features: {},
          is_available: true,
        })
        .select('id')
        .single()
      if (insertError || !insertedNumber?.id) throw insertError || new Error('Failed to get inserted number id')
      const newNumberId = insertedNumber.id
      await supabase
        .from('custom_number_requests')
        .update({ status: 'approved', admin_notes: 'Fulfilled: number added to inventory.', updated_at: new Date().toISOString() })
        .eq('id', req.id)
      const customerName = req.customer_name || 'Customer'
      const customerEmail = req.customer_email || ''
      const countryName = req.country_name || 'Unknown'
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: req.customer_id,
          number_id: newNumberId,
          quantity: moq,
          status: 'documentation_review',
          mrc_at_order: mrc,
          nrc_at_order: nrc,
          currency_at_order: fulfillForm.currency,
          uploaded_documents: { documents: [], customer_type: 'business', notes: undefined },
        })
      if (orderError) {
        setError(`Number was added to inventory but order creation failed: ${orderError.message}. You may need to create the order manually for the customer.`)
        setProcessingCustomRequest(null)
        return
      }
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_order',
            data: {
              customerName,
              customerEmail,
              country: countryName,
              numberType: req.number_type,
              quantity: moq,
              mrc,
              nrc,
              currency: fulfillForm.currency,
            },
          }),
        })
      } catch (e) { /* ignore */ }
      try {
        const { data: adminUsers } = await supabase.from('admin_users').select('user_id').eq('is_active', true)
        if (adminUsers?.length) {
          await supabase.from('notifications').insert(adminUsers.map((a) => ({
            user_id: a.user_id,
            type: 'new_order',
            title: 'New Order Received',
            message: `Custom number fulfilled: order for ${moq} ${req.number_type} number(s) in ${countryName}`,
            metadata: { country: countryName, number_type: req.number_type, quantity: moq },
          })))
        }
      } catch (e) { /* ignore */ }

      // Notify customer that a new order was created for them (custom number fulfilled)
      try {
        const { data: customerRow } = await supabase
          .from('customers')
          .select('user_id')
          .eq('id', req.customer_id)
          .single()
        if (customerRow?.user_id) {
          await supabase.from('notifications').insert({
            user_id: customerRow.user_id,
            type: 'new_order',
            title: 'New order created',
            message: `Your custom number request was fulfilled. A new order for ${moq} ${req.number_type} number(s) in ${countryName} has been created. Check My Orders to upload documents.`,
            metadata: { country: countryName, number_type: req.number_type, quantity: moq },
          })
        }
      } catch (e) {
        console.warn('Failed to send new-order notification to customer:', e)
      }

      setSuccess('Number added to inventory and order created. The order appears under Orders for the customer. You can edit the number in Inventory to set the real number.')
      setFulfillCustomRequestModal(null)
      setFulfillForm({ mrc: '', nrc: '', currency: 'USD', moq: '1', supplier_mrc: '', supplier_nrc: '', supplier_currency: '', specification: '', bill_pulse: '', requirements_text: '' })
      await loadCustomRequests()
      await loadAllNumbers()
    } catch (err: any) {
      setError(err.message || 'Failed to add number to inventory')
    } finally {
      setProcessingCustomRequest(null)
    }
  }

  const handleAddCountry = async () => {
    if (!countryFormData.name || !countryFormData.country_code) {
      setError('Country name and code are required')
      return
    }

    setFetchingRequirements(true)
    setError(null)

    try {
      const response = await fetch('/api/country-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryName: countryFormData.name,
          countryCode: countryFormData.country_code,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch country requirements')
      }

      const { requirements, prefix_area_code } = await response.json()

      const { data, error } = await supabase
        .from('countries')
        .insert({
          name: countryFormData.name,
          country_code: countryFormData.country_code,
          regulator: countryFormData.regulator || null,
          requirements: requirements,
          prefix_area_code: prefix_area_code,
        })
        .select()
        .single()

      if (error) throw error

      setSuccess(
        showFileUpload
          ? 'Country added successfully. Re-validate your file to import rows for the new country.'
          : 'Country added successfully with requirements fetched!'
      )
      setCountryFormData({ name: '', country_code: '', regulator: '' })
      setShowAddCountry(false)
      await loadCountries()
    } catch (err: any) {
      setError(err.message || 'Failed to add country')
    } finally {
      setFetchingRequirements(false)
    }
  }

  const handleAddNumber = async () => {
    if (!formData.country_id) {
      setError('Country is required')
      return
    }

    // Parse and validate numeric fields
    const availableNumbers = parseIntField(formData.available_numbers, 0)
    const mrc = parseNumberField(formData.mrc, 0)
    const nrc = parseNumberField(formData.nrc, 0)
    const moq = parseIntField(formData.moq, 1)

    if (availableNumbers < 0) {
      setError('Available numbers cannot be negative')
      return
    }

    if (moq < 1) {
      setError('MOQ must be at least 1')
      return
    }

    setError(null)

    try {
      const supplierMrc = formData.supplier_mrc ? parseNumberField(formData.supplier_mrc, 0) : null
      const supplierNrc = formData.supplier_nrc ? parseNumberField(formData.supplier_nrc, 0) : null
      const { error } = await supabase.from('numbers').insert({
        country_id: formData.country_id,
        available_numbers: availableNumbers,
        number_type: formData.number_type,
        sms_capability: formData.sms_capability,
        direction: formData.direction,
        mrc: mrc,
        nrc: nrc,
        currency: formData.currency,
        moq: moq,
        supplier_mrc: supplierMrc,
        supplier_nrc: supplierNrc,
        supplier_currency: formData.supplier_currency || null,
        supplier: formData.supplier || null,
        specification: formData.specification || null,
        bill_pulse: formData.bill_pulse || null,
        requirements_text: formData.requirements_text || null,
        other_charges: normalizeOtherChargesForDb(formData.other_charges),
        supplier_other_charges: normalizeOtherChargesForDb(formData.supplier_other_charges),
        features: formData.features,
        is_available: true,
      })

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      setSuccess('Number added to inventory successfully!')
      setFormData({
        country_id: '',
        available_numbers: '',
        number_type: '',
        sms_capability: '',
        direction: '',
        mrc: '',
        nrc: '',
        currency: 'USD',
        moq: '',
        supplier_mrc: '',
        supplier_nrc: '',
        supplier_currency: '',
        supplier: '',
        specification: '',
        bill_pulse: '',
        requirements_text: '',
        other_charges: {},
        supplier_other_charges: {},
        features: {},
      })
      setShowAddNumber(false)
      await loadAllNumbers()
    } catch (err: any) {
      console.error('Add number error:', err)
      setError(err.message || 'Failed to add number')
    }
  }

  const handleBulkAddNumbers = async (extractedNumbers: any[]) => {
    setUploadingNumbers(true)
    setError(null)

    // Valid values for constrained fields
    const validSmsCapabilities = ['SMS only', 'Voice only', 'Both']
    const validDirections = ['Inbound only', 'Outbound only', 'Both']
    const validNumberTypes = ['Geographic', 'Mobile', 'Toll-Free', 'Non-Geographic', '2WV', "Local", "National", "Shared Cost", "DID", "Fixed"]

    try {
      const numbersToAdd = extractedNumbers.map((num, index) => {
        // Country is required
        if (!num.country_id) {
          throw new Error(`Row ${index + 1}: Country is required.`)
        }

        // Leave sms_capability blank if not provided or invalid (no forced default)
        let smsCapability = num.sms_capability
        if (!smsCapability || !validSmsCapabilities.includes(smsCapability)) {
          smsCapability = ''
        }

        // Leave direction blank if not provided or invalid (no forced default)
        let direction = num.direction
        if (!direction || !validDirections.includes(direction)) {
          direction = ''
        }

        // Leave number_type blank if not provided or invalid (no forced default)
        let numberType = num.number_type
        if (!validNumberTypes.includes(numberType)) {
          numberType = ''
        }

        const soc = num.supplier_other_charges
        const hasSupplierOc =
          soc &&
          typeof soc === 'object' &&
          Object.keys(soc).some((k) => (soc as any)[k] !== null && (soc as any)[k] !== undefined)

        return {
          country_id: num.country_id,
          available_numbers: num.available_numbers ?? 1,
          number_type: numberType,
          sms_capability: smsCapability,
          direction: direction,
          mrc: num.mrc !== undefined && num.mrc !== null ? num.mrc : 0,
          nrc: num.nrc !== undefined && num.nrc !== null ? num.nrc : 0,
          currency: num.currency || 'USD',
          moq: num.moq !== undefined && num.moq !== null ? num.moq : 1,
          supplier: num.supplier || null,
          specification: num.specification || null,
          bill_pulse: num.bill_pulse || null,
          requirements_text: num.requirements_text || null,
          other_charges: num.other_charges || {},
          supplier_mrc: num.supplier_mrc ?? null,
          supplier_nrc: num.supplier_nrc ?? null,
          supplier_currency: num.supplier_currency || null,
          supplier_other_charges: hasSupplierOc ? soc : {},
          features: num.features || {},
          is_available: true,
        }
      })

      // Insert numbers in batches
      const batchSize = 50
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < numbersToAdd.length; i += batchSize) {
        const batch = numbersToAdd.slice(i, i + batchSize)
        const { error } = await supabase.from('numbers').insert(batch)

        if (error) {
          console.error('Batch insert error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          })
          errorCount += batch.length
          // Store first error for display
          if (errorCount === batch.length) {
            setError(`Insert failed: ${error.message || error.code || 'Unknown error'}. Have you run the database migration (update_numbers_to_inventory.sql)?`)
          }
        } else {
          successCount += batch.length
        }
      }

      if (errorCount > 0 && successCount > 0) {
        setError(`Added ${successCount} row(s) successfully, but ${errorCount} failed.`)
      } else if (errorCount > 0 && successCount === 0) {
        // Error already set above with details
      } else {
        setSuccess(`Successfully added ${successCount} row(s) to inventory!`)
      }

      setShowFileUpload(false)
      await loadAllNumbers()
    } catch (err: any) {
      setError(err.message || 'Failed to add numbers')
    } finally {
      setUploadingNumbers(false)
    }
  }

  const handleOrderStatus = async (orderId: string, status: 'granted' | 'rejected', notes?: string) => {
    setProcessingOrder(orderId)
    setError(null)

    try {
      // Get admin user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Get order details including uploaded documents and customer_id
      const { data: orderData, error: orderFetchError } = await supabase
        .from('orders')
        .select('uploaded_documents, customer_id')
        .eq('id', orderId)
        .single()

      if (orderFetchError) {
        console.error('Error fetching order:', orderFetchError)
      }

      // Save documents to customer_documents table instead of deleting them
      // This allows documents to persist for future orders
      if (orderData?.uploaded_documents?.documents && Array.isArray(orderData.uploaded_documents.documents)) {
        const documents = orderData.uploaded_documents.documents

        if (documents.length > 0 && orderData.customer_id) {
          // Save each document to customer_documents table
          for (const doc of documents) {
            try {
              await supabase
                .from('customer_documents')
                .insert({
                  customer_id: orderData.customer_id,
                  document_type: doc.requirement_key || 'order_document',
                  title: doc.title || doc.file_name,
                  file_path: doc.file_path,
                  file_name: doc.file_name,
                  file_size: doc.file_size,
                  file_type: doc.file_type,
                  uploaded_at: doc.uploaded_at || new Date().toISOString(),
                  is_verified: status === 'granted', // Auto-verify if order is granted
                  verified_by: status === 'granted' ? adminData?.id : null,
                  verified_at: status === 'granted' ? new Date().toISOString() : null,
                  metadata: {
                    order_id: orderId,
                    customer_type: orderData.uploaded_documents.customer_type,
                  },
                })
            } catch (docErr) {
              console.warn('Failed to save document to customer profile:', docErr)
            }
          }
          console.log(`Saved ${documents.length} documents to customer profile for order ${orderId}`)
        }
      }

      // Update order - keep document references but mark as processed
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString(),
        // Keep documents but mark as saved to profile
        uploaded_documents: {
          ...(orderData?.uploaded_documents || {}),
          documents_saved_to_profile: true,
          saved_at: new Date().toISOString(),
        },
      }

      if (status === 'granted') {
        updateData.granted_at = new Date().toISOString()
        updateData.admin_notes = notes || null
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString()
        updateData.rejected_reason = notes || 'Order rejected by admin'
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error

      // Get the order with customer details to send notification and email
      const { data: orderWithCustomer } = await supabase
        .from('orders')
        .select(`
          *,
          customers:customer_id (
            user_id,
            name,
            email
          ),
          number:number_id (
            number_type,
            countries (name)
          )
        `)
        .eq('id', orderId)
        .single()

      const countryName = orderWithCustomer?.number?.countries?.name || 'Unknown'
      const numberType = orderWithCustomer?.number?.number_type || 'Unknown'
      const quantity = orderWithCustomer?.quantity ?? 1
      const customerName = orderWithCustomer?.customers?.name || 'Customer'
      const customerEmail = orderWithCustomer?.customers?.email

      // Send in-app notification to customer
      if (orderWithCustomer?.customers?.user_id) {
        const customerUserId = orderWithCustomer.customers.user_id
        const notificationTitle = status === 'granted' ? 'Order Approved!' : 'Order Rejected'
        const notificationMessage = status === 'granted'
          ? `Your order for ${numberType} number(s) in ${countryName} has been approved.`
          : `Your order for ${numberType} number(s) in ${countryName} has been rejected. ${notes || ''}`

        try {
          await supabase.from('notifications').insert({
            user_id: customerUserId,
            type: status === 'granted' ? 'order_approved' : 'order_rejected',
            title: notificationTitle,
            message: notificationMessage,
            metadata: {
              order_id: orderId,
              status: status,
              country: countryName,
              number_type: numberType,
            },
          })
        } catch (notificationErr) {
          console.warn('Failed to send notification to customer:', notificationErr)
        }
      }

      // Send email notification to customer
      if (customerEmail) {
        try {
          const emailRes = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'order_status_update',
              data: {
                customerEmail,
                customerName,
                status,
                country: countryName,
                numberType,
                quantity,
                reason: status === 'rejected' ? (notes || undefined) : undefined,
              },
            }),
          })
          if (!emailRes.ok) {
            const errData = await emailRes.json().catch(() => ({}))
            console.warn('Failed to send order status email:', errData?.error || emailRes.statusText)
          }
        } catch (emailErr) {
          console.warn('Failed to send order status email:', emailErr)
        }
      }

      setSuccess(`Order ${status} successfully! Documents have been verified.`)
      await loadOrders()
    } catch (err: any) {
      setError(err.message || `Failed to ${status} order`)
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleOpenOrderRequirements = async (order: Order) => {
    setOrderForRequirementsModal(order)
    setOrderRequirementsData(null)
    setLoadingOrderRequirements(true)
    try {
      const response = await fetch('/api/country-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryId: order.country_id,
          countryName: order.country_name,
          countryCode: order.country_code || '',
          numberType: order.number_type,
          direction: order.direction,
          smsCapability: order.sms_capability,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setOrderRequirementsData(data.requirements || null)
      }
    } catch (err) {
      console.error('Error fetching order requirements:', err)
    } finally {
      setLoadingOrderRequirements(false)
    }
  }

  const handleSaveRequestChanges = async () => {
    if (!orderForRequestChanges) return
    setProcessingOrder(orderForRequestChanges.id)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          admin_request_changes: requestChangesMessage.trim() || null,
          admin_request_changes_at: requestChangesMessage.trim() ? new Date().toISOString() : null,
        })
        .eq('id', orderForRequestChanges.id)
      if (updateError) throw updateError
      setSuccess('Request sent to customer.')
      setOrderForRequestChanges(null)
      setRequestChangesMessage('')
      await loadOrders()
    } catch (err: any) {
      setError(err.message || 'Failed to save request')
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'new') {
      openAddCountryModal()
      setFormData({ ...formData, country_id: '' })
    } else {
      setFormData({ ...formData, country_id: value })
    }
  }

  const openAddCountryModal = (prefillName = '') => {
    setCountryFormData({
      name: prefillName,
      country_code: '',
      regulator: '',
    })
    setShowAddCountry(true)
  }

  const filteredCountriesList = useMemo(() => {
    const q = countrySearch.trim().toLowerCase()
    if (!q) return countries
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country_code.toLowerCase().includes(q) ||
        (c.regulator || '').toLowerCase().includes(q)
    )
  }, [countries, countrySearch])

  const toggleRowExpansion = (numberId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(numberId)) {
      newExpanded.delete(numberId)
    } else {
      newExpanded.add(numberId)
    }
    setExpandedRows(newExpanded)
  }

  const filteredInventoryNumbers = useMemo(() => {
    let list = [...allNumbers]
    if (inventoryFilters.country) {
      list = list.filter((n) => n.country_id === inventoryFilters.country)
    }
    if (inventoryFilters.smsVoice) {
      list = list.filter((n) => n.sms_capability === inventoryFilters.smsVoice)
    }
    if (inventoryFilters.inboundOutbound) {
      list = list.filter((n) => n.direction === inventoryFilters.inboundOutbound)
    }
    if (inventoryFilters.supplier) {
      list = list.filter((n) => (n.supplier || '') === inventoryFilters.supplier)
    }
    return list
  }, [allNumbers, inventoryFilters])

  // Whenever any inventory filter changes, jump back to page 1 — the
  // previously-viewed page number may no longer make sense against the new
  // filtered set.
  useEffect(() => {
    setInventoryPage(1)
  }, [inventoryFilters])

  // Pure display slice over filteredInventoryNumbers — filtering itself is
  // entirely unaffected; this only decides which already-filtered rows are
  // rendered for the current page. Clamped so a shrinking result set (e.g.
  // after a delete) never leaves the page number pointing past the end.
  const inventoryTotalPages = Math.max(1, Math.ceil(filteredInventoryNumbers.length / inventoryPageSize))
  const inventoryCurrentPage = Math.min(inventoryPage, inventoryTotalPages)
  const paginatedInventoryNumbers = useMemo(() => {
    const start = (inventoryCurrentPage - 1) * inventoryPageSize
    return filteredInventoryNumbers.slice(start, start + inventoryPageSize)
  }, [filteredInventoryNumbers, inventoryCurrentPage, inventoryPageSize])

  // Distinct supplier names already present in the inventory, for the supplier
  // dropdown. Custom entries can still be added via SelectWithCustom.
  const existingSuppliers = useMemo(() => {
    const set = new Set<string>()
    allNumbers.forEach((n) => {
      const s = (n.supplier || '').trim()
      if (s) set.add(s)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allNumbers])

  // Presentation lives in InventoryNumberDetails; values are formatted there
  // exactly as before.
  const inventoryPricingDetailContent = (num: Number) => <InventoryNumberDetails num={num} />

  const openInventoryEditorForModal = (num: Number) => {
    const oc = (num.other_charges || {}) as any
    const soc = (num.supplier_other_charges || {}) as any
    const feat = (num.features || {}) as Record<string, string | null>
    setEditingNumber({
      ...num,
      mrc: num.mrc === null || num.mrc === undefined ? ('' as any) : (String(num.mrc) as any),
      nrc: num.nrc === null || num.nrc === undefined ? ('' as any) : (String(num.nrc) as any),
      moq: num.moq === null || num.moq === undefined ? ('' as any) : (String(num.moq) as any),
      other_charges: {
        ...oc,
        inbound_call: oc.inbound_call === null || oc.inbound_call === undefined ? '' : String(oc.inbound_call),
        outbound_call_fixed: oc.outbound_call_fixed === null || oc.outbound_call_fixed === undefined ? '' : String(oc.outbound_call_fixed),
        outbound_call_mobile: oc.outbound_call_mobile === null || oc.outbound_call_mobile === undefined ? '' : String(oc.outbound_call_mobile),
        inbound_sms: oc.inbound_sms === null || oc.inbound_sms === undefined ? '' : String(oc.inbound_sms),
        outbound_sms: oc.outbound_sms === null || oc.outbound_sms === undefined ? '' : String(oc.outbound_sms),
        other_fees: oc.other_fees === null || oc.other_fees === undefined ? '' : String(oc.other_fees),
      },
      supplier_other_charges: {
        ...soc,
        inbound_call: soc.inbound_call === null || soc.inbound_call === undefined ? '' : String(soc.inbound_call),
        outbound_call_fixed: soc.outbound_call_fixed === null || soc.outbound_call_fixed === undefined ? '' : String(soc.outbound_call_fixed),
        outbound_call_mobile: soc.outbound_call_mobile === null || soc.outbound_call_mobile === undefined ? '' : String(soc.outbound_call_mobile),
        inbound_sms: soc.inbound_sms === null || soc.inbound_sms === undefined ? '' : String(soc.inbound_sms),
        outbound_sms: soc.outbound_sms === null || soc.outbound_sms === undefined ? '' : String(soc.outbound_sms),
        other_fees: soc.other_fees === null || soc.other_fees === undefined ? '' : String(soc.other_fees),
      },
      features: {
        voice: feat.voice ?? '',
        sms: feat.sms ?? '',
        reach: feat.reach ?? '',
        emergency_services: feat.emergency_services ?? '',
      },
      supplier_mrc: num.supplier_mrc != null ? String(num.supplier_mrc) : ('' as any),
      supplier_nrc: num.supplier_nrc != null ? String(num.supplier_nrc) : ('' as any),
      supplier_currency: num.supplier_currency ?? ('' as any),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mb-6">
            <img
              src="/logo.png"
              className="bg-[#215F9A] px-6 py-3 rounded-2xl mx-auto shadow-lg animate-pulse-slow"
              alt="logo"
            />
          </div>
          <LoadingSpinner size="lg" text="Loading Admin Dashboard..." />
          <p className="text-sm text-gray-500 mt-4">Fetching your data securely</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-[1600px]">
        {/* Masthead */}
        <div className="mb-5 flex flex-col gap-1 sm:mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#215F9A]">
              Voxco Operations Console
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">Admin Dashboard</h1>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className="mb-4 space-y-2.5">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-md p-0.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1">{success}</p>
                <button
                  onClick={() => setSuccess(null)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-md p-0.5 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Admin workspace — one continuous surface: tab navigation and the
            active tab's content share the same card instead of stacked
            rounded-top/rounded-bottom boxes. */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Tabs - Main Navigation */}
          <div className="overflow-x-auto border-b border-slate-100 px-2 sm:px-3">
            <div className="flex min-w-max">
              <TabButton
                active={activeTab === 'inventory'}
                onClick={() => setActiveTab('inventory')}
                icon={Boxes}
                label="Inventory"
              />
              <TabButton
                active={activeTab === 'countries'}
                onClick={() => setActiveTab('countries')}
                icon={Globe}
                label="Countries"
              />
              <TabButton
                active={activeTab === 'orders'}
                onClick={() => setActiveTab('orders')}
                icon={PackagePlus}
                label="Order Management"
                shortLabel="Orders"
                count={pendingOrdersCount}
              />
              <TabButton
                active={activeTab === 'custom_requests'}
                onClick={() => setActiveTab('custom_requests')}
                icon={Sparkles}
                label="Custom number requests"
                shortLabel="Custom"
                count={pendingCustomRequestsCount}
              />
              <TabButton
                active={activeTab === 'signup_requests'}
                onClick={() => setActiveTab('signup_requests')}
                icon={ShieldCheck}
                label="Signup Requests"
                shortLabel="Signups"
                count={pendingSignupCount}
              />
              <TabButton
                active={activeTab === 'users'}
                onClick={() => setActiveTab('users')}
                icon={UsersIcon}
                label="Users"
              />
              <TabButton
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
                icon={SettingsIcon}
                label="Settings"
              />
            </div>
          </div>

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div>
            {/* Add Number Section */}
            <TabHeader
              title="Add to inventory"
              description="Add a single number or bulk-import from a supplier file."
              action={
                <>
                  <button
                    onClick={() => {
                      setShowFileUpload(!showFileUpload)
                      setShowAddNumber(false)
                      setError(null)
                      setSuccess(null)
                    }}
                    className={showFileUpload ? BTN_SECONDARY : BTN_SUCCESS}
                  >
                    {showFileUpload ? <X className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                    {showFileUpload ? 'Cancel Upload' : 'Upload from File'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddNumber(!showAddNumber)
                      setShowFileUpload(false)
                      setError(null)
                      setSuccess(null)
                    }}
                    className={showAddNumber ? BTN_SECONDARY : BTN_PRIMARY}
                  >
                    {showAddNumber ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {showAddNumber ? 'Cancel' : 'Add Number'}
                  </button>
                </>
              }
            />

            <div className="p-4 sm:p-6">
              {/* File Upload Section */}
              {showFileUpload && (
                <div className="mb-8 overflow-hidden rounded-xl border border-dashed border-slate-300 p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                      <FileSpreadsheet className="h-4 w-4 text-[#215F9A]" />
                      Upload Numbers from File
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('countries')}
                      className="text-left text-sm font-medium text-[#215F9A] hover:underline sm:text-right"
                    >
                      Manage countries
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">
                    Upload a CSV, Excel, Word, or PDF file containing a table with phone numbers.
                    The system will automatically detect the number column and extract additional
                    information if available (country, type, pricing, etc.).
                  </p>
                  <NumberFileUpload
                    countries={countries}
                    onNumbersExtracted={handleBulkAddNumbers}
                    onError={(error) => setError(error)}
                    onSuccess={(message) => setSuccess(message)}
                    onRequestAddCountry={(name: string) => openAddCountryModal(name)}
                  />
                  {uploadingNumbers && (
                    <div className="mt-4 flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Adding numbers to inventory...</span>
                    </div>
                  )}
                </div>
              )}

{showAddNumber && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleAddNumber()
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_CLASS}>
                        Country *
                      </label>
                      <select
                        value={formData.country_id}
                        onChange={handleCountryChange}
                        className={INPUT_CLASS}
                        required
                      >
                        <option value="">Select Country</option>
                        {countries.map((country) => (
                          <option key={country.id} value={country.id}>
                            {country.name} ({country.country_code})
                          </option>
                        ))}
                        <option value="new">+ Add New Country</option>
                      </select>
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Available Numbers
                      </label>
                      <input
                        type="text"
                        value={formData.available_numbers}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty and integers
                          if (value === '' || /^\d*$/.test(value)) {
                            setFormData({ ...formData, available_numbers: value })
                          }
                        }}
                        placeholder="Available numbers"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Number Type *
                      </label>
                      <SelectWithCustom
                        value={formData.number_type}
                        onChange={(value) => setFormData({ ...formData, number_type: value })}
                        options={NUMBER_TYPE_OPTIONS}
                        placeholder="Select number type..."
                        customPlaceholder="Enter number type..."
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        SMS/Voice Capability *
                      </label>
                      <SelectWithCustom
                        value={formData.sms_capability.trim()}
                        onChange={(value) => setFormData({ ...formData, sms_capability: value })}
                        options={SMS_VOICE_OPTIONS}
                        placeholder="Select capability..."
                        customPlaceholder="Enter capability..."
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Inbound/Outbound *
                      </label>
                      <SelectWithCustom
                        value={formData.direction.trim()}
                        onChange={(value) => setFormData({ ...formData, direction: value })}
                        options={DIRECTION_OPTIONS}
                        placeholder="Select direction..."
                        customPlaceholder="Enter direction..."
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Customer MRC (Monthly Recurring Charge)
                      </label>
                      <input
                        type="text"
                        value={formData.mrc}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty, digits, and a single decimal separator ('.' or ',')
                          if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                            setFormData({ ...formData, mrc: normalizeDecimalInput(value) })
                          }
                        }}
                        className={INPUT_CLASS}
                        inputMode="decimal"
                        placeholder="Enter MRC (e.g., 12.50)"
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Customer NRC (Non-Recurring Charge)
                      </label>
                      <input
                        type="text"
                        value={formData.nrc}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty, digits, and a single decimal separator ('.' or ',')
                          if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                            setFormData({ ...formData, nrc: normalizeDecimalInput(value) })
                          }
                        }}
                        className={INPUT_CLASS}
                        inputMode="decimal"
                        placeholder="Enter NRC (e.g., 20.00)"
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Customer currency *
                      </label>
                      <SelectWithCustom
                        value={formData.currency}
                        onChange={(value) => setFormData({ ...formData, currency: value })}
                        options={CURRENCY_OPTIONS}
                        placeholder="Select currency..."
                        customPlaceholder="Enter currency code..."
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 text-sm font-semibold text-[#215F9A] mt-2">Supplier rate (admin only)</div>
                    <div>
                      <label className={LABEL_CLASS}>Supplier MRC</label>
                      <input
                        type="text"
                        value={formData.supplier_mrc ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                            setFormData({ ...formData, supplier_mrc: normalizeDecimalInput(value) })
                          }
                        }}
                        className={INPUT_CLASS}
                        inputMode="decimal"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Supplier NRC</label>
                      <input
                        type="text"
                        value={formData.supplier_nrc ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                            setFormData({ ...formData, supplier_nrc: normalizeDecimalInput(value) })
                          }
                        }}
                        className={INPUT_CLASS}
                        inputMode="decimal"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Supplier Currency</label>
                      <SelectWithCustom
                        value={formData.supplier_currency ?? ''}
                        onChange={(value) => setFormData({ ...formData, supplier_currency: value })}
                        options={CURRENCY_OPTIONS}
                        placeholder="Select currency..."
                        customPlaceholder="Enter currency code..."
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        MOQ (Minimum Order Quantity)
                      </label>
                      <input
                        type="text"
                        value={formData.moq}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty and integers
                          if (value === '' || /^\d*$/.test(value)) {
                            setFormData({ ...formData, moq: value })
                          }
                        }}
                        className={INPUT_CLASS}
                        placeholder="Enter MOQ (e.g., 1)"
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Supplier
                      </label>
                      <SelectWithCustom
                        value={formData.supplier || ''}
                        onChange={(value) =>
                          setFormData({ ...formData, supplier: value })
                        }
                        options={existingSuppliers}
                        placeholder="Select supplier..."
                        customPlaceholder="Enter supplier name..."
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Specification (Prefix/Area)
                      </label>
                      <input
                        type="text"
                        value={formData.specification || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, specification: e.target.value })
                        }
                        placeholder="e.g., Landline, France (07), France (093)"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Bill Pulse
                      </label>
                      <SelectWithCustom
                        value={formData.bill_pulse || ''}
                        onChange={(value) =>
                          setFormData({ ...formData, bill_pulse: value })
                        }
                        options={BILL_PULSE_OPTIONS}
                        placeholder="Select bill pulse..."
                        customPlaceholder="Enter custom (e.g., 45/45)..."
                      />
                    </div>

                    <div>
                      <label className={LABEL_CLASS}>
                        Requirements Text
                      </label>
                      <textarea
                        value={formData.requirements_text || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, requirements_text: e.target.value })
                        }
                        placeholder="Requirements and documentation needed"
                        className={INPUT_CLASS}
                        rows={3}
                      />
                    </div>

                  </div>

                  {/* Customer other charges */}
                  <div className="mt-4">
                    <label className={LABEL_CLASS}>Customer other charges</label>
                    <div className="overflow-hidden rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px] md:min-w-0">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="p-2 text-left">Charge Type</th>
                            <th className="p-2 text-left">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2">Inbound Call (per min)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.inbound_call ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        inbound_call: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className={INPUT_SM_CLASS}
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Outbound Call Fixed (per min)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.outbound_call_fixed ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        outbound_call_fixed: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className={INPUT_SM_CLASS}
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Outbound Call Mobile (per min)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.outbound_call_mobile ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        outbound_call_mobile: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className={INPUT_SM_CLASS}
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Inbound SMS (per SMS)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.inbound_sms ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        inbound_sms: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className={INPUT_SM_CLASS}
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Outbound SMS (per SMS)</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.outbound_sms ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setFormData({
                                      ...formData,
                                      other_charges: {
                                        ...formData.other_charges,
                                        outbound_sms: normalizeDecimalInput(value)
                                      }
                                    })
                                  }
                                }}
                                className={INPUT_SM_CLASS}
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Other Fees</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.other_charges.other_fees ?? ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  other_charges: {
                                    ...formData.other_charges,
                                    other_fees: e.target.value || undefined
                                  }
                                })}
                                className={INPUT_SM_CLASS}
                                placeholder="Description or amount"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Supplier other charges (add form) */}
                  <div className="mt-4">
                    <label className={LABEL_CLASS}>Supplier other charges (admin)</label>
                    <div className="overflow-hidden rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px] md:min-w-0">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="p-2 text-left">Charge Type</th>
                            <th className="p-2 text-left">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(['inbound_call', 'outbound_call_fixed', 'outbound_call_mobile', 'inbound_sms', 'outbound_sms'] as const).map((key) => (
                            <tr key={key} className="border-t">
                              <td className="p-2 capitalize">{key.replace(/_/g, ' ')}</td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={formData.supplier_other_charges[key] ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                      setFormData({
                                        ...formData,
                                        supplier_other_charges: {
                                          ...formData.supplier_other_charges,
                                          [key]: normalizeDecimalInput(value),
                                        },
                                      })
                                    }
                                  }}
                                  className={INPUT_SM_CLASS}
                                  inputMode="decimal"
                                  placeholder="0.0000"
                                />
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t">
                            <td className="p-2">Other Fees</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={formData.supplier_other_charges.other_fees ?? ''}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    supplier_other_charges: {
                                      ...formData.supplier_other_charges,
                                      other_fees: e.target.value || undefined,
                                    },
                                  })
                                }
                                className={INPUT_SM_CLASS}
                                placeholder="Description or amount"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Features Table */}
                  <div className="mt-4">
                    <label className={LABEL_CLASS}>Features</label>
                    <div className="overflow-visible rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="p-2 text-left">Feature</th>
                            <th className="p-2 text-left">Status/Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2">Reach</td>
                            <td className="p-2">
                              <SelectWithCustom
                                value={formData.features.reach ?? ''}
                                onChange={(value) => setFormData({
                                  ...formData,
                                  features: {
                                    ...formData.features,
                                    reach: value || null
                                  }
                                })}
                                options={FEATURE_OPTIONS.reach}
                                placeholder="Select..."
                              />
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Emergency Services</td>
                            <td className="p-2">
                              <SelectWithCustom
                                value={formData.features.emergency_services ?? ''}
                                onChange={(value) => setFormData({
                                  ...formData,
                                  features: {
                                    ...formData.features,
                                    emergency_services: value || null
                                  }
                                })}
                                options={FEATURE_OPTIONS.emergency_services}
                                placeholder="Select..."
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`${BTN_PRIMARY} w-full py-2.5`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Number to Inventory
                  </button>
                </form>
              )}
            </div>

            {/* All Numbers Table */}
            <TabHeader
              title="Inventory"
              count={filteredInventoryNumbers.length}
              description={
                inventoryFilters.country || inventoryFilters.smsVoice || inventoryFilters.inboundOutbound || inventoryFilters.supplier
                  ? `Filtered · ${allNumbers.length} total row(s) in inventory`
                  : 'The working list of numbers available for order.'
              }
            />
            <div className="border-b border-slate-100 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FilterSelect
                  icon={Globe}
                  value={inventoryFilters.country}
                  onChange={(e) => setInventoryFilters({ ...inventoryFilters, country: e.target.value })}
                >
                  <option value="">All countries</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.country_code})
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect
                  icon={MessageSquare}
                  value={inventoryFilters.smsVoice}
                  onChange={(e) => setInventoryFilters({ ...inventoryFilters, smsVoice: e.target.value })}
                >
                  <option value="">All SMS/Voice</option>
                  <option>SMS only</option>
                  <option>Voice only</option>
                  <option>Both</option>
                </FilterSelect>
                <FilterSelect
                  icon={ArrowRightLeft}
                  value={inventoryFilters.inboundOutbound}
                  onChange={(e) => setInventoryFilters({ ...inventoryFilters, inboundOutbound: e.target.value })}
                >
                  <option value="">All directions</option>
                  <option>Inbound only</option>
                  <option>Outbound only</option>
                  <option>Both</option>
                </FilterSelect>
                <FilterSelect
                  icon={Building2}
                  value={inventoryFilters.supplier}
                  onChange={(e) => setInventoryFilters({ ...inventoryFilters, supplier: e.target.value })}
                >
                  <option value="">All suppliers</option>
                  {existingSuppliers.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </FilterSelect>
                <button
                  type="button"
                  onClick={() => setInventoryFilters({ country: '', smsVoice: '', inboundOutbound: '', supplier: '' })}
                  disabled={loadingNumbers}
                  className={`${BTN_SECONDARY} w-full`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset filters
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {loadingNumbers ? (
                <div className="animate-fade-in">
                  <TableSkeleton rows={5} cols={8} />
                </div>
              ) : (
                <>
                  <div className="md:hidden space-y-3 mb-2">
                    {paginatedInventoryNumbers.map((num) => {
                      const isCardExpanded = expandedRows.has(num.id)
                      const supCurM = num.supplier_currency || num.currency || 'USD'
                      return (
                        <div key={`m-${num.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs text-slate-400">{num.supplier || 'No supplier'}</p>
                              <CountryCell name={num.country_name} code={num.country_code} />
                              <p className="text-xs text-slate-500">{num.number_type || '—'}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <SmsVoiceIndicator value={num.sms_capability} />
                                <DirectionIndicator value={num.direction} />
                              </div>
                            </div>
                            <div className="shrink-0 text-right text-sm">
                              <p className="text-xs text-slate-400">Supplier MRC</p>
                              <p className="font-medium tabular-nums text-slate-900">
                                {num.supplier_mrc != null ? formatDecimal(num.supplier_mrc, 2) : '—'}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">NRC</p>
                              <p className="font-medium tabular-nums text-slate-900">
                                {num.supplier_nrc != null ? formatDecimal(num.supplier_nrc, 2) : '—'}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">{supCurM}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                            <RowActionButton
                              icon={isCardExpanded ? ChevronUp : Info}
                              label={isCardExpanded ? 'Hide details' : 'Details'}
                              onClick={() => toggleRowExpansion(num.id)}
                            />
                            <RowActionButton
                              icon={Pencil}
                              label="Edit"
                              variant="edit"
                              onClick={() => openInventoryEditorForModal(num)}
                            />
                            <RowActionButton
                              icon={Trash2}
                              label="Delete"
                              variant="danger"
                              onClick={() => setNumberPendingDelete(num)}
                            />
                            <span className="ml-auto text-xs text-slate-400">
                              {isCardExpanded ? 'Hide pricing detail' : 'View pricing detail'}
                            </span>
                          </div>
                          {isCardExpanded && (
                            <div className="-mx-4 -mb-4 rounded-b-xl border-t border-[#215F9A]/10 bg-[#215F9A]/[0.025] p-3 motion-safe:animate-[fadeIn_180ms_ease-out]">
                              {inventoryPricingDetailContent(num)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <DualScrollbar className="hidden md:block -mx-2 px-2 sm:mx-0 sm:px-0" bodyClassName="[container-type:inline-size]">
                    <table className="w-full min-w-[1200px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                          <th className="max-w-[120px] p-2.5 align-middle sm:p-3">Supplier</th>
                          <th className="p-2.5 align-middle sm:p-3">Country</th>
                          <th className="p-2.5 align-middle sm:p-3">SMS/Voice</th>
                          <th className="p-2.5 align-middle sm:p-3">Direction</th>
                          <th className="p-2.5 text-center align-middle sm:p-3">Available</th>
                          <th className="p-2.5 align-middle sm:p-3">Type</th>
                          <th className="p-2.5 align-middle sm:p-3">Specification</th>
                          <th className="p-2.5 text-right align-middle sm:p-3" title="Supplier MRC">MRC</th>
                          <th className="p-2.5 text-right align-middle sm:p-3" title="Supplier NRC">NRC</th>
                          <th className="p-2.5 align-middle sm:p-3" title="Supplier currency">Curr.</th>
                          <th className="p-2.5 text-center align-middle sm:p-3">MOQ</th>
                          <th className="p-2.5 align-middle sm:p-3">Pulse</th>
                          <th className="p-2.5 text-center align-middle sm:p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedInventoryNumbers.map((num) => {
                          const isExpanded = expandedRows.has(num.id)
                          const supCur = num.supplier_currency || num.currency || 'USD'

                          return (
                            <React.Fragment key={num.id}>
                              <tr
                                className={`transition-colors ${
                                  isExpanded
                                    ? 'bg-[#215F9A]/[0.04] shadow-[inset_3px_0_0_#215F9A] hover:bg-[#215F9A]/[0.06]'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="max-w-[120px] truncate p-2.5 text-xs text-slate-500 sm:p-3" title={num.supplier || undefined}>
                                  {num.supplier || '—'}
                                </td>
                                <td className="p-2.5 sm:p-3">
                                  <CountryCell name={num.country_name} code={num.country_code} />
                                </td>
                                <td className="p-2.5 text-xs text-slate-600 sm:p-3">
                                  <SmsVoiceIndicator value={num.sms_capability} />
                                </td>
                                <td className="p-2.5 text-xs text-slate-600 sm:p-3">
                                  <DirectionIndicator value={num.direction} />
                                </td>
                                <td className="p-2.5 text-center font-semibold tabular-nums text-slate-900 sm:p-3">{num.available_numbers ?? 0}</td>
                                <td className="p-2.5 sm:p-3">
                                  <span className={BADGE_CLASS}>{num.number_type || '—'}</span>
                                </td>
                                <td className="p-2.5 text-xs text-slate-500 sm:p-3 sm:text-sm">{num.specification || '—'}</td>
                                <td className="whitespace-nowrap p-2.5 text-right tabular-nums text-slate-700 sm:p-3">
                                  {num.supplier_mrc != null ? formatDecimal(num.supplier_mrc, 2) : '—'}
                                </td>
                                <td className="whitespace-nowrap p-2.5 text-right tabular-nums text-slate-700 sm:p-3">
                                  {num.supplier_nrc != null ? formatDecimal(num.supplier_nrc, 2) : '—'}
                                </td>
                                <td className="p-2.5 text-slate-500 sm:p-3">{num.supplier_currency || (num.supplier_mrc != null || num.supplier_nrc != null ? num.currency : '—')}</td>
                                <td className="p-2.5 text-center tabular-nums text-slate-700 sm:p-3">{num.moq}</td>
                                <td className="p-2.5 text-xs text-slate-500 sm:p-3">{num.bill_pulse || '—'}</td>
                                <td className="p-2.5 sm:p-3">
                                  <div className="flex items-center justify-center gap-1">
                                    <RowActionButton
                                      icon={isExpanded ? ChevronUp : Info}
                                      label={isExpanded ? 'Hide details' : 'Details'}
                                      onClick={() => toggleRowExpansion(num.id)}
                                    />
                                    <RowActionButton
                                      icon={Pencil}
                                      label="Edit"
                                      variant="edit"
                                      onClick={() => openInventoryEditorForModal(num)}
                                    />
                                    <RowActionButton
                                      icon={Trash2}
                                      label="Delete"
                                      variant="danger"
                                      onClick={() => setNumberPendingDelete(num)}
                                    />
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="!border-t-0 bg-[#215F9A]/[0.025] shadow-[inset_3px_0_0_#215F9A]">
                                  <td colSpan={13} className="p-0">
                                    {/* Pinned to the visible part of the horizontally-scrolling
                                        table (sticky + container width) so the panel never
                                        extends off-screen when the table is wider than the view. */}
                                    <div className="sticky left-0 w-[100cqw] max-w-full px-4 pb-4 pt-1 motion-safe:animate-[fadeIn_180ms_ease-out] sm:px-5 sm:pb-5">
                                      {inventoryPricingDetailContent(num)}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </DualScrollbar>
                  <PaginationBar
                    page={inventoryCurrentPage}
                    totalPages={inventoryTotalPages}
                    pageSize={inventoryPageSize}
                    totalItems={filteredInventoryNumbers.length}
                    onPageChange={setInventoryPage}
                    onPageSizeChange={(size) => {
                      setInventoryPageSize(size)
                      setInventoryPage(1)
                    }}
                  />
                  {allNumbers.length === 0 && (
                    <EmptyState icon={<Package className="h-6 w-6" />} title="No numbers in inventory yet" />
                  )}
                  {allNumbers.length > 0 && filteredInventoryNumbers.length === 0 && (
                    <EmptyState
                      icon={<Search className="h-6 w-6" />}
                      title="No rows match the current filters"
                      action={
                        <button
                          type="button"
                          onClick={() => setInventoryFilters({ country: '', smsVoice: '', inboundOutbound: '', supplier: '' })}
                          className={BTN_SECONDARY}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset filters
                        </button>
                      }
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Countries Tab */}
        {activeTab === 'countries' && (
          <div>
            <TabHeader
              title="Countries"
              count={countries.length}
              description="Regulatory coverage for every market you sell numbers in."
              action={
                <button type="button" onClick={() => openAddCountryModal()} className={BTN_PRIMARY}>
                  <Plus className="h-3.5 w-3.5" />
                  Add country
                </button>
              }
            />
            <div className="p-4 sm:p-6">
              <div className="relative mb-4 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search by name, code, or regulator…"
                  className={`${INPUT_CLASS} pl-9`}
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="p-3">Country</th>
                        <th className="p-3">Code</th>
                        <th className="p-3">Regulator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCountriesList.map((country) => (
                        <tr key={country.id} className="transition-colors hover:bg-slate-50">
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-800">
                              {(() => {
                                const flag = getCountryFlagEmoji(country.country_code)
                                return flag ? (
                                  <span aria-hidden="true" className="text-[15px] leading-none">
                                    {flag}
                                  </span>
                                ) : null
                              })()}
                              {country.name}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={BADGE_CLASS}>{country.country_code}</span>
                          </td>
                          <td className="p-3 text-slate-500">
                            {country.regulator ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Landmark className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                {country.regulator}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {countries.length === 0 && !loading && (
                  <EmptyState icon={<Globe className="h-6 w-6" />} title="No countries in the system yet" />
                )}
                {countries.length > 0 && filteredCountriesList.length === 0 && (
                  <EmptyState icon={<Search className="h-6 w-6" />} title="No countries match your search" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <TabHeader
              title="Order Management"
              count={orders.length}
              description="Approve, reject, or request changes on customer number orders."
            />
            <div className="p-4 sm:p-6">
              {loadingOrders ? (
                <div className="animate-fade-in">
                  <TableSkeleton rows={5} cols={10} />
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <DualScrollbar>
                    <table className="w-full min-w-[1300px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Customer</th>
                          <th className="p-2.5">Country</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">SMS/Voice</th>
                          <th className="p-2.5">Direction</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-right">Supplier MRC</th>
                          <th className="p-2.5 text-right">Supplier NRC</th>
                          <th className="p-2.5">Requirements</th>
                          <th className="p-2.5">Documents</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.map((order) => {
                          const belowMoq = order.below_moq_at_order || order.quantity < (order.moq ?? 1)
                          const docs = order.uploaded_documents?.documents ?? []
                          const otherDocs = order.uploaded_documents?.other_documents ?? []
                          const hasDocs = docs.length > 0 || otherDocs.length > 0
                          const canAct = order.status === 'pending' || order.status === 'documentation_review'
                          return (
                            <tr key={order.id} className="align-top transition-colors hover:bg-slate-50">
                              <td className="whitespace-nowrap p-2.5 text-xs text-slate-500">
                                {new Date(order.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-2.5">
                                <div className="text-xs font-medium text-slate-800">{order.customer_name}</div>
                                <div className="text-xs text-slate-400">{order.customer_email}</div>
                              </td>
                              <td className="p-2.5 text-xs">
                                <CountryCell name={order.country_name} code={order.country_code} />
                              </td>
                              <td className="p-2.5 text-xs">
                                <span className={BADGE_CLASS}>{order.number_type}</span>
                              </td>
                              <td className="p-2.5 text-xs text-slate-600"><SmsVoiceIndicator value={order.sms_capability} /></td>
                              <td className="p-2.5 text-xs text-slate-600"><DirectionIndicator value={order.direction} /></td>
                              <td className="p-2.5 text-center text-xs">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-semibold tabular-nums text-slate-900">{order.quantity}</span>
                                  <span className="whitespace-nowrap text-[10px] tabular-nums text-slate-400">MOQ {order.moq}</span>
                                  {belowMoq && (
                                    <span className="whitespace-nowrap rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                      Below MOQ
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap p-2.5 text-right text-xs tabular-nums text-slate-700">
                                {order.supplier_mrc != null ? `${order.supplier_currency || 'USD'} ${formatDecimal(order.supplier_mrc, 2)}` : '—'}
                              </td>
                              <td className="whitespace-nowrap p-2.5 text-right text-xs tabular-nums text-slate-700">
                                {order.supplier_nrc != null ? `${order.supplier_currency || 'USD'} ${formatDecimal(order.supplier_nrc, 2)}` : '—'}
                              </td>
                              <td className="p-2.5">
                                <RowActionButton
                                  icon={ClipboardList}
                                  label="View requirements"
                                  onClick={() => handleOpenOrderRequirements(order)}
                                />
                              </td>
                              <td className="p-2.5">
                                {hasDocs ? (
                                  <div className="flex flex-col items-start gap-1">
                                    {docs.length > 0 && <span className={BADGE_CLASS}>{docs.length} file{docs.length !== 1 ? 's' : ''}</span>}
                                    {otherDocs.length > 0 && (
                                      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                                        {otherDocs.length} custom doc{otherDocs.length !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                    <span className="text-[11px] capitalize text-slate-400">
                                      {order.uploaded_documents?.customer_type || 'N/A'}
                                    </span>
                                    <button
                                      onClick={() => setSelectedOrderForDocs(order)}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-[#215F9A] hover:underline"
                                    >
                                      <Files className="h-3 w-3" />
                                      View
                                    </button>
                                  </div>
                                ) : order.uploaded_documents?.documents_deleted ? (
                                  <span className="text-xs italic text-slate-400">Cleaned up</span>
                                ) : (
                                  <span className="text-xs text-slate-400">None</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                <StatusPill status={order.status} label={order.status === 'documentation_review' ? 'Doc Review' : order.status} />
                              </td>
                              <td className="p-2.5">
                                {canAct ? (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      onClick={() => handleOrderStatus(order.id, 'granted')}
                                      disabled={processingOrder === order.id}
                                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <Check className="h-3 w-3" />
                                      Grant
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOrderPendingReject(order)
                                        setOrderRejectReason('')
                                      }}
                                      disabled={processingOrder === order.id}
                                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <X className="h-3 w-3" />
                                      Deny
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOrderForRequestChanges(order)
                                        setRequestChangesMessage(order.admin_request_changes || '')
                                      }}
                                      disabled={processingOrder === order.id}
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#215F9A]/30 hover:bg-[#215F9A]/5 hover:text-[#215F9A] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                      Request changes
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    {order.status === 'granted' ? 'Approved' : order.status === 'rejected' ? 'Rejected' : '—'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </DualScrollbar>
                  {orders.length === 0 && (
                    <EmptyState icon={<PackagePlus className="h-6 w-6" />} title="No orders yet" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom number requests Tab */}
        {activeTab === 'custom_requests' && (
          <div>
            <TabHeader
              title="Custom number requests"
              count={customRequests.length}
              description="Requests for numbers not currently in inventory — distinct from regular orders."
            />
            <div className="p-4 sm:p-6">
              {loadingCustomRequests ? (
                <div className="animate-fade-in">
                  <TableSkeleton rows={5} cols={10} />
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <DualScrollbar>
                    <table className="w-full min-w-[1200px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Customer</th>
                          <th className="p-2.5">Country</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">SMS/Voice</th>
                          <th className="p-2.5">Direction</th>
                          <th className="p-2.5 text-right">MRC</th>
                          <th className="p-2.5 text-right">NRC</th>
                          <th className="p-2.5 text-center">MOQ</th>
                          <th className="p-2.5">Requirements</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customRequests.map((req) => (
                          <tr key={req.id} className="align-top transition-colors hover:bg-slate-50">
                            <td className="whitespace-nowrap p-2.5 text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                            <td className="p-2.5">
                              <div className="text-xs font-medium text-slate-800">{req.customer_name || '—'}</div>
                              <div className="text-xs text-slate-400">{req.customer_email || '—'}</div>
                            </td>
                            <td className="p-2.5 text-xs">{req.country_name || '—'}</td>
                            <td className="p-2.5 text-xs">
                              <span className={BADGE_CLASS}>{req.number_type}</span>
                            </td>
                            <td className="p-2.5 text-xs text-slate-600"><SmsVoiceIndicator value={req.sms_capability} /></td>
                            <td className="p-2.5 text-xs text-slate-600"><DirectionIndicator value={req.direction} /></td>
                            <td className="whitespace-nowrap p-2.5 text-right text-xs tabular-nums">{formatMoney(req.mrc, req.currency)}</td>
                            <td className="whitespace-nowrap p-2.5 text-right text-xs tabular-nums">{formatMoney(req.nrc, req.currency)}</td>
                            <td className="p-2.5 text-center text-xs tabular-nums">{req.moq}</td>
                            <td className="max-w-[150px] p-2.5 text-xs text-slate-500" title={req.requirements_text || undefined}>
                              {req.requirements_text ? (req.requirements_text.length > 50 ? `${req.requirements_text.slice(0, 50)}…` : req.requirements_text) : '—'}
                            </td>
                            <td className="p-2.5">
                              <StatusPill status={req.status} label={req.status} />
                            </td>
                            <td className="p-2.5">
                              {req.status === 'pending' ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setFulfillCustomRequestModal(req)
                                      setFulfillForm({
                                        mrc: req.mrc != null ? String(req.mrc) : '',
                                        nrc: req.nrc != null ? String(req.nrc) : '',
                                        currency: req.currency || 'USD',
                                        moq: req.moq != null ? String(req.moq) : '1',
                                        supplier_mrc: '',
                                        supplier_nrc: '',
                                        supplier_currency: '',
                                        specification: req.specification || '',
                                        bill_pulse: req.bill_pulse || '',
                                        requirements_text: req.requirements_text || '',
                                      })
                                      setError(null)
                                    }}
                                    disabled={processingCustomRequest === req.id}
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Fill mandatory fields in popup, then approve to add to inventory"
                                  >
                                    <Check className="h-3 w-3" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCustomRequestPendingReject(req)
                                      setCustomRequestRejectReason('')
                                    }}
                                    disabled={processingCustomRequest === req.id}
                                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <X className="h-3 w-3" />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">{req.status === 'approved' ? 'Approved' : 'Rejected'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </DualScrollbar>
                  {customRequests.length === 0 && (
                    <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No custom number requests yet" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signup Requests Tab */}
        {activeTab === 'signup_requests' && (
          <div>
            <TabHeader
              title="Signup Requests"
              count={signupRequests.length}
              description="Approval queue for new customer accounts."
            />
            <div className="p-4 sm:p-6">
              {loadingSignupRequests ? (
                <div className="animate-fade-in">
                  <TableSkeleton rows={5} cols={6} />
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="p-3">Date</th>
                          <th className="p-3">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Message</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {signupRequests.map((request) => (
                          <tr key={request.id} className="align-top transition-colors hover:bg-slate-50">
                            <td className="whitespace-nowrap p-3 text-xs text-slate-500">
                              {new Date(request.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-3 font-medium text-slate-800">{request.name}</td>
                            <td className="p-3 text-slate-600">{request.email}</td>
                            <td className="max-w-xs truncate p-3 text-sm text-slate-500" title={request.message}>
                              {request.message}
                            </td>
                            <td className="p-3">
                              <StatusPill status={request.status} label={request.status} />
                            </td>
                            <td className="p-3">
                              {request.status === 'pending' ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    onClick={() => handleApproveSignup(request.id)}
                                    disabled={processingSignup === request.id}
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Check className="h-3 w-3" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSignupPendingReject(request)
                                      setSignupRejectReason('')
                                    }}
                                    disabled={processingSignup === request.id}
                                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <X className="h-3 w-3" />
                                    Reject
                                  </button>
                                </div>
                              ) : request.status === 'rejected' && request.rejected_reason ? (
                                <span className="text-xs text-red-600" title={request.rejected_reason}>
                                  {request.rejected_reason.substring(0, 20)}...
                                </span>
                              ) : request.status === 'approved' ? (
                                <span className="text-xs text-emerald-600">Approved</span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {signupRequests.length === 0 && (
                    <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No signup requests yet" />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <TabHeader
              title="User Management"
              count={users.length}
              description="View and manage customer accounts, reset passwords, and handle user issues."
            />
            <div className="p-4 sm:p-6">
              {loadingUsers ? (
                <TableSkeleton rows={5} />
              ) : users.length === 0 ? (
                <EmptyState icon={<UsersIcon className="h-6 w-6" />} title="No users found" />
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="p-3">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Company</th>
                          <th className="p-3">Signup date</th>
                          <th className="p-3">Last login</th>
                          <th className="p-3">Orders</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                          <tr key={user.id} className={`transition-colors hover:bg-slate-50 ${user.is_admin ? 'bg-[#215F9A]/[0.03]' : ''}`}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                  <UserCircle2 className="h-4.5 w-4.5" />
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-800">{user.name}</span>
                                    {user.is_admin && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-[#215F9A]/10 px-2 py-0.5 text-[11px] font-medium text-[#215F9A]">
                                        <ShieldCheck className="h-3 w-3" />
                                        Admin
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-slate-500">{user.email}</td>
                            <td className="p-3 text-slate-500">
                              {user.company_name ? (
                                <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />{user.company_name}</span>
                              ) : '—'}
                            </td>
                            <td className="whitespace-nowrap p-3 text-slate-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap p-3 text-slate-500">
                              {user.last_login_at
                                ? new Date(user.last_login_at).toLocaleDateString()
                                : <span className="italic text-slate-400">Not tracked</span>
                              }
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleViewUserOrders(user)}
                                className="inline-flex items-center gap-1 rounded-md bg-[#215F9A]/10 px-2 py-1 text-xs font-medium text-[#215F9A] transition-colors hover:bg-[#215F9A]/15"
                              >
                                {user.order_count} order{user.order_count === 1 ? '' : 's'}
                              </button>
                            </td>
                            <td className="p-3">
                              {user.is_disabled ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                  <PauseCircle className="h-3 w-3" />
                                  Disabled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  <PlayCircle className="h-3 w-3" />
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {user.is_admin ? (
                                <span className="text-xs italic text-slate-400">Protected</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <RowActionButton
                                    icon={user.is_disabled ? PlayCircle : PauseCircle}
                                    label={user.is_disabled ? 'Enable user' : 'Disable user'}
                                    onClick={() => handleToggleUserStatus(user)}
                                    disabled={processingUser === user.id}
                                    variant={user.is_disabled ? 'quiet' : 'edit'}
                                  />
                                  <RowActionButton
                                    icon={KeyRound}
                                    label="Send password reset"
                                    onClick={() => handleSendPasswordReset(user)}
                                    disabled={processingUser === user.id}
                                    variant="edit"
                                  />
                                  <RowActionButton
                                    icon={Trash2}
                                    label="Delete user"
                                    onClick={() => setUserPendingDelete(user)}
                                    disabled={processingUser === user.id}
                                    variant="danger"
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* User Orders Modal */}
            {viewingUserOrders && (
              <AdminModalShell
                icon={UsersIcon}
                title={`Orders for ${viewingUserOrders.name}`}
                subtitle={<p className="mt-0.5 truncate text-xs text-slate-500">{viewingUserOrders.email}</p>}
                widthClassName="max-w-2xl"
                onClose={() => {
                  setViewingUserOrders(null)
                  setSelectedUserOrders(null)
                }}
              >
                {selectedUserOrders === null ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
                    <span className="text-sm font-medium text-slate-500">Loading orders…</span>
                  </div>
                ) : selectedUserOrders.length === 0 ? (
                  <EmptyState icon={<PackagePlus className="h-6 w-6" />} title="No orders found for this user" />
                ) : (
                  <div className="space-y-3">
                    {selectedUserOrders.map((order: any) => (
                      <div key={order.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-800">
                            {order.number?.countries?.name || 'Unknown'} · {order.number?.number_type || 'Unknown'}
                          </span>
                          <StatusPill status={order.status} label={order.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-500">
                          <div>Quantity: <span className="tabular-nums text-slate-700">{order.quantity}</span></div>
                          <div>Created: {new Date(order.created_at).toLocaleDateString()}</div>
                          <div>MRC: <span className="tabular-nums text-slate-700">{formatDecimal(order.mrc_at_order, 2)}</span></div>
                          <div>NRC: <span className="tabular-nums text-slate-700">{formatDecimal(order.nrc_at_order, 2)}</span></div>
                          <div>Currency: {order.currency_at_order}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminModalShell>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <TabHeader title="Settings" description="Platform-level configuration for notifications and alerts." />
            <div className="p-4 sm:p-6">
              {loadingSettings ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
                  <span className="text-sm font-medium text-slate-500">Loading settings…</span>
                </div>
              ) : (
                <div className="max-w-2xl overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#215F9A]/10 text-[#215F9A]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900">Email notifications</h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Where new signup requests and orders get sent for review.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 px-5 py-5">
                    <div>
                      <label className={LABEL_CLASS}>Notification email address</label>
                      <input
                        type="email"
                        value={adminSettings.notification_email}
                        onChange={(e) => setAdminSettings({ ...adminSettings, notification_email: e.target.value })}
                        className={INPUT_CLASS}
                        placeholder="admin@yourcompany.com"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        Receives notifications for new signup requests and customer orders.
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
                      Delivery also requires SMTP environment variables on the server:{' '}
                      <code className="rounded bg-white px-1 py-0.5 text-slate-600">SMTP_HOST</code>,{' '}
                      <code className="rounded bg-white px-1 py-0.5 text-slate-600">SMTP_PORT</code>,{' '}
                      <code className="rounded bg-white px-1 py-0.5 text-slate-600">SMTP_USER</code>,{' '}
                      <code className="rounded bg-white px-1 py-0.5 text-slate-600">SMTP_PASS</code>
                      {' '}(and optionally <code className="rounded bg-white px-1 py-0.5 text-slate-600">EMAIL_FROM</code>). A fallback recipient can be set with{' '}
                      <code className="rounded bg-white px-1 py-0.5 text-slate-600">ADMIN_NOTIFICATION_EMAIL</code> if the database value is empty.
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={loadingSettings}
                        className={BTN_PRIMARY}
                      >
                        {loadingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        {loadingSettings ? 'Saving…' : 'Save settings'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={sendingTestEmail || !adminSettings.notification_email?.trim()}
                        className={BTN_SECONDARY}
                        title={!adminSettings.notification_email?.trim() ? 'Save a notification email first' : undefined}
                      >
                        {sendingTestEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {sendingTestEmail ? 'Sending…' : 'Send test email'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Number Modal */}
        {editingNumber && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out] sm:p-4"
            onClick={() => setEditingNumber(null)}
          >
            <div
              className="flex max-h-[min(90vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 motion-safe:animate-[scaleIn_150ms_ease-out] sm:max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#215F9A]/10 text-[#215F9A]">
                    <Pencil className="h-[19px] w-[19px]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-slate-900 sm:text-[17px]">Edit Number</h3>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      <CountryCell name={editingNumber.country_name} code={editingNumber.country_code} />
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingNumber(null)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleUpdateNumber(editingNumber)
                }}
                className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Country</label>
                    <input
                      type="text"
                      value={editingNumber.country_name}
                      disabled
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Number Type</label>
                    <SelectWithCustom
                      value={editingNumber.number_type}
                      onChange={(value) => setEditingNumber({ ...editingNumber, number_type: value })}
                      options={NUMBER_TYPE_OPTIONS}
                      placeholder="Select number type..."
                      customPlaceholder="Enter number type..."
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>SMS/Voice</label>
                    <SelectWithCustom
                      value={(editingNumber.sms_capability || '').trim()}
                      onChange={(value) => setEditingNumber({ ...editingNumber, sms_capability: value })}
                      options={SMS_VOICE_OPTIONS}
                      placeholder="Select capability..."
                      customPlaceholder="Enter capability..."
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Inbound/Outbound</label>
                    <SelectWithCustom
                      value={(editingNumber.direction || '').trim()}
                      onChange={(value) => setEditingNumber({ ...editingNumber, direction: value })}
                      options={DIRECTION_OPTIONS}
                      placeholder="Select direction..."
                      customPlaceholder="Enter direction..."
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Supplier name</label>
                    <SelectWithCustom
                      value={editingNumber.supplier || ''}
                      onChange={(value) => setEditingNumber({ ...editingNumber, supplier: value })}
                      options={existingSuppliers}
                      placeholder="Select supplier..."
                      customPlaceholder="Enter supplier name..."
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Customer MRC</label>
                    <input
                      type="text"
                      value={editingNumber.mrc}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty, digits, and a single decimal separator ('.' or ',')
                        if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                          setEditingNumber({ ...editingNumber, mrc: normalizeDecimalInput(value) as any })
                        }
                      }}
                      className={INPUT_CLASS}
                      inputMode="decimal"
                      placeholder="Enter MRC"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Customer NRC</label>
                    <input
                      type="text"
                      value={editingNumber.nrc}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty, digits, and a single decimal separator ('.' or ',')
                        if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                          setEditingNumber({ ...editingNumber, nrc: normalizeDecimalInput(value) as any })
                        }
                      }}
                      className={INPUT_CLASS}
                      inputMode="decimal"
                      placeholder="Enter NRC"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Customer currency</label>
                    <SelectWithCustom
                      value={editingNumber.currency}
                      onChange={(value) => setEditingNumber({ ...editingNumber, currency: value })}
                      options={CURRENCY_OPTIONS}
                      placeholder="Select currency..."
                      customPlaceholder="Enter currency code..."
                    />
                  </div>
                  <div className="col-span-2 text-sm font-semibold text-[#215F9A]">Supplier rate (admin only)</div>
                  <div>
                    <label className={LABEL_CLASS}>Supplier MRC</label>
                    <input
                      type="text"
                      value={((editingNumber as any).supplier_mrc ?? '') as string}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                          setEditingNumber({ ...editingNumber, supplier_mrc: normalizeDecimalInput(value) as any })
                        }
                      }}
                      className={INPUT_CLASS}
                      inputMode="decimal"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Supplier NRC</label>
                    <input
                      type="text"
                      value={((editingNumber as any).supplier_nrc ?? '') as string}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                          setEditingNumber({ ...editingNumber, supplier_nrc: normalizeDecimalInput(value) as any })
                        }
                      }}
                      className={INPUT_CLASS}
                      inputMode="decimal"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Supplier Currency</label>
                    <SelectWithCustom
                      value={((editingNumber as any).supplier_currency ?? '') as string}
                      onChange={(value) => setEditingNumber({ ...editingNumber, supplier_currency: value as any })}
                      options={CURRENCY_OPTIONS}
                      placeholder="Select currency..."
                      customPlaceholder="Enter currency code..."
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>MOQ</label>
                    <input
                      type="text"
                      value={editingNumber.moq}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty and integers
                        if (value === '' || /^\d*$/.test(value)) {
                          setEditingNumber({ ...editingNumber, moq: value as any })
                        }
                      }}
                      className={INPUT_CLASS}
                      placeholder="Enter MOQ"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Available</label>
                    <select
                      value={editingNumber.is_available ? 'true' : 'false'}
                      onChange={(e) => setEditingNumber({ ...editingNumber, is_available: e.target.value === 'true' })}
                      className={INPUT_CLASS}
                    >
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Specification (Prefix/Area)</label>
                    <input
                      type="text"
                      value={editingNumber.specification || ''}
                      onChange={(e) => setEditingNumber({ ...editingNumber, specification: e.target.value })}
                      className={INPUT_CLASS}
                      placeholder="e.g., Landline, France (07)"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Bill Pulse</label>
                    <SelectWithCustom
                      value={editingNumber.bill_pulse || ''}
                      onChange={(value) => setEditingNumber({ ...editingNumber, bill_pulse: value })}
                      options={BILL_PULSE_OPTIONS}
                      placeholder="Select bill pulse..."
                      customPlaceholder="Enter custom (e.g., 45/45)..."
                    />
                  </div>
                </div>

                {/* Supplier other charges (edit) */}
                <div className="mt-4">
                  <label className={LABEL_CLASS}>Supplier other charges (admin)</label>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-2 text-left">Charge Type</th>
                          <th className="p-2 text-left">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['inbound_call', 'outbound_call_fixed', 'outbound_call_mobile', 'inbound_sms', 'outbound_sms'] as const).map((key) => (
                          <tr key={key} className="border-t">
                            <td className="p-2 capitalize">{key.replace(/_/g, ' ')}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={((editingNumber as any).supplier_other_charges?.[key] ?? '') as string}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                    setEditingNumber({
                                      ...editingNumber,
                                      supplier_other_charges: {
                                        ...((editingNumber as any).supplier_other_charges || {}),
                                        [key]: normalizeDecimalInput(value),
                                      },
                                    })
                                  }
                                }}
                                className={INPUT_SM_CLASS}
                                inputMode="decimal"
                                placeholder="0.0000"
                              />
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t">
                          <td className="p-2">Other Fees</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={((editingNumber as any).supplier_other_charges?.other_fees ?? '') as string}
                              onChange={(e) =>
                                setEditingNumber({
                                  ...editingNumber,
                                  supplier_other_charges: {
                                    ...((editingNumber as any).supplier_other_charges || {}),
                                    other_fees: e.target.value || undefined,
                                  },
                                })
                              }
                              className={INPUT_SM_CLASS}
                              placeholder="Description or amount"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Other Charges Section for Edit (customer) */}
                <div className="mt-4">
                  <label className={LABEL_CLASS}>Customer other charges</label>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-2 text-left">Charge Type</th>
                          <th className="p-2 text-left">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="p-2">Inbound Call (per min)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.inbound_call ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      inbound_call: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className={INPUT_SM_CLASS}
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Outbound Call Fixed (per min)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.outbound_call_fixed ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      outbound_call_fixed: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className={INPUT_SM_CLASS}
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Outbound Call Mobile (per min)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.outbound_call_mobile ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      outbound_call_mobile: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className={INPUT_SM_CLASS}
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Inbound SMS (per SMS)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.inbound_sms ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      inbound_sms: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className={INPUT_SM_CLASS}
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Outbound SMS (per SMS)</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.outbound_sms ?? ''}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === '' || DECIMAL_INPUT_RE.test(value)) {
                                  setEditingNumber({
                                    ...editingNumber,
                                    other_charges: {
                                      ...(editingNumber.other_charges || {}),
                                      outbound_sms: normalizeDecimalInput(value)
                                    }
                                  })
                                }
                              }}
                              className={INPUT_SM_CLASS}
                              inputMode="decimal"
                              placeholder="0.0000"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Other Fees</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={(editingNumber.other_charges as any)?.other_fees ?? ''}
                              onChange={(e) => setEditingNumber({
                                ...editingNumber,
                                other_charges: {
                                  ...(editingNumber.other_charges || {}),
                                  other_fees: e.target.value || undefined
                                }
                              })}
                              className={INPUT_SM_CLASS}
                              placeholder="Description or amount"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Features (editable) */}
                <div className="mt-4">
                  <label className={LABEL_CLASS}>Features</label>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="p-2 text-left">Feature</th>
                          <th className="p-2 text-left">Status/Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="p-2">Reach</td>
                          <td className="p-2">
                            <SelectWithCustom
                              value={((editingNumber as any).features?.reach ?? '') as string}
                              onChange={(value) => setEditingNumber({
                                ...editingNumber,
                                features: {
                                  ...((editingNumber as any).features || {}),
                                  reach: value || null
                                }
                              })}
                              options={FEATURE_OPTIONS.reach}
                              placeholder="Select..."
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2">Emergency Services</td>
                          <td className="p-2">
                            <SelectWithCustom
                              value={((editingNumber as any).features?.emergency_services ?? '') as string}
                              onChange={(value) => setEditingNumber({
                                ...editingNumber,
                                features: {
                                  ...((editingNumber as any).features || {}),
                                  emergency_services: value || null
                                }
                              })}
                              options={FEATURE_OPTIONS.emergency_services}
                              placeholder="Select..."
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-slate-100 pt-4">
                  <button type="submit" className={`${BTN_PRIMARY} flex-1 py-2.5`}>
                    <Check className="h-3.5 w-3.5" />
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNumber(null)}
                    className={`${BTN_SECONDARY} flex-1 py-2.5`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Country Modal */}
        {showAddCountry && (
          <AdminModalShell
            icon={Globe}
            title="Add new country"
            subtitle={<p className="mt-0.5 text-xs text-slate-500">Requirements are fetched automatically once saved.</p>}
            widthClassName="max-w-lg"
            onClose={() => {
              setShowAddCountry(false)
              setCountryFormData({ name: '', country_code: '', regulator: '' })
            }}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCountry(false)
                    setCountryFormData({ name: '', country_code: '', regulator: '' })
                  }}
                  className={BTN_SECONDARY}
                >
                  Cancel
                </button>
                <button type="submit" form="add-country-form" disabled={fetchingRequirements} className={BTN_PRIMARY}>
                  {fetchingRequirements && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {fetchingRequirements ? 'Fetching requirements…' : 'Add country'}
                </button>
              </>
            }
          >
            <form
              id="add-country-form"
              onSubmit={(e) => {
                e.preventDefault()
                handleAddCountry()
              }}
              className="space-y-4"
            >
              <div>
                <label className={LABEL_CLASS}>
                  Country Name *
                </label>
                <input
                  type="text"
                  value={countryFormData.name}
                  onChange={(e) =>
                    setCountryFormData({
                      ...countryFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ethiopia"
                  className={INPUT_CLASS}
                  required
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  Country Code *
                </label>
                <input
                  type="text"
                  value={countryFormData.country_code}
                  onChange={(e) =>
                    setCountryFormData({
                      ...countryFormData,
                      country_code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="ET"
                  className={INPUT_CLASS}
                  required
                  maxLength={10}
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  Regulator (Optional)
                </label>
                <input
                  type="text"
                  value={countryFormData.regulator}
                  onChange={(e) =>
                    setCountryFormData({
                      ...countryFormData,
                      regulator: e.target.value,
                    })
                  }
                  placeholder="Ethiopian Communications Authority"
                  className={INPUT_CLASS}
                />
              </div>
            </form>
          </AdminModalShell>
        )}
        </section>
      </div>

      {/* Order requirements modal (like client Numbers page) */}
      {orderForRequirementsModal && (
        <AdminModalShell
          icon={ClipboardList}
          title="Requirements"
          subtitle={
            <p className="mt-0.5 truncate text-xs text-slate-500">
              <CountryCell name={orderForRequirementsModal.country_name} code={orderForRequirementsModal.country_code} />
            </p>
          }
          widthClassName="max-w-2xl"
          onClose={() => setOrderForRequirementsModal(null)}
          footer={
            <button onClick={() => setOrderForRequirementsModal(null)} className={BTN_PRIMARY}>
              Close
            </button>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
            <span className={BADGE_CLASS}>{orderForRequirementsModal.number_type}</span>
            <span className={BADGE_CLASS}>{orderForRequirementsModal.direction}</span>
            <span className={BADGE_CLASS}>{orderForRequirementsModal.sms_capability}</span>
          </div>
          <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer rate (view)</h4>
            <p className="text-sm tabular-nums text-slate-700">
              MRC: {formatDecimal(orderForRequirementsModal.mrc_at_order, 2) ?? '0'} &nbsp;·&nbsp; NRC: {formatDecimal(orderForRequirementsModal.nrc_at_order, 2) ?? '0'} &nbsp;·&nbsp; Currency: {orderForRequirementsModal.currency_at_order}
            </p>
          </div>
          {loadingOrderRequirements ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
              <span className="text-sm font-medium text-slate-500">Loading requirements…</span>
            </div>
          ) : orderRequirementsData ? (
            <div className="space-y-5">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-900">Number Allocation</h4>
                <div className="ml-1 space-y-2 border-l-2 border-slate-100 pl-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Individual Documentation:</p>
                    <ul className="ml-2 list-inside list-disc text-sm text-slate-600">
                      {orderRequirementsData.number_allocation?.end_user_documentation?.individual?.map((doc: string, idx: number) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Business Documentation:</p>
                    <ul className="ml-2 list-inside list-disc text-sm text-slate-600">
                      {orderRequirementsData.number_allocation?.end_user_documentation?.business?.map((doc: string, idx: number) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                  {orderRequirementsData.number_allocation?.address_requirements && (
                    <p className="text-sm text-slate-600">
                      <strong>Address Requirements:</strong> {orderRequirementsData.number_allocation.address_requirements}
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <h4 className="mb-2 text-sm font-semibold text-slate-900">Sub-Allocation</h4>
                <div className="ml-1 border-l-2 border-slate-100 pl-4">
                  <p className="text-sm text-slate-600">
                    <strong>Allowed:</strong> {orderRequirementsData.sub_allocation?.allowed ? 'Yes' : 'No'}
                  </p>
                  {orderRequirementsData.sub_allocation?.rules && (
                    <p className="mt-1 text-sm text-slate-600">{orderRequirementsData.sub_allocation.rules}</p>
                  )}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <h4 className="mb-2 text-sm font-semibold text-slate-900">Number Porting</h4>
                <div className="ml-1 space-y-2 border-l-2 border-slate-100 pl-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Individual Documentation:</p>
                    <ul className="ml-2 list-inside list-disc text-sm text-slate-600">
                      {orderRequirementsData.number_porting?.end_user_documentation?.individual?.map((doc: string, idx: number) => (
                        <li key={`port-ind-${idx}`}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Business Documentation:</p>
                    <ul className="ml-2 list-inside list-disc text-sm text-slate-600">
                      {orderRequirementsData.number_porting?.end_user_documentation?.business?.map((doc: string, idx: number) => (
                        <li key={`port-biz-${idx}`}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                  {orderRequirementsData.number_porting?.process_notes && (
                    <p className="mt-1 text-sm text-slate-600">
                      <strong>Process Notes:</strong> {orderRequirementsData.number_porting.process_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : orderForRequirementsModal.requirements_text ? (
            <p className="whitespace-pre-wrap text-sm text-slate-700">{orderForRequirementsModal.requirements_text}</p>
          ) : (
            <p className="text-sm text-slate-500">No specific requirements on file for this combination.</p>
          )}
        </AdminModalShell>
      )}

      {/* Request changes modal */}
      {orderForRequestChanges && (
        <AdminModalShell
          icon={MessageSquare}
          title="Request changes from customer"
          subtitle={
            <p className="mt-0.5 truncate text-xs text-slate-500">{orderForRequestChanges.customer_name}</p>
          }
          widthClassName="max-w-lg"
          onClose={() => {
            setOrderForRequestChanges(null)
            setRequestChangesMessage('')
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setOrderForRequestChanges(null)
                  setRequestChangesMessage('')
                }}
                className={BTN_SECONDARY}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRequestChanges}
                disabled={processingOrder === orderForRequestChanges.id}
                className={BTN_PRIMARY}
              >
                {processingOrder === orderForRequestChanges.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {processingOrder === orderForRequestChanges.id ? 'Sending…' : 'Send request'}
              </button>
            </>
          }
        >
          <p className="mb-4 text-sm text-slate-600">
            Ask the customer to upload or update specific requirements/documents. They will see this message on their orders page.
          </p>
          <textarea
            value={requestChangesMessage}
            onChange={(e) => setRequestChangesMessage(e.target.value)}
            className={`${INPUT_CLASS} min-h-[120px]`}
            placeholder="e.g. Please upload a copy of your business license and proof of address."
          />
        </AdminModalShell>
      )}

      {/* Fulfill custom request modal - fill mandatory fields before adding to inventory */}
      {fulfillCustomRequestModal && (
        <AdminModalShell
          icon={PackagePlus}
          title="Approve request — mandatory fields"
          subtitle={
            <p className="mt-0.5 text-xs text-slate-500">Fill in the fields below to add the number to inventory and create the order.</p>
          }
          widthClassName="max-w-lg"
          onClose={() => {
            setFulfillCustomRequestModal(null)
            setFulfillForm({ mrc: '', nrc: '', currency: 'USD', moq: '1', supplier_mrc: '', supplier_nrc: '', supplier_currency: '', specification: '', bill_pulse: '', requirements_text: '' })
            setError(null)
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setFulfillCustomRequestModal(null)
                  setFulfillForm({ mrc: '', nrc: '', currency: 'USD', moq: '1', supplier_mrc: '', supplier_nrc: '', supplier_currency: '', specification: '', bill_pulse: '', requirements_text: '' })
                  setError(null)
                }}
                className={BTN_SECONDARY}
              >
                Cancel
              </button>
              <button
                onClick={handleFulfillCustomRequestSubmit}
                disabled={processingCustomRequest === fulfillCustomRequestModal.id}
                className={BTN_PRIMARY}
              >
                {processingCustomRequest === fulfillCustomRequestModal.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {processingCustomRequest === fulfillCustomRequestModal.id ? 'Approving…' : 'Approve'}
              </button>
            </>
          }
        >
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>MRC *</label>
                  <input
                    type="text"
                    value={fulfillForm.mrc}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, mrc: e.target.value })}
                    className={INPUT_CLASS}
                    placeholder="e.g. 12.50"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>NRC *</label>
                  <input
                    type="text"
                    value={fulfillForm.nrc}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, nrc: e.target.value })}
                    className={INPUT_CLASS}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>Currency *</label>
                  <SelectWithCustom
                    value={fulfillForm.currency}
                    onChange={(value) => setFulfillForm({ ...fulfillForm, currency: value })}
                    options={CURRENCY_OPTIONS}
                    placeholder="Select currency..."
                    customPlaceholder="Enter currency code..."
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>MOQ *</label>
                  <input
                    type="text"
                    value={fulfillForm.moq}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, moq: e.target.value })}
                    className={INPUT_CLASS}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="text-sm font-semibold text-[#215F9A] mt-2">Supplier rate (optional, admin only)</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LABEL_CLASS}>Supplier MRC</label>
                  <input
                    type="text"
                    value={fulfillForm.supplier_mrc}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, supplier_mrc: e.target.value })}
                    className={INPUT_CLASS}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Supplier NRC</label>
                  <input
                    type="text"
                    value={fulfillForm.supplier_nrc}
                    onChange={(e) => setFulfillForm({ ...fulfillForm, supplier_nrc: e.target.value })}
                    className={INPUT_CLASS}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Supplier Currency</label>
                  <SelectWithCustom
                    value={fulfillForm.supplier_currency}
                    onChange={(value) => setFulfillForm({ ...fulfillForm, supplier_currency: value })}
                    options={CURRENCY_OPTIONS}
                    placeholder="Select currency..."
                    customPlaceholder="Enter currency code..."
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS}>Specification (optional)</label>
                <input
                  type="text"
                  value={fulfillForm.specification}
                  onChange={(e) => setFulfillForm({ ...fulfillForm, specification: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="e.g. Landline, France (07)"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Bill pulse (optional)</label>
                <input
                  type="text"
                  value={fulfillForm.bill_pulse}
                  onChange={(e) => setFulfillForm({ ...fulfillForm, bill_pulse: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="e.g. 30/30"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Requirements text (optional)</label>
                <textarea
                  value={fulfillForm.requirements_text}
                  onChange={(e) => setFulfillForm({ ...fulfillForm, requirements_text: e.target.value })}
                  className={`${INPUT_CLASS} min-h-[80px]`}
                  placeholder="Documentation or regulatory requirements"
                />
              </div>
            </div>
        </AdminModalShell>
      )}

      {/* Documents Modal for viewing uploaded documents */}
      {selectedOrderForDocs && selectedOrderForDocs.uploaded_documents && (
        <DocumentsModal
          isOpen={!!selectedOrderForDocs}
          onClose={() => setSelectedOrderForDocs(null)}
          uploadedDocuments={selectedOrderForDocs.uploaded_documents}
          orderId={selectedOrderForDocs.id}
          customerName={selectedOrderForDocs.customer_name}
          isAdmin={true}
        />
      )}

      {/* Destructive / reason-gated confirmations. Each onConfirm calls the
          exact same handler the old window.confirm()/prompt() flow called,
          with the exact same arguments — only how confirmation is collected
          changed. */}
      <ConfirmModal
        isOpen={!!numberPendingDelete}
        title="Delete this number?"
        message={
          <>
            This removes{' '}
            <strong>
              {numberPendingDelete?.country_name} · {numberPendingDelete?.number_type}
            </strong>{' '}
            from the available inventory (soft-delete — it can be restored later if needed).
          </>
        }
        confirmLabel="Delete number"
        loading={isDeletingNumber}
        onCancel={() => setNumberPendingDelete(null)}
        onConfirm={async () => {
          if (!numberPendingDelete) return
          setIsDeletingNumber(true)
          await handleDeleteNumber(numberPendingDelete.id)
          setIsDeletingNumber(false)
          setNumberPendingDelete(null)
        }}
      />

      <ConfirmModal
        isOpen={!!userPendingDelete}
        title="Delete this user?"
        message={
          <>
            This permanently deletes <strong>{userPendingDelete?.name}</strong>&apos;s account and all associated orders. This action cannot be undone.
          </>
        }
        confirmLabel="Delete user"
        loading={processingUser === userPendingDelete?.id}
        onCancel={() => setUserPendingDelete(null)}
        onConfirm={async () => {
          if (!userPendingDelete) return
          await handleDeleteUser(userPendingDelete)
          setUserPendingDelete(null)
        }}
      />

      <ReasonModal
        isOpen={!!orderPendingReject}
        title="Reject this order?"
        message={
          <>
            Provide a reason for rejecting the order from <strong>{orderPendingReject?.customer_name}</strong>.
          </>
        }
        placeholder="Rejection reason…"
        value={orderRejectReason}
        onChange={setOrderRejectReason}
        confirmLabel="Reject order"
        requireValue
        loading={processingOrder === orderPendingReject?.id}
        onCancel={() => {
          setOrderPendingReject(null)
          setOrderRejectReason('')
        }}
        onConfirm={async () => {
          if (!orderPendingReject || !orderRejectReason) return
          await handleOrderStatus(orderPendingReject.id, 'rejected', orderRejectReason)
          setOrderPendingReject(null)
          setOrderRejectReason('')
        }}
      />

      <ReasonModal
        isOpen={!!signupPendingReject}
        title="Reject this signup request?"
        message={
          <>
            Optionally provide a reason for rejecting <strong>{signupPendingReject?.email}</strong>&apos;s signup request.
          </>
        }
        placeholder="Rejection reason (optional)…"
        value={signupRejectReason}
        onChange={setSignupRejectReason}
        confirmLabel="Reject request"
        loading={processingSignup === signupPendingReject?.id}
        onCancel={() => {
          setSignupPendingReject(null)
          setSignupRejectReason('')
        }}
        onConfirm={async () => {
          if (!signupPendingReject) return
          await handleRejectSignup(signupPendingReject.id, signupRejectReason)
          setSignupPendingReject(null)
          setSignupRejectReason('')
        }}
      />

      <ReasonModal
        isOpen={!!customRequestPendingReject}
        title="Reject this custom number request?"
        message={
          <>
            Optionally provide a reason for rejecting this request from <strong>{customRequestPendingReject?.customer_name || 'this customer'}</strong>.
          </>
        }
        placeholder="Rejection reason (optional)…"
        value={customRequestRejectReason}
        onChange={setCustomRequestRejectReason}
        confirmLabel="Reject request"
        loading={processingCustomRequest === customRequestPendingReject?.id}
        onCancel={() => {
          setCustomRequestPendingReject(null)
          setCustomRequestRejectReason('')
        }}
        onConfirm={async () => {
          if (!customRequestPendingReject) return
          await handleCustomRequestStatus(customRequestPendingReject.id, 'rejected', customRequestRejectReason)
          setCustomRequestPendingReject(null)
          setCustomRequestRejectReason('')
        }}
      />
    </main>
  )
}
