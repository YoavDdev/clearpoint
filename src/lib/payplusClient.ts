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

interface RecurringFailure {
  recurring_uid: string;
  customer_uid: string;
  customer_name: string;
  date_of_failure: string;
  date_to_charge: string;
  amount: number;
  card_number: string;
  card_expiry: string;
  uid: string;
  status_code: string | null;
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
  private terminalUid: string;

  constructor() {
    this.apiKey = process.env.PAYPLUS_API_KEY || '';
    this.secretKey = process.env.PAYPLUS_SECRET_KEY || '';
    this.terminalUid = process.env.PAYPLUS_TERMINAL_UID || '';

    this.baseUrl =
      process.env.PAYPLUS_USE_MOCK === 'true'
        ? 'https://restapidev.payplus.co.il/api/v1.0'
        : 'https://restapi.payplus.co.il/api/v1.0';

    if (!this.apiKey || !this.secretKey) {
      console.warn('⚠️ PayPlus API keys not configured');
    }

    if (!this.terminalUid) {
      console.warn('⚠️ PayPlus terminal UID not configured (PAYPLUS_TERMINAL_UID)');
    }
  }

  async getRecurringLastChargeDate(recurringUid: string): Promise<string | undefined> {
    return this.getLastChargeDateFromChargesList(recurringUid);
  }

  private withTerminalUid(url: string) {
    if (!this.terminalUid) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}terminal_uid=${encodeURIComponent(this.terminalUid)}`;
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
        this.withTerminalUid(`${this.baseUrl}/RecurringPayments/${recurringUid}/ViewRecurring`),
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

      // PayPlus responses are not consistent across endpoints/environments.
      // We support both:
      // 1) { results: { status: true, data: {...} } }
      // 2) { status_code: '000', ... } (flat payload)
      // 3) { data: { status_code: '000', ... } }
      const resultsStatus = (data as any)?.results?.status;
      if (resultsStatus === 'error') {
        const desc = (data as any)?.results?.description;
        const code = (data as any)?.results?.code;
        console.error(`❌ PayPlus API error: ${desc} (code: ${code})`);
        return null;
      }

      const recurringData: any =
        (data as any)?.results?.data ?? (data as any)?.data ?? (data as any);

      const statusCode = recurringData?.status_code;
      const okByResults = typeof resultsStatus === 'boolean' ? resultsStatus : undefined;
      const okByStatusCode = typeof statusCode === 'string' ? statusCode === '000' : undefined;

      if (!recurringData || (okByResults === false && okByStatusCode !== true)) {
        console.error('❌ PayPlus API returned unsuccessful status or missing data');
        return null;
      }

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

  async getRecurringChargesDebug(recurringUid: string): Promise<{
    ok: boolean;
    httpStatus?: number;
    resultsStatus?: any;
    resultsCode?: any;
    resultsDescription?: any;
    chargesCount?: number;
    sampleChargeKeys?: string[];
    dateCandidates?: Record<string, unknown>;
  }> {
    try {
      const response = await fetch(
        this.withTerminalUid(`${this.baseUrl}/RecurringPayments/${recurringUid}/ViewRecurringCharge`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
            'secret-key': this.secretKey,
          },
        }
      );

      const httpStatus = response.status;
      const payload: any = await response.json().catch(() => null);

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

      const sample = charges?.[0];

      const pick = (obj: any, key: string) => (obj && key in obj ? obj[key] : undefined);
      const dateCandidates = sample
        ? {
            last_payment_date: pick(sample, 'last_payment_date'),
            payment_date: pick(sample, 'payment_date'),
            charge_date: pick(sample, 'charge_date'),
            transaction_date: pick(sample, 'transaction_date'),
            created_at: pick(sample, 'created_at'),
            created_date: pick(sample, 'created_date'),
            date: pick(sample, 'date'),
          }
        : undefined;

      return {
        ok: response.ok && payload?.results?.status !== 'error',
        httpStatus,
        resultsStatus: payload?.results?.status,
        resultsCode: payload?.results?.code,
        resultsDescription: payload?.results?.description,
        chargesCount: charges.length,
        sampleChargeKeys: sample ? Object.keys(sample).slice(0, 30) : [],
        dateCandidates,
      };
    } catch {
      return { ok: false };
    }
  }

  private async getLastChargeDateFromChargesList(recurringUid: string): Promise<string | undefined> {
    try {
      const response = await fetch(
        this.withTerminalUid(`${this.baseUrl}/RecurringPayments/${recurringUid}/ViewRecurringCharge`),
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
   * Get recurring payment failures report
   * GET /RecurringPaymentsReports/Failures
   * Returns list of failed charges with recurring_uid, date_of_failure, amount, status
   */
  async getRecurringFailures(fromDate?: string): Promise<RecurringFailure[]> {
    try {
      if (!this.terminalUid) {
        console.warn('⚠️ Cannot fetch failures: PAYPLUS_TERMINAL_UID not configured');
        return [];
      }

      const params = new URLSearchParams({
        terminal_uid: this.terminalUid,
        currency_code: 'ILS',
      });

      if (fromDate) {
        params.set('from_date', fromDate);
      } else {
        // Default: last 45 days
        const d = new Date();
        d.setDate(d.getDate() - 45);
        params.set('from_date', d.toISOString().split('T')[0]);
      }

      const url = `${this.baseUrl}/RecurringPaymentsReports/Failures?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
          'secret-key': this.secretKey,
        },
      });

      if (!response.ok) {
        console.error(`❌ PayPlus Failures API error: ${response.status}`);
        return [];
      }

      const result = await response.json();
      const failures: any[] = result?.data || [];

      return failures.map((f: any) => ({
        recurring_uid: f.recurring_uid,
        customer_uid: f.customer_uid,
        customer_name: f.customer_name,
        date_of_failure: f.date_of_failure,
        date_to_charge: f.date_to_charge,
        amount: f.amount,
        card_number: f.card_number,
        card_expiry: f.card_expiry,
        uid: f.uid,
        status_code: f.status?.status_code || null,
      }));
    } catch (error) {
      console.error('❌ getRecurringFailures error:', error);
      return [];
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
