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
    status: boolean | 'error';
    code?: number;
    description?: string;
    data?: {
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
  data?: any;
}

function parsePayPlusDate(value: unknown): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) return asDate;

  const m = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = m[4] ? Number(m[4]) : 0;
  const minute = m[5] ? Number(m[5]) : 0;
  const second = m[6] ? Number(m[6]) : 0;

  const d = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export class PayPlusClient {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.PAYPLUS_API_KEY || '';
    this.secretKey = process.env.PAYPLUS_SECRET_KEY || '';

    this.baseUrl =
      process.env.PAYPLUS_USE_MOCK === 'true'
        ? 'https://restapidev.payplus.co.il/api/v1.0'
        : 'https://restapi.payplus.co.il/api/v1.0';

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

      // Check if PayPlus returned an error
      if (data.results?.status === 'error') {
        console.error(`❌ PayPlus API error: ${data.results.description} (code: ${data.results.code})`);
        return null;
      }

      if (!data.results?.status || !data.results.data) {
        console.error('❌ PayPlus API returned unsuccessful status or missing data');
        return null;
      }

      const recurringData = data.results.data;
      console.log('📊 Recurring Data:', JSON.stringify(recurringData, null, 2));

      let lastPaymentDate = recurringData.last_payment_date;
      if (!lastPaymentDate) {
        lastPaymentDate = await this.getLastChargeDateFromChargesList(recurringUid);
      }

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
        last_payment_date: lastPaymentDate,
        cancelled_at: recurringData.cancelled_date,
        payment_failures: recurringData.payment_failures || 0,
      };
    } catch (error) {
      console.error('❌ PayPlus API error:', error);
      return null;
    }
  }

  private async getLastChargeDateFromChargesList(recurringUid: string): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${this.baseUrl}/RecurringPayments/${recurringUid}/ViewRecurringCharge`,
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
        const errorText = await response.text().catch(() => '');
        console.error(
          `❌ PayPlus charges list error: ${response.status} ${response.statusText} body=${errorText}`
        );
        return undefined;
      }

      const payload: any = await response.json();

      if (payload?.results?.status === 'error') {
        console.error(
          `❌ PayPlus charges list API error: ${payload?.results?.description} (code: ${payload?.results?.code})`
        );
        return undefined;
      }

      const maybeCharges =
        payload?.data ??
        payload?.results?.data ??
        payload?.results?.data?.charges ??
        payload?.results?.data?.items ??
        payload?.results?.data?.list;

      const charges: any[] = Array.isArray(maybeCharges)
        ? maybeCharges
        : Array.isArray(maybeCharges?.data)
          ? maybeCharges.data
          : [];

      const pickDate = (c: any): string | undefined =>
        c?.last_payment_date ??
        c?.payment_date ??
        c?.charge_date ??
        c?.transaction_date ??
        c?.created_at ??
        c?.created_date ??
        c?.date;

      let best: { date: Date; raw: string } | null = null;
      for (const c of charges) {
        const raw = pickDate(c);
        const parsed = parsePayPlusDate(raw);
        if (!raw || !parsed) continue;
        if (!best || parsed.getTime() > best.date.getTime()) {
          best = { date: parsed, raw: String(raw) };
        }
      }

      return best?.raw;
    } catch {
      return undefined;
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
