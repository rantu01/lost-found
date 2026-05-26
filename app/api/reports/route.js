import clientPromise from '../../../lib/mongodb'
import { calculatePaymentBreakdown, getUrgencyLevel } from '../../../lib/finance'

export async function GET(request) {
  try {
    if (!clientPromise) {
      // DB not configured - return empty array so front-end can handle gracefully
      return new Response(JSON.stringify([]), { status: 200 })
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    const reports = await db.collection('reports').find({}).sort({ createdAt: -1 }).toArray()
    return new Response(JSON.stringify(reports), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500 })
  }
}

export async function POST(request) {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    const body = await request.json()
    const client = await clientPromise
    const db = client.db('trace-back')
    const now = new Date()
    const breakdown = calculatePaymentBreakdown({
      category: body.category,
      rewardAmount: body.rewardAmount,
      commissionMode: body.commissionMode,
      commissionValue: body.commissionValue,
      currency: body.currency || 'USD',
    })
    const doc = {
      ...body,
      createdAt: now,
      updatedAt: now,
      lostAt: body.lostAt || body.date || now,
      reviewStatus: body.reviewStatus || 'pending',
      caseStatus: body.caseStatus || 'open',
      paymentStatus: body.paymentStatus || 'unpaid',
      commissionMode: breakdown.commissionMode,
      commissionValue: breakdown.commissionValue,
      rewardAmount: breakdown.rewardAmount,
      commissionAmount: breakdown.commissionAmount,
      finalPayableAmount: breakdown.totalAmount,
      urgencyLevel: getUrgencyLevel(body),
    }
    const res = await db.collection('reports').insertOne(doc)
    return new Response(JSON.stringify({ ...doc, _id: res.insertedId }), { status: 201 })
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500 })
  }
}
