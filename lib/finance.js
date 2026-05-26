export const DEFAULT_COMMISSION_RULES = [
  { category: 'Electronics', mode: 'percentage', value: 10 },
  { category: 'Wallet / Bank Card', mode: 'percentage', value: 8 },
  { category: 'Documents', mode: 'percentage', value: 6 },
  { category: 'Small Accessories', mode: 'percentage', value: 3 },
  { category: 'Jewelry', mode: 'percentage', value: 12 },
  { category: 'Money Bag', mode: 'percentage', value: 10 },
  { category: 'Default', mode: 'percentage', value: 7 },
]

export const URGENT_CATEGORIES = [
  'Money Bag',
  'Wallet',
  'Wallet / Bank Card',
  'Bank Card',
  'Passport',
  'Driving License',
  'National ID Card',
  'Mobile Phone',
  'Laptop',
  'Important Documents',
  'Jewelry',
  'Car Keys',
  'Office ID Cards',
  'Medical Documents',
  'ATM Cards',
]

export function normalizeCategory(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function toNumber(value, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

export function formatMoney(amount, currency = 'USD') {
  const safeAmount = toNumber(amount, 0)
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(safeAmount)
  } catch {
    return `$${safeAmount.toFixed(2)}`
  }
}

export function getCommissionRule(category, rules = DEFAULT_COMMISSION_RULES) {
  const normalizedCategory = normalizeCategory(category)
  const normalizedRules = Array.isArray(rules) && rules.length > 0 ? rules : DEFAULT_COMMISSION_RULES

  return (
    normalizedRules.find((rule) => normalizeCategory(rule.category) === normalizedCategory) ||
    normalizedRules.find((rule) => normalizeCategory(rule.category) === 'default') ||
    DEFAULT_COMMISSION_RULES[DEFAULT_COMMISSION_RULES.length - 1]
  )
}

export function calculatePaymentBreakdown({
  category,
  rewardAmount,
  commissionRules = DEFAULT_COMMISSION_RULES,
  commissionMode,
  commissionValue,
  currency = 'USD',
}) {
  const rule = getCommissionRule(category, commissionRules)
  const reward = Math.max(0, toNumber(rewardAmount, 0))
  const mode = commissionMode || rule.mode || 'percentage'
  const value = commissionValue ?? rule.value ?? 0

  const commissionAmount = mode === 'fixed'
    ? Math.max(0, toNumber(value, 0))
    : Math.max(0, (reward * toNumber(value, 0)) / 100)

  const totalAmount = Math.max(0, reward + commissionAmount)

  return {
    rewardAmount: reward,
    commissionAmount,
    totalAmount,
    commissionMode: mode,
    commissionValue: toNumber(value, 0),
    categoryRule: rule,
    currency,
  }
}

export function getUrgencyLevel(report) {
  const category = normalizeCategory(report?.category)
  const title = normalizeCategory(report?.title)
  const isUrgentCategory = URGENT_CATEGORIES.some((item) => normalizeCategory(item) === category)
  const titleSignals = ['passport', 'license', 'id card', 'wallet', 'phone', 'laptop', 'documents', 'jewelry']
  const hasUrgentTitle = titleSignals.some((signal) => title.includes(signal))

  if (isUrgentCategory || hasUrgentTitle) return 'high'
  if ((report?.type || '').toString().toUpperCase() === 'FOUND') return 'medium'
  return 'normal'
}

export function getReportLifecycle(report) {
  const reviewStatus = (report?.reviewStatus || 'pending').toString().toLowerCase()
  const caseStatus = (report?.caseStatus || 'open').toString().toLowerCase()
  const paymentStatus = (report?.paymentStatus || 'unpaid').toString().toLowerCase()

  if (caseStatus === 'resolved' || paymentStatus === 'paid') {
    return 'resolved'
  }

  if (caseStatus === 'claimed' || caseStatus === 'handover') {
    return 'claimed'
  }

  if (reviewStatus === 'approved') {
    return 'approved'
  }

  return reviewStatus || 'pending'
}
