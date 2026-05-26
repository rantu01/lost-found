"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Smartphone, Wallet, FileText, ShoppingBag, Key, Grid, BellRing, ArrowRight, Search, ShieldAlert, MapPin } from "lucide-react";
import RecentReports from './RecentReports'

export default function TraceBack() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    router.push(`/lost`);
  };

  const highlights = useMemo(() => ([
    { label: 'Live alerts', value: 'Emergency feed' },
    { label: 'Recovered today', value: 'Fast claim flow' },
    { label: 'Active users', value: 'Real-time updates' },
  ]), [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[36px] border border-white/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-700">
              <BellRing className="h-3.5 w-3.5" />
              TraceBack live recovery
            </div>
            <div>
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">Recover what matters with a cleaner lost-and-found workflow.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">Post a report, match urgent alerts, and complete the handover through a secure request workspace with payments and notifications built in.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={handleSearch} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                <Search className="h-4 w-4" />
                Explore items
              </button>
              <Link href="dashboard/report-lost" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100">
                Submit report
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/flash-news" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                <ShieldAlert className="h-4 w-4" />
                Flash News
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-[30px] bg-slate-950 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-300">Quick access</p>
                <h2 className="mt-2 text-2xl font-semibold">Emergency categories</h2>
              </div>
              <MapPin className="h-6 w-6 text-cyan-300" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { name: 'Mobile', icon: <Smartphone className="h-5 w-5" /> },
                { name: 'Wallet', icon: <Wallet className="h-5 w-5" /> },
                { name: 'Documents', icon: <FileText className="h-5 w-5" /> },
                { name: 'Bags', icon: <ShoppingBag className="h-5 w-5" /> },
                { name: 'Keys', icon: <Key className="h-5 w-5" /> },
                { name: 'Other', icon: <Grid className="h-5 w-5" /> },
              ].map((category) => (
                <button
                  key={category.name}
                  onClick={() => router.push('/lost')}
                  className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition hover:bg-white/10"
                >
                  {category.icon}
                  <span className="mt-2 text-sm font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <RecentReports />

    </div>
  );
}