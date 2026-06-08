"use client"

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import auth from '../../../lib/firebase'
import { isAdminEmail } from '../../../lib/access'

export default function AdminPostedBy({ reporterName, userEmail, contactVisible }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && isAdminEmail(currentUser.email)) {
        setIsAdmin(true)
      }
    })
    return () => unsubscribe()
  }, [])

  if (contactVisible || isAdmin) {
    return <span className="font-semibold text-slate-950">{reporterName || userEmail || 'Anonymous'}</span>
  }

  return <span className="font-semibold text-slate-950">Hidden until payment</span>
}
