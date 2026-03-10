'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Value / Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2 border rounded-lg flex items-center justify-between bg-white hover:border-gray-400 transition-colors ${
          isPlaceholder ? 'text-gray-400' : 'text-gray-900'
        }`}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
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
      )}
    </div>
  )
}
