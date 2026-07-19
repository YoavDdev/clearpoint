'use client';

import { useState } from 'react';
import { Download, Loader2, Server } from 'lucide-react';

interface ExportInstallConfigProps {
  userId: string;
  customerName: string;
}

export default function ExportInstallConfig({ userId, customerName }: ExportInstallConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cfToken, setCfToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/export-install-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cfTunnelToken: cfToken || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const { config } = await res.json();

      // Download as JSON file
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clearpoint-config-${customerName.replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setIsOpen(false);
      setCfToken('');
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת קובץ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-sm border-2 border-orange-200 p-6 hover:shadow-lg hover:border-orange-400 transition-all text-right w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-right flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2 justify-end">
              <span>ייצא קובץ התקנה</span>
              <Server className="text-orange-600" size={22} />
            </h3>
            <p className="text-sm text-slate-600">JSON להתקנת Mini PC אוטומטית</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 text-orange-600 font-semibold group-hover:gap-3 transition-all">
          <span className="text-sm">ייצא עכשיו</span>
          <Download size={16} />
        </div>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl shadow-lg border-2 border-orange-300 p-6">
      <div className="flex items-center gap-2 justify-end mb-4">
        <h3 className="text-lg font-semibold text-slate-800">ייצוא קובץ התקנה</h3>
        <Server className="text-orange-600" size={22} />
      </div>

      <div className="space-y-4">
        <div className="text-right">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cloudflare Tunnel Token (אופציונלי)
          </label>
          <input
            type="text"
            value={cfToken}
            onChange={(e) => setCfToken(e.target.value)}
            placeholder="eyJ... (אפשר להשאיר ריק ולמלא אחרי)"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-left font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 mt-1">
            אם עדיין לא יצרת tunnel, אפשר למלא אחר כך בקובץ
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm text-right">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => { setIsOpen(false); setError(''); }}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span>הורד קובץ JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
