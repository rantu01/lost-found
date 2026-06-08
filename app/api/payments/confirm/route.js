import Stripe from 'stripe'
import { ObjectId } from 'mongodb'
import clientPromise from '../../../../lib/mongodb'

export async function POST(request) {
  try {
    const body = await request.json()
    const transactionId = body.transactionId || ''
    const sessionId = body.sessionId || ''
    const reportId = body.reportId || ''

    if (!transactionId && !sessionId) {
      return new Response(JSON.stringify({ message: 'Transaction or session id is required' }), { status: 400 })
    }

    const client = await clientPromise
    if (!client) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    const db = client.db('trace-back')
    const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()

    let transaction = null
    if (transactionId) {
      transaction = await db.collection('transactions').findOne({ _id: new ObjectId(transactionId) })
    }
    if (!transaction && sessionId) {
      transaction = await db.collection('transactions').findOne({ stripeSessionId: sessionId })
    }

    if (!transaction) {
      return new Response(JSON.stringify({ message: 'Transaction not found' }), { status: 404 })
    }

    if (transaction.paymentStatus === 'paid') {
      return new Response(JSON.stringify({ success: true, alreadyPaid: true, transaction }), { status: 200 })
    }

    if (secretKey && sessionId) {
      const stripe = new Stripe(secretKey)
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.payment_status !== 'paid') {
        return new Response(JSON.stringify({ message: 'Payment not completed yet' }), { status: 400 })
      }
    }

    const now = new Date()
    await db.collection('transactions').updateOne(
      { _id: transaction._id },
      { $set: { paymentStatus: 'paid', paidAt: now, updatedAt: now } }
    )

    const resolvedReportId = reportId || transaction.reportId
    if (resolvedReportId) {
      try {
        await db.collection('reports').updateOne(
          { _id: new ObjectId(resolvedReportId) },
          { $set: { paymentStatus: 'paid', caseStatus: 'claimed', updatedAt: now } }
        )
      } catch {
        // report id may not be a valid ObjectId
      }
    }

    const updated = await db.collection('transactions').findOne({ _id: transaction._id })

    return new Response(JSON.stringify({ success: true, transaction: updated }), { status: 200 })
  } catch (error) {
    console.error('Payment confirm error:', error.message)
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
