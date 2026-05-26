import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <div className="border-t border-white/70 bg-white/80 px-6 pb-8 pt-16 backdrop-blur md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-1">
            <h2 className="mb-4 text-2xl font-semibold text-slate-950">TraceBack</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              TraceBack is a community-driven platform helping people reunite with their lost belongings through transparency and technology.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-900">Quick Links</h3>
            <ul className="space-y-2 text-sm font-medium text-slate-600">
              <li><Link href="/" className="hover:text-blue-700 transition-colors">Home</Link></li>
              <li><Link href="/lost" className="hover:text-blue-700 transition-colors">Lost Items</Link></li>
              <li><Link href="/found" className="hover:text-blue-700 transition-colors">Found Items</Link></li>
              <li><Link href="/flash-news" className="hover:text-blue-700 transition-colors">Flash News</Link></li>
              <li><Link href="/dashboard" className="hover:text-blue-700 transition-colors">User Dashboard</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-900">Support</h3>
            <ul className="space-y-2 text-sm font-medium text-slate-600">
              <li><Link href="/faq" className="hover:text-blue-700 transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-blue-700 transition-colors">Contact Us</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-700 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-700 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Connect & Contact */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-900">Contact Us</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <p className="flex flex-col">
                <span className="text-[10px] uppercase text-gray-400 font-bold">Email</span>
                <span className="font-medium text-slate-800">support@traceback.com</span>
              </p>
              <p className="flex flex-col">
                <span className="text-[10px] uppercase text-gray-400 font-bold">Phone</span>
                <span className="font-medium text-slate-800">+880 1234 567890</span>
              </p>
              <div className="flex gap-4 pt-2">
                <Link href="#" className="text-blue-700 font-bold text-xs hover:underline">FB</Link>
                <Link href="#" className="text-blue-400 font-bold text-xs hover:underline">TW</Link>
                <Link href="#" className="text-pink-600 font-bold text-xs hover:underline">IG</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-xs text-slate-500 md:flex-row">
          <p>© {new Date().getFullYear()} TraceBack. All rights reserved.</p>
          <p className="font-medium">Made for the Community</p>
        </div>
      </div>
    </div>
  );
};

export default Footer;