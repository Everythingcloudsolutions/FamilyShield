import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/', '/alerts', '/devices']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function isAuthEnabled(): boolean {
  const explicit = process.env.PORTAL_BASIC_AUTH_ENABLED
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return process.env.NODE_ENV === 'production'
}

function unauthorizedResponse(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="FamilyShield Portal"',
    },
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  if (!isAuthEnabled()) {
    return NextResponse.next()
  }

  const expectedUser = process.env.PORTAL_BASIC_AUTH_USERNAME
  const expectedPass = process.env.PORTAL_BASIC_AUTH_PASSWORD

  if (!expectedUser || !expectedPass) {
    return new NextResponse('Portal auth is enabled but credentials are not configured', {
      status: 503,
    })
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return unauthorizedResponse()
  }

  try {
    const base64Credentials = authHeader.split(' ')[1]
    const decoded = atob(base64Credentials)
    const separatorIndex = decoded.indexOf(':')
    const user = decoded.slice(0, separatorIndex)
    const pass = decoded.slice(separatorIndex + 1)

    if (user !== expectedUser || pass !== expectedPass) {
      return unauthorizedResponse()
    }
  } catch {
    return unauthorizedResponse()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
