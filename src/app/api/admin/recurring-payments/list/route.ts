import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status') || 'all';
    const q = (searchParams.get('q') || '').trim();
    const pageRaw = searchParams.get('page');
    const pageSizeRaw = searchParams.get('page_size');

    const page = Math.max(0, Number(pageRaw || 0) || 0);
    const pageSize = Math.min(200, Math.max(10, Number(pageSizeRaw || 50) || 50));
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let userIdsFromSearch: string[] | null = null;
    if (q) {
      const like = `%${q}%`;
      const { data: matchedUsers, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .limit(5000);

      if (usersError) {
        console.error('❌ Error searching users for recurring payments:', usersError);
        return NextResponse.json(
          { error: 'Failed to search users', details: usersError.message },
          { status: 500 }
        );
      }

      const ids = (matchedUsers || []).map((u: any) => u.id).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({
          success: true,
          recurring_payments: [],
          page,
          page_size: pageSize,
          total: 0,
        });
      }
      userIdsFromSearch = ids;
    }

    let query = supabaseAdmin
      .from('recurring_payments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (userIdsFromSearch) {
      query = query.in('user_id', userIdsFromSearch);
    }

    if (status === 'active') {
      query = query.eq('is_active', true).eq('is_valid', true);
    } else if (status === 'paused') {
      query = query.eq('is_active', true).eq('is_valid', false);
    } else if (status === 'cancelled') {
      query = query.eq('is_active', false);
    } else if (status !== 'all') {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 }
      );
    }

    const { data: payments, error, count } = await query.range(from, to);

    if (error) {
      console.error('❌ Error fetching recurring payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recurring payments', details: error.message },
        { status: 500 }
      );
    }

    const rows = payments || [];
    const uniqueUserIds = Array.from(new Set(rows.map((p: any) => p.user_id).filter(Boolean)));
    const uniquePlanIds = Array.from(new Set(rows.map((p: any) => p.plan_id).filter(Boolean)));

    const [usersRes, plansRes] = await Promise.all([
      uniqueUserIds.length
        ? supabaseAdmin
            .from('users')
            .select('id, full_name, email, phone, plan_id')
            .in('id', uniqueUserIds)
        : Promise.resolve({ data: [], error: null } as any),
      Promise.resolve({ data: [], error: null } as any),
    ]);

    if (usersRes.error) {
      console.error('❌ Error fetching users for recurring payments:', usersRes.error);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersRes.error.message },
        { status: 500 }
      );
    }

    const usersById = new Map<string, any>((usersRes.data || []).map((u: any) => [u.id, u]));

    const userPlanIds = Array.from(
      new Set((usersRes.data || []).map((u: any) => u.plan_id).filter(Boolean))
    );
    const mergedPlanIds = Array.from(new Set([...uniquePlanIds, ...userPlanIds]));

    const plansQueryRes = mergedPlanIds.length
      ? await supabaseAdmin
          .from('plans')
          .select('id, name, monthly_price, connection_type')
          .in('id', mergedPlanIds)
      : ({ data: [], error: null } as any);

    if (plansQueryRes.error) {
      console.error('❌ Error fetching plans for recurring payments:', plansQueryRes.error);
      return NextResponse.json(
        { error: 'Failed to fetch plans', details: plansQueryRes.error.message },
        { status: 500 }
      );
    }

    const plansById = new Map<string, any>((plansQueryRes.data || []).map((p: any) => [p.id, p]));

    const enriched = rows.map((p: any) => {
      const user = usersById.get(p.user_id) || null;
      const effectivePlanId = p.plan_id || user?.plan_id || null;
      return {
        ...p,
        user,
        plan: effectivePlanId ? (plansById.get(effectivePlanId) || null) : null,
      };
    });

    return NextResponse.json({
      success: true,
      recurring_payments: enriched,
      page,
      page_size: pageSize,
      total: count || 0,
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
