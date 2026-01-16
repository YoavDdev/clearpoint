import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseUrl = process.env.PAYPLUS_USE_MOCK === 'true' 
      ? 'https://restapidev.payplus.co.il'
      : 'https://restapi.payplus.co.il';
    
    // Customers/View endpoint requires 'take' parameter (max 500)
    const apiUrl = `${baseUrl}/api/v1.0/Customers/View?take=500`;
    
    console.log('🔵 Fetching customers from:', apiUrl);
    console.log('🔵 API Key:', process.env.PAYPLUS_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('🔵 Secret Key:', process.env.PAYPLUS_SECRET_KEY ? '✅ Set' : '❌ Missing');

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'api-key': process.env.PAYPLUS_API_KEY!,
        'secret-key': process.env.PAYPLUS_SECRET_KEY!,
      },
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ PayPlus error response:', errorText);
      return NextResponse.json(
        { success: false, error: `PayPlus API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ PayPlus customers response:', data);
    
    return NextResponse.json({
      success: true,
      customers: data.customers || [],
      count: data.count || 0,
    });
  } catch (error) {
    console.error('❌ Error fetching PayPlus customers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
