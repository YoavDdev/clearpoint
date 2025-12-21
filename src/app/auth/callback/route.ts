import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  console.log('🔐 Auth callback called:', { token_hash: !!token_hash, type, next })

  if (token_hash && type) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      // אימות הטוקן מהמייל (תומך ב-invite, recovery, signup)
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (error) {
        console.error('❌ Failed to verify OTP:', error)
        return NextResponse.redirect(new URL('/login?error=קישור_לא_תקין', requestUrl.origin))
      }

      console.log('✅ Token verified successfully, user:', data.user?.email)

      // אם זה invite או recovery - צריך להגדיר סיסמה
      if (type === 'invite' || type === 'recovery') {
        console.log('➡️ Redirecting to setup-password')
        return NextResponse.redirect(new URL('/setup-password', requestUrl.origin))
      }

      // אחרת - ללוח הבקרה או ל-next
      console.log('➡️ Redirecting to:', next)
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } catch (error) {
      console.error('❌ Error in auth callback:', error)
      return NextResponse.redirect(new URL('/login?error=שגיאה_באימות', requestUrl.origin))
    }
  }

  // אם אין טוקן - חזרה ללוגין
  console.warn('⚠️ No token_hash found in callback')
  return NextResponse.redirect(new URL('/login?error=חסר_טוקן', requestUrl.origin))
}
