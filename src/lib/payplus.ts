/**
 * Payplus Payment Integration
 * https://www.payplus.co.il/
 * API Documentation: https://docs.payplus.co.il/reference/introduction
 */

import crypto from 'crypto';

// =====================================================
// Types
// =====================================================

export interface PayplusPaymentRequest {
  sum: number;
  currency?: 'ILS' | 'USD' | 'EUR';
  description: string;
  customer_uid?: string;           // ✅ אם קיים - משתמש בלקוח קיים ב-PayPlus
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;      // ✅ כתובת מלאה
  customer_city?: string;          // ✅ עיר
  customer_id_number?: string;     // ✅ ת.ז / ע.מ
  custom_fields?: {
    cField1?: string;
    cField2?: string;
    cField3?: string;
  };
  success_url?: string;
  cancel_url?: string;
  notify_url?: string; // Webhook URL
  max_payments?: number; // תשלומים
  items?: PayplusPaymentItem[];
  monthly_price?: number; // מחיר חודשי למצב Mock (לתצוגה בלבד)
}

export interface PayplusPaymentItem {
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface PayplusPaymentResponse {
  status: '1' | '0';
  err?: string;
  data?: {
    pageUrl: string; // URL להפניית הלקוח
    transactionId: string;
    processId: string;
    processToken: string;
  };
}

export interface PayplusWebhookPayload {
  transaction_uid: string;
  payment_request_uid?: string;
  page_request_uid?: string;
  approval_num?: string;
  voucher_num?: string;
  amount: string;
  currency: string;
  status_code: string; // '000' = success
  type: 'regular' | 'recurring';
  four_digits?: string;
  card_type?: string;
  card_exp?: string;
  customer_name?: string;
  email?: string;
  phone?: string;
  more_info?: string;
  created?: string;
  transaction_date?: string;
}

// ❌ PayplusSubscriptionRequest - DELETED (אין מנויים)

// =====================================================
// Configuration
// =====================================================

const PAYPLUS_CONFIG = {
  baseUrl: process.env.PAYPLUS_API_URL || 'https://restapi.payplus.co.il/api/v1.0',
  devUrl: 'https://restapidev.payplus.co.il/api/v1.0', // Staging
  apiKey: process.env.PAYPLUS_API_KEY || '',
  secretKey: process.env.PAYPLUS_SECRET_KEY || '',
  paymentPageUid: process.env.PAYPLUS_PAYMENT_PAGE_UID || '',
  terminalUid: process.env.PAYPLUS_TERMINAL_UID || '',
  cashierUid: process.env.PAYPLUS_CASHIER_UID || '',
  // Force production mode if PAYPLUS_FORCE_PRODUCTION is set
  testMode: process.env.PAYPLUS_FORCE_PRODUCTION === 'true' ? false : (process.env.NODE_ENV !== 'production'),
  useMock: process.env.PAYPLUS_USE_MOCK === 'true', // 🧪 Mock mode לפיתוח
};

// Get correct base URL based on environment
function getBaseUrl(): string {
  if (PAYPLUS_CONFIG.useMock) {
    return `${process.env.NEXT_PUBLIC_BASE_URL}/api/mock-payplus`;
  }
  return PAYPLUS_CONFIG.testMode ? PAYPLUS_CONFIG.devUrl : PAYPLUS_CONFIG.baseUrl;
}

// Validate configuration (רק אם לא ב-mock mode)
if (!PAYPLUS_CONFIG.useMock && (!PAYPLUS_CONFIG.apiKey || !PAYPLUS_CONFIG.secretKey || !PAYPLUS_CONFIG.paymentPageUid)) {
  console.warn('⚠️ Payplus payment configuration is incomplete.');
  console.warn('📋 Please set in .env:');
  console.warn('   PAYPLUS_API_KEY=your_api_key');
  console.warn('   PAYPLUS_SECRET_KEY=your_secret_key');
  console.warn('   PAYPLUS_PAYMENT_PAGE_UID=your_page_uid');
  console.warn('💡 Or set PAYPLUS_USE_MOCK=true to use mock API for development');
}

// =====================================================
// API Functions
// =====================================================

/**
 * יצירת תשלום חד-פעמי
 */
export async function createOneTimePayment(
  request: PayplusPaymentRequest
): Promise<PayplusPaymentResponse> {
  try {
    // 🧪 Mock mode - שימוש ב-API מזויף לפיתוח
    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Using Mock Payplus API');
      const mockPayload = {
        sum: request.sum,
        customer_name: request.customer_name,
        description: request.description,
        monthly_price: request.monthly_price, // העברת מחיר חודשי למצב Mock
      };
      
      const response = await fetch(`${getBaseUrl()}/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });
      
      const data = await response.json();
      
      // המרה לפורמט Grow (תאימות עם הקוד הקיים)
      if (data.results?.status === 'success') {
        return {
          status: '1',
          data: {
            pageUrl: data.data?.payment_page_link || '',
            transactionId: data.data?.page_request_uid || '',
            processId: data.data?.page_request_uid || '',
            processToken: data.data?.page_request_uid || '',
          },
        };
      } else {
        return {
          status: '0',
          err: data.results?.description || 'Failed to create payment',
        };
      }
    }

    // 🚀 Production mode - שימוש ב-API האמיתי של Payplus
    const payload: any = {
      payment_page_uid: PAYPLUS_CONFIG.paymentPageUid,
      amount: request.sum,
      currency_code: request.currency || 'ILS',
      
      // פרטי לקוח - אם יש customer_uid משתמשים בו, אחרת שולחים פרטים ליצירת לקוח חדש
      customer: request.customer_uid ? {
        customer_uid: request.customer_uid, // לקוח קיים - לא יוצר חדש!
      } : {
        customer_name: request.customer_name,
        email: request.customer_email,
        phone: request.customer_phone || '',
        address: request.customer_address || '',
        city: request.customer_city || '',
        identification_number: request.customer_id_number || '',
      },
      
      // Callbacks & Redirects
      refURL_callback: request.notify_url || `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/payplus`,
      refURL_success: request.success_url || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
      refURL_failure: request.cancel_url || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
      
      // אופציות
      sendEmailApproval: false, // לא לשלוח אימייל אוטומטי
      sendEmailFailure: false,
      send_failure_callback: true, // לקבל callback גם על כשלון
      
      // Metadata (שדות מותאמים)
      more_info: request.custom_fields 
        ? `${request.custom_fields.cField1 || ''}|${request.custom_fields.cField2 || ''}|${request.custom_fields.cField3 || ''}`
        : undefined,
    };

    // פריטים (אם יש)
    if (request.items && request.items.length > 0) {
      payload.items = request.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        description: item.description || '',
      }));
    }

    const apiUrl = `${getBaseUrl()}/PaymentPages/GenerateLink`;
    
    console.log('📤 Sending to Payplus API:');
    console.log('   URL:', apiUrl);
    console.log('   Method: POST');
    console.log('   Headers:', {
      'Content-Type': 'application/json',
      'api-key': PAYPLUS_CONFIG.apiKey ? `${PAYPLUS_CONFIG.apiKey.substring(0, 8)}...` : 'MISSING',
      'secret-key': PAYPLUS_CONFIG.secretKey ? `${PAYPLUS_CONFIG.secretKey.substring(0, 8)}...` : 'MISSING',
    });
    console.log('   Payload:', JSON.stringify({
      ...payload,
      payment_page_uid: payload.payment_page_uid ? `${payload.payment_page_uid.substring(0, 8)}...` : 'MISSING',
    }, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      // קריאת הגוף של השגיאה
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('📥 Error response body:', errorBody);
      } catch (e) {
        console.error('Could not read error body');
      }
      
      throw new Error(`Payplus API error: ${response.status} ${response.statusText}${errorBody ? `\nDetails: ${errorBody}` : ''}`);
    }

    const data = await response.json();
    
    console.log('📥 Received from Payplus API:', JSON.stringify(data, null, 2));

    // המרה לפורמט Grow (תאימות עם הקוד הקיים)
    if (data.results?.status === 'success') {
      return {
        status: '1',
        data: {
          pageUrl: data.data?.payment_page_link || '',
          transactionId: data.data?.page_request_uid || '',
          processId: data.data?.page_request_uid || '',
          processToken: data.data?.page_request_uid || '',
        },
      };
    } else {
      return {
        status: '0',
        err: data.results?.description || 'Failed to create payment',
      };
    }
  } catch (error) {
    console.error('Payplus payment creation error:', error);
    throw error;
  }
}

/**
 * יצירת Payment Page למנוי חודשי חוזר
 * הלקוח יזין את הכרטיס שלו ב-Payment Page והמנוי ייווצר אוטומטית
 */
export async function createRecurringPaymentPage(request: {
  customer_uid: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  amount: number;
  plan_name: string;
  start_date: string; // DD/MM/YYYY
  recurring_type?: number; // 2 = monthly
  recurring_range?: number; // 1 = every month
  number_of_charges?: number; // 0 = unlimited
  success_url?: string;
  cancel_url?: string;
  custom_fields?: any;
}): Promise<PayplusPaymentResponse> {
  try {
    console.log('🔵 Creating recurring payment page for customer:', request.customer_name);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Recurring payment page created');
      return {
        status: '1',
        data: {
          pageUrl: `http://localhost:3000/mock-recurring-payment?customer=${request.customer_uid}`,
          transactionId: `mock_recurring_${Date.now()}`,
          processId: `mock_recurring_${Date.now()}`,
          processToken: `mock_token_${Date.now()}`,
        },
      };
    }

