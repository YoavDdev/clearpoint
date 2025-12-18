import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Mock PayPlus API - create-recurring
 * מדמה מנוי חוזר בפורמט פשוט
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('🧪 [MOCK PAYPLUS] create-recurring called');
    console.log('📦 Amount:', body.amount);
    console.log('📦 Customer:', body.customer_name);
    console.log('📦 Billing cycle:', body.billing_cycle);

    // יצירת מזהים מזויפים
    const mockRecurringId = `mock-rec-${Date.now()}`;
    const mockProcessId = `mock-proc-rec-${Date.now()}`;
    const mockTransactionId = `mock-txn-rec-${Date.now()}`;
    const mockPageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mock-payplus/payment-page?id=${mockRecurringId}&type=recurring`;

    // Mock response בפורמט PayPlus (שיומר אחר כך לפורמט Grow)
    const mockResponse = {
      results: {
        status: "success",
        code: "0",
        description: "Success"
      },
      data: {
        payment_page_link: mockPageUrl,
        recurring_uid: mockRecurringId,
        transaction_uid: mockTransactionId,
        process_token: mockProcessId,
        // שדות נוספים
        status: "active",
        amount: body.amount,
        currency: "ILS",
        billing_cycle: body.billing_cycle || "monthly",
        next_charge_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      }
    };

    console.log('✅ [MOCK PAYPLUS] Recurring subscription created:', mockRecurringId);
    console.log('✅ [MOCK PAYPLUS] Payment URL:', mockPageUrl);

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ [MOCK PAYPLUS] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Mock API error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
