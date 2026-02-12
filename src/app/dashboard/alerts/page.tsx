'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell, Plus, Pencil, Trash2, Power, PowerOff, Save, X,
  Clock, Shield, Car, Bug, Flame, Crosshair, User, Loader2,
  ChevronDown, ChevronUp, Camera, Mail, MessageSquare, Smartphone,
  Sparkles, Settings, Briefcase, Sword, Dog, Cat
} from 'lucide-react';
import AlertsFeed from '@/components/AlertsFeed';

interface AlertRule {
  id: string;
  name: string;
  detection_type: string;
  schedule_start: string | null;
  schedule_end: string | null;
  days_of_week: number[];
  notify_email: boolean;
  notify_sms: boolean;
  notify_push: boolean;
  cooldown_minutes: number;
  min_confidence: number;
  is_active: boolean;
  is_preset: boolean;
  preset_key: string | null;
  exclude_types: string[];
  camera_id: string | null;
  camera?: { id: string; name: string } | null;
  created_at: string;
}

interface CameraOption {
  id: string;
  name: string;
}

const DETECTION_TYPES = [
  { value: 'person', label: 'אדם', icon: User, color: 'blue' },
  { value: 'vehicle', label: 'רכב', icon: Car, color: 'orange' },
  { value: 'dog', label: 'כלב', icon: Dog, color: 'green' },
  { value: 'cat', label: 'חתול', icon: Cat, color: 'emerald' },
  { value: 'animal', label: 'חיה אחרת', icon: Bug, color: 'green' },
  { value: 'suspicious_object', label: 'חפץ חשוד', icon: Briefcase, color: 'yellow' },
  { value: 'weapon', label: 'סכין / חפץ חד', icon: Sword, color: 'red' },
  { value: 'fire', label: 'אש', icon: Flame, color: 'red' },
  { value: 'smoke', label: 'עשן', icon: Flame, color: 'gray' },
  { value: 'firearm', label: 'נשק חם', icon: Crosshair, color: 'red' },
  { value: 'any', label: 'כל זיהוי', icon: Shield, color: 'red' },
];

const EXCLUDABLE_TYPES = DETECTION_TYPES.filter(dt =>
  !['any'].includes(dt.value)
);

const DAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const PRESET_ICONS: Record<string, string> = {
  night_guard: '🌙',
  intrusion: '🚨',
  vehicle: '🚗',
  suspicious_object: '🎒',
  weapon: '🔪',
};

function getDetectionInfo(type: string) {
  return DETECTION_TYPES.find(d => d.value === type) || DETECTION_TYPES[3];
}

