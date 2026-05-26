"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmail, signInWithGooglePopup } from '../../../lib/firebase'

const Login = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      router.push(nextPath)
    } catch (err) {
      alert(err?.message || 'Login failed')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGooglePopup()
      router.push(nextPath)
    } catch (err) {
      alert(err?.message || 'Google sign-in failed')
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-[450px] rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#0052cc] w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-100">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TraceBack</h1>
          <p className="text-sm text-gray-500 text-center leading-relaxed">Recover what&apos;s yours, secure what you find.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-3.5 bg-blue-50/30 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-blue-50/30 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <Link href="#" className="text-xs font-bold text-blue-700 hover:underline">Forgot password?</Link>
          </div>

          <button disabled={loading} className="w-full bg-[#0052cc] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-blue-800 transition-all shadow-md active:scale-[0.98] mt-2">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="relative my-8 text-center">
          <hr className="border-gray-100" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Or continue with</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={handleGoogle} className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-sm font-semibold text-gray-700">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="google" />
            Google
          </button>
          <button className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-sm font-semibold text-gray-700">
            <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-5 h-5" alt="facebook" />
            Facebook
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">Don&apos;t have an account? <Link href="/signup" className="font-bold text-blue-600">Sign up</Link></p>
      </div>
    </div>
  )
}

export default Login