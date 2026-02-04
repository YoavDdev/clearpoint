import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

function normalizeDateParam(param: string, isEnd: boolean) {
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.exec(param);
  if (dateOnlyMatch) {
    const [y, m, d] = param.split('-').map((v) => Number(v));
    const date = isEnd
      ? new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
      : new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    return date.toISOString();
  }

  const parsed = new Date(param);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function csvEscape(value: unknown) {
  const str = value === null || value === undefined ? "" : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function extractProviderTransactionId(payment: any): string {
  const direct = payment?.provider_transaction_id;
  if (direct) return String(direct);

  const md = payment?.metadata;
  if (!md) return "";

  const candidates = [
    md.provider_transaction_id,
    md.transaction_id,
    md.transactionId,
    md.transaction_uid,
    md.transactionUid,
    md.approval_num,
    md.approvalNum,
    md.voucher_num,
    md.voucherNum,
  ];

  const found = candidates.find((v) => v !== null && v !== undefined && String(v).trim() !== "");
  return found ? String(found) : "";
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const documentType = searchParams.get("document_type");
    const subscription = searchParams.get("subscription");
    const dateFromRaw = searchParams.get("date_from");
    const dateToRaw = searchParams.get("date_to");
    const dateFieldRaw = searchParams.get("date_field");

    const dateField = (dateFieldRaw === 'paid_at' || dateFieldRaw === 'created_at')
      ? dateFieldRaw
      : 'paid_at';

    let query = supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        document_type,
        status,
        total_amount,
        currency,
        created_at,
        paid_at,
        has_subscription,
        user:users (
          full_name,
          email
        ),
        payment:payments!invoices_payment_id_fkey (
          id,
          status,
          paid_at,
          provider_transaction_id,
          metadata
        )
      `)
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (documentType && documentType !== "all") {
      query = query.eq("document_type", documentType);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (subscription === 'true') {
      query = query.eq('has_subscription', true);
    } else if (subscription === 'false') {
      query = query.eq('has_subscription', false);
    }

    if (dateFromRaw) {
      const dateFrom = normalizeDateParam(dateFromRaw, false);
      if (!dateFrom) {
        return NextResponse.json(
          { success: false, error: "Invalid date_from" },
          { status: 400 }
        );
      }
      query = query.gte(dateField, dateFrom);
    }

    if (dateToRaw) {
      const dateTo = normalizeDateParam(dateToRaw, true);
      if (!dateTo) {
        return NextResponse.json(
          { success: false, error: "Invalid date_to" },
          { status: 400 }
        );
      }
      query = query.lte(dateField, dateTo);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error("Error exporting invoices:", error);
      return NextResponse.json(
        { success: false, error: "Failed to export invoices" },
        { status: 500 }
      );
    }

    const rows = invoices || [];

    const headers = [
      "document_type",
      "invoice_number",
      "status",
      "created_at",
      "paid_at",
      "customer_name",
      "customer_email",
      "total_amount",
      "currency",
      "is_recurring",
      "payment_status",
      "provider_transaction_id",
      "payment_id",
      "invoice_id"
    ];

    const csvLines: string[] = [];
    csvLines.push(headers.map(csvEscape).join(","));

    for (const inv of rows as any[]) {
      const providerTransactionId = extractProviderTransactionId(inv.payment);
      const line = [
        inv.document_type,
        inv.invoice_number,
        inv.status,
        inv.created_at,
        inv.paid_at,
        inv.user?.full_name || "",
        inv.user?.email || "",
        inv.total_amount,
        inv.currency,
        inv.has_subscription ? "true" : "false",
        inv.payment?.status || "",
        providerTransactionId,
        inv.payment?.id || "",
        inv.id,
      ];

      csvLines.push(line.map(csvEscape).join(","));
    }

    const csv = csvLines.join("\n");

    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const filename = `clearpoint-invoices_${y}-${m}-${d}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    console.error("Error in invoices export API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
