'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bell, X, ChevronLeft } from 'lucide-react'
import { useNotifications, Notification } from '../NotificationContext'

const typeIconMap: Record<Notification['type'], React.ReactNode> = {
  order_status: (
    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    </div>
  ),
  draft_reminder: (
    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
  admin_action: (
    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    </div>
  ),
  system: (
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
  signup_approved: (
    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  ),
  signup_rejected: (
    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  ),
  new_order: (
    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </div>
  ),
  order_approved: (
    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
  order_rejected: (
    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
  custom_request_approved: (
    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
  custom_request_rejected: (
    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  ),
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
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-scale-in origin-top-right">
          {/* Selected Notification Full View */}
          {selectedNotification ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="font-semibold text-gray-900 flex-1">Notification Details</h3>
                <button
                  onClick={() => { setIsOpen(false); setSelectedNotification(null); }}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              {/* Full Content */}
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-start gap-3 mb-4">
                  {typeIconMap[selectedNotification.type]}
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedNotification.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimeAgo(selectedNotification.created_at)}
                    </p>
                  </div>
                </div>
                {selectedNotification.message && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedNotification.message}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                {showAll ? (
                  <>
                    <button
                      onClick={handleBack}
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors mr-2"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h3 className="font-semibold text-gray-900 flex-1">All Notifications ({notifications.length})</h3>
                  </>
                ) : (
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#215F9A] hover:text-[#2c78c0] font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className={`overflow-y-auto ${showAll ? 'max-h-[60vh]' : 'max-h-96'}`}>
                {loading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#215F9A] mx-auto"></div>
                    <p className="mt-2 text-sm">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div>
                    {displayedNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-50 ${
                          !notification.is_read ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {typeIconMap[notification.type]}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
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
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                  <button 
                    onClick={handleViewAll}
                    className="text-xs text-[#215F9A] hover:text-[#2c78c0] font-medium"
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

