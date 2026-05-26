import clientPromise from '../../../lib/mongodb'

export async function GET(request) {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId') || ''
    const userId = searchParams.get('userId') || ''

    const filter = {}
    if (reportId) filter.reportId = reportId
    if (userId) filter.$or = [{ payerId: userId }, { receiverId: userId }, { userId }]

    const client = await clientPromise
    const db = client.db('trace-back')
    const transactions = await db.collection('transactions').find(filter).sort({ createdAt: -1 }).toArray()

    return new Response(JSON.stringify(transactions), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}

export async function POST(request) {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    const body = await request.json()
    const now = new Date()
    const doc = {
      reportId: body.reportId || '',
      threadId: body.threadId || '',
      payerId: body.payerId || '',
      receiverId: body.receiverId || '',
      userId: body.userId || '',
      paymentFlow: body.paymentFlow || 'claim',
      title: body.title || 'Recovered item payment',
      currency: body.currency || 'USD',
      rewardAmount: Number(body.rewardAmount || 0),
      commissionAmount: Number(body.commissionAmount || 0),
      totalAmount: Number(body.totalAmount || 0),
      paymentStatus: body.paymentStatus || 'pending',
      checkoutUrl: body.checkoutUrl || '',
      stripeSessionId: body.stripeSessionId || '',
      failureReason: body.failureReason || '',
      metadata: body.metadata || {},
      createdAt: now,
      updatedAt: now,
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    const res = await db.collection('transactions').insertOne(doc)

    return new Response(JSON.stringify({ ...doc, _id: res.insertedId }), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
