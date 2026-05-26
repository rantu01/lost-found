"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, CalendarDays, ArrowRight, ShieldCheck } from 'lucide-react'

function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString()
}

function formatTime(value) {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString()
}

function pickTimelineValue(...values) {
  return values.find((value) => value && !Number.isNaN(new Date(value).getTime())) || ''
}

function isResolvedReport(report) {
  const caseStatus = (report?.caseStatus || '').toString().toLowerCase()
  const paymentStatus = (report?.paymentStatus || '').toString().toLowerCase()
  return caseStatus === 'resolved' || paymentStatus === 'paid' || Boolean(report?.resolvedAt) || Boolean(report?.foundAt)
}

export default function ResolvedReportsPage() {
  const [reports, setReports] = useState([])
  const [search, setSearch] = useState('')
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
            .filter(isResolvedReport)
            .sort((left, right) => new Date(right.resolvedAt || right.foundAt || right.createdAt || 0) - new Date(left.resolvedAt || left.foundAt || left.createdAt || 0))
        )
      } catch (error) {
        console.error(error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadReports()
    const timer = setInterval(loadReports, 15000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const filteredReports = useMemo(() => {
    const searchText = search.trim().toLowerCase()
    return reports.filter((item) => {
      if (!searchText) return true
      return `${item.title || ''} ${item.location || ''} ${item.category || ''}`.toLowerCase().includes(searchText)
    })
  }, [reports, search])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,#f7fffb_0%,#ffffff_40%,#f0fdf4_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-emerald-100 bg-slate-950 px-6 py-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-emerald-300">Resolved reports</p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Completed cases with the full timeline.</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">This page keeps every resolved report in one place so users can check when it was lost and when it was found again.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-4 text-center sm:min-w-72">
              <p className="text-[11px] uppercase tracking-wider text-slate-300">Resolved count</p>
              <p className="mt-2 text-2xl font-semibold">{reports.length}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resolved items, locations, or categories..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-400" />
          </div>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 text-slate-500 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">Loading resolved reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-emerald-200 bg-white/90 p-8 text-center text-slate-500 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">
            No resolved reports match your search.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((report) => (
              <article key={report._id} className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">
                <div className="relative h-52 bg-emerald-50">
                  <img src={report.img || 'https://via.placeholder.com/800x600?text=Resolved'} alt={report.title} className="h-full w-full object-cover" />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Resolved
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{report.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{report.location || 'Unknown location'}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">{report.category || 'Resolved'}</span>
                  </div>

                  <div className="space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 font-medium text-slate-700"><CalendarDays className="h-4 w-4" /> Lost at</span>
                      <span className="font-semibold text-slate-950">{formatDate(report.lostAt || report.date || report.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-700">Found at</span>
                      <span className="font-semibold text-slate-950">{formatDate(pickTimelineValue(report.foundAt, report.resolvedAt, report.updatedAt, report.createdAt))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                      <span>Resolved on</span>
                      <span>{formatTime(pickTimelineValue(report.resolvedAt, report.foundAt, report.updatedAt, report.createdAt))}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link href={`/resolved/${report._id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
                      Open timeline
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