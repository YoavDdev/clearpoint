import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Mock PayPlus API - PaymentPages/GenerateLink
 * מדמה את endpoint האמיתי של PayPlus לתשלומים חד-פעמיים
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('🧪 [MOCK PAYPLUS] PaymentPages/GenerateLink called');
    console.log('📦 Amount:', body.amount);
    console.log('📦 Customer:', body.customer?.customer_name);

    // יצירת מזהים מזויפים
    const mockTransactionId = `txn-${Date.now()}`;
    const mockProcessId = `proc-${Date.now()}`;
    const mockPageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mock-payplus/payment-page?id=${mockTransactionId}`;

    // Mock response בפורמט המדויק של PayPlus
    const mockResponse = {
      results: {
        status: "success",
        code: "0",
        description: "Success"
      },
      data: {
        page_request_uid: mockTransactionId,
        payment_page_link: mockPageUrl,
        transaction_uid: mockTransactionId,
        process_token: mockProcessId,
        // שדות נוספים שPayPlus מחזיר
        expiry_datetime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        qr_code_url: mockPageUrl,
      }
    };

    console.log('✅ [MOCK PAYPLUS] Payment link created:', mockPageUrl);

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
