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
    const reportId = body.reportId || ''
    const transaction = await db.collection('transactions').insertOne({
      reportId,
      threadId: body.threadId || reportId,
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

    const transactionId = transaction.insertedId.toString()
    const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()

    if (!secretKey) {
      return new Response(
        JSON.stringify({
          checkoutUrl: `${getOrigin(request)}/dashboard/requests/${reportId || transactionId}?payment=ready&transaction=${transactionId}`,
          transactionId,
          breakdown,
          message: 'Stripe is not configured yet. Placeholder checkout returned.',
        }),
        { status: 200 }
      )
    }

    const placeholderUrl = `${getOrigin(request)}/dashboard/requests/${reportId || transactionId}?payment=ready&transaction=${transactionId}`

    try {
      const stripe = new Stripe(secretKey)
      const unitAmount = Math.max(50, Math.round(breakdown.totalAmount * 100))

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${getOrigin(request)}/dashboard/requests/${reportId || transactionId}?payment=success&transaction=${transactionId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getOrigin(request)}/dashboard/requests/${reportId || transactionId}?payment=cancelled&transaction=${transactionId}`,
        line_items: [
          {
            price_data: {
              currency: (breakdown.currency || 'USD').toLowerCase(),
              product_data: {
                name: body.title || 'Recovery payment',
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          reportId,
          threadId: body.threadId || reportId,
          paymentFlow: body.paymentFlow || 'claim',
          transactionId,
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
          transactionId,
          breakdown,
        }),
        { status: 200 }
      )
    } catch (stripeError) {
      console.error('Stripe checkout failed, using placeholder:', stripeError.message)
      await db.collection('transactions').updateOne(
        { _id: transaction.insertedId },
        { $set: { checkoutUrl: placeholderUrl, paymentStatus: 'checkout_created', failureReason: stripeError.message, updatedAt: new Date() } }
      )

      return new Response(
        JSON.stringify({
          checkoutUrl: placeholderUrl,
          transactionId,
          breakdown,
          message: 'Stripe unavailable. Dev placeholder checkout returned.',
        }),
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Checkout error:', error.message)
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
