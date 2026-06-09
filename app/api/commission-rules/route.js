import clientPromise from '../../../lib/mongodb'
import { ADMIN_EMAIL, isAdminEmail } from '../../../lib/access'
import { DEFAULT_COMMISSION_RULES } from '../../../lib/finance'

function normalizeRule(rule) {
  return {
    category: rule?.category || 'Default',
    mode: rule?.mode === 'fixed' ? 'fixed' : 'percentage',
    value: Number.isFinite(Number(rule?.value)) ? Number(rule.value) : 0,
    active: rule?.active !== false,
    note: rule?.note || '',
    updatedAt: new Date(),
  }
}

export async function GET() {
  try {
    if (!clientPromise) {
      return new Response(JSON.stringify({ rules: DEFAULT_COMMISSION_RULES }), { status: 200 })
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    const rules = await db.collection('commission-rules').find({}).sort({ updatedAt: -1, category: 1 }).toArray()

    return new Response(
      JSON.stringify({
        rules: rules.length > 0 ? rules : DEFAULT_COMMISSION_RULES,
      }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const adminEmail = (body?.adminEmail || '').toLowerCase()

    if (!isAdminEmail(adminEmail)) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 403 })
    }

    if (!clientPromise) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    const rule = normalizeRule(body)

    await db.collection('commission-rules').updateOne(
      { category: rule.category },
      { $set: rule, $setOnInsert: { createdAt: new Date(), updatedBy: ADMIN_EMAIL } },
      { upsert: true }
    )

    return new Response(JSON.stringify(rule), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const adminEmail = (searchParams.get('adminEmail') || '').toLowerCase()

    if (!isAdminEmail(adminEmail)) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 403 })
    }

    if (!clientPromise) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    if (!category) {
      return new Response(JSON.stringify({ message: 'Category is required' }), { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    await db.collection('commission-rules').deleteOne({ category })

    return new Response(JSON.stringify({ success: true, category }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
