import clientPromise from '../../../../lib/mongodb'
import { ObjectId } from 'mongodb'
import { ADMIN_EMAIL } from '../../../../lib/access'

function canAdminOverride(body) {
  return (body?.adminEmail || '').toLowerCase() === ADMIN_EMAIL
}

export async function GET(request, { params }) {
  try {
    const client = await clientPromise
    const db = client.db('trace-back')
    const { id } = await params
    const item = await db.collection('reports').findOne({ _id: new ObjectId(id) })
    if (!item) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 })
    return new Response(JSON.stringify(item), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db('trace-back')
    const { id } = await params
    const oid = new ObjectId(id)
    const { userId, ...updates } = body
    const existing = await db.collection('reports').findOne({ _id: oid })
    if (!existing) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 })
    const adminOverride = canAdminOverride(body)
    if (!adminOverride && existing.userId !== userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 403 })

    const allowedUpdates = adminOverride
      ? {
          reviewStatus: updates.reviewStatus,
          caseStatus: updates.caseStatus,
          paymentStatus: updates.paymentStatus,
          reviewedAt: updates.reviewStatus ? new Date() : existing.reviewedAt,
          reviewedBy: body.adminEmail,
          adminNote: updates.adminNote || '',
          resolvedAt: updates.caseStatus === 'resolved' ? (updates.resolvedAt || new Date()) : existing.resolvedAt,
          foundAt: updates.caseStatus === 'resolved' ? (updates.foundAt || existing.foundAt || updates.resolvedAt || new Date()) : existing.foundAt,
          updatedAt: new Date(),
        }
      : updates

    await db.collection('reports').updateOne({ _id: oid }, { $set: { ...allowedUpdates, updatedAt: new Date() } })
    const updated = await db.collection('reports').findOne({ _id: oid })
    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db('trace-back')
    const { id } = await params
    const oid = new ObjectId(id)
    const existing = await db.collection('reports').findOne({ _id: oid })
    if (!existing) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 })
    const adminOverride = canAdminOverride(body)
    if (!adminOverride && existing.userId !== body.userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 403 })
    await db.collection('reports').deleteOne({ _id: oid })
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), { status: 500 })
  }
}
