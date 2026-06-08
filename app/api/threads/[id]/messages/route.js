import { ObjectId } from 'mongodb'
import clientPromise from '../../../../../lib/mongodb'

async function isChatUnlocked(db, threadId) {
  try {
    const report = await db.collection('reports').findOne({ _id: new ObjectId(threadId) })
    return (report?.paymentStatus || '').toString().toLowerCase() === 'paid'
  } catch {
    return false
  }
}

export async function GET(request, { params }) {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    const { id } = await params
    const messages = await db.collection('thread-messages').find({ threadId: id }).sort({ createdAt: 1 }).toArray()

    return new Response(JSON.stringify(messages), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    const body = await request.json()
    const client = await clientPromise
    const db = client.db('trace-back')
    const { id } = await params

    const chatUnlocked = await isChatUnlocked(db, id)
    if (!chatUnlocked) {
      return new Response(JSON.stringify({ message: 'Payment required before sending messages' }), { status: 403 })
    }
    const doc = {
      threadId: id,
      senderId: body.senderId || '',
      senderName: body.senderName || 'Anonymous',
      message: body.message || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const res = await db.collection('thread-messages').insertOne(doc)

    return new Response(JSON.stringify({ ...doc, _id: res.insertedId }), { status: 201 })
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
