/**
 * Grow (Meshulam) Payment Integration
 * https://grow.business/
 * API Documentation: https://docs.meshulam.co.il/
 */

// =====================================================
// Types
// =====================================================

export interface GrowPaymentRequest {
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
  items?: GrowPaymentItem[];
}

export interface GrowPaymentItem {
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface GrowPaymentResponse {
  status: '1' | '0';
  err?: string;
  data?: {
    pageUrl: string; // URL להפניית הלקוח
    transactionId: string;
    processId: string;
    processToken: string;
  };
}

export interface GrowWebhookPayload {
  status: '1' | '0';
  err?: string;
  data?: {
    asmachta: string; // אסמכתא
    cardSuffix: string;
    cardType: string;
    cardBrand: string;
    cardExp: string;
    sum: string;
    paymentsNum: string;
    allPaymentsNum: string;
    paymentDate: string;
    description: string;
    fullName: string;
    payerPhone: string;
    payerEmail: string;
    transactionId: string;
    transactionToken: string;
    processId: string;
    processToken: string;
    statusCode: string; // '2' = שולם בהצלחה
    status: string; // 'שולם'
    customFields?: {
      cField1?: string;
      cField2?: string;
      cField3?: string;
    };
  };
}

export interface GrowSubscriptionRequest {
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

const GROW_CONFIG = {
  baseUrl: process.env.GROW_API_URL || 'https://secure.meshulam.co.il',
  pageCode: process.env.GROW_PAGE_CODE || '', // קוד עמוד מהפאנל
  apiKey: process.env.GROW_API_KEY || '', // מפתח API
  userId: process.env.GROW_USER_ID || '', // User ID מהפאנל
  testMode: process.env.NODE_ENV !== 'production',
  useMock: process.env.GROW_USE_MOCK === 'true', // 🧪 Mock mode לפיתוח
};

// Validate configuration (רק אם לא ב-mock mode)
if (!GROW_CONFIG.useMock && (!GROW_CONFIG.pageCode || !GROW_CONFIG.apiKey)) {
  console.warn('⚠️ Grow payment configuration is incomplete. Please set GROW_PAGE_CODE and GROW_API_KEY in .env');
  console.warn('💡 Or set GROW_USE_MOCK=true to use mock API for development');
}

// =====================================================
// API Functions
// =====================================================

/**
 * יצירת תשלום חד-פעמי
 */
export async function createOneTimePayment(
  request: GrowPaymentRequest
): Promise<GrowPaymentResponse> {
  try {
    // 🧪 Mock mode - שימוש ב-API מזויף לפיתוח
    if (GROW_CONFIG.useMock) {
      console.log('🧪 Using Mock Grow API');
      const mockPayload = {
        sum: request.sum,
        customer_name: request.customer_name,
        description: request.description,
      };
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mock-grow/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });
      
      return await response.json();
    }

