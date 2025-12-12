import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock PayPlus API - Transactions/CreateRecurring
 * מדמה את endpoint האמיתי של PayPlus למנויים חוזרים
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('🧪 [MOCK PAYPLUS] Transactions/CreateRecurring called');
    console.log('📦 Amount:', body.amount);
    console.log('📦 Billing cycle:', body.billing_cycle);
    console.log('📦 Customer:', body.customer?.customer_name);

    // יצירת מזהים מזויפים
    const mockRecurringId = `rec-${Date.now()}`;
    const mockTransactionId = `txn-rec-${Date.now()}`;
    const mockProcessId = `proc-rec-${Date.now()}`;
    const mockPageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mock-payplus/payment-page?id=${mockRecurringId}&type=recurring`;

    // Mock response בפורמט המדויק של PayPlus
    const mockResponse = {
      results: {
        status: "success",
        code: "0",
        description: "Success"
      },
      data: {
        recurring_uid: mockRecurringId,
        payment_page_link: mockPageUrl,
        transaction_uid: mockTransactionId,
        process_token: mockProcessId,
        // שדות נוספים
        next_billing_date: body.start_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "active",
      }
    };

    console.log('✅ [MOCK PAYPLUS] Recurring subscription created:', mockRecurringId);

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ [MOCK PAYPLUS] Error:', error);
    return NextResponse.json(
      { 
        results: {
          status: "error",
          code: "500",
          description: "Mock API error"
        }
      },
      { status: 500 }
    );
  }
}
