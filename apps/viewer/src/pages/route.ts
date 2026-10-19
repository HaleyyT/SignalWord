export type PublicPage = 'home' | 'event' | 'confirm' | 'enrollment' | 'privacy' | 'support' | 'unavailable'

export function pageForPath(pathname: string): PublicPage {
  if (pathname === '/') return 'home'
  if (pathname === '/privacy') return 'privacy'
  if (pathname === '/support') return 'support'
  if (/^\/join\/[A-Za-z0-9_-]{43}$/.test(pathname) || /^\/manage-contact\/[a-f0-9]{64}$/.test(pathname)) return 'enrollment'
  if (pathname.startsWith('/confirm/')) return 'confirm'
  if (pathname.startsWith('/events/')) return 'event'
  return 'unavailable'
}
