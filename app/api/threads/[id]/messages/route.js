import clientPromise from '../../../../../lib/mongodb'

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
