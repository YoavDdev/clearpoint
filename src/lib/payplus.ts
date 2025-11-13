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
  customer_name: string;
  customer_email: string;
  customer_phone: string;
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

export interface PayplusSubscriptionRequest {
  customer_id: string;
  amount: number;
  currency?: 'ILS' | 'USD' | 'EUR';
  description: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  billing_cycle: 'monthly' | 'yearly';
  start_date?: string; // YYYY-MM-DD
  notify_url?: string;
  recurring_amount?: number; // סכום החיוב החודשי (אם שונה מהתשלום הראשון)
}

// =====================================================
// Configuration
// =====================================================

const PAYPLUS_CONFIG = {
  baseUrl: process.env.PAYPLUS_API_URL || 'https://restapi.payplus.co.il/api/v1.0',
  devUrl: 'https://restapidev.payplus.co.il/api/v1.0', // Staging
  apiKey: process.env.PAYPLUS_API_KEY || '',
  secretKey: process.env.PAYPLUS_SECRET_KEY || '',
  paymentPageUid: process.env.PAYPLUS_PAYMENT_PAGE_UID || '',
  testMode: process.env.NODE_ENV !== 'production',
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
      };
      
      const response = await fetch(`${getBaseUrl()}/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });
      
      return await response.json();
    }

    // 🚀 Production mode - שימוש ב-API האמיתי של Payplus
    const payload: any = {
      payment_page_uid: PAYPLUS_CONFIG.paymentPageUid,
      amount: request.sum,
      currency_code: request.currency || 'ILS',
      
      // פרטי לקוח
      customer: {
        customer_name: request.customer_name,
        email: request.customer_email,
        phone: request.customer_phone,
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

    console.log('📤 Sending to Payplus API:', JSON.stringify({
      ...payload,
      payment_page_uid: '***HIDDEN***',
    }, null, 2));

    const response = await fetch(`${getBaseUrl()}/PaymentPages/GenerateLink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Payplus API error: ${response.status} ${response.statusText}`);
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
 * יצירת מנוי חוזר
 */
export async function createRecurringSubscription(
  request: PayplusSubscriptionRequest
): Promise<PayplusPaymentResponse> {
  try {
    // 🧪 Mock mode
    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Using Mock Payplus API for Recurring');
      const mockPayload = {
        amount: request.amount,
        customer_name: request.customer_name,
        billing_cycle: request.billing_cycle,
      };
      
      const response = await fetch(`${getBaseUrl()}/create-recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });
      
      return await response.json();
    }

    // ✅ Validate configuration
    if (!PAYPLUS_CONFIG.apiKey || !PAYPLUS_CONFIG.secretKey || !PAYPLUS_CONFIG.paymentPageUid) {
      throw new Error('Payplus API configuration is missing');
    }

    const payload = {
      payment_page_uid: PAYPLUS_CONFIG.paymentPageUid,
      amount: request.amount,
      currency_code: request.currency || 'ILS',
      
      // הגדרות Recurring
      charge_method: 'Regular', // סוג חיוב קבוע
      charge_frequency: request.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly',
      start_date: request.start_date || new Date().toISOString().split('T')[0],
      end_date: null, // אין תאריך סיום (עד לביטול)
      
      // פרטי לקוח
      customer: {
        customer_name: request.customer_name,
        email: request.customer_email,
        phone: request.customer_phone,
        customer_uid: request.customer_id, // שימוש ב-customer_id כ-UID
      },
      
      // תיאור
      description: request.description,
      
      // Callback
      callback_url: request.notify_url || `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/payplus/recurring`,
      
      // Metadata
      more_info: `${request.customer_id}|recurring|${request.billing_cycle}`,
    };

    console.log('📤 Sending to Payplus Recurring API:', JSON.stringify({
      ...payload,
      payment_page_uid: '***HIDDEN***',
    }, null, 2));
    
    console.log('🔗 Using endpoint:', `${getBaseUrl()}/RecurringPayments/Add`);

    const response = await fetch(`${getBaseUrl()}/RecurringPayments/Add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Payplus API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('📥 Received from Payplus Recurring API:', JSON.stringify(data, null, 2));

    // המרה לפורמט Grow (תאימות עם הקוד הקיים)
    if (data.results?.status === 'success') {
      return {
        status: '1',
        data: {
          pageUrl: data.data?.payment_page_link || '',
          transactionId: data.data?.recurring_uid || '',
          processId: data.data?.recurring_uid || '',
          processToken: data.data?.recurring_uid || '',
        },
      };
    } else {
      console.error('❌ Payplus API Error:', data.results?.description);
      return {
        status: '0',
        err: data.results?.description || 'Failed to create subscription',
      };
    }
  } catch (error) {
    console.error('Payplus subscription creation error:', error);
    throw error;
  }
}

/**
 * ביטול מנוי חוזר
 */
export async function cancelSubscription(recurringUid: string): Promise<boolean> {
  try {
    if (PAYPLUS_CONFIG.useMock) {
      console.log('🧪 Mock: Cancel subscription', recurringUid);
      return true;
    }

    const response = await fetch(`${getBaseUrl()}/RecurringPayments/DeleteRecurring/${recurringUid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': PAYPLUS_CONFIG.apiKey,
        'secret-key': PAYPLUS_CONFIG.secretKey,
      },
    });

    const data = await response.json();
    return data.results?.status === 'success';
  } catch (error) {
    console.error('Payplus subscription cancellation error:', error);
    return false;
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
export function parseWebhookData(payload: PayplusWebhookPayload) {
  // Parse more_info (metadata)
  const moreInfoParts = payload.more_info?.split('|') || [];
  const customFields = {
    cField1: moreInfoParts[0] || undefined,
    cField2: moreInfoParts[1] || undefined,
    cField3: moreInfoParts[2] || undefined,
  };

  return {
    paymentId: payload.transaction_uid,
    transactionId: payload.transaction_uid,
    amount: parseFloat(payload.amount),
    status: payload.status_code === '000' ? 'completed' : 'failed',
    payerName: payload.customer_name || '',
    payerEmail: payload.email || '',
    payerPhone: payload.phone || '',
    paymentDate: payload.transaction_date || payload.created || new Date().toISOString(),
    cardDetails: {
      suffix: payload.four_digits || '',
      type: payload.card_type || '',
      brand: payload.card_type || '',
      expiry: payload.card_exp || '',
    },
    asmachta: payload.approval_num || '',
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
  createRecurringSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  parseWebhookData,
  getPaymentStatus,
  calculateNextBillingDate,
  formatAmount,
};
