import clientPromise from '../../../../lib/mongodb'
import { getReportLifecycle, getUrgencyLevel } from '../../../../lib/finance'
import { URL } from 'url'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

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
          my: {},
          categoryCounts: [],
          recentActivities: [],
          urgentReports: [],
        }),
        { status: 200 }
      )
    }

    const client = await clientPromise
    const db = client.db('trace-back')

    const reportFilter = userId ? { userId } : {}
    const notificationFilter = userId ? { recipientId: userId } : {}
    const transactionFilter = userId ? { userId } : {}

    const [reports, users, transactions, notifications, userNotifications, userTransactions] = await Promise.all([
      db.collection('reports').find({}).sort({ createdAt: -1 }).limit(400).toArray(),
      db.collection('users').find({}).sort({ lastSeen: -1, createdAt: -1 }).toArray(),
      db.collection('transactions').find({}).sort({ createdAt: -1 }).limit(200).toArray(),
      db.collection('notifications').find({}).sort({ createdAt: -1 }).limit(200).toArray(),
      userId ? db.collection('notifications').find(notificationFilter).sort({ createdAt: -1 }).toArray() : Promise.resolve([]),
      userId ? db.collection('transactions').find(transactionFilter).sort({ createdAt: -1 }).toArray() : Promise.resolve([]),
    ])

    const userReports = userId ? reports.filter((report) => report.userId === userId) : []

    const getStatus = (report) => (report?.reviewStatus || 'pending').toString().toLowerCase()

    const approvedReports = reports.filter((report) => getStatus(report) === 'approved')
    const pendingReports = reports.filter((report) => getStatus(report) === 'pending')
    const resolvedReports = reports.filter((report) => getReportLifecycle(report) === 'resolved')
    const claimedReports = reports.filter((report) => getReportLifecycle(report) === 'claimed')

    const myApproved = userReports.filter((report) => getStatus(report) === 'approved')
    const myPending = userReports.filter((report) => getStatus(report) === 'pending')
    const myResolved = userReports.filter((report) => getReportLifecycle(report) === 'resolved')
    const myClaimed = userReports.filter((report) => getReportLifecycle(report) === 'claimed')
    const myClaims = reports.filter((report) => report.claimedBy && report.claimedBy === userId)

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
        my: {
          reports: userReports.length,
          pending: myPending.length,
          approved: myApproved.length,
          resolved: myResolved.length,
          claimed: myClaimed.length,
          claims: myClaims.length,
          notifications: userNotifications.length,
          unreadNotifications: userNotifications.filter((n) => !n.isRead).length,
          transactions: userTransactions.length,
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
