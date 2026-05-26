"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BellRing, ClipboardList, Home, MapPinned, Search, ShieldCheck, TriangleAlert, Users } from 'lucide-react'

const DASHBOARD_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/notifications', label: 'Notifications', icon: BellRing },
  { href: '/dashboard/report-lost', label: 'Report Lost', icon: ClipboardList },
  { href: '/dashboard/my-reports', label: 'My Added Reports', icon: Search },
  // { href: '/lost', label: 'Lost Items', icon: MapPinned },
  // { href: '/found', label: 'Found Items', icon: ShieldCheck },
  // { href: '/flash-news', label: 'Flash News', icon: BellRing },
  // { href: '/resolved', label: 'Resolved', icon: TriangleAlert },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-24 rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-300">Dashboard</p>
            <h1 className="mt-3 text-2xl font-semibold">TraceBack</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">Track reports, move into the recovery workspace, and watch resolved items separately.</p>
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