import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/setup-password'

  if (token_hash && type) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      // אימות הטוקן מהמייל
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (error) {
        console.error('❌ Failed to verify OTP:', error)
        return NextResponse.redirect(new URL('/login?error=invalid_link', requestUrl.origin))
      }

      console.log('✅ Magic link verified, redirecting to:', next)
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } catch (error) {
      console.error('❌ Error in auth callback:', error)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }
  }

  // אם אין טוקן - חזרה ללוגין
  return NextResponse.redirect(new URL('/login?error=missing_token', requestUrl.origin))
}
