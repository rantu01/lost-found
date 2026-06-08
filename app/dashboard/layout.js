"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { onAuthStateChanged, updateProfile } from 'firebase/auth'
import { BellRing, Camera, ClipboardList, Home, ImageUp, MapPinned, PencilLine, Search, ShieldCheck, TriangleAlert, Users, X } from 'lucide-react'
import auth from '../../lib/firebase'

const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/notifications', label: 'Notifications', icon: BellRing },
  { href: '/dashboard/report-lost', label: 'Report Lost', icon: ClipboardList },
  { href: '/dashboard/my-reports', label: 'My Added Reports', icon: Search },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ displayName: '', photoURL: '' })
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhoto, setEditPhoto] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const editRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthReady(true)

      if (currentUser) {
        setProfile({
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          photoURL: currentUser.photoURL || '',
        })
      }

      if (!currentUser) {
        router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`)
      }
    })

    return () => unsubscribe()
  }, [pathname, router])

  useEffect(() => {
    if (!user?.uid) return
    fetch(`/api/users`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const match = data.find((entry) => entry.uid === user.uid || entry.email === user.email)
          if (match) {
            setProfile({
              displayName: match.displayName || user.displayName || user.email?.split('@')[0] || 'User',
              photoURL: match.photoURL || user.photoURL || '',
            })
          }
        }
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editRef.current && !editRef.current.contains(event.target)) {
        setEditing(false)
      }
    }
    if (editing) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editing])

  const openEditor = useCallback(() => {
    setEditName(profile.displayName)
    setEditPhoto(profile.photoURL)
    setEditing(true)
  }, [profile])

  const saveProfile = useCallback(async () => {
    if (!user) return
    setSaving(true)
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: editName.trim() || user.email?.split('@')[0] || 'User',
          photoURL: editPhoto.trim() || '',
        }),
      })

      await updateProfile(user, {
        displayName: editName.trim() || user.email?.split('@')[0] || 'User',
        photoURL: editPhoto.trim() || '',
      })

      setProfile({
        displayName: editName.trim() || user.email?.split('@')[0] || 'User',
        photoURL: editPhoto.trim() || '',
      })
      setEditing(false)
    } catch {
    } finally {
      setSaving(false)
    }
  }, [user, editName, editPhoto])

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data?.url) setEditPhoto(data.url)
    } catch {
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  if (!authReady) {
    return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-sm text-slate-500">Checking access...</div>
  }

  if (!user) {
    return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-sm text-slate-500">Redirecting to login...</div>
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-24 rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-300">Dashboard</p>
            <h1 className="mt-3 text-2xl font-semibold">TraceBack</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">Track reports, move into the recovery workspace, and watch resolved items separately.</p>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-600">
                    {(profile.displayName || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{profile.displayName}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <button type="button" onClick={openEditor} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-cyan-700">
                <PencilLine className="h-4 w-4" />
              </button>
            </div>

            {editing && (
              <div ref={editRef} className="mt-4 space-y-3 rounded-2xl border border-cyan-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">Edit profile</p>
                  <button type="button" onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</span>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400" />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Photo</span>
                  <div className="flex items-center gap-3">
                    {editPhoto ? (
                      <img src={editPhoto} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-400">
                        <Camera className="h-5 w-5" />
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="profile-upload" />
                    <label
                      htmlFor="profile-upload"
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <ImageUp className="h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Choose file'}
                    </label>
                    {editPhoto && (
                      <button type="button" onClick={() => setEditPhoto('')} className="text-xs text-slate-400 hover:text-red-500">
                        Clear
                      </button>
                    )}
                  </div>
                </label>
                <button type="button" onClick={saveProfile} disabled={saving} className="w-full rounded-xl bg-cyan-600 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <nav className="mt-5 space-y-2">
            {DASHBOARD_LINKS.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Users className="h-4 w-4" />
              Quick access
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>• Resolve cases from the request workspace.</p>
              <p>• Check public resolved timelines separately.</p>
              <p>• Keep payment and handover records in the admin dashboard.</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 rounded-[28px] border border-white/70 bg-white/90 px-4 py-4 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-700">Dashboard</p>
              <h1 className="mt-1 text-lg font-semibold text-slate-950">TraceBack</h1>
            </div>
            <Link href="/dashboard/notifications" className="rounded-2xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
              Notifications
            </Link>
            <Link href="/resolved" className="rounded-2xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
              Resolved
            </Link>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {DASHBOARD_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${isActive ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}