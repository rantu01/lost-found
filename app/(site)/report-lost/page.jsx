"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { 
  Package,
  MapPin,
  Calendar,
  Tag,
  CloudUpload,
  Lightbulb,
  CheckCircle2,
  SendHorizontal,
  ChevronDown,
  Coins,
  BadgePercent,
  ArrowRight,
} from 'lucide-react'
import { calculatePaymentBreakdown, DEFAULT_COMMISSION_RULES, formatMoney } from '../../../lib/finance'

const CATEGORY_OPTIONS = [
  'Electronics',
  'Wallet / Bank Card',
  'Documents',
  'Small Accessories',
  'Jewelry',
  'Money Bag',
  'Mobile Phone',
  'Laptop',
  'Passport',
  'Other',
]

const ReportItem = () => {
  const [itemType, setItemType] = useState('lost')
  const [user, setUser] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [description, setDescription] = useState('')
  const [rewardAmount, setRewardAmount] = useState('25')
  const [loading, setLoading] = useState(false)
  const [img, setImg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [commissionRules, setCommissionRules] = useState(DEFAULT_COMMISSION_RULES)
  const fileInputRef = useRef(null)

  const handleFileChange = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Upload failed')
      setImg(data.url)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    import('../../../lib/firebase').then(({ default: auth }) => {
      const { onAuthStateChanged } = require('firebase/auth')
      const unsub = onAuthStateChanged(auth, (currentUser) => {
        if (mounted) setUser(currentUser)
      })
      return () => {
        mounted = false
        unsub()
      }
    }).catch((error) => console.error(error))

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    fetch('/api/commission-rules')
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return
        const rules = Array.isArray(data?.rules) ? data.rules : DEFAULT_COMMISSION_RULES
        setCommissionRules(rules)
      })
      .catch((error) => console.error(error))

    return () => {
      mounted = false
    }
  }, [])

  const paymentPreview = useMemo(() => calculatePaymentBreakdown({
    category,
    rewardAmount,
    commissionRules,
  }), [category, rewardAmount, commissionRules])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] py-10 px-4 md:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-700">Report Lost / Found</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Submit a detailed report and preview the payment flow up front.</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">Higher-value items use the current commission table automatically so the owner or finder sees the reward, admin fee, and final amount before checkout.</p>
          </div>

          <div className="mb-8 flex w-full rounded-2xl bg-slate-100 p-1.5">
            <button
              onClick={() => setItemType('lost')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${itemType === 'lost' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lost Item
            </button>
            <button
              onClick={() => setItemType('found')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${itemType === 'found' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Found Item
            </button>
          </div>

          {!user ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
              <p className="text-sm text-amber-800">You must be logged in to submit a report. Please <a href="/login" className="font-semibold text-cyan-700">log in</a>.</p>
            </div>
          ) : (
            <form
              className="space-y-6"
              onSubmit={async (event) => {
                event.preventDefault()
                setLoading(true)
                try {
                  const preview = calculatePaymentBreakdown({ category, rewardAmount, commissionRules })
                  const body = {
                    title,
                    category,
                    date,
                    lostAt: date,
                    location: locationInput,
                    description,
                    type: itemType.toUpperCase(),
                    userId: user.uid,
                    userEmail: user.email || '',
                    reporterName: user.displayName || user.email || 'Anonymous',
                    img,
                    reviewStatus: 'pending',
                    rewardAmount: preview.rewardAmount,
                    commissionMode: preview.commissionMode,
                    commissionValue: preview.commissionValue,
                    commissionAmount: preview.commissionAmount,
                    finalPayableAmount: preview.totalAmount,
                    caseStatus: 'open',
                  }
                  const response = await fetch('/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  })
                  if (!response.ok) throw new Error('Failed to create')
                  alert('Report submitted and sent for admin approval')
                  setTitle('')
                  setCategory('')
                  setDate('')
                  setLocationInput('')
                  setDescription('')
                  setRewardAmount('25')
                } catch (error) {
                  console.error(error)
                  alert(error?.message || 'Error')
                } finally {
                  setLoading(false)
                }
              }}
            >
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Item Title</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    type="text"
                    placeholder="e.g., Blue Leather Wallet"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Category</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-10 text-sm text-slate-600 outline-none focus:border-cyan-400"
                    >
                      <option value="">Select Category</option>
                      {CATEGORY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      type="date"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-500 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Reward Amount</label>
                  <div className="relative">
                    <Coins className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={rewardAmount}
                      onChange={(event) => setRewardAmount(event.target.value)}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="25"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Commission Preview</label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><BadgePercent className="h-4 w-4" /> Admin fee</span>
                      <span className="font-semibold text-slate-950">{formatMoney(paymentPreview.commissionAmount)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Total payable</span>
                      <span className="font-semibold text-slate-950">{formatMoney(paymentPreview.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={locationInput}
                    onChange={(event) => setLocationInput(event.target.value)}
                    type="text"
                    placeholder={`Where was it ${itemType === 'lost' ? 'lost' : 'found'}?`}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows="4"
                  placeholder="Include distinctive features (serial numbers, scratches, contents)..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-cyan-400"
                />
              </div>

              <button disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 py-4 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">
                <SendHorizontal className="h-5 w-5" />
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
            <div onClick={() => fileInputRef.current && fileInputRef.current.click()} className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-cyan-200 bg-slate-50 p-8 text-center transition hover:border-cyan-400 hover:bg-cyan-50/40">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50 transition">
                <CloudUpload className="h-8 w-8 text-cyan-700" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-slate-900">Upload Photo</h3>
              <p className="mb-4 text-xs leading-relaxed text-slate-400">Click here to browse and attach proof images.</p>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Max Size: 5MB</span>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFileChange(event.target.files && event.target.files[0])} />
              <div className="mt-4">
                {uploading ? <p className="text-sm text-slate-500">Uploading...</p> : img ? <img src={img} alt="preview" className="h-40 w-40 rounded-2xl object-cover" /> : null}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Reporting Tips</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-700" />
                <p className="text-[13px] leading-snug text-slate-500">Be as specific as possible with the item title.</p>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-700" />
                <p className="text-[13px] leading-snug text-slate-500">Upload high-quality photos from multiple angles.</p>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-700" />
                <p className="text-[13px] leading-snug text-slate-500">Mention unique identifiers like serial numbers or private marks.</p>
              </li>
            </ul>
          </div>

          <div className="rounded-[32px] bg-slate-950 p-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3 text-cyan-300">
              <ArrowRight className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Preview</span>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="flex items-center gap-2"><BadgePercent className="h-4 w-4" /> Commission</span>
                <span className="font-semibold text-white">{formatMoney(paymentPreview.commissionAmount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="flex items-center gap-2"><Coins className="h-4 w-4" /> Reward</span>
                <span className="font-semibold text-white">{formatMoney(paymentPreview.rewardAmount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-cyan-500 px-4 py-3 text-slate-950">
                <span className="font-semibold">Final payable</span>
                <span className="font-semibold">{formatMoney(paymentPreview.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportItem
