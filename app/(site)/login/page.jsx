import LoginClient from './LoginClient'

export default function LoginPage({ searchParams }) {
  const nextPath = typeof searchParams?.next === 'string' && searchParams.next.length > 0 ? searchParams.next : '/'
  return <LoginClient nextPath={nextPath} />
}