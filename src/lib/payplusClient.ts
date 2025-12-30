/**
 * PayPlus API Client
 * Documentation: https://payplus.co.il/api-documentation/
 */

interface PayPlusRecurringStatus {
  status: 'active' | 'cancelled' | 'suspended' | 'expired';
  customer_uid: string;
  recurring_uid: string;
  amount: number;
  next_payment_date?: string;
  last_payment_date?: string;
  cancelled_at?: string;
  payment_failures?: number;
}

interface PayPlusAPIResponse {
  results: {
    status: boolean;
    data: {
      status_code: string;
      recurring_status?: string;
      customer_uid: string;
      amount: number;
      next_payment_date?: string;
      last_payment_date?: string;
      cancelled_date?: string;
      payment_failures?: number;
    };
  };
}

export class PayPlusClient {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = 'https://restapi.payplus.co.il/api/v1.0';

  constructor() {
    this.apiKey = process.env.PAYPLUS_API_KEY || '';
    this.secretKey = process.env.PAYPLUS_SECRET_KEY || '';

    if (!this.apiKey || !this.secretKey) {
      console.warn('⚠️ PayPlus API keys not configured');
    }
  }

  /**
   * Check recurring payment status
   * GET /RecurringPayments/ViewRecurring/{recurring_uid}
   */
  async getRecurringStatus(recurringUid: string): Promise<PayPlusRecurringStatus | null> {
    try {
      console.log(`🔍 Checking PayPlus status for recurring: ${recurringUid}`);
      console.log(`🔑 API Key configured: ${!!this.apiKey}`);
      console.log(`🔑 Secret Key configured: ${!!this.secretKey}`);

      const response = await fetch(
        `${this.baseUrl}/RecurringPayments/${recurringUid}/ViewRecurring`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
            'secret-key': this.secretKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ PayPlus API error: ${response.status} ${response.statusText}`);
        console.error(`❌ PayPlus error body:`, errorText);
        return null;
      }

      const data: PayPlusAPIResponse = await response.json();
      
      console.log('📦 PayPlus API Response:', JSON.stringify(data, null, 2));

      if (!data.results?.status) {
        console.error('❌ PayPlus API returned unsuccessful status');
        return null;
      }

      const recurringData = data.results.data;
      console.log('📊 Recurring Data:', JSON.stringify(recurringData, null, 2));

      // Map PayPlus status codes to our status
      let status: 'active' | 'cancelled' | 'suspended' | 'expired' = 'active';
      
      if (recurringData.recurring_status === 'cancelled' || recurringData.cancelled_date) {
        status = 'cancelled';
      } else if (recurringData.recurring_status === 'suspended') {
        status = 'suspended';
      } else if (recurringData.recurring_status === 'expired') {
        status = 'expired';
      }

      console.log(`✅ PayPlus status for ${recurringUid}: ${status}`);

      return {
        status,
        customer_uid: recurringData.customer_uid,
        recurring_uid: recurringUid,
        amount: recurringData.amount,
        next_payment_date: recurringData.next_payment_date,
        last_payment_date: recurringData.last_payment_date,
        cancelled_at: recurringData.cancelled_date,
        payment_failures: recurringData.payment_failures || 0,
      };
    } catch (error) {
      console.error('❌ PayPlus API error:', error);
      return null;
    }
  }

  /**
   * Cancel recurring payment
   * POST /RecurringPayments/CancelRecurring/{recurring_uid}
   */
  async cancelRecurring(recurringUid: string): Promise<boolean> {
    try {
      console.log(`🛑 Cancelling PayPlus recurring: ${recurringUid}`);

      const response = await fetch(
        `${this.baseUrl}/RecurringPayments/CancelRecurring/${recurringUid}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
            'secret-key': this.secretKey,
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ PayPlus cancel error: ${response.status}`);
        return false;
      }

      const data = await response.json();
      console.log('✅ PayPlus recurring cancelled successfully');
      return data.results?.status === true;
    } catch (error) {
      console.error('❌ PayPlus cancel error:', error);
      return false;
    }
  }
}

// Singleton instance
export const payplusClient = new PayPlusClient();