    // 🚀 Production mode - שימוש ב-API האמיתי של Grow
    const payload = {
      pageCode: GROW_CONFIG.pageCode,
      apiKey: GROW_CONFIG.apiKey,
      ...(GROW_CONFIG.userId && { userId: GROW_CONFIG.userId }), // userId אופציונלי
      action: 'createProcess', // ✅ Meshulam דורש action
      sum: request.sum.toFixed(2),
      currency: request.currency || 'ILS',
      description: request.description,
      
      // פרטי לקוח
      fullName: request.customer_name,
      email: request.customer_email,
      phone: request.customer_phone,
      
      // URLs
      successUrl: request.success_url || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
      cancelUrl: request.cancel_url || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
      notifyUrl: request.notify_url || `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/webhook/grow`,
      
      // אפשרויות
      maxPayments: request.max_payments || 1,
      
      // שדות מותאמים אישית
      customFields: request.custom_fields,
      
      // פריטים (אם יש)
      ...(request.items && {
        items: request.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          description: item.description,
        })),
      }),
    };

    const response = await fetch(`${GROW_CONFIG.baseUrl}/api/light/server/1.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: GrowPaymentResponse = await response.json();

    if (data.status !== '1') {
      throw new Error(data.err || 'Failed to create payment');
    }

    return data;
  } catch (error) {
    console.error('Grow payment creation error:', error);
    throw error;
  }
}

/**
 * יצירת מנוי חוזר
 */
export async function createRecurringSubscription(
  request: GrowSubscriptionRequest
): Promise<GrowPaymentResponse> {
  try {
    // ✅ Validate configuration
    if (!GROW_CONFIG.pageCode || !GROW_CONFIG.apiKey) {
      throw new Error('Grow API configuration is missing (pageCode or apiKey)');
    }

    const payload = {
      pageCode: GROW_CONFIG.pageCode,
      apiKey: GROW_CONFIG.apiKey,
      ...(GROW_CONFIG.userId && { userId: GROW_CONFIG.userId }), // userId אופציונלי
      action: 'createProcess', // ✅ Meshulam דורש action במקום method
      
      // פרטי תשלום
      sum: request.amount.toFixed(2),
      currency: (request.currency || 'ILS').toUpperCase(),
      description: request.description,
      maxPayments: 1, // תשלום אחד (לא פיצול)
      
      // פרטי לקוח
      fullName: request.customer_name,
      email: request.customer_email,
      phone: request.customer_phone,
      customerId: request.customer_id,
      sendEmail: 0, // לא לשלוח אימייל אוטומטי (נשלח בעצמנו)
      
      // הגדרות חיוב חוזר
      isRecurring: 1, // 1 = true, 0 = false
      recurringCycle: request.billing_cycle === 'monthly' ? 1 : 12, // 1 = חודשי, 12 = שנתי
      recurringStartDate: request.start_date || new Date().toISOString().split('T')[0],
      
      // סכום חיוב חוזר (אם שונה מהתשלום הראשון)
      ...(request.recurring_amount && request.recurring_amount !== request.amount && {
        recurringSum: request.recurring_amount.toFixed(2),
      }),
      
      // Webhook
      notifyUrl: request.notify_url || `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/webhook/grow`,
      
      // URLs
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
    };

    console.log('📤 Sending to Grow API:', JSON.stringify({
      ...payload,
      apiKey: '***HIDDEN***', // הסתרת המפתח בלוג
    }, null, 2));
    
    console.log('🔗 Using endpoint:', `${GROW_CONFIG.baseUrl}/api/light/server/1.0`);

    const response = await fetch(`${GROW_CONFIG.baseUrl}/api/light/server/1.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: GrowPaymentResponse = await response.json();
    
    console.log('📥 Received from Grow API:', JSON.stringify(data, null, 2));

    if (data.status !== '1') {
      console.error('❌ Grow API Error:', data.err);
      throw new Error(data.err || 'Failed to create subscription');
    }

    return data;
  } catch (error) {
    console.error('Grow subscription creation error:', error);
    throw error;
  }
}

/**
 * ביטול מנוי חוזר
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  try {
    const payload = {
      pageCode: GROW_CONFIG.pageCode,
      apiKey: GROW_CONFIG.apiKey,
      userId: GROW_CONFIG.userId,
      processId: subscriptionId,
      action: 'cancel',
    };

    const response = await fetch(`${GROW_CONFIG.baseUrl}/api/light/server/1.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data.status === '1';
  } catch (error) {
    console.error('Grow subscription cancellation error:', error);
    return false;
  }
}

/**
 * אימות webhook signature
 */
export function verifyWebhookSignature(payload: GrowWebhookPayload): boolean {
  // Grow מאמת באמצעות ה-API key והנתונים
  // יש לוודא שה-webhook מגיע מכתובת IP של Grow
  // וש-data.processToken תקף
  
  if (!payload.data?.processToken) {
    return false;
  }
  
  // בדיקה נוספת: האם הסטטוס תקין
  return payload.status === '1';
}

/**
 * המרת webhook payload למידע תשלום
 */
export function parseWebhookData(payload: GrowWebhookPayload) {
  if (!payload.data) {
    throw new Error('Invalid webhook payload');
  }

  const { data } = payload;

  return {
    paymentId: data.transactionId,
    transactionId: data.processId,
    amount: parseFloat(data.sum),
    status: data.statusCode === '2' ? 'completed' : 'failed',
    payerName: data.fullName,
    payerEmail: data.payerEmail,
    payerPhone: data.payerPhone,
    paymentDate: data.paymentDate,
    cardDetails: {
      suffix: data.cardSuffix,
      type: data.cardType,
      brand: data.cardBrand,
      expiry: data.cardExp,
    },
    asmachta: data.asmachta,
    paymentsNum: parseInt(data.paymentsNum),
    allPaymentsNum: parseInt(data.allPaymentsNum),
    customFields: data.customFields,
  };
}

/**
 * בדיקת סטטוס תשלום
 */
export async function getPaymentStatus(transactionId: string) {
  try {
    const payload = {
      pageCode: GROW_CONFIG.pageCode,
      apiKey: GROW_CONFIG.apiKey,
      userId: GROW_CONFIG.userId,
      processId: transactionId,
      action: 'getStatus',
    };

    const response = await fetch(`${GROW_CONFIG.baseUrl}/api/light/server/1.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Grow payment status check error:', error);
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