    // PayPlus Payment Page with recurring parameters
    const payload: any = {
      payment_page_uid: PAYPLUS_CONFIG.paymentPageUid,
      amount: request.amount,
      currency_code: 'ILS',
      
      customer: {
        customer_uid: request.customer_uid,
        customer_name: request.customer_name,
        email: request.customer_email,
        phone: request.customer_phone || '',
      },
      
      // Recurring parameters - correct field names for PayPlus
      charge_method: 4, // 4 = Create recurring payment
      recurring_type: request.recurring_type || 2, // 2 = monthly
      recurring_range: request.recurring_range || 1, // every 1 month
      number_of_payments: request.number_of_charges || 0, // 0 = unlimited
      start_date: request.start_date, // DD/MM/YYYY
      charge_default: 0, // 0 = Don't charge now, only create recurring
      
      // Callbacks
      refURL_callback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/payplus`,
      refURL_success: request.success_url || `${process.env.NEXT_PUBLIC_BASE_URL}/recurring-payment-success`,
      refURL_failure: request.cancel_url || `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`,
      
      sendEmailApproval: false,
      sendEmailFailure: false,
      send_failure_callback: true,
      
      more_info: request.custom_fields 
        ? `${request.custom_fields.cField1 || ''}|${request.custom_fields.cField2 || ''}|${request.custom_fields.cField3 || ''}`
        : undefined,
      
      items: [{
        name: request.plan_name,
        quantity: 1,
        price: request.amount,
        vat_type: 0,
      }],
    };

    console.log('📤 Creating PayPlus Payment Page for recurring:', payload);

    const apiUrl = `${getBaseUrl()}/PaymentPages/generateLink`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('📥 PayPlus Payment Page response:', data);

    if (data.results?.status === 'success' && data.data?.payment_page_link) {
      return {
        status: '1',
        data: {
          pageUrl: data.data.payment_page_link,
          transactionId: data.data.page_request_uid || '',
          processId: data.data.page_request_uid || '',
          processToken: data.data.page_request_uid || '',
        },
      };
    } else {
      return {
        status: '0',
        err: data.results?.description || 'Failed to create payment page',
      };
    }
  } catch (error) {
    console.error('❌ Create recurring payment page error:', error);
    return {
      status: '0',
      err: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * קבלת פרטי מנוי חוזר
 */
export async function viewRecurringPayment(uid: string) {
  try {
    if (PAYPLUS_CONFIG.useMock) {
      // Mock data for testing
      return {
        status: 'success',
        data: {
          uid,
          customer_name: 'Mock Customer',
          amount: 100,
          currency: 'ILS',
          status: 'active',
          next_charge_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      };
    }

    const apiUrl = `${getBaseUrl()}/RecurringPayments/${uid}/ViewRecurring`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
    });

    if (!response.ok) {
      throw new Error(`PayPlus API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('ViewRecurring error:', error);
    throw error;
  }
}

