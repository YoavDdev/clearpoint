import { NextRequest, NextResponse } from 'next/server';
import { hasActiveSubscription, getSubscriptionDetails } from '@/lib/subscription-check';

export const dynamic = 'force-dynamic';

/**
 * בדיקת סטטוס מנוי
 * GET /api/subscription/check?userId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    const isActive = await hasActiveSubscription(userId);
    const details = await getSubscriptionDetails(userId);

    return NextResponse.json({
      success: true,
      isActive,
      subscription: details,
      message: isActive 
        ? 'המנוי פעיל - כל התכונות זמינות'
        : 'אין מנוי פעיל - תכונות מושבתות'
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
