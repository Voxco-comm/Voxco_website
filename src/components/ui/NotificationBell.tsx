'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Bell,
  X,
  ChevronLeft,
  Package,
  PackagePlus,
  Clock,
  ShieldCheck,
  Info,
  CircleCheckBig,
  XCircle,
  Loader2,
} from 'lucide-react'
import { useNotifications, Notification } from '../NotificationContext'

// Presentation-only: derives an icon + color tone for each existing
// notification type. Every key below already exists on Notification['type'];
// nothing here reads, writes, or reinterprets the underlying data.
const typeMeta: Record<Notification['type'], { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  order_status: { icon: Package, className: 'bg-blue-50 text-blue-600' },
  draft_reminder: { icon: Clock, className: 'bg-amber-50 text-amber-600' },
  admin_action: { icon: ShieldCheck, className: 'bg-purple-50 text-purple-600' },
  system: { icon: Info, className: 'bg-slate-100 text-slate-500' },
  signup_approved: { icon: CircleCheckBig, className: 'bg-emerald-50 text-emerald-600' },
  signup_rejected: { icon: XCircle, className: 'bg-red-50 text-red-600' },
  new_order: { icon: PackagePlus, className: 'bg-indigo-50 text-indigo-600' },
  order_approved: { icon: CircleCheckBig, className: 'bg-emerald-50 text-emerald-600' },
  order_rejected: { icon: XCircle, className: 'bg-red-50 text-red-600' },
  custom_request_approved: { icon: CircleCheckBig, className: 'bg-emerald-50 text-emerald-600' },
  custom_request_rejected: { icon: XCircle, className: 'bg-red-50 text-red-600' },
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  const meta = typeMeta[type]
  const Icon = meta.icon
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
      <Icon className="h-4 w-4" />
    </span>
  )
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showAll, setShowAll] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedNotification(null)
        setShowAll(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    // Show full notification details
    setSelectedNotification(notification)
  }

  const handleBack = () => {
    setSelectedNotification(null)
    setShowAll(false)
  }

  const handleViewAll = () => {
    setShowAll(true)
    setSelectedNotification(null)
  }

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-[#215F9A]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
          {/* Selected Notification Full View */}
          {selectedNotification ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                <button
                  onClick={handleBack}
                  aria-label="Back"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="flex-1 text-sm font-semibold text-slate-900">Notification details</h3>
                <button
                  onClick={() => { setIsOpen(false); setSelectedNotification(null); }}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Full Content */}
              <div className="max-h-[60vh] overflow-y-auto p-4">
                <div className="mb-4 flex items-start gap-3">
                  <NotificationIcon type={selectedNotification.type} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">{selectedNotification.title}</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatTimeAgo(selectedNotification.created_at)}
                    </p>
                  </div>
                </div>
                {selectedNotification.message && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {selectedNotification.message}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
                {showAll ? (
                  <>
                    <button
                      onClick={handleBack}
                      aria-label="Back"
                      className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h3 className="flex-1 text-sm font-semibold text-slate-900">All notifications ({notifications.length})</h3>
                  </>
                ) : (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500">{unreadCount} unread</p>
                    )}
                  </div>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#215F9A] transition-colors hover:text-[#1b4e80]"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className={`overflow-y-auto ${showAll ? 'max-h-[60vh]' : 'max-h-96'}`}>
                {loading ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[#215F9A]" />
                    <p className="text-sm font-medium text-slate-500">Loading notifications…</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Bell className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-slate-500">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {displayedNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                          !notification.is_read ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {!notification.is_read && (
                          <span className="absolute left-0 top-0 h-full w-0.5 bg-[#215F9A]" aria-hidden="true" />
                        )}
                        <NotificationIcon type={notification.type} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#215F9A]"></span>
                            )}
                          </div>
                          {notification.message && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                              {notification.message}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-400">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 5 && !showAll && (
                <div className="border-t border-slate-100 px-4 py-2.5 text-center">
                  <button
                    onClick={handleViewAll}
                    className="text-xs font-semibold text-[#215F9A] transition-colors hover:text-[#1b4e80]"
                  >
                    View all notifications ({notifications.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
