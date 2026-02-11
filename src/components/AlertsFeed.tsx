'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell, BellOff, Check, CheckCheck, Eye, User, Car, Bug,
  Shield, Flame, Clock, Camera, Loader2, RefreshCw, Filter,
  ChevronDown, ChevronUp, Image as ImageIcon, AlertTriangle, Download, Trash2, Video,
  Briefcase, Sword
} from 'lucide-react';

interface Alert {
  id: string;
  camera_id: string;
  detection_type: string;
  confidence: number | null;
  snapshot_url: string | null;
  message: string | null;
  metadata: any;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  camera?: { id: string; name: string } | null;
  rule?: { id: string; name: string } | null;
}

const DETECTION_ICONS: Record<string, any> = {
  person: User,
  vehicle: Car,
  animal: Bug,
  suspicious_object: Briefcase,
  weapon: Sword,
  motion: Eye,
  any: Shield,
  fire: Flame,
};

const DETECTION_LABELS: Record<string, string> = {
  person: 'אדם',
  vehicle: 'רכב',
  animal: 'חיה',
  suspicious_object: 'חפץ חשוד',
  weapon: 'נשק',
  motion: 'תנועה',
  any: 'כללי',
  fire: 'אש/עשן',
};

const DETECTION_COLORS: Record<string, string> = {
  person: 'blue',
  vehicle: 'orange',
  animal: 'green',
  suspicious_object: 'yellow',
  weapon: 'red',
  motion: 'purple',
  any: 'red',
  fire: 'red',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} דק׳`;
  if (diffHour < 24) return `לפני ${diffHour} שעות`;
  if (diffDay === 1) return 'אתמול';
  return `לפני ${diffDay} ימים`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

async function downloadSnapshot(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

export default function AlertsFeed({ isAdmin = false }: { isAdmin?: boolean }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all'); // all, unacknowledged, person, vehicle, animal
  const [showFilters, setShowFilters] = useState(false);

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter === 'unacknowledged') params.set('unacknowledged', 'true');
      else if (filter !== 'all') params.set('detection_type', filter);

      const res = await fetch(`/api/alerts?${params}`);
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts || []);
        setUnacknowledgedCount(data.unacknowledged_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchAlerts(true), 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId }),
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a =>
          a.id === alertId ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a
        ));
        setUnacknowledgedCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Acknowledge failed:', err);
    }
  };

  const acknowledgeAll = async () => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledge_all: true }),
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true, acknowledged_at: new Date().toISOString() })));
        setUnacknowledgedCount(0);
      }
    } catch (err) {
      console.error('Acknowledge all failed:', err);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('למחוק את ההתראה?')) return;
    try {
      const res = await fetch(`/api/alerts?id=${alertId}`, { method: 'DELETE' });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        if (expandedAlert === alertId) setExpandedAlert(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const deleteAllAlerts = async () => {
    if (!confirm('למחוק את כל ההתראות? פעולה זו לא ניתנת לביטול.')) return;
    try {
      const res = await fetch('/api/alerts?all=true', { method: 'DELETE' });
      if (res.ok) {
        setAlerts([]);
        setUnacknowledgedCount(0);
        setExpandedAlert(null);
      }
    } catch (err) {
      console.error('Delete all failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Group alerts by date
  const grouped: Record<string, Alert[]> = {};
  for (const alert of alerts) {
    const dateKey = formatDate(alert.created_at);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(alert);
  }

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2">
          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
            {alerts.length} התראות
          </div>
          {unacknowledgedCount > 0 && (
            <div className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              {unacknowledgedCount} חדשות
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {unacknowledgedCount > 0 && (
            <button
              onClick={acknowledgeAll}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              סמן הכל כנקרא
            </button>
          )}
          {alerts.length > 0 && (
            <button
              onClick={deleteAllAlerts}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              מחק הכל
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            סינון
          </button>
          <button
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-xl">
          {[
            { key: 'all', label: 'הכל' },
            { key: 'unacknowledged', label: 'חדשות' },
            { key: 'person', label: 'אדם' },
            { key: 'vehicle', label: 'רכב' },
            { key: 'animal', label: 'חיה' },
            { key: 'motion', label: 'תנועה' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {alerts.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-lg font-medium">אין התראות</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter !== 'all' ? 'נסה לשנות את הסינון' : 'כשיזוהה אירוע — ההתראה תופיע כאן'}
          </p>
        </div>
      )}

      {/* Alerts grouped by date */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([dateKey, dateAlerts]) => (
          <div key={dateKey}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium px-2">{dateKey}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-2">
              {dateAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  expanded={expandedAlert === alert.id}
                  onExpand={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                  onAcknowledge={() => acknowledgeAlert(alert.id)}
                  onDelete={() => deleteAlert(alert.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────
function AlertCard({
  alert, expanded, onExpand, onAcknowledge, onDelete
}: {
  alert: Alert;
  expanded: boolean;
  onExpand: () => void;
  onAcknowledge: () => void;
  onDelete: () => void;
}) {
  const Icon = DETECTION_ICONS[alert.detection_type] || Shield;
  const label = DETECTION_LABELS[alert.detection_type] || alert.detection_type;
  const color = DETECTION_COLORS[alert.detection_type] || 'slate';

  const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', ring: 'ring-green-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-200' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-200' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200' },
  };

  const c = colorClasses[color] || colorClasses.slate;

  // Build link to recordings page, 10 seconds before alert time
  const getRecordingLink = (a: Alert) => {
    const d = new Date(a.created_at);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const secondsSinceMidnight = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    const seekTo = Math.max(0, secondsSinceMidnight - 10); // 10 seconds before
    return `/dashboard?mode=recordings&camera_id=${a.camera_id}&date=${date}&t=${seekTo}`;
  };

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        !alert.acknowledged ? 'border-blue-200 shadow-sm ring-1 ring-blue-100' : 'border-slate-100'
      }`}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onExpand}>
        {/* Unread dot */}
        <div className="w-2 shrink-0">
          {!alert.acknowledged && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
          <Icon className={`w-4.5 h-4.5 ${c.text}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
              {label}
            </span>
            {alert.confidence && (
              <span className="text-xs text-slate-400">
                {Math.round(alert.confidence * 100)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {alert.camera?.name || 'מצלמה'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(alert.created_at)}
            </span>
            <span className="text-slate-400">{timeAgo(alert.created_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!alert.acknowledged && (
            <button
              onClick={(e) => { e.stopPropagation(); onAcknowledge(); }}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
              title="סמן כנקרא"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          {alert.snapshot_url && (
            <div className="p-1.5 text-slate-400">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-3">
          {/* Message */}
          {alert.message && (
            <p className="text-sm text-slate-700">{alert.message}</p>
          )}

          {/* Snapshot */}
          {alert.snapshot_url && (
            <div className="relative rounded-lg overflow-hidden bg-black group">
              <img
                src={alert.snapshot_url}
                alt="Snapshot"
                className="w-full max-h-64 object-contain"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSnapshot(
                    alert.snapshot_url!,
                    `clearpoint-${alert.detection_type}-${new Date(alert.created_at).toISOString().replace(/[:.]/g, '-')}.jpg`
                  );
                }}
                className="absolute top-2 left-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="הורד תמונה"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-slate-400">סוג</p>
              <p className="font-medium text-slate-700">{label}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-slate-400">ביטחון</p>
              <p className="font-medium text-slate-700">
                {alert.confidence ? `${Math.round(alert.confidence * 100)}%` : '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-slate-400">מצלמה</p>
              <p className="font-medium text-slate-700">{alert.camera?.name || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-slate-400">זמן</p>
              <p className="font-medium text-slate-700">
                {formatTime(alert.created_at)} • {formatDate(alert.created_at)}
              </p>
            </div>
            {alert.rule?.name && (
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-400">חוק</p>
                <p className="font-medium text-slate-700">{alert.rule.name}</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-slate-400">סטטוס</p>
              <p className={`font-medium ${alert.acknowledged ? 'text-green-600' : 'text-blue-600'}`}>
                {alert.acknowledged ? 'נקרא' : 'חדש'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-1">
            <a
              href={getRecordingLink(alert)}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors"
            >
              <Video className="w-3 h-3" />
              צפה בהקלטה
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              מחק התראה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
