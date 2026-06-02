import { useCallback, useEffect, useMemo, useState } from 'react'

export const NOTIFICATION_STORAGE_KEY = 'cdoc_admin_notifications'
export const NOTIFICATION_EVENT = 'cdoc_notifications_changed'

function safeParseNotifications() {
  try {
    const value = JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function saveNotifications(notifications) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications))
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT))
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function getNotifications() {
  return safeParseNotifications()
}

export function addNotification(payload) {
  const now = new Date().toISOString()
  const notification = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'system',
    title: '',
    message: '',
    audience: 'admin',
    userEmail: '',
    userName: '',
    panelLabel: '',
    screenMessage: '',
    errorMessage: '',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    status: 'new',
    createdAt: now,
    readBy: [],
    ...payload,
  }

  const notifications = [notification, ...safeParseNotifications()].slice(0, 100)
  saveNotifications(notifications)
  return notification
}

export function markNotificationRead(notificationId, userEmail) {
  const email = normalizeEmail(userEmail)
  if (!email || !notificationId) return

  const notifications = safeParseNotifications().map(notification => {
    if (notification.id !== notificationId) return notification
    const readBy = Array.isArray(notification.readBy) ? notification.readBy : []
    return readBy.includes(email)
      ? notification
      : { ...notification, readBy: [...readBy, email] }
  })
  saveNotifications(notifications)
}

export function markAllNotificationsRead(userEmail) {
  const email = normalizeEmail(userEmail)
  if (!email) return

  const notifications = safeParseNotifications().map(notification => {
    const readBy = Array.isArray(notification.readBy) ? notification.readBy : []
    return readBy.includes(email)
      ? notification
      : { ...notification, readBy: [...readBy, email] }
  })
  saveNotifications(notifications)
}

function canSeeNotification(notification, user) {
  if (!user) return false
  if (user.isAdmin) return true

  const userEmail = normalizeEmail(user.email)
  const notificationEmail = normalizeEmail(notification.userEmail)
  return notification.audience === 'all' || notificationEmail === userEmail
}

export function useNotifications(user) {
  const [notifications, setNotifications] = useState(() => safeParseNotifications())

  const refresh = useCallback(() => setNotifications(safeParseNotifications()), [])

  useEffect(() => {
    refresh()
    const onStorage = (event) => {
      if (event.key === NOTIFICATION_STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(NOTIFICATION_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(NOTIFICATION_EVENT, refresh)
    }
  }, [refresh])

  const visibleNotifications = useMemo(
    () => notifications.filter(notification => canSeeNotification(notification, user)),
    [notifications, user]
  )

  const currentEmail = normalizeEmail(user?.email)
  const unreadCount = visibleNotifications.filter(notification => {
    const readBy = Array.isArray(notification.readBy) ? notification.readBy : []
    return currentEmail && !readBy.includes(currentEmail)
  }).length

  return {
    notifications: visibleNotifications,
    unreadCount,
    refresh,
    markRead: (id) => markNotificationRead(id, user?.email),
    markAllRead: () => markAllNotificationsRead(user?.email),
  }
}
