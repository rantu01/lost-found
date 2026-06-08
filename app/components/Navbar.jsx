"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, UserCircle2, ChevronDown, Megaphone, ClipboardList, PencilLine } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth'
import auth, { signOutUser } from '../../lib/firebase'
import { isAdminEmail } from '../../lib/access'

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState({ displayName: '', photoURL: '' })
    const isAdmin = isAdminEmail(user?.email)

    const goToDashboard = () => {
        setIsUserMenuOpen(false)
        setIsOpen(false)
        router.push(isAdmin ? '/admin-dashboard' : '/dashboard')
    }

    const handleLogout = async () => {
        setIsUserMenuOpen(false)
        setIsOpen(false)
        try {
            await signOutUser()
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u)

            if (u?.email) {
                setProfile({
                    displayName: u.displayName || u.email.split('@')[0],
                    photoURL: u.photoURL || '',
                })

                fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid: u.uid,
                        email: u.email,
                        displayName: u.displayName || u.email.split('@')[0],
                        photoURL: u.photoURL || '',
                        role: isAdminEmail(u.email) ? 'admin' : 'user',
                    }),
                }).catch((error) => console.error(error))
            }
        })
        return () => unsub()
    }, [])

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

    const navLinks = [
        { name: 'Home', href: '/' },
        { name: 'Lost Items', href: '/lost' },
        { name: 'Found Items', href: '/found' },
        { name: 'Flash News', href: '/flash-news' },
        { name: 'Resolved', href: '/resolved' },
    ];

    return (
        <header className="bg-white/90 backdrop-blur sticky top-0 z-50 shadow-sm border-b border-white/70">
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex justify-between items-center">

                {/* Logo Section */}
                <div className="flex-shrink-0">
                    <Link href="/" className="text-2xl font-bold text-blue-700 tracking-tight">
                        TraceBack
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex flex-row items-center gap-x-10">
                    {navLinks.map((link) => {
                        if (link.adminOnly && !isAdmin) return null
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`text-sm font-semibold transition-all duration-200 py-1 ${isActive
                                    ? "text-blue-700 border-b-2 border-blue-700"
                                    : "text-gray-600 hover:text-blue-700"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Auth Buttons */}
                <div className="flex items-center gap-6 relative">
                    <div className="hidden md:flex items-center gap-6">
                        {user ? (
                            <>
                                {/* <Link href="/report-lost" className="hidden lg:inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                                    <PencilLine className="w-4 h-4" />
                                    Report Lost
                                </Link>
                                <Link href="/my-reports" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                                    My Added Reports
                                </Link> */}
                                <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsUserMenuOpen((value) => !value)}
                                            className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-gray-700 hover:border-blue-200 hover:text-blue-700 transition-colors"
                                            aria-haspopup="menu"
                                            aria-expanded={isUserMenuOpen}
                                        >
                                            <div className="flex items-center gap-2">
                                                {profile.photoURL ? (
                                                    <img src={profile.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
                                                ) : (
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                        {(profile.displayName || '?')[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="hidden text-sm font-semibold sm:block">{profile.displayName}</span>
                                            </div>
                                            <ChevronDown className="h-4 w-4" />
                                        </button>

                                    {isUserMenuOpen && (
                                        <div className="absolute right-0 top-full mt-3 w-52 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl z-50">
                                            <button
                                                type="button"
                                                onClick={goToDashboard}
                                                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                                            >
                                                Dashboard
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                                    Login
                                </Link>
                                <Link href="/signup">
                                    <button className="bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-blue-800 transition-all shadow-md active:scale-95">
                                        Signup
                                    </button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-gray-100 shadow-xl z-50">
                    <nav className="flex flex-col p-6 space-y-4">
                        {navLinks.map((link) => (
                            link.adminOnly && !isAdmin ? null : (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`text-base font-medium p-2 rounded-lg ${pathname === link.href ? "bg-blue-50 text-blue-700" : "text-gray-600"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            )
                        ))}
                        <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                            {user ? (
                                <>
                                    <Link href="/report-lost" onClick={() => setIsOpen(false)} className="w-full py-3 text-center bg-slate-950 text-white font-semibold rounded-xl">
                                        Report Lost
                                    </Link>
                                    <Link href="/my-reports" onClick={() => setIsOpen(false)} className="w-full py-3 text-center text-gray-700 font-semibold border border-gray-200 rounded-xl">
                                        My Added Reports
                                    </Link>
                                    <button onClick={goToDashboard} className="w-full py-3 text-center text-slate-700 font-semibold border border-slate-200 rounded-xl">
                                        Dashboard
                                    </button>
                                    <button onClick={handleLogout} className="w-full py-3 text-center text-red-600 font-semibold border border-red-600 rounded-xl">
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href="/login" onClick={() => setIsOpen(false)} className="w-full py-3 text-center text-blue-700 font-semibold border border-blue-700 rounded-xl">
                                        Login
                                    </Link>
                                    <Link href="/signup" onClick={() => setIsOpen(false)} className="w-full py-3 text-center bg-blue-700 text-white font-semibold rounded-xl">
                                        Signup
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Navbar;