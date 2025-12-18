import { NextResponse } from 'next/server';
import { createOneTimePayment } from '@/lib/payplus';

export const dynamic = 'force-dynamic';

/**
 * טסט חיבור בסיסי ל-PayPlus
 * GET /api/test-payplus
 * 
 * בודק:
 * - API Keys תקינים
 * - חיבור ל-Staging/Production
 * - יצירת לינק תשלום ₪1
 */
export async function GET() {
  try {
    console.log('🧪 Testing PayPlus connection...');
    
    // בדיקת הגדרות
    const config = {
      hasApiKey: !!process.env.PAYPLUS_API_KEY,
      hasSecretKey: !!process.env.PAYPLUS_SECRET_KEY,
      hasPageUid: !!process.env.PAYPLUS_PAYMENT_PAGE_UID,
      nodeEnv: process.env.NODE_ENV,
      useMock: process.env.PAYPLUS_USE_MOCK === 'true',
    };
    
    console.log('⚙️ Configuration:', config);
    
    if (!config.hasApiKey || !config.hasSecretKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing PayPlus API credentials',
        config,
      }, { status: 500 });
    }
    
    if (!config.hasPageUid && !config.useMock) {
      return NextResponse.json({
        success: false,
        error: 'Missing PAYPLUS_PAYMENT_PAGE_UID',
        hint: 'Get it from PayPlus Dashboard → Settings → Payment Pages',
        config,
      }, { status: 500 });
    }
    
    // יצירת תשלום טסט של ₪1
    console.log('💳 Creating test payment of ₪1...');
    
    const testPayment = await createOneTimePayment({
      sum: 1, // ₪1 בלבד!
      currency: 'ILS',
      description: 'בדיקת חיבור PayPlus - ₪1 בלבד',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '0501234567',
      items: [
        {
          name: 'טסט חיבור',
          quantity: 1,
          price: 1,
          description: 'בדיקת מערכת',
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`,
    });
    
    console.log('📥 PayPlus response:', testPayment);
    
    if (testPayment.status === '1' && testPayment.data?.pageUrl) {
      return NextResponse.json({
        success: true,
        message: '✅ PayPlus connection successful!',
        mode: config.useMock ? '🧪 Mock Mode' : (config.nodeEnv === 'development' ? '🧪 Staging' : '🚀 Production'),
        paymentLink: testPayment.data.pageUrl,
        transactionId: testPayment.data.transactionId,
        config,
        instructions: {
          he: 'לחץ על paymentLink כדי לראות את דף התשלום של PayPlus',
          en: 'Click on paymentLink to see PayPlus payment page',
          testCards: {
            success: '5326-1402-8077-9844 (תוקף: 05/26, CVV: 000)',
            rejected: '5326-1402-0001-0120 (תוקף: 05/26, CVV: 000)',
          },
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create payment',
        details: testPayment,
        config,
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ PayPlus test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}
