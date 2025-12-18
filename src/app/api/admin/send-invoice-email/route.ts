import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendInvoiceEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        user:users (
          full_name,
          email
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const { data: items } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true });

    if (!invoice.user?.email) {
      return NextResponse.json(
        { error: 'Customer email not found' },
        { status: 400 }
      );
    }

    const isMonthlyRecurring = items?.length === 1 && items[0].item_type === 'subscription';

    const emailData = {
      customerName: invoice.user.full_name || invoice.user.email,
      customerEmail: invoice.user.email,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: new Date(invoice.created_at).toLocaleDateString('he-IL'),
      totalAmount: invoice.total_amount,
      items: items?.map(item => ({
        name: item.item_name,
        description: item.item_description || '',
        quantity: item.quantity,
        price: item.unit_price,
      })) || [],
      invoiceUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoice.id}`,
      isMonthlyRecurring,
    };

    const success = await sendInvoiceEmail(emailData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Invoice email sent successfully',
        email: invoice.user.email,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
