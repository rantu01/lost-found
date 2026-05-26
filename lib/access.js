export const ADMIN_EMAIL = 'admin@admin.com'

export function isAdminEmail(email) {
  return (email || '').toLowerCase() === ADMIN_EMAIL
}
