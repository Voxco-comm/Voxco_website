'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Compact page-number sequence with ellipsis for large page counts, e.g.
// [1, '…', 4, 5, 6, '…', 42]. Pure function of (current page, total pages).
export function getPaginationRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 1) return total === 1 ? [1] : []
  const range: (number | 'ellipsis')[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) range.push('ellipsis')
  for (let i = left; i <= right; i++) range.push(i)
  if (right < total - 1) range.push('ellipsis')
  range.push(total)
  return range
}

// Client-side pagination footer: "Showing X–Y of Z", compact page numbers,
// Prev/Next, and an optional rows-per-page selector. Purely presentational —
// holds no state of its own and calls nothing but the callbacks it's given.
// The caller owns the page/pageSize state and is responsible for slicing its
// already-filtered array; this component never reads or filters data itself.
export function PaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  itemLabel,
  className = 'mt-4 border-t border-slate-100 pt-4',
}: {
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  /** Optional noun appended to the total, e.g. "numbers" → "of 42 numbers". */
  itemLabel?: string
  /** Spacing/border classes for the outer wrapper. */
  className?: string
}) {
  if (totalItems === 0) return null

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)
  const pages = getPaginationRange(page, totalPages)

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          Showing <span className="font-medium tabular-nums text-slate-700">{startItem}–{endItem}</span> of{' '}
          <span className="font-medium tabular-nums text-slate-700">{totalItems}</span>
          {itemLabel ? ` ${itemLabel}` : null}
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 focus:border-[#215F9A] focus:outline-none focus:ring-2 focus:ring-[#215F9A]/20"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-[#215F9A]/30 hover:bg-[#215F9A]/5 hover:text-[#215F9A] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-500"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors ${
                  p === page
                    ? 'bg-[#215F9A] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-[#215F9A]/30 hover:bg-[#215F9A]/5 hover:text-[#215F9A] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-500"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
