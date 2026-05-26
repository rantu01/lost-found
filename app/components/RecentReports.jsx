"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUrgencyLevel } from '../../lib/finance'

function isPublicReport(report) {
  const status = (report?.reviewStatus || '').toString().toLowerCase()
  return !status || status === 'approved'
}

function isResolvedReport(report) {
  const caseStatus = (report?.caseStatus || '').toString().toLowerCase()
  const paymentStatus = (report?.paymentStatus || '').toString().toLowerCase()
  return caseStatus === 'resolved' || paymentStatus === 'paid' || Boolean(report?.resolvedAt) || Boolean(report?.foundAt)
}

export default function RecentReports({ items } = {}) {
  const router = useRouter()
  const [reports, setReports] = useState(() => (Array.isArray(items) ? items : []))
  const [loading, setLoading] = useState(() => !Array.isArray(items))

  useEffect(() => {
    if (Array.isArray(items)) return

    let mounted = true
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports')
        const data = await res.json()

        if (!mounted) return

        if (res.ok) {
          if (Array.isArray(data)) {
            setReports(data.filter((report) => isPublicReport(report) && !isResolvedReport(report)))
          } else if (data && Array.isArray(data.reports)) {
            setReports(data.reports.filter((report) => isPublicReport(report) && !isResolvedReport(report)))
          } else {
            console.error('Unexpected /api/reports response shape:', data)
            setReports([])
          }
        } else {
          console.error('Failed to fetch /api/reports:', data)
          setReports(Array.isArray(data?.reports) ? data.reports.filter((report) => isPublicReport(report) && !isResolvedReport(report)) : [])
        }
      } catch (e) {
        console.error(e)
        if (mounted) setReports([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchReports()
    return () => { mounted = false }
  }, [items])

  const formatType = (type) => (type || '').toString().toUpperCase()

  return (
    <section className="px-4 py-10 sm:px-6 lg:px-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-700">Latest reports</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Recent items from the community</h2>
        </div>
        <a href="/flash-news" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">View urgent alerts →</a>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-slate-500">No reports found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reports.map((item, i) => (
            <div key={item._id || i} className="group overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] transition hover:-translate-y-1 hover:shadow-lg">
              <div className="relative h-52 w-full overflow-hidden">
                <img src={item.img || 'https://via.placeholder.com/600x400?text=No+Image'} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute left-3 top-3 flex gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${formatType(item.type) === 'LOST' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {formatType(item.type) || 'REPORT'}
                  </span>
                  {getUrgencyLevel(item) === 'high' && (
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Emergency</span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h3 className="mb-1 text-lg font-semibold leading-tight text-slate-950">{item.title}</h3>
                <p className="mb-3 flex items-center gap-1 text-sm text-slate-500">📍 {item.location}</p>
                <p className="mb-4 text-xs text-slate-400">{item.category || 'Uncategorized'} · {item.paymentStatus || 'unpaid'}</p>

                <button onClick={() => router.push(`/item/${item._id || i}`)} className="w-full rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-2.5 font-semibold text-cyan-700 transition hover:bg-cyan-600 hover:text-white">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
