import clientPromise from '../../../../lib/mongodb'
import { getReportLifecycle, getUrgencyLevel } from '../../../../lib/finance'

export async function GET() {
  try {
    if (!clientPromise) {
      return new Response(
        JSON.stringify({
          counts: {
            activePosts: 0,
            pendingApprovals: 0,
            resolvedCases: 0,
            claimedItems: 0,
            totalUsers: 0,
            totalTransactions: 0,
          },
          categoryCounts: [],
          recentActivities: [],
          urgentReports: [],
        }),
        { status: 200 }
      )
    }

    const client = await clientPromise
    const db = client.db('trace-back')
    const [reports, users, transactions, notifications] = await Promise.all([
      db.collection('reports').find({}).sort({ createdAt: -1 }).limit(400).toArray(),
      db.collection('users').find({}).sort({ lastSeen: -1, createdAt: -1 }).toArray(),
      db.collection('transactions').find({}).sort({ createdAt: -1 }).limit(200).toArray(),
      db.collection('notifications').find({}).sort({ createdAt: -1 }).limit(200).toArray(),
    ])

    const approvedReports = reports.filter((report) => (report?.reviewStatus || 'approved').toString().toLowerCase() === 'approved')
    const pendingReports = reports.filter((report) => (report?.reviewStatus || 'pending').toString().toLowerCase() === 'pending')
    const resolvedReports = reports.filter((report) => getReportLifecycle(report) === 'resolved')
    const claimedReports = reports.filter((report) => getReportLifecycle(report) === 'claimed')

    const categoryMap = reports.reduce((accumulator, report) => {
      const category = report?.category || 'Uncategorized'
      accumulator[category] = (accumulator[category] || 0) + 1
      return accumulator
    }, {})

    const categoryCounts = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => right.count - left.count)

    const urgentReports = reports
      .filter((report) => getUrgencyLevel(report) === 'high')
      .slice(0, 8)

    const recentActivities = [
      ...transactions.slice(0, 5).map((transaction) => ({
        label: transaction.paymentFlow === 'claim' ? 'Claim payment' : 'Reward payment',
        title: transaction.title || 'Recovered item payment',
        time: transaction.createdAt,
        tone: transaction.paymentStatus === 'paid' ? 'success' : 'warning',
      })),
      ...notifications.slice(0, 5).map((notification) => ({
        label: notification.type || 'notification',
        title: notification.title || notification.message || 'New alert',
        time: notification.createdAt,
        tone: notification.isRead ? 'neutral' : 'info',
      })),
    ]
      .sort((left, right) => new Date(right.time || 0) - new Date(left.time || 0))
      .slice(0, 10)

    return new Response(
      JSON.stringify({
        counts: {
          activePosts: approvedReports.length,
          pendingApprovals: pendingReports.length,
          resolvedCases: resolvedReports.length,
          claimedItems: claimedReports.length,
          totalUsers: users.length,
          totalTransactions: transactions.length,
        },
        categoryCounts,
        recentActivities,
        urgentReports,
      }),
      { status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), { status: 500 })
  }
}
