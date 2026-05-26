import Link from 'next/link'
import { ObjectId } from 'mongodb'
import clientPromise from '../../../../lib/mongodb'

function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString()
}

function pickTimelineValue(...values) {
  return values.find((value) => value && !Number.isNaN(new Date(value).getTime())) || ''
}

export default async function ResolvedPage({ params }) {
  const { id } = await params

  try {
    const client = await clientPromise
    const db = client.db('trace-back')
    const report = await db.collection('reports').findOne({ _id: new ObjectId(id) })

    if (!report) {
      return (
        <div className="mx-auto max-w-3xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Resolved item not found</h1>
          <p className="mt-2 text-sm text-slate-500">The record may have been removed.</p>
        </div>
      )
    }

    const isResolved = (report.caseStatus || '').toString().toLowerCase() === 'resolved'
    if (!isResolved) {
      return (
        <div className="mx-auto max-w-3xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-950">This report is not resolved yet</h1>
          <p className="mt-2 text-sm text-slate-500">Resolved details will appear here after the case is closed.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/item/${id}`} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Back to item</Link>
            <Link href="/my-reports" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">My reports</Link>
          </div>
        </div>
      )
    }

    const lostAt = pickTimelineValue(report.lostAt, report.date, report.createdAt, report.updatedAt)
    const foundAt = pickTimelineValue(report.foundAt, report.resolvedAt, report.updatedAt, report.createdAt)

    return (
      <div className="mx-auto max-w-4xl p-4 py-8 sm:p-6 lg:p-8">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">Resolved</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">Public timeline only</span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold text-slate-950">{report.title}</h1>
          <p className="mt-2 text-sm text-slate-500">This page shows only when the item went missing and when it came back.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lost at</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{formatDate(lostAt)}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Found at</p>
              <p className="mt-2 text-lg font-semibold">{formatDate(foundAt)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/item/${id}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Back to item</Link>
            <Link href="/flash-news" className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-400">Flash News</Link>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">Error</h1>
        <p className="mt-2 text-sm text-slate-500">{error?.message || 'Failed to load resolved page.'}</p>
      </div>
    )
  }
}