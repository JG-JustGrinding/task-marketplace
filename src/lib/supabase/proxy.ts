import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data, error } = await supabase.auth.getClaims()

  if (error) {
    const message = error.message || ''
    const code = (error as any).code || ''

    // In some race conditions (multiple concurrent refreshes), Supabase can
    // return a "refresh token already used" error even though the browser
    // still has a valid session. In that case, avoid forcing a logout-style
    // redirect here and just let the request continue.
    if (message.includes('refresh token already used')) {
      return supabaseResponse
    }

    // If the refresh token is missing/invalid on the server, the browser still
    // has stale auth cookies. Clear them and force a fresh login so we don't
    // keep hammering Supabase with bad tokens.
    if (
      code === 'refresh_token_not_found' ||
      message.toLowerCase().includes('refresh token not found')
    ) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'

      const response = NextResponse.redirect(redirectUrl)
      // Best-effort: clear Supabase auth cookies so the next request starts clean.
      const existingCookies = request.cookies.getAll()
      for (const cookie of existingCookies) {
        if (cookie.name.toLowerCase().includes('supabase')) {
          response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
        }
      }

      return response
    }
  }

  const user = data?.claims

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}