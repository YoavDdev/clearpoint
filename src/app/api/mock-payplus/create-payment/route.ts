import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Mock PayPlus API - create-payment
 * מדמה תשלום חד-פעמי בפורמט פשוט
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('🧪 [MOCK PAYPLUS] create-payment called');
    console.log('📦 Amount:', body.sum);
    console.log('📦 Customer:', body.customer_name);
    console.log('📦 Description:', body.description);
    if (body.monthly_price) {
      console.log('🔄 Monthly subscription included:', body.monthly_price);
    }

    // יצירת מזהים מזויפים
    const mockTransactionId = `mock-txn-${Date.now()}`;
    const mockProcessId = `mock-proc-${Date.now()}`;
    
    // בניית URL עם פרמטרים
    const params = new URLSearchParams({
      id: mockTransactionId,
      type: body.monthly_price ? 'combined' : 'one_time',
      amount: body.sum?.toString() || '0'
    });
    
    if (body.monthly_price) {
      params.append('monthly_price', body.monthly_price.toString());
    }
    
    const mockPageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mock-payplus/payment-page?${params}`;

    // Mock response בפורמט PayPlus (שיומר אחר כך לפורמט Grow)
    const mockResponse = {
      results: {
        status: "success",
        code: "0",
        description: "Success"
      },
      data: {
        payment_page_link: mockPageUrl,
        page_request_uid: mockTransactionId,
        transaction_uid: mockTransactionId,
        process_token: mockProcessId,
        // שדות נוספים
        amount: body.sum,
        currency: "ILS",
        customer_name: body.customer_name,
        description: body.description,
      }
    };

    console.log('✅ [MOCK PAYPLUS] Payment link created:', mockPageUrl);
    console.log('✅ [MOCK PAYPLUS] Transaction ID:', mockTransactionId);

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
