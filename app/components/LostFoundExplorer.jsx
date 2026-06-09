"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

const CATEGORY_OPTIONS = ['Electronics', 'Pets', 'Documents', 'Other']

const STATUS_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Lost', value: 'LOST' },
  { label: 'Found', value: 'FOUND' },
]

function normalizeType(value) {
  return (value || '').toString().trim().toUpperCase()
}

function isPublicReport(report) {
  const status = (report?.reviewStatus || '').toString().toLowerCase()
  return !status || status === 'approved'
}

function isResolvedReport(report) {
  const caseStatus = (report?.caseStatus || '').toString().toLowerCase()
  const paymentStatus = (report?.paymentStatus || '').toString().toLowerCase()
  return caseStatus === 'resolved' || paymentStatus === 'paid' || Boolean(report?.resolvedAt) || Boolean(report?.foundAt)
}

function getComparableDate(item) {
  const rawDate = item?.date || item?.createdAt
  if (!rawDate) return null

  const parsed = new Date(rawDate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function FilterContent({
  search,
  setSearch,
  location,
  setLocation,
  selectedCategories,
  setSelectedCategories,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  status,
  setStatus,
  onReset,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Category</h3>
        <div className="space-y-3">
          {CATEGORY_OPTIONS.map((category) => (
            <label key={category} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => {
                  setSelectedCategories((current) =>
                    current.includes(category)
                      ? current.filter((value) => value !== category)
                      : [...current, category]
                  )
                }}
                className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-blue-600">{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Date Range</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 uppercase">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 uppercase">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Location</h3>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location..."
            className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        Reset filters
      </button>
    </div>
  )
}

const ITEMS_PER_PAGE = 9

export default function LostFoundExplorer({ defaultStatus = 'ALL', title, description }) {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState(normalizeType(defaultStatus) || 'ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports')
        const data = await res.json()

        if (!mounted) return

        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.reports)
            ? data.reports
            : []

        setReports(
          normalized.filter((report) => isPublicReport(report) && !isResolvedReport(report)).map((item) => ({
            ...item,
            _id: item?._id && item._id.toString ? item._id.toString() : item?._id,
          }))
        )
      } catch (error) {
        console.error(error)
        if (mounted) setReports([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchReports()
    return () => {
      mounted = false
    }
  }, [])

  const filteredReports = reports
    .filter((item) => {
      const type = normalizeType(item.type)
      const titleText = `${item.title || ''} ${item.description || ''}`.toLowerCase()
      const locationText = (item.location || '').toLowerCase()
      const categoryText = (item.category || '').toLowerCase()
      const searchText = search.trim().toLowerCase()
      const locationTextFilter = location.trim().toLowerCase()

      if (status !== 'ALL' && type !== status) return false
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) return false
      if (searchText && !titleText.includes(searchText) && !locationText.includes(searchText) && !categoryText.includes(searchText)) return false
      if (locationTextFilter && !locationText.includes(locationTextFilter)) return false

      const reportDate = getComparableDate(item)
      if (dateFrom && reportDate && reportDate < new Date(`${dateFrom}T00:00:00`)) return false
      if (dateTo && reportDate && reportDate > new Date(`${dateTo}T23:59:59.999`)) return false

      return true
    })
    .sort((left, right) => {
      const leftDate = getComparableDate(left)?.getTime() || 0
      const rightDate = getComparableDate(right)?.getTime() || 0

      return sortBy === 'oldest' ? leftDate - rightDate : rightDate - leftDate
    })

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE))
  const paginatedReports = filteredReports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, location, selectedCategories, dateFrom, dateTo, status, sortBy])

  const resetFilters = () => {
    setSearch('')
    setLocation('')
    setSelectedCategories([])
    setDateFrom('')
    setDateTo('')
    setStatus(normalizeType(defaultStatus) || 'ALL')
    setSortBy('newest')
  }

  const pageTitle = title || (normalizeType(defaultStatus) === 'FOUND' ? 'Found Items' : 'Lost Items')
  const pageDescription =
    description ||
    'Search, filter, and open reports in a responsive view built for desktop and mobile.'

  return (
    <div className="min-h-screen bg-[#f8faff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-600 mb-3">TraceBack Explorer</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{pageTitle}</h1>
            <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed">{pageDescription}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reports..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFiltersOpen(true)}
              className="lg:hidden inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-full lg:w-80 shrink-0 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 h-fit sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Filters</h2>
                <p className="text-xs text-slate-400 mt-1">Refine results</p>
              </div>
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Clear
              </button>
            </div>

            <FilterContent
              search={search}
              setSearch={setSearch}
              location={location}
              setLocation={setLocation}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              status={status}
              setStatus={setStatus}
              onReset={resetFilters}
            />
          </aside>

          <main className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <p className="text-sm text-gray-500">
                Showing <span className="font-bold text-gray-900">{filteredReports.length}</span> results
              </p>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-gray-100 bg-white p-10 text-gray-500 shadow-sm">
                Loading reports...
              </div>
            ) : paginatedReports.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
                No reports match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedReports.map((item) => {
                  const reportType = normalizeType(item.type)
                  return (
                    <div key={item._id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={item.img || 'https://via.placeholder.com/800x500?text=No+Image'}
                          alt={item.title || 'Report image'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${reportType === 'LOST' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                          {reportType || 'REPORT'}
                        </span>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                            {item.title || 'Untitled report'}
                          </h3>
                          <Bookmark className="w-4 h-4 text-blue-800 cursor-pointer shrink-0" />
                        </div>

                        <p className="text-sm text-gray-500 line-clamp-2 mb-5 min-h-10">
                          {item.description || 'No description provided.'}
                        </p>

                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between gap-3 text-[11px] text-gray-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date')}
                          </div>
                          <div className="flex items-center gap-1 text-right">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[10rem]">{item.location || 'Unknown location'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => router.push(`/item/${item._id}`)}
                          className="mt-5 w-full rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-600 hover:text-white"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <button
                  className={`p-2 text-gray-400 hover:text-blue-600 ${currentPage <= 1 ? 'opacity-30 pointer-events-none' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400 italic">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded text-sm font-medium ${
                          page === currentPage
                            ? 'bg-blue-900 text-white'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  className={`p-2 text-gray-400 hover:text-blue-600 ${currentPage >= totalPages ? 'opacity-30 pointer-events-none' : ''}`}
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isFiltersOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!isFiltersOpen}
      >
        <button
          type="button"
          aria-label="Close filters overlay"
          className="absolute inset-0 bg-slate-900/40"
          onClick={() => setIsFiltersOpen(false)}
        />

        <div className={`absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ${isFiltersOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Filters</h2>
              <p className="text-xs text-slate-400 mt-1">Swipe or tap outside to close</p>
            </div>
            <button type="button" onClick={() => setIsFiltersOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-[calc(100%-72px)] overflow-y-auto px-5 py-5">
            <FilterContent
              search={search}
              setSearch={setSearch}
              location={location}
              setLocation={setLocation}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              status={status}
              setStatus={setStatus}
              onReset={resetFilters}
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed left-0 right-0 bottom-4 z-40 flex justify-center pointer-events-none">
        <div className="pointer-events-auto rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Browse reports and open filters from the button above
        </div>
      </div>

      <div className="mt-10 px-4 sm:px-6 lg:px-8 pb-8">
        <Link href="/report-lost" className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800">
          Submit a new report →
        </Link>
      </div>
    </div>
  )
}