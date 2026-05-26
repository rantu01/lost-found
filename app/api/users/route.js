import clientPromise from '../../../lib/mongodb'

export async function GET() {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify([]), { status: 200 })
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    const users = await db.collection('users').find({}).sort({ lastSeen: -1, createdAt: -1 }).toArray()
    return new Response(JSON.stringify(users), { status: 200 })
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
    const email = (body.email || '').toLowerCase()

    if (!email) {
      return new Response(JSON.stringify({ message: 'Email is required' }), { status: 400 })
    }

    const existing = await db.collection('users').findOne({ email })
    const createdAt = existing?.createdAt || now
    const doc = {
      uid: body.uid || existing?.uid || email,
      email,
      displayName: body.displayName || existing?.displayName || email.split('@')[0],
      photoURL: body.photoURL || existing?.photoURL || '',
      role: body.role || existing?.role || 'user',
      lastSeen: now,
    }

    await db.collection('users').updateOne(
      { email },
      { $set: doc, $setOnInsert: { createdAt } },
      { upsert: true }
    )

    return new Response(JSON.stringify({ ...doc, createdAt }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500 })
  }
}
