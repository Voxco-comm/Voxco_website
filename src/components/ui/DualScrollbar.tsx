'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

interface DualScrollbarProps {
  children: React.ReactNode
  /** Classes applied to the outer wrapper. */
  className?: string
  /** Classes applied to the scrollable body (e.g. max-height). */
  bodyClassName?: string
}

/**
 * Wraps wide content (typically a table) in a horizontally scrollable body and
 * adds a second scrollbar pinned to the TOP of the content. This makes it easy
 * to scroll to the right-hand columns without having to scroll all the way down
 * to the bottom scrollbar first.
 */
export default function DualScrollbar({ children, className = '', bodyClassName = '' }: DualScrollbarProps) {
  const topRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [overflowing, setOverflowing] = useState(false)
  const isSyncing = useRef(false)

  const measure = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    setScrollWidth(body.scrollWidth)
    setOverflowing(body.scrollWidth > body.clientWidth + 1)
  }, [])

  useEffect(() => {
    measure()
    const body = bodyRef.current
    if (!body) return
    const ro = new ResizeObserver(measure)
    ro.observe(body)
    if (body.firstElementChild) ro.observe(body.firstElementChild)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, children])

  const onTopScroll = () => {
    if (isSyncing.current) {
      isSyncing.current = false
      return
    }
    if (topRef.current && bodyRef.current) {
      isSyncing.current = true
      bodyRef.current.scrollLeft = topRef.current.scrollLeft
    }
  }

  const onBodyScroll = () => {
    if (isSyncing.current) {
      isSyncing.current = false
      return
    }
    if (topRef.current && bodyRef.current) {
      isSyncing.current = true
      topRef.current.scrollLeft = bodyRef.current.scrollLeft
    }
  }

  return (
    <div className={className}>
      {overflowing && (
        <div
          ref={topRef}
          onScroll={onTopScroll}
          aria-hidden="true"
          className="overflow-x-auto overflow-y-hidden"
          style={{ height: 14 }}
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
      )}
      <div ref={bodyRef} onScroll={onBodyScroll} className={`overflow-x-auto ${bodyClassName}`}>
        {children}
      </div>
    </div>
  )
}
