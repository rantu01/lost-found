import Stripe from 'stripe'
import clientPromise from '../../../../lib/mongodb'
import { calculatePaymentBreakdown } from '../../../../lib/finance'

function getOrigin(request) {
  return process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'
}

export async function POST(request) {
  try {
    const body = await request.json()
    const breakdown = calculatePaymentBreakdown({
      category: body.category,
      rewardAmount: body.rewardAmount,
      commissionMode: body.commissionMode,
      commissionValue: body.commissionValue,
      currency: body.currency || 'USD',
    })

    const client = await clientPromise
    if (!client) {
      return new Response(JSON.stringify({ message: 'Database not configured' }), { status: 503 })
    }

    const db = client.db('trace-back')
    const transaction = await db.collection('transactions').insertOne({
      reportId: body.reportId || '',
      threadId: body.threadId || '',
      paymentFlow: body.paymentFlow || 'claim',
      title: body.title || 'Recovered item payment',
      payerId: body.payerId || '',
      receiverId: body.receiverId || '',
      userId: body.userId || '',
      currency: breakdown.currency,
      rewardAmount: breakdown.rewardAmount,
      commissionAmount: breakdown.commissionAmount,
      totalAmount: breakdown.totalAmount,
      commissionMode: breakdown.commissionMode,
      commissionValue: breakdown.commissionValue,
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return new Response(
        JSON.stringify({
          checkoutUrl: `${getOrigin(request)}/dashboard/requests/${body.reportId || transaction.insertedId.toString()}?payment=ready`,
          transactionId: transaction.insertedId,
          breakdown,
          message: 'Stripe is not configured yet. Placeholder checkout returned.',
        }),
        { status: 200 }
      )
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2025-03-31.basil' })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${getOrigin(request)}/dashboard/requests/${body.reportId || transaction.insertedId.toString()}?payment=success&transaction=${transaction.insertedId}`,
      cancel_url: `${getOrigin(request)}/dashboard/requests/${body.reportId || transaction.insertedId.toString()}?payment=cancelled&transaction=${transaction.insertedId}`,
      line_items: [
        {
          price_data: {
            currency: (breakdown.currency || 'USD').toLowerCase(),
            product_data: {
              name: body.title || 'Recovery payment',
            },
            unit_amount: Math.round(breakdown.totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        reportId: body.reportId || '',
        threadId: body.threadId || '',
        paymentFlow: body.paymentFlow || 'claim',
        rewardAmount: String(breakdown.rewardAmount),
        commissionAmount: String(breakdown.commissionAmount),
      },
    })

    await db.collection('transactions').updateOne(
      { _id: transaction.insertedId },
      { $set: { stripeSessionId: session.id, checkoutUrl: session.url || '', paymentStatus: 'checkout_created', updatedAt: new Date() } }
    )

    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
        transactionId: transaction.insertedId,
        breakdown,
      }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