export default function AlertsSettingsPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'settings'>('feed');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // New rule form state
  const [newRule, setNewRule] = useState({
    name: '',
    detection_type: 'person',
    exclude_types: [] as string[],
    camera_id: '',
    schedule_start: '22:00',
    schedule_end: '06:00',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    notify_email: true,
    notify_sms: false,
    notify_push: true,
    cooldown_minutes: 5,
    min_confidence: 0.5,
    is_active: true,
  });

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/alert-rules');
      const data = await res.json();
      if (data.success) setRules(data.rules);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCameras = useCallback(async () => {
    try {
      const res = await fetch('/api/user-cameras');
      const data = await res.json();
      if (data.success) setCameras(data.cameras || []);
    } catch (err) {
      console.error('Failed to fetch cameras:', err);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchCameras();
  }, [fetchRules, fetchCameras]);

  const toggleRule = async (rule: AlertRule) => {
    setSaving(rule.id);
    try {
      const res = await fetch('/api/alert-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setSaving(null);
    }
  };

  const updateRule = async (ruleId: string, updates: Partial<AlertRule>) => {
    setSaving(ruleId);
    try {
      const res = await fetch('/api/alert-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...updates } : r));
        setEditingRule(null);
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setSaving(null);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('למחוק את החוק?')) return;
    setSaving(ruleId);
    try {
      const res = await fetch(`/api/alert-rules?id=${ruleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRules(prev => prev.filter(r => r.id !== ruleId));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setSaving(null);
    }
  };

  const createRule = async () => {
    if (!newRule.name.trim()) return;
    setSaving('new');
    try {
      const res = await fetch('/api/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRule,
          camera_id: newRule.camera_id || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRules();
        setShowNewForm(false);
        setNewRule({
          name: '', detection_type: 'person', exclude_types: [],
          camera_id: '',
          schedule_start: '22:00', schedule_end: '06:00',
          days_of_week: [0, 1, 2, 3, 4, 5, 6],
          notify_email: true, notify_sms: false, notify_push: true,
          cooldown_minutes: 5, min_confidence: 0.5, is_active: true,
        });
      }
    } catch (err) {
      console.error('Create failed:', err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const activeCount = rules.filter(r => r.is_active).length;
  const presetRules = rules.filter(r => r.is_preset);
  const customRules = rules.filter(r => !r.is_preset);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">התראות AI</h1>
            <p className="text-slate-500">זיהוי חכם של אירועים בזמן אמת</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'feed'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            התראות
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            הגדרות חוקים
            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
              {rules.length}
            </span>
          </button>
        </div>
      </div>

      {/* Feed Tab */}
      {activeTab === 'feed' && <AlertsFeed />}

      {/* Settings Tab */}
      {activeTab === 'settings' && (<div>

      {/* Preset Rules */}
      {presetRules.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            הגדרות מערכת
          </h2>
          <div className="space-y-3">
            {presetRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                cameras={cameras}
                saving={saving === rule.id}
                expanded={expandedRule === rule.id}
                editing={editingRule === rule.id}
                onToggle={() => toggleRule(rule)}
                onExpand={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                onEdit={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
                onSave={(updates) => updateRule(rule.id, updates)}
                onCancelEdit={() => setEditingRule(null)}
                onDelete={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Rules */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            חוקים מותאמים אישית
          </h2>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            חוק חדש
          </button>
        </div>

        {/* New Rule Form */}
        {showNewForm && (
          <NewRuleForm
            newRule={newRule}
            cameras={cameras}
            saving={saving === 'new'}
            onChange={setNewRule}
            onSave={createRule}
            onCancel={() => setShowNewForm(false)}
          />
        )}

        {customRules.length === 0 && !showNewForm && (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">אין חוקים מותאמים אישית</p>
            <p className="text-slate-400 text-sm">לחץ &quot;חוק חדש&quot; כדי ליצור</p>
          </div>
        )}

        <div className="space-y-3">
          {customRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              cameras={cameras}
              saving={saving === rule.id}
              expanded={expandedRule === rule.id}
              editing={editingRule === rule.id}
              onToggle={() => toggleRule(rule)}
              onExpand={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
              onEdit={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
              onSave={(updates) => updateRule(rule.id, updates)}
              onCancelEdit={() => setEditingRule(null)}
              onDelete={() => deleteRule(rule.id)}
            />
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          איך זה עובד?
        </h3>
        <ul className="text-purple-700 text-sm space-y-1">
          <li>• המערכת מנתחת את הוידאו מהמצלמות בזמן אמת</li>
          <li>• כשמזוהה אירוע שתואם לחוק שהגדרת — נשלחת התראה</li>
          <li>• ניתן להגדיר שעות פעילות, סוג זיהוי, ואיזו מצלמה</li>
          <li>• cooldown מונע הצפה של התראות חוזרות</li>
        </ul>
      </div>
      </div>)}
    </div>
  );
}

// ============================================================
// Rule Card Component
// ============================================================
function RuleCard({
  rule, cameras, saving, expanded, editing, onToggle, onExpand, onEdit, onSave, onCancelEdit, onDelete
}: {
  rule: AlertRule;
  cameras: CameraOption[];
  saving: boolean;
  expanded: boolean;
  editing: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<AlertRule>) => void;
  onCancelEdit: () => void;
  onDelete: (() => void) | null;
}) {
  const detection = getDetectionInfo(rule.detection_type);
  const Icon = detection.icon;
  const presetIcon = rule.preset_key ? PRESET_ICONS[rule.preset_key] : null;

  const [editForm, setEditForm] = useState({
    schedule_start: rule.schedule_start || '',
    schedule_end: rule.schedule_end || '',
    days_of_week: rule.days_of_week || [0, 1, 2, 3, 4, 5, 6],
    camera_id: rule.camera_id || '',
    cooldown_minutes: rule.cooldown_minutes,
    min_confidence: rule.min_confidence,
    notify_email: rule.notify_email,
    notify_sms: rule.notify_sms,
    notify_push: rule.notify_push,
    detection_type: rule.detection_type,
  });

  const scheduleLabel = rule.schedule_start && rule.schedule_end
    ? `${rule.schedule_start}–${rule.schedule_end}`
    : '24/7';

  const cameraLabel = rule.camera?.name || 'כל המצלמות';

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      rule.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-60'
    }`}>
      {/* Main Row */}
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={onExpand}>
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          rule.is_active
            ? 'bg-gradient-to-br from-blue-100 to-cyan-100'
            : 'bg-slate-100'
        }`}>
          {presetIcon ? (
            <span className="text-xl">{presetIcon}</span>
          ) : (
            <Icon className={`w-5 h-5 ${rule.is_active ? 'text-blue-600' : 'text-slate-400'}`} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 truncate">{rule.name}</p>
            {rule.is_preset && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full font-medium">
                מערכת
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Icon className="w-3 h-3" />
              {detection.label}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {scheduleLabel}
            </span>
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {cameraLabel}
            </span>
          </div>
        </div>

        {/* Toggle + Expand */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          disabled={saving}
          className={`p-2 rounded-lg transition-colors ${
            rule.is_active
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : rule.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {/* Expanded Details / Edit */}
      {expanded && (
        <div className="border-t border-slate-100 p-4">
          {editing ? (
            <EditRuleForm
              editForm={editForm}
              cameras={cameras}
              saving={saving}
              isPreset={rule.is_preset}
              onChange={setEditForm}
              onSave={() => onSave({
                ...editForm,
                camera_id: editForm.camera_id || null,
                schedule_start: editForm.schedule_start || null,
                schedule_end: editForm.schedule_end || null,
              })}
              onCancel={onCancelEdit}
            />
          ) : (
            <div className="space-y-3">
              {/* Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">סוג זיהוי</p>
                  <p className="font-medium text-slate-800">{detection.label}</p>
                </div>
                <div>
                  <p className="text-slate-500">שעות</p>
                  <p className="font-medium text-slate-800">{scheduleLabel}</p>
                </div>
                <div>
                  <p className="text-slate-500">מצלמה</p>
                  <p className="font-medium text-slate-800">{cameraLabel}</p>
                </div>
                <div>
                  <p className="text-slate-500">ימים</p>
                  <p className="font-medium text-slate-800">
                    {(rule.days_of_week || []).length === 7 ? 'כל יום' : (rule.days_of_week || []).map(d => DAY_LABELS[d]).join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">cooldown</p>
                  <p className="font-medium text-slate-800">{rule.cooldown_minutes} דקות</p>
                </div>
                <div>
                  <p className="text-slate-500">רגישות</p>
                  <p className="font-medium text-slate-800">{Math.round(rule.min_confidence * 100)}%</p>
                </div>
              </div>

              {/* Notification badges */}
              <div className="flex gap-2">
                {rule.notify_email && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg">
                    <Mail className="w-3 h-3" /> אימייל
                  </span>
                )}
                {rule.notify_sms && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs rounded-lg">
                    <MessageSquare className="w-3 h-3" /> SMS
                  </span>
                )}
                {rule.notify_push && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-lg">
                    <Smartphone className="w-3 h-3" /> Push
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> ערוך
                </button>
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> מחק
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Edit Rule Form
// ============================================================
function EditRuleForm({
  editForm, cameras, saving, isPreset, onChange, onSave, onCancel
}: {
  editForm: any;
  cameras: CameraOption[];
  saving: boolean;
  isPreset: boolean;
  onChange: (form: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const toggleDay = (day: number) => {
    const current = editForm.days_of_week || [];
    onChange({
      ...editForm,
      days_of_week: current.includes(day)
        ? current.filter((d: number) => d !== day)
        : [...current, day].sort(),
    });
  };

  return (
    <div className="space-y-4">
      {/* Detection Type */}
      {!isPreset && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">סוג זיהוי</label>
          <div className="flex flex-wrap gap-2">
            {DETECTION_TYPES.map(dt => (
              <button
                key={dt.value}
                onClick={() => onChange({ ...editForm, detection_type: dt.value, exclude_types: dt.value !== 'any' ? [] : (editForm.exclude_types || []) })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  editForm.detection_type === dt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <dt.icon className="w-3.5 h-3.5" />
                {dt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exclude Types (only when "any" is selected) */}
      {editForm.detection_type === 'any' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">החרגות (לא להתריע על)</label>
          <div className="flex flex-wrap gap-2">
            {EXCLUDABLE_TYPES.map(dt => {
              const excluded = (editForm.exclude_types || []).includes(dt.value);
              return (
                <button
                  key={dt.value}
                  onClick={() => {
                    const current = editForm.exclude_types || [];
                    onChange({
                      ...editForm,
                      exclude_types: excluded
                        ? current.filter((t: string) => t !== dt.value)
                        : [...current, dt.value],
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    excluded
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <dt.icon className="w-3.5 h-3.5" />
                  {dt.label}
                  {excluded && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-1">לחץ כדי להחריג סוג — למשל: החרג &quot;חתול&quot; כדי לא לקבל התראות על חתולים</p>
        </div>
      )}

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">התחלה</label>
          <input
            type="time"
            value={editForm.schedule_start}
            onChange={e => onChange({ ...editForm, schedule_start: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">סיום</label>
          <input
            type="time"
            value={editForm.schedule_end}
            onChange={e => onChange({ ...editForm, schedule_end: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400">השאר ריק ל-24/7</p>

      {/* Days */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ימים</label>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                (editForm.days_of_week || []).includes(i)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">מצלמה</label>
        <select
          value={editForm.camera_id}
          onChange={e => onChange({ ...editForm, camera_id: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">כל המצלמות</option>
          {cameras.map(cam => (
            <option key={cam.id} value={cam.id}>{cam.name}</option>
          ))}
        </select>
      </div>

      {/* Cooldown + Confidence */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">cooldown (דקות)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={editForm.cooldown_minutes}
            onChange={e => onChange({ ...editForm, cooldown_minutes: parseInt(e.target.value) || 5 })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">רגישות מינימלית</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={editForm.min_confidence}
              onChange={e => onChange({ ...editForm, min_confidence: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm font-medium text-slate-700 w-10 text-center">
              {Math.round(editForm.min_confidence * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">אופן התראה</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.notify_email}
              onChange={e => onChange({ ...editForm, notify_email: e.target.checked })}
              className="rounded"
            />
            <Mail className="w-3.5 h-3.5 text-blue-500" /> אימייל
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.notify_sms}
              onChange={e => onChange({ ...editForm, notify_sms: e.target.checked })}
              className="rounded"
            />
            <MessageSquare className="w-3.5 h-3.5 text-green-500" /> SMS
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.notify_push}
              onChange={e => onChange({ ...editForm, notify_push: e.target.checked })}
              className="rounded"
            />
            <Smartphone className="w-3.5 h-3.5 text-purple-500" /> Push
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          שמור
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm transition-colors"
        >
          <X className="w-4 h-4" /> ביטול
        </button>
      </div>
    </div>
  );
}

// ============================================================
// New Rule Form
// ============================================================
function NewRuleForm({
  newRule, cameras, saving, onChange, onSave, onCancel
}: {
  newRule: any;
  cameras: CameraOption[];
  saving: boolean;
  onChange: (form: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const toggleDay = (day: number) => {
    const current = newRule.days_of_week || [];
    onChange({
      ...newRule,
      days_of_week: current.includes(day)
        ? current.filter((d: number) => d !== day)
        : [...current, day].sort(),
    });
  };

  return (
    <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4 space-y-4">
      <h3 className="font-bold text-blue-800 flex items-center gap-2">
        <Plus className="w-4 h-4" /> חוק התראה חדש
      </h3>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">שם החוק</label>
        <input
          type="text"
          value={newRule.name}
          onChange={e => onChange({ ...newRule, name: e.target.value })}
          placeholder="למשל: שומר חצר"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      {/* Detection Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">סוג זיהוי</label>
        <div className="flex flex-wrap gap-2">
          {DETECTION_TYPES.map(dt => (
            <button
              key={dt.value}
              onClick={() => onChange({ ...newRule, detection_type: dt.value, exclude_types: dt.value !== 'any' ? [] : newRule.exclude_types })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                newRule.detection_type === dt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              <dt.icon className="w-3.5 h-3.5" />
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exclude Types (only when "any" is selected) */}
      {newRule.detection_type === 'any' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">החרגות (לא להתריע על)</label>
          <div className="flex flex-wrap gap-2">
            {EXCLUDABLE_TYPES.map(dt => {
              const excluded = (newRule.exclude_types || []).includes(dt.value);
              return (
                <button
                  key={dt.value}
                  onClick={() => {
                    const current = newRule.exclude_types || [];
                    onChange({
                      ...newRule,
                      exclude_types: excluded
                        ? current.filter((t: string) => t !== dt.value)
                        : [...current, dt.value],
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    excluded
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border'
                  }`}
                >
                  <dt.icon className="w-3.5 h-3.5" />
                  {dt.label}
                  {excluded && <X className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-1">לחץ כדי להחריג סוג — למשל: החרג &quot;חתול&quot; כדי לא לקבל התראות על חתולים</p>
        </div>
      )}

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">מ-שעה</label>
          <input
            type="time"
            value={newRule.schedule_start}
            onChange={e => onChange({ ...newRule, schedule_start: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">עד שעה</label>
          <input
            type="time"
            value={newRule.schedule_end}
            onChange={e => onChange({ ...newRule, schedule_end: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Days */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ימים</label>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                (newRule.days_of_week || []).includes(i)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">מצלמה</label>
        <select
          value={newRule.camera_id}
          onChange={e => onChange({ ...newRule, camera_id: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">כל המצלמות</option>
          {cameras.map(cam => (
            <option key={cam.id} value={cam.id}>{cam.name}</option>
          ))}
        </select>
      </div>

      {/* Cooldown + Confidence */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">cooldown (דקות)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={newRule.cooldown_minutes}
            onChange={e => onChange({ ...newRule, cooldown_minutes: parseInt(e.target.value) || 5 })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">רגישות מינימלית</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={newRule.min_confidence}
              onChange={e => onChange({ ...newRule, min_confidence: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm font-medium text-slate-700 w-10 text-center">
              {Math.round(newRule.min_confidence * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">אופן התראה</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={newRule.notify_email}
              onChange={e => onChange({ ...newRule, notify_email: e.target.checked })}
              className="rounded"
            />
            <Mail className="w-3.5 h-3.5 text-blue-500" /> אימייל
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={newRule.notify_sms}
              onChange={e => onChange({ ...newRule, notify_sms: e.target.checked })}
              className="rounded"
            />
            <MessageSquare className="w-3.5 h-3.5 text-green-500" /> SMS
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={newRule.notify_push}
              onChange={e => onChange({ ...newRule, notify_push: e.target.checked })}
              className="rounded"
            />
            <Smartphone className="w-3.5 h-3.5 text-purple-500" /> Push
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving || !newRule.name.trim()}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          צור חוק
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-100 text-sm transition-colors border"
        >
          <X className="w-4 h-4" /> ביטול
        </button>
      </div>
    </div>
  );
}