/**
 * קבלת רשימת כל המנויים החוזרים
 */
export async function listAllRecurringPayments() {
  try {
    console.log('🔵 listAllRecurringPayments - Starting...');
    console.log('🔵 Mock mode:', PAYPLUS_CONFIG.useMock);
    
    if (PAYPLUS_CONFIG.useMock) {
      console.log('✅ Using mock data');
      // Mock data for testing
      return {
        status: 'success',
        data: [
          {
            uid: 'rec_001',
            customer_name: 'יוסי כהן',
            customer_email: 'yossi@example.com',
            customer_phone: '0501234567',
            amount: 150,
            currency: 'ILS',
            status: 'active',
            next_charge_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            total_charges: 2,
          },
          {
            uid: 'rec_002',
            customer_name: 'דנה לוי',
            customer_email: 'dana@example.com',
            customer_phone: '0527654321',
            amount: 200,
            currency: 'ILS',
            status: 'active',
            next_charge_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            total_charges: 3,
          },
        ],
      };
    }

    console.log('🔵 Using real PayPlus API');
    
    const apiUrl = `${getBaseUrl()}/RecurringPayments/View?terminal_uid=${PAYPLUS_CONFIG.terminalUid}`;
    console.log('🔵 API URL:', apiUrl);
    console.log('🔵 API Key:', PAYPLUS_CONFIG.apiKey ? '✅ Set' : '❌ Missing');
    console.log('🔵 Secret Key:', PAYPLUS_CONFIG.secretKey ? '✅ Set' : '❌ Missing');
    console.log('🔵 Terminal UID:', PAYPLUS_CONFIG.terminalUid ? '✅ Set' : '❌ Missing');
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
    });

    console.log('🔵 Response status:', response.status);
    console.log('🔵 Response statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ PayPlus API error response:', errorText);
      console.error('❌ This usually means:');
      console.error('   1. The endpoint does not exist');
      console.error('   2. Your account is not authorized for Recurring Payments');
      console.error('   3. Missing required permissions');
      console.error('💡 Suggestion: Set PAYPLUS_USE_MOCK=true for development');
      throw new Error(`PayPlus API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ PayPlus response:', data);
    
    // התאמה לפורמט שלנו - נורמליזציה של הנתונים
    const normalizedData = (data.data || []).map((item: any) => ({
      uid: item.uid,
      customer_name: item.customer_name,
      customer_email: item.customer_email,
      customer_phone: item.customer_phone || 'לא זמין',
      amount: item.each_payment_amount, // המרה מ-each_payment_amount ל-amount
      currency: item.currency_code || 'ILS',
      status: item.valid ? 'active' : 'cancelled',
      next_charge_date: item.start_date || item.first_charge_date,
      created_at: item.created_at,
      total_charges: item.already_charged_transfers || 0,
      // שדות נוספים
      card_number: item.card_number,
      card_expiry: item.card_expiry,
      recurring_type: item.recurring_type,
      number_of_charges: item.number_of_charges,
    }));
    
    return {
      status: 'success',
      data: normalizedData,
    };
  } catch (error) {
    console.error('❌ ListRecurringPayments error:', error);
    throw error;
  }
}

/**
 * ביטול מנוי חוזר
 */
export async function cancelRecurringPayment(uid: string) {
  try {
    if (PAYPLUS_CONFIG.useMock) {
      return {
        status: 'success',
        message: 'Recurring payment cancelled successfully',
      };
    }

    const apiUrl = `${getBaseUrl()}/RecurringPayments/${uid}/Cancel`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
    });

    if (!response.ok) {
      throw new Error(`PayPlus API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('CancelRecurring error:', error);
    throw error;
  }
}

