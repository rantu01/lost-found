"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { onAuthStateChanged } from 'firebase/auth'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, MessageSquareMore, RefreshCw, ShieldAlert, TrendingUp, User2 } from 'lucide-react'
import auth from '../../lib/firebase'

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

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ counts: {}, categoryCounts: [], recentActivities: [], urgentReports: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser))
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      try {
        const statsResponse = await fetch('/api/dashboard/stats')

        const statsData = await statsResponse.json()

        if (!mounted) return

        setStats(statsData || { counts: {}, categoryCounts: [], recentActivities: [], urgentReports: [] })
      } catch (error) {
        console.error(error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDashboard()
    const timer = setInterval(loadDashboard, 15000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [user])

  const countCards = useMemo(() => [
    { label: 'Active Posts', value: stats?.counts?.activePosts || 0, tone: 'text-sky-700 bg-sky-50', icon: TrendingUp },
    { label: 'Pending Approvals', value: stats?.counts?.pendingApprovals || 0, tone: 'text-amber-700 bg-amber-50', icon: ShieldAlert },
    { label: 'Resolved Cases', value: stats?.counts?.resolvedCases || 0, tone: 'text-emerald-700 bg-emerald-50', icon: CheckCircle2 },
    { label: 'Claimed Items', value: stats?.counts?.claimedItems || 0, tone: 'text-violet-700 bg-violet-50', icon: MessageSquareMore },
    { label: 'Total Users', value: stats?.counts?.totalUsers || 0, tone: 'text-slate-700 bg-slate-100', icon: User2 },
    { label: 'Transactions', value: stats?.counts?.totalTransactions || 0, tone: 'text-rose-700 bg-rose-50', icon: Clock3 },
  ], [stats])

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 px-6 py-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-300">User dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Track requests, payments, and recovered items in one place.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{user?.displayName || user?.email || 'Guest'} can follow live request threads, review urgent alerts, and move straight into the recovery workspace.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/report-lost" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Report Lost
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/my-reports" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              My Added Reports
            </Link>
          </div>
        </div>
      </section>

      {/* <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {countCards.map((card) => {
          const Icon = card.icon
          return (
            <article key={card.label} className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-950">{card.value}</h2>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          )
        })}
      </section> */}

      
      <div className="space-y-6">
          <div className="rounded-[32px] border border-rose-100 bg-rose-50 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-rose-950">Urgent alerts</h2>
                <p className="text-sm text-rose-700">High-priority items need immediate follow-up.</p>
              </div>
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>

            <div className="space-y-3">
              {(stats.urgentReports || []).slice(0, 4).map((report) => (
                <Link key={report._id || report.title} href={`/item/${report._id}`} className="block rounded-2xl border border-rose-100 bg-white p-4 transition hover:border-rose-300 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{report.title}</p>
                      <p className="text-xs text-slate-500">{report.location || 'Unknown location'}</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-700">Emergency</span>
                  </div>
                </Link>
              ))}
              {(stats.urgentReports || []).length === 0 && <p className="text-sm text-rose-700">No urgent alerts right now.</p>}
            </div>
          </div>
        </div>

      {/* <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Recent activity</h2>
            <p className="text-sm text-slate-500">Payments, alerts, and workflow changes from the last refresh.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(stats.recentActivities || []).map((activity, index) => (
            <div key={`${activity.title}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">{activity.label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{activity.title}</p>
              <p className="mt-2 text-[11px] text-slate-400">{formatRelativeTime(activity.time)}</p>
            </div>
          ))}
          {(stats.recentActivities || []).length === 0 && <p className="text-sm text-slate-500">No recent activity yet.</p>}
        </div>
      </section> */}
    </div>
  )
}