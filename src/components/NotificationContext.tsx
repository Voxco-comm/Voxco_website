'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'

export interface Notification {
  id: string
  user_id: string
  type: 'order_status' | 'draft_reminder' | 'admin_action' | 'system' | 'signup_approved' | 'signup_rejected' | 'new_order' | 'order_approved' | 'order_rejected' | 'custom_request_approved' | 'custom_request_rejected'
  title: string
  message: string | null
  metadata: Record<string, any>
  is_read: boolean
  created_at: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  addToast: (toast: ToastMessage) => void
  toasts: ToastMessage[]
  removeToast: (id: string) => void
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        // Handle permission denied error gracefully - table might not have proper grants yet
        if (error.code === '42501') {
          console.warn('Notifications table permission denied. Run the fix_permissions.sql script in Supabase SQL Editor.')
        } else {
          console.error('Error fetching notifications:', error)
        }
        setNotifications([])
        return
      }

      setNotifications(data || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Polling fallback - refresh notifications every 30 seconds as backup for real-time
  useEffect(() => {
    if (!user) return
    
    const pollInterval = setInterval(() => {
      fetchNotifications()
    }, 30000) // Poll every 30 seconds
    
    return () => clearInterval(pollInterval)
  }, [user, fetchNotifications])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast: ToastMessage) => {
    const id = toast.id || crypto.randomUUID()
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])

    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }
  }, [removeToast])

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])

          // Show a toast for the new notification
          addToast({
            id: newNotification.id,
            type: 'info',
            title: newNotification.title,
            message: newNotification.message || undefined,
            duration: 5000,
          })
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to notifications channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Notification channel error:', err)
        } else if (status === 'TIMED_OUT') {
          console.warn('Notification subscription timed out')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, addToast])

  const markAsRead = async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        if (error.code === '42501') {
          console.warn('Notifications table permission denied.')
        } else {
          throw error
        }
        return
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        if (error.code === '42501') {
          console.warn('Notifications table permission denied.')
        } else {
          throw error
        }
        return
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
    addToast,
    toasts,
    removeToast,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

