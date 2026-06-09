"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { onAuthStateChanged } from 'firebase/auth'
import {
  Activity,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Eye,
  PieChart,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
  X,
  PencilLine,
  Plus,
  Trash2,
} from 'lucide-react'
import auth from '../../lib/firebase'
import { isAdminEmail } from '../../lib/access'
import { DEFAULT_COMMISSION_RULES, formatMoney } from '../../lib/finance'

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

function Badge({ tone = 'slate', children }) {
  const styles = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
  }

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${styles[tone] || styles.slate}`}>{children}</span>
}

function StatCard({ label, value, helper, icon: Icon, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-950">{value}</h3>
          <p className="mt-2 text-xs text-slate-400">{helper}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone] || tones.slate}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ counts: {}, categoryCounts: [], recentActivities: [], urgentReports: [] })
  const [commissionRules, setCommissionRules] = useState(DEFAULT_COMMISSION_RULES)
  const [savingRule, setSavingRule] = useState('')
  const [actionId, setActionId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [reportTypeFilter, setReportTypeFilter] = useState('ALL')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser && !isAdminEmail(currentUser.email)) {
        router.replace('/')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return

    let mounted = true
    const fetchData = async () => {
      try {
        const [statsResponse, reportsResponse, usersResponse, rulesResponse] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/reports'),
          fetch('/api/users'),
          fetch('/api/commission-rules'),
        ])

        const [statsData, reportsData, usersData, rulesData] = await Promise.all([
          statsResponse.json(),
          reportsResponse.json(),
          usersResponse.json(),
          rulesResponse.json(),
        ])

        if (!mounted) return

        const normalizedReports = Array.isArray(reportsData) ? reportsData : Array.isArray(reportsData?.reports) ? reportsData.reports : []
        const normalizedUsers = Array.isArray(usersData) ? usersData : []
        const normalizedRules = Array.isArray(rulesData?.rules) ? rulesData.rules : DEFAULT_COMMISSION_RULES

        setStats(statsData || { counts: {}, categoryCounts: [], recentActivities: [], urgentReports: [] })
        setReports(normalizedReports)
        setUsers(normalizedUsers)
        setCommissionRules(normalizedRules)
      } catch (fetchError) {
        console.error(fetchError)
        if (mounted) setError(fetchError?.message || 'Failed to load dashboard data')
      }
    }

    fetchData()
    const intervalId = setInterval(fetchData, 15000)
    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [user])

  const dashboardCounts = stats?.counts || {}

  const topUsers = useMemo(() => users.slice(0, 6), [users])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const query = searchQuery.toLowerCase()
    return users.filter((entry) => (entry.displayName || '').toLowerCase().includes(query) || (entry.email || '').toLowerCase().includes(query))
  }, [users, searchQuery])

  const updateReportStatus = async (id, update) => {
    setActionId(id)
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          userId: user.uid,
          ...update,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Action failed')
      setReports((current) => current.map((report) => (report._id === id ? data : report)))
    } catch (updateError) {
      alert(updateError?.message || 'Action failed')
    } finally {
      setActionId('')
    }
  }

  const saveCommissionRule = async (rule) => {
    setSavingRule(rule.category)
    try {
      const response = await fetch('/api/commission-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          ...rule,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Commission update failed')
      setCommissionRules((current) => {
        const next = current.filter((entry) => (entry.category || '').toLowerCase() !== (rule.category || '').toLowerCase())
        return [...next, data].sort((left, right) => left.category.localeCompare(right.category))
      })
    } catch (saveError) {
      alert(saveError?.message || 'Commission update failed')
    } finally {
      setSavingRule('')
    }
  }

  const deleteCommissionRule = async (category) => {
    if (!confirm(`Delete commission rule for "${category}"?`)) return
    try {
      const response = await fetch(`/api/commission-rules?category=${encodeURIComponent(category)}&adminEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Delete failed')
      setCommissionRules((current) => current.filter((entry) => entry.category !== category))
    } catch (deleteError) {
      alert(deleteError?.message || 'Delete failed')
    }
  }

  const updateRuleField = (category, field, value) => {
    setCommissionRules((current) => current.map((rule) => rule.category === category ? { ...rule, [field]: value } : rule))
  }

  const addCommissionRule = () => {
    const newCategory = `New Category ${commissionRules.length + 1}`
    setCommissionRules((current) => [...current, { tempId: `new-${Date.now()}`, category: newCategory, mode: 'percentage', value: 5, isNew: true }])
  }

  const updateRuleByIndex = (index, field, value) => {
    setCommissionRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [field]: value } : rule))
  }

  const workflowReports = useMemo(() => {
    const filtered = reportTypeFilter === 'ALL' ? reports : reports.filter((r) => (r.type || '').toString().toUpperCase() === reportTypeFilter)
    return filtered
      .slice()
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 8)
  }, [reports, reportTypeFilter])

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-500">Loading admin dashboard...</div>
  }

  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center">
        <div className="mx-auto max-w-md rounded-3xl border border-white/70 bg-white p-8 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">
          <h1 className="text-2xl font-semibold text-slate-950">Access denied</h1>
          <p className="mt-2 text-sm text-slate-500">Only <span className="font-semibold">admin@admin.com</span> can open this dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-4 text-slate-800 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 px-6 py-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-300">Admin only</p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Live recovery dashboard with commission controls and workflow analytics.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">Monitor approvals, resolve cases, review transactions, and update commission rules without leaving the dashboard.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
              <p className="text-[11px] uppercase tracking-wider text-slate-300">Signed in as</p>
              <p className="mt-1 font-semibold">{user.email}</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Active Posts" value={dashboardCounts.activePosts || 0} helper="Approved reports visible on the site" icon={TrendingUp} tone="blue" />
          <StatCard label="Pending Approvals" value={dashboardCounts.pendingApprovals || 0} helper="Needs review before publishing" icon={ShieldAlert} tone="amber" />
          <StatCard label="Resolved Cases" value={dashboardCounts.resolvedCases || 0} helper="Cases closed after payment" icon={CheckCircle2} tone="emerald" />
          <StatCard label="Claimed Items" value={dashboardCounts.claimedItems || 0} helper="Requests moved to shared workspace" icon={BadgeDollarSign} tone="cyan" />
          <StatCard label="Total Users" value={dashboardCounts.totalUsers || 0} helper="Synced from Firebase and MongoDB" icon={Users} tone="slate" />
          <StatCard label="Transactions" value={dashboardCounts.totalTransactions || 0} helper="Stored payment history entries" icon={Clock3} tone="rose" />
        </section>

        <section className="">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Report moderation</h2>
                <p className="text-sm text-slate-500">Approve, reject, or close out reports with one action.</p>
              </div>
              <Badge tone="blue">{workflowReports.length} visible</Badge>
            </div>

            <div className="mb-5 flex gap-2 border-b border-slate-100 pb-3">
              {['ALL', 'LOST', 'FOUND'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setReportTypeFilter(tab)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    reportTypeFilter === tab
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Review</th>
                    <th className="px-4 py-3">Case</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {workflowReports.map((report) => {
                    const reviewStatus = (report.reviewStatus || 'pending').toString().toLowerCase()
                    const caseStatus = (report.caseStatus || 'open').toString().toLowerCase()
                    return (
                      <tr key={report._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <img src={report.img || 'https://via.placeholder.com/80?text=No+Image'} alt={report.title || 'Report'} className="h-12 w-12 rounded-2xl border border-slate-200 object-cover" />
                            <div>
                              <p className="font-semibold text-slate-950">{report.title || 'Untitled report'}</p>
                              <p className="text-xs text-slate-500">{report.location || 'Unknown location'}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{report.category || 'Uncategorized'} · {report.type || 'REPORT'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge tone={reviewStatus === 'approved' ? 'emerald' : reviewStatus === 'rejected' ? 'rose' : 'amber'}>{reviewStatus}</Badge>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <Badge tone={caseStatus === 'resolved' ? 'emerald' : caseStatus === 'claimed' ? 'cyan' : 'slate'}>{caseStatus}</Badge>
                            <span className="text-xs text-slate-400">{report.paymentStatus || 'unpaid'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link href={`/item/${report._id}`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                            <button type="button" disabled={actionId === report._id} onClick={() => updateReportStatus(report._id, { reviewStatus: 'approved' })} className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button type="button" disabled={actionId === report._id} onClick={() => updateReportStatus(report._id, { reviewStatus: 'rejected' })} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60">
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </button>
                            <button type="button" disabled={actionId === report._id} onClick={() => updateReportStatus(report._id, { caseStatus: 'resolved', paymentStatus: 'paid' })} className="inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-60">
                              <PieChart className="h-3.5 w-3.5" />
                              Resolve
                            </button>
                            <Link href={`/admin-dashboard/resolved/${report._id}`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          
        </section>

        <div className="space-y-6">
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">User management</h2>
                  <p className="text-sm text-slate-500">All registered users with search.</p>
                </div>
                <Users className="h-5 w-5 text-cyan-700" />
              </div>

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Active users</p>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {topUsers.map((entry) => (
                      <div key={entry._id || entry.email} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{entry.displayName || entry.email}</p>
                          <p className="truncate text-xs text-slate-500">{entry.email}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge tone={entry.role === 'admin' ? 'slate' : 'cyan'}>{entry.role || 'user'}</Badge>
                          <p className="mt-2 text-[11px] text-slate-400">Seen {formatRelativeTime(entry.lastSeen)}</p>
                        </div>
                      </div>
                    ))}
                    {topUsers.length === 0 && <p className="text-sm text-slate-500">No active users.</p>}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">All users</p>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-slate-500">No users matched your search.</p>
                    ) : (
                      filteredUsers.map((entry) => (
                        <div key={entry._id || entry.email} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{entry.displayName || entry.email}</p>
                            <p className="truncate text-xs text-slate-500">{entry.email}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <Badge tone={entry.role === 'admin' ? 'slate' : 'cyan'}>{entry.role || 'user'}</Badge>
                            <p className="mt-2 text-[11px] text-slate-400">Seen {formatRelativeTime(entry.lastSeen)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Status overview</h2>
                  <p className="text-sm text-slate-500">Quick operational health signals.</p>
                </div>
                <Activity className="h-5 w-5 text-slate-700" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">
                    <span>Pending approvals</span>
                    <span>{dashboardCounts.pendingApprovals || 0}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-cyan-600" style={{ width: `${Math.min(100, (dashboardCounts.pendingApprovals || 0) * 12)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">
                    <span>Resolved coverage</span>
                    <span>{reports.length ? Math.round(((dashboardCounts.resolvedCases || 0) / reports.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${reports.length ? Math.round(((dashboardCounts.resolvedCases || 0) / reports.length) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Category-wise report count</h2>
                <p className="text-xs text-slate-500">Live breakdown.</p>
              </div>
              <Badge tone="cyan">Live</Badge>
            </div>

            <div className="space-y-3">
              {(stats.categoryCounts || []).length === 0 ? (
                <p className="text-sm text-slate-500">No reports found yet.</p>
              ) : (
                stats.categoryCounts.slice(0, 6).map((item) => (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      <span className="text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${Math.min(100, item.count * 12)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Recent activity</h2>
                <p className="text-xs text-slate-500">Payments, alerts, and workflow changes.</p>
              </div>
              <Badge tone="slate">Auto refresh</Badge>
            </div>

            <div className="space-y-2">
              {(stats.recentActivities || []).length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity yet.</p>
              ) : (
                stats.recentActivities.slice(0, 4).map((activity, index) => (
                  <div key={`${activity.title}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">{activity.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{activity.title}</p>
                      </div>
                      <Badge tone={activity.tone === 'success' ? 'emerald' : activity.tone === 'warning' ? 'amber' : 'slate'}>{activity.tone}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{formatRelativeTime(activity.time)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Commission rules</h2>
              <p className="text-sm text-slate-500">Admin-controlled fixed or percentage commissions by category.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addCommissionRule}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Add rule
              </button>
              <Badge tone="cyan">Editable</Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {commissionRules.map((rule, ruleIndex) => (
              <div key={rule.tempId || rule.category} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {rule.isNew ? (
                      <label className="block space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category name</span>
                        <input
                          value={rule.category}
                          onChange={(event) => updateRuleByIndex(ruleIndex, 'category', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-400"
                        />
                      </label>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-950">{rule.category}</p>
                        <p className="mt-1 text-xs text-slate-500">Current breakdown affects checkout preview.</p>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveCommissionRule(rule)}
                      disabled={savingRule === rule.category}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingRule === rule.category ? 'Saving...' : 'Save'}
                    </button>
                    {!rule.isNew && (
                      <button
                        type="button"
                        onClick={() => deleteCommissionRule(rule.category)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mode</span>
                    <select value={rule.mode || 'percentage'} onChange={(event) => (rule.isNew ? updateRuleByIndex(ruleIndex, 'mode', event.target.value) : updateRuleField(rule.category, 'mode', event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Value</span>
                    <input value={rule.value ?? 0} onChange={(event) => (rule.isNew ? updateRuleByIndex(ruleIndex, 'value', event.target.value) : updateRuleField(rule.category, 'value', event.target.value))} type="number" min="0" step="0.5" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400" />
                  </label>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Preview</span>
                  <span className="font-semibold text-slate-950">{rule.mode === 'fixed' ? formatMoney(rule.value || 0) : `${Number(rule.value || 0)}%`}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
