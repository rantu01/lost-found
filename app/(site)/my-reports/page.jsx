"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import auth from '../../../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { ArrowUpDown, ClipboardList, CircleCheckBig, Clock3, Edit3, Eye, Filter, Search, Trash2 } from 'lucide-react'

const STATUS_OPTIONS = ['ALL', 'pending', 'approved', 'resolved', 'claimed']
const TYPE_OPTIONS = ['ALL', 'LOST', 'FOUND']

function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString()
}

function getStatus(report) {
  return (report?.caseStatus || report?.reviewStatus || 'pending').toString().toLowerCase()
}

export default function MyReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', location: '', type: 'LOST', description: '', category: '' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser))
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    let mounted = true

    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports')
        const data = await response.json()
        if (!mounted) return
        const normalized = (data || []).map((item) => ({ ...item, _id: item._id && item._id.toString ? item._id.toString() : item._id }))
        setReports(normalized.filter((report) => report.userId === user.uid))
      } catch (error) {
        console.error(error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchReports()
    return () => {
      mounted = false
    }
  }, [user])

  const onDelete = async (id) => {
    if (!confirm('Delete this report?')) return
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Delete failed')
      setReports((current) => current.filter((report) => (report._id && report._id.toString ? report._id.toString() : report._id) !== (id && id.toString ? id.toString() : id)))
    } catch (error) {
      alert(error.message)
    }
  }

  const startEdit = (report) => {
    setEditingId(report._id)
    setForm({
      title: report.title,
      location: report.location,
      type: report.type,
      description: report.description || '',
      category: report.category || '',
    })
  }

  const saveEdit = async (id) => {
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: user.uid }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Update failed')
      const updated = { ...data, _id: data._id && data._id.toString ? data._id.toString() : data._id }
      setReports((current) => current.map((report) => (report._id && report._id.toString ? report._id.toString() : report._id) === (id && id.toString ? id.toString() : id) ? updated : report))
      setEditingId(null)
    } catch (error) {
      alert(error.message)
    }
  }

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        const searchText = search.trim().toLowerCase()
        const matchesSearch = !searchText || `${report.title || ''} ${report.location || ''} ${report.description || ''}`.toLowerCase().includes(searchText)
        const matchesStatus = statusFilter === 'ALL' || getStatus(report) === statusFilter
        const matchesType = typeFilter === 'ALL' || (report.type || '').toString().toUpperCase() === typeFilter
        return matchesSearch && matchesStatus && matchesType
      })
      .sort((left, right) => {
        const leftDate = new Date(left.createdAt || left.date || 0).getTime()
        const rightDate = new Date(right.createdAt || right.date || 0).getTime()
        return sortBy === 'oldest' ? leftDate - rightDate : rightDate - leftDate
      })
  }, [reports, search, statusFilter, typeFilter, sortBy])

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Please <a href="/login" className="font-semibold text-cyan-700">log in</a> to see your reports.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-700">My Added Reports</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Manage your posts, statuses, and quick actions.</h1>
            <p className="mt-2 text-sm text-slate-500">Filter by status or type, edit records inline, and jump directly into each report.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/report-lost')} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              <ClipboardList className="h-4 w-4" />
              Report Lost
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.5fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, location, description..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-cyan-400" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400">
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All statuses' : option}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400">
            {TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option === 'ALL' ? 'All types' : option}</option>)}
          </select>
          <button type="button" onClick={() => setSortBy((current) => (current === 'newest' ? 'oldest' : 'newest'))} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <ArrowUpDown className="h-4 w-4" />
            {sortBy === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading your reports...</p>
        ) : filteredReports.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            You have no reports that match the current filters.
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {filteredReports.map((report) => (
                    <tr key={report._id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        {editingId === report._id ? (
                          <div className="space-y-3">
                            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400" />
                            <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400" />
                            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400">
                              <option>LOST</option>
                              <option>FOUND</option>
                            </select>
                            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400" />
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(report._id)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Save</button>
                              <button onClick={() => setEditingId(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                              <img src={report.img || 'https://via.placeholder.com/80?text=No+Image'} alt={report.title} className="h-full w-full object-cover" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{report.title}</p>
                              <p className="text-xs text-slate-500">{report.location || 'Unknown location'} · {report.category || 'Uncategorized'}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{report.type || 'REPORT'}</p>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${getStatus(report) === 'resolved' ? 'bg-emerald-100 text-emerald-700' : getStatus(report) === 'claimed' ? 'bg-cyan-100 text-cyan-700' : getStatus(report) === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {getStatus(report)}
                          </span>
                          <span className={`inline-flex w-fit items-center gap-1 text-[11px] ${report.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {report.paymentStatus === 'paid' ? <CircleCheckBig className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                            {report.paymentStatus || 'unpaid'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-500">{formatDate(report.createdAt || report.date)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/item/${report._id}`} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                          <button onClick={() => startEdit(report)} className="inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100">
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button onClick={() => onDelete(report._id)} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100">
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
