'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  User, 
  Mail, 
  Phone,
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
  Plus,
  X,
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
  };
}

export default function RecurringPaymentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userIdFilter = searchParams.get('user_id');
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerInfo, setCustomerInfo] = useState<{full_name: string, email: string} | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchPayments = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const url = userIdFilter 
        ? `/api/admin/recurring-payments/list?user_id=${userIdFilter}` 
        : '/api/admin/recurring-payments/list';
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch');
      }
      
      setPayments(result.recurring_payments || []);
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
  }, [userIdFilter]);

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

  const fetchUsersAndPlans = async () => {
    try {
      // Fetch customers from PayPlus via our API route (to avoid CORS)
      const [customersRes, plansRes] = await Promise.all([
        fetch('/api/payplus-customers'),
        fetch('/api/plans'),
      ]);
      
      const customersData = await customersRes.json();
      const plansData = await plansRes.json();
      
      console.log('📦 Customers data:', customersData);
      console.log('📦 Plans data:', plansData);
      
      // API returns { success, customers }
      if (customersData.success && customersData.customers) {
        console.log('✅ Setting customers:', customersData.customers.length);
        setUsers(customersData.customers);
      } else {
        console.log('⚠️ No customers found');
      }
      
      // Plans API returns { success, plans }
      if (plansData.success && plansData.plans) {
        setPlans(plansData.plans);
      }
    } catch (error) {
      console.error('Error fetching users/plans:', error);
      alert('שגיאה בטעינת נתונים. אנא נסה שוב.');
    }
  };

  const handleCreateRecurring = async (formData: any) => {
    if (!formData.user_id || !formData.amount) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/admin/recurring-payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      alert('המנוי נוצר בהצלחה!');
      setShowCreateModal(false);
      fetchPayments(true);
    } catch (error) {
      console.error('Error creating recurring payment:', error);
      alert(`שגיאה ביצירת המנוי: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setCreating(false);
    }
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
        alert(`✅ ${result.message}\n\nסונכרן: ${result.synced}\nדולג (כבר קיימים): ${result.skipped}\nשגיאות: ${result.errors}`);
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

  const filteredPayments = payments
    .filter(p => {
      if (filter === 'active') return p.is_active && p.is_valid;
      if (filter === 'cancelled') return !p.is_active;
      return true;
    })
    .filter(p => 
      searchTerm === '' || 
      (p.user?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.user?.phone || '').includes(searchTerm)
    );

  const stats = {
    total: payments.length,
    active: payments.filter(p => p.is_active && p.is_valid).length,
    paused: payments.filter(p => p.is_active && !p.is_valid).length,
    cancelled: payments.filter(p => !p.is_active).length,
    totalRevenue: payments
      .filter(p => p.is_active && p.is_valid)
      .reduce((sum, p) => sum + p.amount, 0),
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">מנויים חוזרים</h1>
            <p className="text-slate-600">ניהול מנויים חוזרים מהמערכת</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                fetchUsersAndPlans();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold"
            >
              <Plus className="w-4 h-4" />
              צור מנוי חדש
            </button>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">סה"כ מנויים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">פעילים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">מושהים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.paused}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Ban className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">מבוטלים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.cancelled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">הכנסה חודשית</p>
                <p className="text-2xl font-bold text-slate-900">₪{stats.totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>

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
              {(['all', 'active', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? 'הכל' : f === 'active' ? 'פעילים' : 'מבוטלים'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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

      {filteredPayments.length === 0 ? (
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
        <div className="space-y-4">
          {filteredPayments.map((payment) => {
            const daysUntilCharge = payment.next_charge_date ? getDaysUntilCharge(payment.next_charge_date) : null;
            
            return (
              <div key={payment.id} className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {payment.user?.full_name || 'לא ידוע'}
                          </h3>
                          {payment.plan && (
                            <p className="text-sm text-slate-600">{payment.plan.name}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            {getRecurringTypeText(payment.recurring_type, payment.recurring_range)}
                            {payment.number_of_charges > 0 && ` • ${payment.number_of_charges} חיובים`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          {payment.user?.email || 'לא ידוע'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4" />
                          {payment.user?.phone || 'לא ידוע'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(payment)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">סכום</p>
                      <p className="text-xl font-bold text-slate-900">
                        ₪{payment.amount.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 mb-1">חיוב הבא</p>
                      {payment.next_charge_date ? (
                        <>
                          <p className="text-sm font-medium text-slate-900">
                            {formatDate(payment.next_charge_date)}
                          </p>
                          {daysUntilCharge !== null && (
                            <p className="text-xs text-slate-600">
                              {daysUntilCharge > 0 ? `בעוד ${daysUntilCharge} ימים` : daysUntilCharge === 0 ? 'היום' : 'עבר'}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-400">לא הוגדר</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 mb-1">תאריך התחלה</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(payment.start_date)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 mb-1">נוצר</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <Link
                      href={`/admin/customers/${payment.user_id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      צפה בלקוח
                    </Link>
                    
                    {payment.is_active && (
                      <button
                        onClick={() => handleToggleValid(payment.id, payment.is_valid)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                          payment.is_valid
                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {payment.is_valid ? (
                          <>
                            <Pause className="w-4 h-4" />
                            השהה
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            הפעל
                          </>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDelete(payment.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      מחק
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Recurring Payment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-slate-900">צור מנוי חוזר חדש</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  user_id: formData.get('user_id'),
                  plan_id: formData.get('plan_id') || null,
                  customer_uid: formData.get('customer_uid'),
                  card_token: formData.get('card_token'),
                  recurring_type: parseInt(formData.get('recurring_type') as string) || 2,
                  recurring_range: parseInt(formData.get('recurring_range') as string) || 1,
                  number_of_charges: parseInt(formData.get('number_of_charges') as string) || 0,
                  start_date: new Date(formData.get('start_date') as string).toISOString(),
                  amount: parseFloat(formData.get('amount') as string),
                  currency_code: 'ILS',
                  items: [
                    {
                      name: formData.get('item_name') || 'מנוי חודשי',
                      quantity: 1,
                      price: parseFloat(formData.get('amount') as string),
                      vat_type: 0,
                    }
                  ],
                  notes: formData.get('notes'),
                };
                handleCreateRecurring(data);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    בחר לקוח מ-PayPlus *
                  </label>
                  <select
                    name="customer_uid"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- בחר לקוח --</option>
                    {users.map((customer) => (
                      <option key={customer.uid} value={customer.uid}>
                        {customer.customer_name} ({customer.customer_email || 'אין אימייל'})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">לקוחות מ-PayPlus</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    בחר תוכנית
                  </label>
                  <select
                    name="plan_id"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- ללא תוכנית --</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} (₪{plan.monthly_price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Card Token (PayPlus)
                  </label>
                  <input
                    type="text"
                    name="card_token"
                    placeholder="אופציונלי - אם יש כרטיס שמור"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    💡 אם אין כרטיס שמור, הלקוח יצטרך להזין בפעם הראשונה
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    סכום לחיוב *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    step="0.01"
                    min="0"
                    placeholder="99.00"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    שם הפריט
                  </label>
                  <input
                    type="text"
                    name="item_name"
                    defaultValue="מנוי חודשי"
                    placeholder="מנוי חודשי"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    סוג מנוי
                  </label>
                  <select
                    name="recurring_type"
                    defaultValue="2"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">יומי</option>
                    <option value="1">שבועי</option>
                    <option value="2">חודשי</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    תדירות
                  </label>
                  <input
                    type="number"
                    name="recurring_range"
                    defaultValue="1"
                    min="1"
                    placeholder="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">לדוגמה: 1 = כל חודש, 2 = כל חודשיים</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    מספר חיובים
                  </label>
                  <input
                    type="number"
                    name="number_of_charges"
                    defaultValue="0"
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">0 = ללא הגבלה</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    תאריך התחלה *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  הערות
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="הערות נוספות..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-l from-green-600 to-emerald-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg font-bold disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      יוצר מנוי...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      צור מנוי
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium disabled:opacity-50"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
