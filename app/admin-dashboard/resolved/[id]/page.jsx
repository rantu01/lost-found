"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { ArrowLeft, BadgeInfo, CreditCard, Users } from 'lucide-react'
import auth from '../../../../lib/firebase'
import { isAdminEmail } from '../../../../lib/access'
import { formatMoney } from '../../../../lib/finance'

function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString()
}

function pickTimelineValue(...values) {
  return values.find((value) => value && !Number.isNaN(new Date(value).getTime())) || ''
}

export default function AdminResolvedDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const reportId = params?.id
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [users, setUsers] = useState([])

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
    if (!user || !isAdminEmail(user.email) || !reportId) return

    let mounted = true
    const loadData = async () => {
      try {
        const [reportResponse, transactionResponse, usersResponse] = await Promise.all([
          fetch(`/api/reports/${reportId}`),
          fetch(`/api/transactions?reportId=${encodeURIComponent(reportId)}`),
          fetch('/api/users'),
        ])

        const [reportData, transactionData, usersData] = await Promise.all([
          reportResponse.json(),
          transactionResponse.json(),
          usersResponse.json(),
        ])

        if (!mounted) return

        setReport(reportResponse.ok ? reportData : null)
        setTransactions(Array.isArray(transactionData) ? transactionData : [])
        setUsers(Array.isArray(usersData) ? usersData : [])
      } catch (error) {
        console.error(error)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [user, reportId])

  const latestTransaction = useMemo(() => transactions[0] || null, [transactions])
  const lookupUser = (uid) => users.find((entry) => entry.uid === uid || entry.email === uid)

  if (loading) {
    return <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 text-slate-500 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">Loading resolve details...</div>
  }

  if (!user || !isAdminEmail(user.email)) {
    return null
  }

  if (!report) {
    return <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 text-slate-500 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">Resolve record not found.</div>
  }

  const payer = lookupUser(latestTransaction?.payerId || report.payerId)
  const receiver = lookupUser(latestTransaction?.receiverId || report.receiverId)
  const lostAt = pickTimelineValue(report.lostAt, report.date, report.createdAt, report.updatedAt)
  const foundAt = pickTimelineValue(report.foundAt, report.resolvedAt, report.updatedAt, report.createdAt)
  const resolvedAt = pickTimelineValue(report.resolvedAt, report.foundAt, report.updatedAt, report.createdAt)

  return (
    <div className="space-y-10 pb-8 max-w-7xl mx-auto mt-6">
      <section className="rounded-[32px] border border-white/70 bg-slate-950 px-6 py-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-300">Admin resolve details</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{report.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">Only admins can see who paid, who received the payment, and the full closeout record.</p>
          </div>
          <Link href="/admin-dashboard" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <p className="text-sm font-medium text-slate-500">Lost at</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatDate(lostAt)}</p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <p className="text-sm font-medium text-slate-500">Found at</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatDate(foundAt)}</p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <p className="text-sm font-medium text-slate-500">Paid amount</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(latestTransaction?.totalAmount || report.finalPayableAmount || 0)}</p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <p className="text-sm font-medium text-slate-500">Payment status</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{latestTransaction?.paymentStatus || report.paymentStatus || 'unknown'}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><BadgeInfo className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Resolution summary</h2>
              <p className="text-sm text-slate-500">The public page hides this information from normal visitors.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Case status</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{report.caseStatus || 'open'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolved at</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(resolvedAt)}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Paid by</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{payer?.displayName || payer?.email || latestTransaction?.payerId || 'Unknown payer'}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{latestTransaction?.payerId || report.payerId || 'No payer id'}</p>
            </div>
            <div className="rounded-2xl bg-cyan-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">Received by</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{receiver?.displayName || receiver?.email || latestTransaction?.receiverId || 'Unknown receiver'}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{latestTransaction?.receiverId || report.receiverId || 'No receiver id'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700"><CreditCard className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Transaction record</h2>
              <p className="text-sm text-slate-500">One transaction is linked to this resolved case.</p>
            </div>
          </div>

          {latestTransaction ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transaction title</p>
                <p className="mt-2 font-semibold text-slate-950">{latestTransaction.title || 'Recovered item payment'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Flow</p>
                <p className="mt-2 font-semibold text-slate-950">{latestTransaction.paymentFlow || 'claim'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transaction time</p>
                <p className="mt-2 font-semibold text-slate-950">{formatDate(latestTransaction.createdAt)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No transaction was recorded for this report yet.</p>
          )}

          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Users className="h-4 w-4" />
              Admin-only note
            </div>
            <p className="mt-2">If you need to audit who received the money, compare the transaction record with the resolved report metadata.</p>
          </div>
        </div>
      </section>
    </div>
  )
}