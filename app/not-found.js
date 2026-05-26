"use client"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NotFound() {
	const router = useRouter()

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
			<div className="max-w-xl text-center">
				<div className="text-8xl font-extrabold text-gray-300">404</div>
				<h1 className="mt-6 text-2xl font-bold text-gray-900">Page not found</h1>
				<p className="mt-2 text-gray-600">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
				<p className="mt-2 text-gray-500">পৃষ্ঠাটি পাওয়া যায়নি</p>

				<div className="mt-6 flex justify-center gap-3">
					<Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">হোমে ফিরে যান</Link>
					<button onClick={() => router.back()} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100">পূর্বের পেজ</button>
				</div>

				<div className="mt-8 text-sm text-gray-400">If you think this is an error, try refreshing or contact the site administrator.</div>
			</div>
		</div>
	)
}

