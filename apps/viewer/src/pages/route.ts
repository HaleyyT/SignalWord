export type PublicPage = 'event' | 'privacy' | 'support' | 'unavailable'

export function pageForPath(pathname: string): PublicPage {
  if (pathname === '/privacy') return 'privacy'
  if (pathname === '/support') return 'support'
  if (pathname.startsWith('/events/')) return 'event'
  return 'unavailable'
}
