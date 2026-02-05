'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FixedSizeList as List } from 'react-window';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPageShell } from '@/components/admin/AdminPageShell';
import { AdminPageTop } from '@/components/admin/AdminPageTop';
import { 
  CreditCard, 
  DollarSign, 
  User, 
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  Ban,
  Clock,
  Pause,
  Play,
  Trash2,
  Eye,
  ArrowLeft,
} from 'lucide-react';

interface RecurringPayment {
  id: string;
  user_id: string;
  plan_id: string | null;
  recurring_uid: string | null;
  customer_uid: string | null;
  card_token: string | null;
  recurring_type: number;
  recurring_range: number;
  number_of_charges: number;
  start_date: string;
  end_date: string | null;
  amount: number;
  currency_code: string;
  items: any[];
  is_active: boolean;
  is_valid: boolean;
  extra_info: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  last_charge_date: string | null;
  next_charge_date: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  plan?: {
    id: string;
    name: string;
    monthly_price: number;
    connection_type?: string;
  };
}

function RecurringPaymentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userIdFilter = searchParams.get('user_id');
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [customerInfo, setCustomerInfo] = useState<{full_name: string, email: string} | null>(null);
  const [syncing, setSyncing] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchPayments = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      params.set('status', filter);
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (userIdFilter) params.set('user_id', userIdFilter);

      const url = `/api/admin/recurring-payments/list?${params.toString()}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch');
      }
      
      setPayments(result.recurring_payments || []);
      setTotal(Number(result.total || 0));
    } catch (error) {
      console.error('❌ Error fetching payments:', error);
      alert(`שגיאה בטעינת מנויים: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    if (userIdFilter) {
      fetchCustomerInfo();
    }
  }, [userIdFilter, filter, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      fetchPayments();
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchCustomerInfo = async () => {
    try {
      const response = await fetch('/api/admin-get-users');
      const data = await response.json();
      if (data.success) {
        const customer = data.users.find((u: any) => u.id === userIdFilter);
        if (customer) {
          setCustomerInfo({ full_name: customer.full_name, email: customer.email });
        }
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  const clearUserFilter = () => {
    router.push('/admin/recurring-payments');
  };

  const handleSyncFromPayPlus = async () => {
    if (!confirm('האם לסנכרן את כל המנויים מ-PayPlus? זה עשוי לקחת זמן.')) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/admin/recurring-payments/sync-from-payplus', {
        method: 'POST',
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\nחדשים: ${result.synced}\nעודכנו: ${result.updated}\nדולגו: ${result.skipped}\nשגיאות: ${result.errors}\nסה"כ: ${result.total}`);
        setPage(0);
        fetchPayments(true);
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing from PayPlus:', error);
      alert(`שגיאה בסנכרון: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מנוי זה?')) return;

    try {
      const response = await fetch('/api/admin/recurring-payments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurring_payment_id: id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      alert('המנוי נמחק בהצלחה');
      fetchPayments(true);
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('שגיאה במחיקת המנוי');
    }
  };

  const handleToggleValid = async (id: string, currentValid: boolean) => {
    const action = currentValid ? 'להשעות' : 'להפעיל';
    if (!confirm(`האם אתה בטוח שברצונך ${action} מנוי זה?`)) return;

    try {
      const response = await fetch('/api/admin/recurring-payments/toggle-valid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recurring_payment_id: id, valid: !currentValid }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      alert(`המנוי ${!currentValid ? 'הופעל' : 'הושעה'} בהצלחה`);
      fetchPayments(true);
    } catch (error) {
      console.error('Error toggling valid:', error);
      alert('שגיאה בעדכון המנוי');
    }
  };

  const stats = useMemo(() => {
    const active = payments.filter(p => p.is_active && p.is_valid).length;
    const paused = payments.filter(p => p.is_active && !p.is_valid).length;
    const cancelled = payments.filter(p => !p.is_active).length;
    const totalRevenue = payments
      .filter(p => p.is_active && p.is_valid)
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      pageTotal: payments.length,
      total,
      active,
      paused,
      cancelled,
      totalRevenue,
    };
  }, [payments, total]);

  const getStatusBadge = (payment: RecurringPayment) => {
    if (!payment.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3" />
          מבוטל
        </span>
      );
    }
    if (!payment.is_valid) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
          <Clock className="w-3 h-3" />
          מושהה
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="w-3 h-3" />
        פעיל
      </span>
    );
  };

  const getRecurringTypeText = (type: number, range: number) => {
    const types = { 0: 'יומי', 1: 'שבועי', 2: 'חודשי' };
    const typeText = types[type as keyof typeof types] || 'לא ידוע';
    return range > 1 ? `כל ${range} ${typeText}` : typeText;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDaysUntilCharge = (dateString: string) => {
    const days = Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const Row = ({ index, style }: { index: number; style: any }) => {
    const payment = payments[index];
    if (!payment) return null;
    const nextCharge = payment.next_charge_date ? formatDate(payment.next_charge_date) : '—';
    const lastCharge = payment.last_charge_date ? formatDate(payment.last_charge_date) : '—';
    const daysUntilCharge = payment.next_charge_date ? getDaysUntilCharge(payment.next_charge_date) : null;
    const amountText = `₪${payment.amount.toFixed(0)}`;

    return (
      <div
        style={style}
        dir="ltr"
        className={`grid grid-cols-12 gap-3 items-center px-4 border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
      >
        <div className="col-span-1 flex gap-1 justify-start" dir="ltr">
          <Link
            href={`/admin/customers/${payment.user_id}`}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
            title="צפה בלקוח"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {payment.is_active && (
            <button
              onClick={() => handleToggleValid(payment.id, payment.is_valid)}
              className={`p-2 rounded-lg transition-all ${
                payment.is_valid
                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
              title={payment.is_valid ? 'השהה' : 'הפעל'}
            >
              {payment.is_valid ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            onClick={() => handleDelete(payment.id)}
            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
            title="מחק"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="col-span-1" dir="rtl">
          <div className="text-sm text-slate-900 text-right">{lastCharge}</div>
        </div>

        <div className="col-span-2" dir="rtl">
          <div className="text-sm text-slate-900 text-right">{nextCharge}</div>
          {daysUntilCharge !== null && (
            <div className="text-xs text-slate-500 text-right">
              {daysUntilCharge > 0 ? `בעוד ${daysUntilCharge} ימים` : daysUntilCharge === 0 ? 'היום' : 'עבר'}
            </div>
          )}
        </div>

        <div className="col-span-2" dir="rtl">
          {getStatusBadge(payment)}
        </div>

        <div className="col-span-1" dir="rtl">
          <div className="font-bold text-slate-900 text-right">{amountText}</div>
        </div>

        <div className="col-span-2 min-w-0" dir="rtl">
          <div className="text-sm text-slate-900 truncate text-right">
            {payment.plan?.name || '—'}
            {payment.plan?.connection_type && (
              <span className="text-xs text-slate-500 mr-2">
                ({payment.plan.connection_type === 'sim' ? 'SIM' : payment.plan.connection_type === 'wifi' ? 'Wi‑Fi' : payment.plan.connection_type})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 truncate text-right">{getRecurringTypeText(payment.recurring_type, payment.recurring_range)}</div>
        </div>

        <div className="col-span-3 min-w-0" dir="rtl">
          <div className="font-bold text-slate-900 truncate text-right">{payment.user?.full_name || 'לא ידוע'}</div>
          <div className="text-xs text-slate-600 truncate text-right">{payment.user?.email || '—'}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען מנויים חוזרים...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminPageShell>
      <AdminPageTop
        spacing="compact"
        scrollMode="single"
        header={(
          <AdminPageHeader
            title="מנויים חוזרים"
            subtitle="צפייה במנויים חוזרים מ-PayPlus"
            icon={CreditCard}
            tone="purple"
            action={(
              <div className="flex gap-2">
                <button
                  onClick={handleSyncFromPayPlus}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-purple-600 to-pink-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'מסנכרן...' : 'סנכרן מ-PayPlus'}
                </button>
                <button
                  onClick={() => fetchPayments(true)}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  רענן
                </button>
              </div>
            )}
          />
        )}
        stats={(
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-slate-600 text-sm">סה"כ מנויים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">בעמוד: {stats.pageTotal}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-slate-600 text-sm">פעילים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="text-orange-600" size={24} />
              </div>
              <div>
                <p className="text-slate-600 text-sm">מושהים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.paused}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Ban className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-slate-600 text-sm">מבוטלים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.cancelled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-slate-600 text-sm">הכנסה חודשית</p>
                <p className="text-2xl font-bold text-slate-900">₪{stats.totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </div>
          </div>
        )}
        controls={(
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="חיפוש לפי שם, אימייל או טלפון..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              {(['all', 'active', 'paused', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setPage(0);
                    setFilter(f);
                  }}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? 'הכל' : f === 'active' ? 'פעילים' : f === 'paused' ? 'מושהים' : 'מבוטלים'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-slate-600">
              עמוד {page + 1} מתוך {totalPages} • סה"כ {total}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(0);
                  setPageSize(Number(e.target.value));
                }}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>

              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50"
              >
                הקודם
              </button>
              <button
                onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                disabled={page + 1 >= totalPages}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50"
              >
                הבא
              </button>
            </div>
          </div>
          </div>
        )}
      />

      {userIdFilter && customerInfo && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">מציג מנויים עבור:</p>
              <p className="text-lg font-bold text-blue-700">{customerInfo.full_name}</p>
              <p className="text-xs text-blue-600">{customerInfo.email}</p>
            </div>
          </div>
          <button
            onClick={clearUserFilter}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            כל המנויים
          </button>
        </div>
      )}

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
          <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">אין מנויים חוזרים</h3>
          <p className="text-slate-600">
            {searchTerm || filter !== 'all' 
              ? 'לא נמצאו מנויים התואמים לחיפוש'
              : 'עדיין לא נוצרו מנויים חוזרים במערכת'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div dir="ltr" className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
            <div className="col-span-1" dir="rtl">פעולות</div>
            <div className="col-span-1 text-right" dir="rtl">חיוב אחרון</div>
            <div className="col-span-2 text-right" dir="rtl">חיוב הבא</div>
            <div className="col-span-2 text-right" dir="rtl">סטטוס</div>
            <div className="col-span-1 text-right" dir="rtl">סכום</div>
            <div className="col-span-2 text-right" dir="rtl">תוכנית</div>
            <div className="col-span-3 text-right" dir="rtl">לקוח</div>
          </div>

          <List
            height={520}
            itemCount={payments.length}
            itemSize={56}
            width={'100%'}
          >
            {Row as any}
          </List>
        </div>
      )}
    </AdminPageShell>
  );
}

export default function RecurringPaymentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">טוען מנויים...</p>
        </div>
      </div>
    }>
      <RecurringPaymentsContent />
    </Suspense>
  );
}
