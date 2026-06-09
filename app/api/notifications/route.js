import { ObjectId } from 'mongodb'
import clientPromise from '../../../lib/mongodb'

export async function GET(request) {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get('recipientId') || searchParams.get('userId') || ''

    const client = await clientPromise
    const db = client.db('trace-back')
    const filter = recipientId ? { recipientId } : {}
    const notifications = await db.collection('notifications').find(filter).sort({ createdAt: -1 }).limit(200).toArray()

    return new Response(JSON.stringify(notifications), { status: 200 })
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
      title: body.title || 'System alert',
      message: body.message || '',
      type: body.type || 'info',
      priority: body.priority || 'normal',
      audience: body.audience || 'all',
      reportId: body.reportId || '',
      threadId: body.threadId || '',
      userId: body.userId || '',
      recipientId: body.recipientId || '',
      actionUrl: body.actionUrl || '',
      isRead: Boolean(body.isRead),
      createdAt: now,
      updatedAt: now,
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    const res = await db.collection('notifications').insertOne(doc)

    return new Response(JSON.stringify({ ...doc, _id: res.insertedId }), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    const body = await request.json()
    const client = await clientPromise
    const db = client.db('trace-back')
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : body.id ? [body.id] : []

    if (ids.length === 0) {
      return new Response(JSON.stringify({ message: 'Notification id is required' }), { status: 400 })
    }

    await db.collection('notifications').updateMany(
      { _id: { $in: ids.map((value) => new ObjectId(value)) } },
      { $set: { isRead: true, updatedAt: new Date() } }
    )

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
