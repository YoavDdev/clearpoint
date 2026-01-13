'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface RecurringPayment {
  uid: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: number;
  currency: string;
  status: 'active' | 'cancelled' | 'paused' | 'failed';
  next_charge_date: string;
  created_at: string;
  total_charges?: number;
  linked_user?: {
    id: string;
    full_name: string;
    email: string;
    plan_id: string;
  } | null;
  has_active_subscription?: boolean;
  subscription_created?: boolean;
}

export default function RecurringPaymentsPage() {
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayments = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      console.log('🔵 Fetching recurring payments...');
      const response = await fetch('/api/admin/recurring-payments');
      console.log('🔵 Response status:', response.status);
      console.log('🔵 Response headers:', response.headers);
      
      // קריאת הגוף בכל מקרה
      const responseText = await response.text();
      console.log('🔵 Response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error(`שגיאת פורמט: ${responseText.substring(0, 100)}`);
      }
      
      if (!response.ok) {
        console.error('❌ API Error:', result);
        const errorMessage = result.error || result.details || result.message || 'Failed to fetch';
        throw new Error(errorMessage);
      }
      
      console.log('✅ Received data:', result);
      setPayments(result.data || []);
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
  }, []);

  const handleCancelPayment = async (uid: string) => {
    if (!confirm('האם אתה בטוח שברצונך לבטל מנוי זה?')) return;

    try {
      const response = await fetch('/api/admin/recurring-payments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });

      if (!response.ok) throw new Error('Failed to cancel');
      
      alert('המנוי בוטל בהצלחה');
      fetchPayments(true);
    } catch (error) {
      console.error('Error cancelling payment:', error);
      alert('שגיאה בביטול המנוי');
    }
  };

  const filteredPayments = payments
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => 
      searchTerm === '' || 
      p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer_phone.includes(searchTerm)
    );

  const stats = {
    total: payments.length,
    active: payments.filter(p => p.status === 'active').length,
    cancelled: payments.filter(p => p.status === 'cancelled').length,
    totalRevenue: payments
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      active: { icon: CheckCircle, text: 'פעיל', color: 'bg-green-50 text-green-700 border-green-200' },
      cancelled: { icon: XCircle, text: 'מבוטל', color: 'bg-red-50 text-red-700 border-red-200' },
      paused: { icon: Clock, text: 'מושהה', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      failed: { icon: AlertCircle, text: 'נכשל', color: 'bg-gray-50 text-gray-700 border-gray-200' },
    };
    
    const config = configs[status as keyof typeof configs] || configs.failed;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">מנויים חוזרים</h1>
            <p className="text-slate-600">ניהול מנויים חוזרים מ-PayPlus</p>
          </div>
          <button
            onClick={() => fetchPayments(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            רענן
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                <p className="text-slate-600 text-sm">מנויים פעילים</p>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">מנויים מבוטלים</p>
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

        {/* Filters */}
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

      {/* Payments List */}
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
            const daysUntilCharge = getDaysUntilCharge(payment.next_charge_date);
            
            return (
              <div key={payment.uid} className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900">{payment.customer_name}</h3>
                          <p className="text-xs text-slate-500">UID: {payment.uid}</p>
                          
                          {/* סטטוס קישור */}
                          <div className="flex items-center gap-2 mt-1">
                            {payment.linked_user ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                  <CheckCircle className="w-3 h-3" />
                                  מקושר למשתמש
                                </span>
                                {payment.subscription_created && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                                    ⚡ מנוי נוצר
                                  </span>
                                )}
                                {payment.has_active_subscription && !payment.subscription_created && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium border border-cyan-200">
                                    ✅ מנוי קיים
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                                <AlertCircle className="w-3 h-3" />
                                לא מקושר
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          {payment.customer_email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4" />
                          {payment.customer_phone}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-left">
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">סכום חודשי</p>
                      <p className="text-xl font-bold text-slate-900">
                        ₪{payment.amount.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 mb-1">חיוב הבא</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(payment.next_charge_date)}
                      </p>
                      <p className="text-xs text-slate-600">
                        {daysUntilCharge > 0 ? `בעוד ${daysUntilCharge} ימים` : 'היום'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 mb-1">תאריך יצירה</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 mb-1">חיובים שבוצעו</p>
                      <p className="text-sm font-medium text-slate-900">
                        {payment.total_charges || 0} תשלומים
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
