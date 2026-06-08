import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { ArrowRight, Bell, ShieldAlert } from 'lucide-react'
import clientPromise from '../../../lib/mongodb'
import { calculatePaymentBreakdown, formatMoney, getUrgencyLevel } from '../../../lib/finance'
import AdminPostedBy from './AdminPostedBy'

function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString()
}

export default async function Page({ params }) {
  const { id } = await params
  let report = null
  let error = ''

  try {
    const client = await clientPromise
    const db = client.db('trace-back')
    report = await db.collection('reports').findOne({ _id: new ObjectId(id) })
  } catch (caughtError) {
    error = caughtError?.message || 'Failed to load report'
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-950">Error</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-950">Report not found</h2>
        <p className="mt-2 text-sm text-slate-500">The requested report could not be found.</p>
      </div>
    )
  }

  const reviewStatus = (report.reviewStatus || 'approved').toString().toLowerCase()
  const caseStatus = (report.caseStatus || 'open').toString().toLowerCase()
  const paymentStatus = (report.paymentStatus || 'unpaid').toString().toLowerCase()
  const contactVisible = paymentStatus === 'paid'
  const urgencyLevel = getUrgencyLevel(report)
  const breakdown = calculatePaymentBreakdown({
    category: report.category,
    rewardAmount: report.rewardAmount || report.estimatedReward || 0,
    commissionMode: report.commissionMode,
    commissionValue: report.commissionValue,
  })

  if (reviewStatus !== 'approved') {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <h2 className="text-xl font-semibold text-slate-950">Waiting for approval</h2>
          <p className="mt-2 text-sm text-slate-500">This report is not public yet. An admin will review it before it appears on the site.</p>
        </div>
      </div>
    )
  }

  if (caseStatus === 'resolved') {
    return (
      <div className="mx-auto max-w-4xl p-4 py-8 sm:p-6 lg:p-8">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">Resolved</span>
            {urgencyLevel === 'high' && <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-700">Emergency</span>}
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">{report.title}</h1>
          <p className="mt-2 text-sm text-slate-500">This record is closed. The public view only shows the timeline below.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lost at</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{formatDate(report.lostAt || report.date || report.createdAt)}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Found at</p>
              <p className="mt-2 text-lg font-semibold">{formatDate(report.foundAt || report.resolvedAt)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/resolved/${id}`} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400">
              Open public resolved page
            </Link>
            <Link href="/my-reports" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              My reports
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4 py-8 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="relative aspect-[4/3] bg-slate-100">
            <img src={report.img || 'https://via.placeholder.com/800x600?text=No+Image'} alt={report.title} className="h-full w-full object-cover" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${report.type === 'FOUND' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {report.type}
              </span>
              {urgencyLevel === 'high' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Emergency
                </span>
              )}
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950">{report.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{report.location || 'Unknown location'}</p>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">{report.description || 'No description provided.'}</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reward</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(breakdown.rewardAmount)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Commission</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(breakdown.commissionAmount)}</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Final payable</p>
                <p className="mt-2 text-lg font-semibold">{formatMoney(breakdown.totalAmount)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/dashboard/requests/${id}`} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400">
                {report.type === 'FOUND' ? 'Claim Item' : 'Found This Item'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {caseStatus === 'resolved' && (
                <Link href={`/resolved/${id}`} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                  Resolved view
                </Link>
              )}
              {/* <Link href="/flash-news" className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                <Bell className="h-4 w-4" />
                Flash News
              </Link>
              <Link href="/my-reports" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                My reports
              </Link> */}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-950">Workflow snapshot</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">1. Open the shared workspace and verify the item details.</div>
              <div className="rounded-2xl bg-slate-50 p-4">2. Exchange messages and proof in the request thread.</div>
              <div className="rounded-2xl bg-slate-50 p-4">3. Complete Stripe payment before handover or reward release.</div>
              <div className="rounded-2xl bg-slate-50 p-4">4. Resolve the case and save transaction history.</div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-950">Metadata</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Category</span><span className="font-semibold text-slate-950">{report.category || 'Uncategorized'}</span></div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-slate-500">Posted by</span>
                <AdminPostedBy reporterName={report.reporterName} userEmail={report.userEmail} contactVisible={contactVisible} />
              </div>
              {contactVisible && report.userEmail && (
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Contact</span>
                  <span className="font-semibold text-slate-950">{report.userEmail}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Lost at</span><span className="font-semibold text-slate-950">{formatDate(report.lostAt || report.date || report.createdAt)}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
