"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { onAuthStateChanged } from 'firebase/auth'
import { BellRing, CheckCheck, Clock3, RefreshCw } from 'lucide-react'
import auth from '../../../lib/firebase'

function formatRelativeTime(value) {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export default function DashboardNotificationsPage() {
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser))
    return () => unsubscribe()
  }, [])

  const loadNotifications = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/notifications${user?.uid ? `?userId=${encodeURIComponent(user.uid)}` : ''}`)
      const data = await response.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const run = async () => {
      if (!mounted) return
      await loadNotifications()
    }

    run()
    const timer = setInterval(run, 15000)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [user])

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, [notifications])

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 px-6 py-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-700">Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">Notifications</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
              Keep track of new alerts, claims, and workflow updates in one dedicated stream.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Back to overview
            </Link>
            <button
              type="button"
              onClick={loadNotifications}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Total notifications</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">{notifications.length}</h2>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <BellRing className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Unread</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">{unreadCount}</h2>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Clock3 className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Read</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">{Math.max(0, notifications.length - unreadCount)}</h2>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCheck className="h-5 w-5" />
            </span>
          </div>
        </article>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">All notifications</h2>
            <p className="text-sm text-slate-500">Recent dashboard alerts and claim updates.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {notifications.length}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const content = (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{notification.message}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${notification.isRead ? 'bg-slate-200 text-slate-600' : 'bg-cyan-100 text-cyan-700'}`}>
                    {notification.isRead ? 'Read' : 'New'}
                  </span>
                </div>
              )

              const footer = (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <p>{formatRelativeTime(notification.createdAt)}</p>
                  {notification.actionUrl ? (
                    <span className="font-semibold text-cyan-700">Pay &amp; chat &rarr;</span>
                  ) : null}
                </div>
              )

              if (notification.actionUrl) {
                return (
                  <Link
                    key={notification._id || notification.title}
                    href={notification.actionUrl}
                    className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-cyan-50 hover:shadow-sm"
                  >
                    {content}
                    {footer}
                  </Link>
                )
              }

              return (
                <div key={notification._id || notification.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  {content}
                  {footer}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}