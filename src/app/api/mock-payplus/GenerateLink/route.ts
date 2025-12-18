import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Mock PayPlus API - GenerateLink
 * מדמה את ה-API של PayPlus לצורך פיתוח
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('🧪 [MOCK PAYPLUS] GenerateLink called');
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    // יצירת מזהים מזויפים
    const mockTransactionId = `mock-txn-${Date.now()}`;
    const mockProcessId = `mock-proc-${Date.now()}`;
    const mockPageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mock-payplus/payment-page?id=${mockTransactionId}`;

    // Mock response בפורמט של PayPlus
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
        process_token: mockProcessId
      }
    };

    console.log('✅ [MOCK PAYPLUS] Returning mock payment link:', mockPageUrl);

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
