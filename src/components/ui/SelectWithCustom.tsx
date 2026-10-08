'use client'

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const insideTrigger = !!dropdownRef.current && dropdownRef.current.contains(target)
      const insideMenu = !!menuRef.current && menuRef.current.contains(target)
      if (!insideTrigger && !insideMenu) {
        setIsOpen(false)
        setShowCustomInput(false)
        setCustomValue('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCustomInput])

  // Anchor the portaled dropdown to the trigger while it's open. Closes on
  // scroll/resize (capture-phase, so it also catches scrolling inside a
  // modal body) rather than trying to follow — the same behavior most
  // floating dropdowns use, and avoids ever rendering detached from the
  // trigger.
  useLayoutEffect(() => {
    if (!isOpen) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updatePosition()

    const handleScrollOrResize = () => {
      setIsOpen(false)
      setShowCustomInput(false)
    }

    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen])

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

  const menu = isOpen && mounted && menuPos && (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width }}
      className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
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
