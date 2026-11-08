const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function confirmationTokenFromPath(pathname: string, hash = ''): string | null {
  const fragment = new URLSearchParams(hash.replace(/^#/, '')).get('token')
  if (pathname === '/confirm' && fragment && /^[A-Za-z0-9_-]{43}$/.test(fragment)) return fragment
  const match = pathname.match(/^\/confirm\/([^/]+)$/)
  if (!match) return null
  const token = decodeURIComponent(match[1])
  return TOKEN_PATTERN.test(token) ? token : null
}

export async function confirmTrustedContact(token: string, signal?: AbortSignal): Promise<'confirmed' | 'unavailable' | 'temporary'> {
  if (!TOKEN_PATTERN.test(token)) return 'unavailable'
  try {
    const response = await fetch(`/api/private-links`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type':'application/json' },
      body: JSON.stringify({kind:'confirmation',token,action:'confirm'}),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal,
    })
    if (response.status === 404 || response.status === 410) return 'unavailable'
    if (!response.ok) return 'temporary'
    const value: unknown = await response.json()
    return value !== null && typeof value === 'object' && (value as { confirmed?: unknown }).confirmed === true
      ? 'confirmed' : 'temporary'
  } catch {
    return 'temporary'
  }
}

export async function withdrawTrustedContact(token: string): Promise<'withdrawn' | 'unavailable' | 'temporary'> {
  if (!TOKEN_PATTERN.test(token)) return 'unavailable'
  try {
    const response = await fetch(`/api/private-links`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type':'application/json' },
      body: JSON.stringify({kind:'confirmation',token,action:'withdraw'}),
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
    })
    if (response.status === 404 || response.status === 410) return 'unavailable'
    if (!response.ok) return 'temporary'
    const value: unknown = await response.json()
    return value !== null && typeof value === 'object' && (value as { withdrawn?: unknown }).withdrawn === true
      ? 'withdrawn' : 'temporary'
  } catch { return 'temporary' }
}
