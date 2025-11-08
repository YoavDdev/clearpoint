import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock API for Grow Payment Creation
 * זה מדמה את ה-API של Grow לצורך פיתוח
 * כשתקבל API keys אמיתיים - פשוט תשנה את ה-URL ב-grow.ts
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('🧪 Mock Grow API - Payment Request:', body);

    // סימולציה של עיבוד (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    // החזרת תשובה מזויפת כמו Grow
    const mockResponse = {
      status: '1', // הצלחה
      data: {
        pageUrl: `http://localhost:3000/mock-payment-page?amount=${body.sum}&customer=${body.customer_name}`,
        transactionId: `MOCK-${Date.now()}`,
        processId: `PROCESS-${Date.now()}`,
        processToken: `TOKEN-${Math.random().toString(36).substr(2, 9)}`
      }
    };

    console.log('✅ Mock Grow API - Response:', mockResponse);

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ Mock Grow API Error:', error);
    return NextResponse.json(
      { 
        status: '0', 
        err: 'Mock API Error: ' + String(error) 
      },
      { status: 500 }
    );
  }
}
