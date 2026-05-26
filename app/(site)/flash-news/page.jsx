"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Filter, Search, ShieldAlert } from 'lucide-react'
import { URGENT_CATEGORIES, getUrgencyLevel } from '../../../lib/finance'

function isResolvedReport(report) {
  const caseStatus = (report?.caseStatus || '').toString().toLowerCase()
  const paymentStatus = (report?.paymentStatus || '').toString().toLowerCase()
  return caseStatus === 'resolved' || paymentStatus === 'paid' || Boolean(report?.resolvedAt) || Boolean(report?.foundAt)
}

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

export default function FlashNewsPage() {
  const [reports, setReports] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadReports = async () => {
      try {
        const response = await fetch('/api/reports')
        const data = await response.json()
        const normalized = Array.isArray(data) ? data : Array.isArray(data?.reports) ? data.reports : []

        if (!mounted) return

        setReports(
          normalized
            .filter((item) => (item.reviewStatus || 'approved').toString().toLowerCase() === 'approved')
            .filter((item) => !isResolvedReport(item))
            .map((item) => ({
              ...item,
              urgencyLevel: item.urgencyLevel || getUrgencyLevel(item),
            }))
        )
      } catch (error) {
        console.error(error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadReports()
    const timer = setInterval(loadReports, 10000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const urgentReports = useMemo(() => {
    return reports
      .filter((item) => item.urgencyLevel === 'high' || URGENT_CATEGORIES.some((entry) => (item.category || '').toLowerCase() === entry.toLowerCase()))
      .filter((item) => {
        const searchText = search.trim().toLowerCase()
        const matchesSearch = !searchText || `${item.title || ''} ${item.location || ''} ${item.category || ''}`.toLowerCase().includes(searchText)
        const matchesCategory = category === 'ALL' || (item.category || '') === category
        return matchesSearch && matchesCategory
      })
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
  }, [reports, search, category])

  const categories = ['ALL', ...new Set(URGENT_CATEGORIES)]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.12),_transparent_30%),linear-gradient(180deg,#fff5f5_0%,#fff_42%,#fff7f7_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-rose-100 bg-slate-950 px-6 py-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-rose-300">Flash News</p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Emergency lost-item alerts that need attention now.</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">High-priority items are sorted by latest, highlighted in red, and kept live with polling updates for urgent recovery.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:min-w-72">
              <div className="rounded-2xl bg-white/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-300">Urgent categories</p>
                <p className="mt-2 text-2xl font-semibold">{URGENT_CATEGORIES.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-300">Live alerts</p>
                <p className="mt-2 text-2xl font-semibold">{urgentReports.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur md:grid-cols-[1.2fr_0.8fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search urgent items, locations, or categories..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-rose-400" />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-rose-400">
              {categories.map((entry) => (
                <option key={entry} value={entry}>{entry === 'ALL' ? 'All categories' : entry}</option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 text-slate-500 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">Loading flash news...</div>
        ) : urgentReports.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-rose-200 bg-white/90 p-8 text-center text-slate-500 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">
            No emergency reports match your filters.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {urgentReports.map((report) => (
              <article key={report._id} className="overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">
                <div className="relative h-52 bg-rose-50">
                  <img src={report.img || 'https://via.placeholder.com/800x600?text=Emergency'} alt={report.title} className="h-full w-full object-cover" />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Emergency
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{report.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{report.location || 'Unknown location'}</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-700">{report.category || 'Alert'}</span>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-600">{report.description || 'Urgent alert details are limited.'}</p>

                  <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm">
                    <span className="font-medium text-rose-900">{formatRelativeTime(report.createdAt)}</span>
                    <span className="text-rose-700">Latest update</span>
                  </div>

                  <div className="flex gap-3">
                    <Link href={`/dashboard/requests/${report._id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500">
                      Quick contact
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href={`/item/${report._id}`} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      View
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
