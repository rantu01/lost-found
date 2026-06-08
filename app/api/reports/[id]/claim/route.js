import { ObjectId } from 'mongodb'
import clientPromise from '../../../../../lib/mongodb'
import { getUrgencyLevel } from '../../../../../lib/finance'

export async function POST(request, { params }) {
  try {
    const body = await request.json()
    const userId = body.userId || ''
    const userName = body.userName || body.userEmail || 'A user'

    if (!userId) {
      return new Response(JSON.stringify({ message: 'User id is required' }), { status: 400 })
    }

    const client = await clientPromise
    if (!client) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    const db = client.db('trace-back')
    const { id } = await params
    const report = await db.collection('reports').findOne({ _id: new ObjectId(id) })

    if (!report) {
      return new Response(JSON.stringify({ message: 'Report not found' }), { status: 404 })
    }

    const isOwner = report.userId === userId
    const reportType = (report.type || 'LOST').toString().toUpperCase()
    const paymentStatus = (report.paymentStatus || 'unpaid').toString().toLowerCase()
    const now = new Date()

    if (isOwner) {
      return new Response(
        JSON.stringify({
          report,
          isOwner: true,
          shouldPay: paymentStatus !== 'paid',
          requestType: reportType === 'FOUND' ? 'claim' : 'handover',
        }),
        { status: 200 }
      )
    }

    const existingClaimer = report.claimedBy || ''
    const updates = {
      caseStatus: 'claimed',
      updatedAt: now,
    }

    if (!existingClaimer) {
      updates.claimedBy = userId
      updates.claimedByName = userName
      updates.claimedAt = now
    }

    await db.collection('reports').updateOne({ _id: new ObjectId(id) }, { $set: updates })
    const updatedReport = await db.collection('reports').findOne({ _id: new ObjectId(id) })

    if (reportType === 'LOST' && !existingClaimer) {
      await db.collection('notifications').insertOne({
        title: 'আপনার হারানো আইটেমটি কেউ খুঁজে পেয়েছে',
        message: `${userName} আপনার "${report.title}" আইটেমটি খুঁজে পেয়েছে। ক্লেইম করতে পেমেন্ট সম্পন্ন করুন, তারপর মেসেজ করতে পারবেন।`,
        type: 'handover',
        priority: getUrgencyLevel(report),
        reportId: id,
        threadId: id,
        userId,
        recipientId: report.userId || '',
        actionUrl: `/dashboard/requests/${id}`,
        isRead: false,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (reportType === 'FOUND' && !existingClaimer) {
      await db.collection('notifications').insertOne({
        title: 'কেউ আপনার পাওয়া আইটেমটি ক্লেইম করতে চায়',
        message: `${userName} "${report.title}" আইটেমটি ক্লেইম করতে চায়। তারা পেমেন্ট সম্পন্ন করলে চ্যাট শুরু হবে।`,
        type: 'claim',
        priority: getUrgencyLevel(report),
        reportId: id,
        threadId: id,
        userId,
        recipientId: report.userId || '',
        actionUrl: `/dashboard/requests/${id}`,
        isRead: false,
        createdAt: now,
        updatedAt: now,
      })
    }

    return new Response(
      JSON.stringify({
        report: updatedReport,
        isOwner: false,
        shouldPay: reportType === 'FOUND' && paymentStatus !== 'paid',
        requestType: reportType === 'FOUND' ? 'claim' : 'handover',
        autoCheckout: reportType === 'FOUND' && paymentStatus !== 'paid',
      }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