// =====================================================
// Customer Management Functions
// =====================================================

export interface PayPlusCustomerRequest {
  email: string;
  customer_name: string;
  vat_number?: string;
  customer_number?: string;
  notes?: string;
  phone?: string;
  business_address?: string;
  business_city?: string;
  business_postal_code?: string;
  business_country_iso?: string;
  subject_code?: string;
  communication_email?: string;
}

/**
 * יצירת לקוח חדש ב-PayPlus
 */
export async function createPayPlusCustomer(
  request: PayPlusCustomerRequest
): Promise<{ success: boolean; customer_uid?: string; error?: string }> {
  try {
    console.log('🔵 Creating PayPlus customer:', request.customer_name);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Using Mock - customer created');
      return {
        success: true,
        customer_uid: `mock_customer_${Date.now()}`,
      };
    }

    const apiUrl = `${getBaseUrl()}/Customers/Add`;
    
    // Build payload with only defined values
    const payload: any = {
      email: request.email,
      customer_name: request.customer_name,
    };

    // Add optional fields only if they have values
    if (request.vat_number) payload.vat_number = request.vat_number;
    if (request.customer_number) payload.customer_number = request.customer_number;
    if (request.notes) payload.notes = request.notes;
    if (request.phone) payload.phone = request.phone;
    if (request.business_address) payload.business_address = request.business_address;
    if (request.business_city) payload.business_city = request.business_city;
    if (request.business_postal_code) payload.business_postal_code = request.business_postal_code;
    if (request.business_country_iso) payload.business_country_iso = request.business_country_iso;
    if (request.subject_code) payload.subject_code = request.subject_code;
    if (request.communication_email) payload.communication_email = request.communication_email;

    console.log('📤 Sending to PayPlus Customers/Add:', payload);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('📥 PayPlus response:', data);

    if (!response.ok || data.results?.status !== 'success') {
      console.error('❌ Failed to create PayPlus customer:', data);
      return {
        success: false,
        error: data.results?.description || 'Failed to create customer',
      };
    }

    return {
      success: true,
      customer_uid: data.data?.customer_uid,
    };
  } catch (error) {
    console.error('❌ createPayPlusCustomer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * עדכון לקוח קיים ב-PayPlus
 */
export async function updatePayPlusCustomer(
  customer_uid: string,
  request: PayPlusCustomerRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔵 Updating PayPlus customer:', customer_uid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Using Mock - customer updated');
      return { success: true };
    }

    const apiUrl = `${getBaseUrl()}/Customers/Update/${customer_uid}`;
    
    // Build payload with only defined values
    const payload: any = {
      email: request.email,
      customer_name: request.customer_name,
    };

    // Add optional fields only if they have values
    if (request.vat_number) payload.vat_number = request.vat_number;
    if (request.customer_number) payload.customer_number = request.customer_number;
    if (request.notes) payload.notes = request.notes;
    if (request.phone) payload.phone = request.phone;
    if (request.business_address) payload.business_address = request.business_address;
    if (request.business_city) payload.business_city = request.business_city;
    if (request.business_postal_code) payload.business_postal_code = request.business_postal_code;
    if (request.business_country_iso) payload.business_country_iso = request.business_country_iso;
    if (request.subject_code) payload.subject_code = request.subject_code;
    if (request.communication_email) payload.communication_email = request.communication_email;

    console.log('📤 Sending to PayPlus Customers/Update:', payload);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('📥 PayPlus response:', data);

    if (!response.ok || data.results?.status !== 'success') {
      console.error('❌ Failed to update PayPlus customer:', data);
      return {
        success: false,
        error: data.results?.description || 'Failed to update customer',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ updatePayPlusCustomer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * מחיקת לקוח מ-PayPlus
 */
export async function removePayPlusCustomer(
  customer_uid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔵 Removing PayPlus customer:', customer_uid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Using Mock - customer removed');
      return { success: true };
    }

    const apiUrl = `${getBaseUrl()}/Customers/Remove/${customer_uid}`;
    
    console.log('📤 Sending to PayPlus Customers/Remove');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
    });

    const data = await response.json();
    console.log('📥 PayPlus response:', data);

    if (!response.ok || data.results?.status !== 'success') {
      console.error('❌ Failed to remove PayPlus customer:', data);
      return {
        success: false,
        error: data.results?.description || 'Failed to remove customer',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ removePayPlusCustomer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * אימות webhook signature
 * Payplus שולח hash ב-headers שצריך לאמת
 */
export function verifyWebhookSignature(
  body: any,
  receivedHash: string,
  userAgent: string
): boolean {
  try {
    // 1. בדוק User-Agent
    if (userAgent !== 'PayPlus') {
      console.warn('⚠️ Invalid user-agent:', userAgent);
      return false;
    }
    
    // 2. בדוק שיש hash
    if (!receivedHash) {
      console.warn('⚠️ Missing hash in headers');
      return false;
    }
    
    // 3. חשב hash על ה-body
    const message = typeof body === 'string' ? body : JSON.stringify(body);
    const calculatedHash = crypto
      .createHmac('sha256', PAYPLUS_CONFIG.secretKey)
      .update(message)
      .digest('base64');
    
    // 4. השווה
    const isValid = calculatedHash === receivedHash;
    
    if (!isValid) {
      console.warn('⚠️ Hash mismatch!');
      console.warn('Received:', receivedHash);
      console.warn('Calculated:', calculatedHash);
    }
    
    return isValid;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

/**
 * המרת webhook payload למידע תשלום
 */
export function parseWebhookData(payload: any) {
  // PayPlus יכול לשלוח בשני פורמטים:
  // 1. Flat format (ישן)
  // 2. Nested format (חדש) - עם transaction object
  
  const transaction = payload.transaction || payload;
  const data = payload.data || {};
  const cardInfo = data.card_information || {};
  
  // Parse more_info (metadata)
  const moreInfo = transaction.more_info || payload.more_info || '';
  const moreInfoParts = moreInfo.split('|') || [];
  const customFields = {
    cField1: moreInfoParts[0] || undefined,
    cField2: moreInfoParts[1] || undefined,
    cField3: moreInfoParts[2] || undefined,
  };

  return {
    paymentId: transaction.uid || payload.transaction_uid,
    transactionId: transaction.uid || payload.transaction_uid,
    amount: parseFloat(transaction.amount || payload.amount || '0'),
    status: (transaction.status_code || payload.status_code) === '000' ? 'completed' : 'failed',
    payerName: data.customer_name || payload.customer_name || '',
    payerEmail: data.customer_email || payload.customer_email || payload.email || '',
    payerPhone: data.customer_phone || payload.customer_phone || payload.phone || '',
    customerUid: payload.customer_uid || data.customer_uid || '',
    paymentDate: transaction.date || payload.transaction_date || payload.created || new Date().toISOString(),
    cardDetails: {
      suffix: cardInfo.four_digits || payload.four_digits || '',
      type: cardInfo.brand_name || payload.card_type || '',
      brand: cardInfo.brand_name || payload.card_type || '',
      expiry: cardInfo.expiry_month && cardInfo.expiry_year 
        ? `${cardInfo.expiry_month}/${cardInfo.expiry_year}` 
        : payload.card_exp || '',
    },
    cardToken: data.token || payload.token || payload.card_token || '',
    asmachta: transaction.approval_number || payload.approval_num || '',
    paymentsNum: 1,
    allPaymentsNum: 1,
    customFields,
    isRecurring: payload.type === 'recurring',
  };
}

/**
 * בדיקת סטטוס תשלום
 */
export async function getPaymentStatus(transactionUid: string) {
  try {
    if (PAYPLUS_CONFIG.useMock) {
      return { status: 'success', data: { status_code: '000' } };
    }

    // Payplus לא מספקת endpoint ישיר לבדיקת סטטוס
    // צריך להשתמש ב-webhook או ב-transaction reports
    console.warn('⚠️ Payplus does not have a direct status check endpoint');
    console.warn('💡 Use webhooks for real-time status updates');
    
    return null;
  } catch (error) {
    console.error('Payplus payment status check error:', error);
    throw error;
  }
}

// =====================================================
// Recurring Payments - Additional Types & Functions
// =====================================================

export interface RecurringPaymentItem {
  name: string;
  quantity: number;
  price: number;
  vat_type?: number;
}

export interface CreateRecurringPaymentRequest {
  terminal_uid: string;
  customer_uid: string;
  card_token?: string | null;
  cashier_uid: string;
  currency_code: 'ILS' | 'USD' | 'EUR' | 'GPB';
  recurring_type: 0 | 1 | 2; // 0=daily, 1=weekly, 2=monthly
  recurring_range: number;
  number_of_charges: number;
  start_date: string;
  end_date?: string;
  instant_first_payment?: boolean; // Whether to charge immediately or wait for start_date
  items: RecurringPaymentItem[];
  extra_info?: string;
}

export interface UpdateRecurringPaymentRequest extends CreateRecurringPaymentRequest {}

export interface RecurringPaymentResponse {
  results: {
    status: string;
    code: number;
    description: string;
  };
  data: {
    recurring_uid?: string;
    customer_uid?: string;
    [key: string]: any;
  };
}

/**
 * יצירת מנוי חוזר חדש
 */
export async function createRecurringPayment(
  request: CreateRecurringPaymentRequest
): Promise<RecurringPaymentResponse> {
  try {
    console.log('🔵 Creating PayPlus recurring payment');

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Recurring payment created');
      return {
        results: { status: 'success', code: 0, description: 'OK' },
        data: { recurring_uid: `mock_recurring_${Date.now()}` },
      };
    }

    const apiUrl = `${getBaseUrl()}/RecurringPayments/Add`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    console.log('📥 PayPlus recurring response:', data);
    return data;
  } catch (error) {
    console.error('❌ Create recurring payment error:', error);
    throw error;
  }
}

/**
 * עדכון מנוי חוזר
 */
export async function updateRecurringPayment(
  recurringUid: string,
  request: UpdateRecurringPaymentRequest
): Promise<RecurringPaymentResponse> {
  try {
    console.log('🔵 Updating PayPlus recurring payment:', recurringUid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Recurring payment updated');
      return {
        results: { status: 'success', code: 0, description: 'OK' },
        data: { recurring_uid: recurringUid },
      };
    }

    const apiUrl = `${getBaseUrl()}/RecurringPayments/Update/${recurringUid}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    console.log('📥 PayPlus update response:', data);
    return data;
  } catch (error) {
    console.error('❌ Update recurring payment error:', error);
    throw error;
  }
}

/**
 * מחיקת מנוי חוזר
 */
export async function deleteRecurringPayment(
  recurringUid: string
): Promise<RecurringPaymentResponse> {
  try {
    console.log('🔵 Deleting PayPlus recurring payment:', recurringUid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Recurring payment deleted');
      return {
        results: { status: 'success', code: 0, description: 'OK' },
        data: {},
      };
    }

    const apiUrl = `${getBaseUrl()}/RecurringPayments/DeleteRecurring/${recurringUid}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify({
        terminal_uid: PAYPLUS_CONFIG.terminalUid,
      }),
    });

    const data = await response.json();
    console.log('📥 PayPlus delete response:', data);
    return data;
  } catch (error) {
    console.error('❌ Delete recurring payment error:', error);
    throw error;
  }
}

/**
 * שליפת כרטיסי אשראי שמורים של לקוח
 * מחלץ מידע על כרטיסים ממנויים חוזרים קיימים
 */
export async function getCustomerCards(customerUid: string): Promise<any> {
  try {
    console.log('🔵 Fetching saved cards from recurring payments for customer:', customerUid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: No saved cards');
      return { results: { status: 'success', code: 0, description: 'OK' }, data: [] };
    }

    // Get all recurring payments for this terminal
    const apiUrl = `${getBaseUrl()}/RecurringPayments/View?terminal_uid=${PAYPLUS_CONFIG.terminalUid}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
    });

    const data = await response.json();
    console.log('📥 RecurringPayments/View response:', data);
    
    // Filter recurring payments by customer_uid
    if (data.data && Array.isArray(data.data)) {
      const customerRecurringPayments = data.data.filter((rp: any) => rp.customer_uid === customerUid);
      
      if (customerRecurringPayments.length > 0) {
        const firstRecurring = customerRecurringPayments[0];
        console.log('✅ Found recurring payment with saved card:', {
          recurring_uid: firstRecurring.uid,
          card_number: firstRecurring.card_number,
          card_expiry: firstRecurring.card_expiry,
        });
        
        // Return card info extracted from recurring payment
        // Note: card_uid might be in card_token or token field
        return {
          results: { status: 'success', code: 0, description: 'OK' },
          data: [{
            uid: firstRecurring.card_token || firstRecurring.token || firstRecurring.uid, // Try different possible fields
            card_number: firstRecurring.card_number,
            card_expiry: firstRecurring.card_expiry,
            recurring_uid: firstRecurring.uid, // Keep for reference
          }]
        };
      }
    }
    
    console.log('⚠️ No recurring payments with saved cards found for customer');
    return { results: { status: 'success', code: 0, description: 'OK' }, data: [] };
  } catch (error) {
    console.error('❌ Get customer cards error:', error);
    return { results: { status: 'error', code: 1, description: 'Error' }, data: [] };
  }
}

/**
 * השעיה/הפעלה של מנוי חוזר
 */
export async function toggleRecurringValid(
  recurringUid: string,
  valid: boolean
): Promise<RecurringPaymentResponse> {
  try {
    console.log(`🔵 ${valid ? 'Activating' : 'Pausing'} recurring payment:`, recurringUid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Recurring payment validity toggled');
      return {
        results: { status: 'success', code: 0, description: 'OK' },
        data: { recurring_uid: recurringUid, valid },
      };
    }

    const apiUrl = `${getBaseUrl()}/RecurringPayments/${recurringUid}/Valid`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify({
        terminal_uid: PAYPLUS_CONFIG.terminalUid,
        valid,
      }),
    });

    const data = await response.json();
    console.log('📥 PayPlus valid toggle response:', data);
    return data;
  } catch (error) {
    console.error('❌ Toggle recurring valid error:', error);
    throw error;
  }
}

/**
 * קבלת פרטי מנוי חוזר ספציפי
 */
export async function getRecurringPaymentDetails(
  recurringUid: string
): Promise<any> {
  try {
    console.log('🔵 Fetching recurring payment details:', recurringUid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Returning recurring payment details');
      return {
        results: { status: 'success', code: 0, description: 'OK' },
        data: {
          recurring_uid: recurringUid,
          customer_uid: 'mock_customer',
          amount: 99,
          status: 'active',
        },
      };
    }

    const apiUrl = `${getBaseUrl()}/RecurringPayments/${recurringUid}/ViewRecurring`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
        'terminal_uid': PAYPLUS_CONFIG.terminalUid,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Get recurring payment details error:', error);
    throw error;
  }
}

/**
 * קבלת רשימת חיובים של מנוי
 */
export async function getRecurringCharges(
  recurringUid: string,
  skip: number = 0,
  take: number = 50
): Promise<any> {
  try {
    console.log('🔵 Fetching recurring charges for:', recurringUid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Returning charges list');
      return {
        results: { status: 'success', code: 0, description: 'OK' },
        data: { items: [] },
      };
    }

    const params = new URLSearchParams({
      terminal_uid: PAYPLUS_CONFIG.terminalUid,
      skip: skip.toString(),
      take: take.toString(),
    });

    const apiUrl = `${getBaseUrl()}/RecurringPayments/${recurringUid}/ViewRecurringCharge?${params.toString()}`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Get recurring charges error:', error);
    throw error;
  }
}

/**
 * שליחת התראה לחידוש כרטיס אשראי
 */
export async function sendCardRenewalNotification(
  recurringUid: string,
  disableSendEmail: boolean = false
): Promise<any> {
  try {
    console.log('🔵 Sending card renewal notification for:', recurringUid);

    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Card renewal notification sent');
      return {
        results: { status: 'success', code: 0, description: 'OK' },
        data: { payment_page_url: 'https://mock.payment.page' },
      };
    }

    const apiUrl = `${getBaseUrl()}/RecurringPayments/CreditCardRenewal/${recurringUid}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify({
        terminal_uid: PAYPLUS_CONFIG.terminalUid,
        disable_send_email: disableSendEmail,
      }),
    });

    const data = await response.json();
    console.log('📥 Card renewal response:', data);
    return data;
  } catch (error) {
    console.error('❌ Send card renewal notification error:', error);
    throw error;
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * חישוב תאריך חיוב הבא
 */
export function calculateNextBillingDate(
  billingCycle: 'monthly' | 'yearly',
  fromDate: Date = new Date()
): Date {
  const nextDate = new Date(fromDate);
  
  if (billingCycle === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  
  return nextDate;
}

/**
 * פורמט סכום לתצוגה
 */
export function formatAmount(amount: number, currency: string = 'ILS'): string {
  const symbols: Record<string, string> = {
    ILS: '₪',
    USD: '$',
    EUR: '€',
  };
  
  return `${symbols[currency] || '₪'}${amount.toFixed(2)}`;
}

export default {
  createOneTimePayment,
  createRecurringPaymentPage,
  viewRecurringPayment,
  listAllRecurringPayments,
  cancelRecurringPayment,
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
  toggleRecurringValid,
  getCustomerCards,
  getRecurringPaymentDetails,
  getRecurringCharges,
  sendCardRenewalNotification,
  verifyWebhookSignature,
  parseWebhookData,
  getPaymentStatus,
  calculateNextBillingDate,
  formatAmount,
};
