"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { ArrowRight, CheckCircle2, Lock, MessageSquare, Send, ShieldCheck } from 'lucide-react'
import auth from '../../../../lib/firebase'
import { calculatePaymentBreakdown, formatMoney, getUrgencyLevel } from '../../../../lib/finance'

function prettyTime(value) {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'
  return date.toLocaleString()
}

export default function RequestWorkspacePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const reportId = params?.id
  const [user, setUser] = useState(null)
  const [report, setReport] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [paying, setPaying] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [claimInfo, setClaimInfo] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser))
    return () => unsubscribe()
  }, [])

  const loadWorkspace = useCallback(async () => {
    try {
      const [reportResponse, messagesResponse] = await Promise.all([
        fetch(`/api/reports/${reportId}`),
        fetch(`/api/threads/${reportId}/messages`),
      ])

      const reportData = await reportResponse.json()
      const messagesData = await messagesResponse.json()

      setReport(reportResponse.ok ? reportData : null)
      setMessages(Array.isArray(messagesData) ? messagesData : [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    if (reportId) loadWorkspace()
  }, [reportId, loadWorkspace])

  const confirmPayment = useCallback(async () => {
    const paymentResult = searchParams?.get('payment')
    const transactionId = searchParams?.get('transaction')
    const sessionId = searchParams?.get('session_id')

    if (!transactionId || (paymentResult !== 'success' && paymentResult !== 'ready')) return

    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, sessionId, reportId }),
      })
      const data = await response.json()
      if (response.ok) {
        setStatusMessage('Payment confirmed. You can now chat and see contact details.')
        await loadWorkspace()
      } else {
        setStatusMessage(data?.message || 'Payment confirmation failed.')
      }
    } catch (error) {
      setStatusMessage(error?.message || 'Payment confirmation failed.')
    }
  }, [searchParams, reportId, loadWorkspace])

  useEffect(() => {
    confirmPayment()
  }, [confirmPayment])

  const initiateClaim = useCallback(async () => {
    if (!user?.uid || !reportId) return

    try {
      const response = await fetch(`/api/reports/${reportId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userName: user.displayName || user.email || 'A user',
          userEmail: user.email || '',
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setClaimInfo(data)
        if (data.report) setReport(data.report)
      }
    } catch (error) {
      console.error(error)
    }
  }, [user, reportId])

  useEffect(() => {
    if (user?.uid && reportId && !loading) {
      initiateClaim()
    }
  }, [user, reportId, loading, initiateClaim])

  const paymentMessage = useMemo(() => {
    const paymentResult = searchParams?.get('payment')
    if (paymentResult === 'success') return 'Payment confirmed. You can now chat and see contact details.'
    if (paymentResult === 'cancelled') return 'Payment was cancelled. Complete payment to unlock chat.'
    if (paymentResult === 'ready') return 'Dev mode: payment marked as complete. Chat is now unlocked.'
    return ''
  }, [searchParams])

  const breakdown = useMemo(() => calculatePaymentBreakdown({
    category: report?.category,
    rewardAmount: report?.rewardAmount || report?.estimatedReward || 0,
    commissionMode: report?.commissionMode,
    commissionValue: report?.commissionValue,
  }), [report])

  const reportType = (report?.type || 'LOST').toString().toUpperCase()
  const requestType = reportType === 'FOUND' ? 'claim' : 'handover'
  const isPaid = (report?.paymentStatus || '').toString().toLowerCase() === 'paid'
  const isOwner = user?.uid && report?.userId === user.uid
  const shouldPay = useMemo(() => {
    if (isPaid) return false
    if (reportType === 'LOST') return isOwner
    return !isOwner
  }, [isPaid, reportType, isOwner])

  const canChat = isPaid
  const canSeeContact = isPaid

  const startCheckout = useCallback(async () => {
    if (!report || !user) return
    setPaying(true)
    try {
      const payerId = reportType === 'LOST' ? report.userId : user.uid
      const receiverId = reportType === 'LOST' ? (report.claimedBy || user.uid) : report.userId

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          threadId: reportId,
          title: `${report.title} recovery payment`,
          category: report.category,
          rewardAmount: report.rewardAmount || report.estimatedReward || 0,
          commissionMode: report.commissionMode,
          commissionValue: report.commissionValue,
          paymentFlow: requestType,
          payerId,
          receiverId,
          userId: user.uid,
          currency: 'USD',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Checkout failed')

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      setStatusMessage(error?.message || 'Checkout could not be started.')
    } finally {
      setPaying(false)
    }
  }, [report, user, reportId, reportType, requestType])

  // Auto-redirect intentionally removed — user clicks "Pay" manually.

  const sendMessage = async () => {
    if (!messageInput.trim() || !canChat) return
    setSending(true)
    try {
      const response = await fetch(`/api/threads/${reportId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.uid || 'guest',
          senderName: user?.displayName || user?.email || 'Guest',
          message: messageInput.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatusMessage(data?.message || 'Message could not be sent.')
        return
      }
      setMessageInput('')
      const messagesResponse = await fetch(`/api/threads/${reportId}/messages`)
      const messagesData = await messagesResponse.json()
      setMessages(Array.isArray(messagesData) ? messagesData : [])
    } finally {
      setSending(false)
    }
  }

  const markResolved = async () => {
    if (!report || !isOwner) return
    await fetch(`/api/reports/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: report.userId,
        caseStatus: 'resolved',
        paymentStatus: 'paid',
        foundAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
      }),
    })
    setStatusMessage('Case marked as resolved.')
    await loadWorkspace()
  }

  if (loading) {
    return <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 text-slate-500 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">Loading request workspace...</div>
  }

  if (!report) {
    return <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 text-slate-500 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">Request not found.</div>
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-700">Shared request workspace</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{report.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {isPaid
                ? 'Payment complete. You can now chat and see contact details.'
                : shouldPay
                  ? 'Complete payment to unlock chat and contact details.'
                  : 'Waiting for the other party to complete payment before chat unlocks.'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
            <p className="text-xs uppercase tracking-wider text-slate-400">Current phase</p>
            <p className="mt-1 font-semibold">
              {isPaid ? 'Chat unlocked' : requestType === 'claim' ? 'Claim verification' : 'Lost item recovery'}
            </p>
          </div>
        </div>
      </section>

      {(paymentMessage || statusMessage) && (
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">{paymentMessage || statusMessage}</div>
      )}

      {!isPaid && (
        <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)]">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-amber-900">Payment required</h2>
              <p className="mt-1 text-sm text-amber-800">
                {reportType === 'LOST' && isOwner
                  ? 'Someone found your item. Pay the reward to unlock chat and contact details.'
                  : reportType === 'LOST' && !isOwner
                    ? 'The item owner has been notified. Chat will unlock after they complete payment.'
                    : reportType === 'FOUND' && !isOwner
                      ? 'Complete payment to claim this item and unlock chat with the finder.'
                      : 'Waiting for the claimer to complete payment.'}
              </p>
              {shouldPay && (
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={paying}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  {paying ? 'Redirecting to payment...' : `Pay ${formatMoney(breakdown.totalAmount)}`}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${report.type === 'FOUND' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {report.type}
              </span>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${getUrgencyLevel(report) === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                {getUrgencyLevel(report) === 'high' ? 'Emergency' : 'Standard'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{prettyTime(report.createdAt)}</span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reward amount</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{formatMoney(breakdown.rewardAmount)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Admin commission</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{formatMoney(breakdown.commissionAmount)}</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Final payable</p>
                <p className="mt-2 text-xl font-semibold">{formatMoney(breakdown.totalAmount)}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {shouldPay && !isPaid && (
                <button type="button" onClick={startCheckout} disabled={paying} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-60">
                  {paying ? 'Preparing checkout...' : 'Pay with Stripe'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {isOwner && isPaid && (
                <button type="button" onClick={markResolved} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4" />
                  Mark resolved
                </button>
              )}
              <Link href={`/item/${reportId}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Back to item
              </Link>
            </div>
          </div>

          <div id="chat" className={`rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur ${!canChat ? 'opacity-60' : ''}`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                {canChat ? <MessageSquare className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Shared chat and verification</h2>
                <p className="text-sm text-slate-500">
                  {canChat ? 'Ask ownership questions, request proof, and coordinate handover.' : 'Complete payment to unlock chat.'}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50 p-4">
              {!canChat ? (
                <p className="text-sm text-slate-500">Chat is locked until payment is completed.</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-500">No messages yet. Start the conversation below.</p>
              ) : messages.map((message) => (
                <div key={message._id || message.createdAt} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{message.senderName}</p>
                    <p className="text-[11px] text-slate-400">{prettyTime(message.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{message.message}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder={canChat ? 'Ask for proof, serial number, or pickup time...' : 'Payment required to send messages'}
                disabled={!canChat}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button type="button" onClick={sendMessage} disabled={sending || !canChat} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send message'}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Contact details</h2>
                <p className="text-sm text-slate-500">{canSeeContact ? 'Visible after payment.' : 'Hidden until payment is complete.'}</p>
              </div>
            </div>

            {canSeeContact ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Posted by</p>
                  <p className="mt-1 font-semibold text-slate-950">{report.reporterName || 'Anonymous'}</p>
                  <p className="mt-1 text-slate-600">{report.userEmail || 'No email'}</p>
                </div>
                {report.claimedByName && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{reportType === 'LOST' ? 'Found by' : 'Claimed by'}</p>
                    <p className="mt-1 font-semibold text-slate-950">{report.claimedByName}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                <Lock className="h-4 w-4 shrink-0" />
                Contact details will appear after payment.
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-950">Payment breakdown</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Reward</span><span className="font-semibold text-slate-950">{formatMoney(breakdown.rewardAmount)}</span></div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-slate-500">Commission</span><span className="font-semibold text-slate-950">{formatMoney(breakdown.commissionAmount)}</span></div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white"><span>Total</span><span className="font-semibold">{formatMoney(breakdown.totalAmount)}</span></div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
