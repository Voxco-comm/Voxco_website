'use client'

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, X } from 'lucide-react'

interface SelectWithCustomProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
  allowCustom?: boolean
  customPlaceholder?: string
  onAddCustomOption?: (option: string) => void
}

// Gap between trigger and menu, and the minimum distance the menu keeps from
// the viewport edge. MENU_MAX_HEIGHT matches the old `max-h-60`.
const MENU_GAP = 4
const VIEWPORT_MARGIN = 8
const MENU_MAX_HEIGHT = 240

type MenuPosition = {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

// True while `el` is at least partly visible in the viewport and in every
// clipping ancestor (e.g. a scrollable modal body). Used to close the menu
// once its trigger has been scrolled out of sight instead of leaving it
// floating over unrelated content.
function isVisibleInScrollParents(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node)
    if (/auto|scroll|hidden|clip/.test(overflowX + overflowY)) {
      const clip = node.getBoundingClientRect()
      if (rect.bottom <= clip.top || rect.top >= clip.bottom) return false
    }
  }
  return true
}

export default function SelectWithCustom({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  allowCustom = true,
  customPlaceholder = 'Enter custom value...',
  onAddCustomOption,
}: SelectWithCustomProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [mounted, setMounted] = useState(false)
  // Position of the portaled dropdown, computed from the trigger's own
  // bounding rect so it always renders relative to the viewport instead of
  // being clipped by a scrollable/overflow-hidden ancestor (e.g. a modal body).
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setShowCustomInput(false)
    setCustomValue('')
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const insideTrigger = !!dropdownRef.current && dropdownRef.current.contains(target)
      const insideMenu = !!menuRef.current && menuRef.current.contains(target)
      if (!insideTrigger && !insideMenu) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeMenu])

  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCustomInput])

  // Anchor the portaled dropdown to the trigger while it's open. The menu is
  // placed below the trigger, or above it when there is more room there, and
  // its height is capped to the space available so every option stays
  // reachable by scrolling the list. Scrolling the page / a modal body or
  // resizing (e.g. the mobile keyboard opening) re-anchors it; scrolling the
  // option list itself is ignored. It only closes once the trigger is no
  // longer visible.
  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      if (!isVisibleInScrollParents(trigger)) {
        closeMenu()
        return
      }
      const rect = trigger.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN
      const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN
      const contentHeight = menuRef.current?.scrollHeight ?? MENU_MAX_HEIGHT
      const neededHeight = Math.min(contentHeight, MENU_MAX_HEIGHT)
      const placeAbove = spaceBelow < neededHeight && spaceAbove > spaceBelow
      const maxHeight = Math.max(0, Math.min(MENU_MAX_HEIGHT, placeAbove ? spaceAbove : spaceBelow))
      setMenuPos(
        placeAbove
          ? { bottom: viewportHeight - rect.top + MENU_GAP, left: rect.left, width: rect.width, maxHeight }
          : { top: rect.bottom + MENU_GAP, left: rect.left, width: rect.width, maxHeight }
      )
    }
    updatePosition()

    const handleScroll = (event: Event) => {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) return
      updatePosition()
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, showCustomInput, value, options.length, closeMenu])

  const handleSelect = (option: string) => {
    onChange(option)
    setIsOpen(false)
    setShowCustomInput(false)
  }

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim())
      if (onAddCustomOption) {
        onAddCustomOption(customValue.trim())
      }
      setCustomValue('')
      setShowCustomInput(false)
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomSubmit()
    } else if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomValue('')
    }
  }

  const displayValue = value || placeholder
  const isPlaceholder = !value

  const menu = isOpen && mounted && (
    <div
      ref={menuRef}
      style={
        menuPos
          ? { position: 'fixed', ...menuPos }
          : { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }
      }
      className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto overscroll-contain"
    >
      {/* Existing Options */}
      {options.map((option, index) => (
        <button
          key={index}
          type="button"
          onClick={() => handleSelect(option)}
          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
            option === value ? 'bg-blue-50 text-[#215F9A] font-medium' : 'text-gray-700'
          }`}
        >
          {option}
        </button>
      ))}

      {/* Divider */}
      {allowCustom && options.length > 0 && (
        <div className="border-t border-gray-100 my-1" />
      )}

      {/* Custom Input */}
      {allowCustom && (
        <>
          {showCustomInput ? (
            <div className="p-2">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={customPlaceholder}
                  className="flex-1 p-2 text-sm border rounded focus:outline-none focus:border-[#215F9A]"
                />
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="p-2 bg-[#215F9A] text-white rounded hover:bg-[#2c78c0] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomValue('')
                  }}
                  className="p-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm text-[#215F9A] font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add custom value
            </button>
          )}
        </>
      )}

      {/* Clear Option */}
      {value && (
        <>
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            onClick={() => handleSelect('')}
            className="w-full px-3 py-2 text-left hover:bg-red-50 transition-colors text-sm text-red-600"
          >
            Clear selection
          </button>
        </>
      )}
    </div>
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Value / Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2 border rounded-lg flex items-center justify-between bg-white hover:border-gray-400 transition-colors ${
          isPlaceholder ? 'text-gray-400' : 'text-gray-900'
        }`}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown: portaled to <body> so it always renders above modal/table
          content and is never clipped by a scrollable or overflow-hidden
          ancestor. */}
      {menu && createPortal(menu, document.body)}
    </div>
  )
}
