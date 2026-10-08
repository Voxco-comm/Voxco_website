'use client'

import React, { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import AuthPagesFooter from './AuthPagesFooter'
import { AuthBrandBand, AuthBrandPanel } from './AuthBrandPanel'

// Shared presentation for the authentication pages (Sign In, Sign Up,
// Reset Password). Layout and styling only — no auth state or logic.

// Field styling: calm slate border, subtle hover, Voxco-blue focus ring.
// Pair with `fieldBorder()` for the border colour and `authIconClass` for a
// leading icon placed *after* the input (so `peer-focus` can tint it).
export const authInputClass =
  'peer block h-12 w-full rounded-xl border bg-white pl-11 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-[#215F9A] focus:ring-4 focus:ring-[#215F9A]/[0.12] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:border-slate-300'

export const authTextareaClass =
  'block w-full resize-none rounded-xl border bg-white px-4 py-3 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-[#215F9A] focus:ring-4 focus:ring-[#215F9A]/[0.12] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:border-slate-300'

export const authIconClass =
  'pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors duration-200 peer-focus:text-[#215F9A]'

export const authLabelClass = 'mb-2 block text-sm font-medium text-slate-700'

export const authLinkClass =
  'rounded-md font-semibold text-[#215F9A] transition-colors duration-200 hover:text-[#2c78c0] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/40 focus-visible:ring-offset-2'

export type FieldTone = 'default' | 'error' | 'success'

export function fieldBorder(tone: FieldTone | boolean = 'default') {
  const t = tone === true ? 'error' : tone === false ? 'default' : tone
  if (t === 'error') return 'border-red-300 hover:border-red-400 focus:border-red-500 focus:ring-red-500/10'
  if (t === 'success') return 'border-emerald-400 hover:border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/10'
  return 'border-slate-300'
}

interface AuthLayoutProps {
  children: ReactNode
  /** Max width of the form column content. */
  width?: 'default' | 'wide'
  /** Show the "Secure login powered by Supabase" line above the legal links. */
  showSecureNote?: boolean
}

export default function AuthLayout({ children, width = 'default', showSecureNote = false }: AuthLayoutProps) {
  const maxW = width === 'wide' ? 'max-w-[480px]' : 'max-w-[400px]'

  return (
    <div className="relative flex min-h-screen flex-col bg-white sm:bg-[#050B18] sm:pb-12 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:bg-white lg:pb-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <AuthBrandPanel />
      <AuthBrandBand />

      <section
        className={`relative z-10 -mt-8 flex flex-1 flex-col rounded-t-[28px] bg-white sm:m-auto sm:w-[calc(100%-5rem)] sm:flex-none sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-[0_30px_80px_-24px_rgba(0,0,0,0.65)] lg:m-0 lg:w-auto lg:max-w-none lg:flex-1 lg:rounded-none lg:border-0 lg:shadow-none ${
          width === 'wide' ? 'sm:max-w-[600px]' : 'sm:max-w-[520px]'
        }`}
      >
        {/* Faint dot texture anchored to the top-right corner (desktop only) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(#215F9A_1px,transparent_1px)] opacity-[0.09] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_55%)] lg:block"
        />

        <div className="relative flex flex-1 flex-col px-6 pb-8 pt-9 sm:px-10 sm:py-10 lg:px-12 xl:px-16">
          <div className={`mx-auto flex w-full ${maxW} flex-1 flex-col justify-center animate-fade-in-up`}>
            {children}
          </div>

          {/* Footer */}
          <div className={`mx-auto mt-10 flex w-full ${maxW} flex-col items-center gap-3 text-center sm:mt-8`}>
            {showSecureNote && (
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                Secure login powered by Supabase
              </p>
            )}
            <div className="[&>footer]:mt-0 [&>footer]:text-xs">
              <AuthPagesFooter />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export function AuthHeader({ title, subtitle, icon }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-8">
      {icon && <div className="mb-5">{icon}</div>}
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-[2rem]">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{subtitle}</p>}
    </div>
  )
}

// Rounded icon badge used for status screens (expired link, success…).
export function AuthStatusIcon({ tone, children }: { tone: 'success' | 'warning'; children: ReactNode }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
      : 'border-amber-200 bg-amber-50 text-amber-600'
  return (
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${toneClass}`}>
      {children}
    </span>
  )
}

interface AuthPrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  /** Show the trailing arrow (default true). */
  arrow?: boolean
  children: ReactNode
}

// Voxco-blue primary action — matches the dashboard hero CTA: gradient,
// subtle depth, hover lift + glow, natural pressed state.
export function AuthPrimaryButton({
  loading = false,
  loadingText,
  arrow = true,
  disabled,
  className = '',
  children,
  ...props
}: AuthPrimaryButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`group relative inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#2C74B3] to-[#1C4F80] px-6 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_16px_-6px_rgba(8,22,42,0.55)] transition-all duration-300 ease-out hover:from-[#3A87CE] hover:to-[#215F9A] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_30px_-10px_rgba(44,116,179,0.65)] motion-safe:hover:-translate-y-0.5 active:scale-[0.99] active:from-[#245D93] active:to-[#163f68] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),0_2px_8px_-3px_rgba(8,22,42,0.5)] motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#215F9A]/25 disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_16px_-6px_rgba(8,22,42,0.55)] disabled:active:scale-100 ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          {arrow && (
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 ease-out motion-safe:group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </button>
  )
}

// Eye / eye-off control positioned inside a password input's right edge.
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#215F9A]/40"
    >
      {shown ? (
        <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
      ) : (
        <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
      )}
    </button>
  )
}

// Hairline-separated "Don't have an account? Sign Up" style row.
export function AuthSwitchPrompt({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 border-t border-slate-200/80 pt-6 text-center">
      <p className="text-[15px] text-slate-600">{children}</p>
    </div>
  )
}
