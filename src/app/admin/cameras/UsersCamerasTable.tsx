"use client";

import Link from "next/link";
import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { CamerasTable } from "./CamerasTable";
import { AlertCircle, Camera, CheckCircle, ChevronDown, Plus, Search, User as UserIcon } from "lucide-react";

type CameraRow = {
  id: string;
  user_id: string;
  user: {
    full_name: string;
  } | null;
};

type UserSummary = {
  user_id: string;
  full_name: string;
  camera_count: number;
};

export function UsersCamerasTable({ cameras }: { cameras: CameraRow[] }) {
  const [search, setSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<Record<string, any>>({});
  const [healthLoading, setHealthLoading] = useState(true);

  const ListOuterElement = useMemo(() => {
    const Comp = forwardRef<HTMLDivElement, any>((props, ref) => {
      return (
        <div
          ref={ref}
          {...props}
          style={{
            ...(props.style || {}),
            scrollbarGutter: "stable",
          }}
        />
      );
    });
    Comp.displayName = "UsersCamerasListOuterElement";
    return Comp;
  }, []);

  const users: UserSummary[] = useMemo(() => {
    const byUser = new Map<string, UserSummary>();

    for (const cam of cameras) {
      const userId = cam.user_id || "__unknown__";
      const fullName = cam.user?.full_name || "ללא לקוח";

      const existing = byUser.get(userId);
      if (existing) {
        existing.camera_count += 1;
      } else {
        byUser.set(userId, {
          user_id: userId,
          full_name: fullName,
          camera_count: 1,
        });
      }
    }

    return [...byUser.values()].sort((a, b) => b.camera_count - a.camera_count);
  }, [cameras]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.full_name.toLowerCase().includes(q));
  }, [users, search]);

  const parseDate = (raw: unknown) => {
    if (!raw) return null;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
    if (typeof raw === 'string' || typeof raw === 'number') {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  };

  const getCameraAggregateStatus = (cameraId: string) => {
    const health = healthData[cameraId];
    if (!health || !health.success) return 'offline' as const;

    const streamStatus = health.health?.stream_status?.toLowerCase();
    if (streamStatus === 'missing' || streamStatus === 'stale' || streamStatus === 'error') {
      return 'issue' as const;
    }

    const lastChecked = parseDate(health.health?.last_checked);
    if (lastChecked) {
      const diffMinutes = (Date.now() - lastChecked.getTime()) / (1000 * 60);
      if (diffMinutes > 60) return 'offline' as const;
    }

    return 'ok' as const;
  };

  useEffect(() => {
    let mounted = true;

    const fetchHealthData = async () => {
      if (!cameras.length) {
        if (mounted) {
          setHealthData({});
          setHealthLoading(false);
        }
        return;
      }

      try {
        const cameraIds = cameras.map((c) => c.id);
        const res = await fetch('/api/camera-health/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cameraIds }),
        });

        const data = await res.json();
        const healthByCameraId = data?.healthByCameraId || {};
        const next: Record<string, any> = {};
        for (const id of cameraIds) {
          const row = healthByCameraId[id];
          next[id] = row ? { success: true, health: row } : { success: false };
        }
        if (mounted) {
          setHealthData(next);
          setHealthLoading(false);
        }
      } catch {
        if (mounted) setHealthLoading(false);
      }
    };

    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [cameras]);

  const camerasByUserId = useMemo(() => {
    const byUser = new Map<string, CameraRow[]>();
    for (const cam of cameras) {
      const userId = cam.user_id || "__unknown__";
      const arr = byUser.get(userId);
      if (arr) arr.push(cam);
      else byUser.set(userId, [cam]);
    }
    return byUser;
  }, [cameras]);

  const userStatus = useMemo(() => {
    const map = new Map<string, 'ok' | 'offline' | 'issue' | 'loading'>();

    for (const u of users) {
      if (u.user_id === '__unknown__') {
        map.set(u.user_id, 'offline');
        continue;
      }

      if (healthLoading) {
        map.set(u.user_id, 'loading');
        continue;
      }

      const cams = camerasByUserId.get(u.user_id) || [];
      let anyIssue = false;
      let anyOffline = false;
      for (const cam of cams) {
        const s = getCameraAggregateStatus(cam.id);
        if (s === 'issue') anyIssue = true;
        else if (s === 'offline') anyOffline = true;
      }

      if (anyIssue) map.set(u.user_id, 'issue');
      else if (anyOffline) map.set(u.user_id, 'offline');
      else map.set(u.user_id, 'ok');
    }

    return map;
  }, [users, camerasByUserId, healthLoading, healthData]);

  const Row = ({ index, style }: { index: number; style: any }) => {
    const user = filtered[index];
    if (!user) return null;

    const isExpanded = expandedUserId === user.user_id;

    return (
      <div
        style={style}
        dir="rtl"
        className={`grid grid-cols-[3fr_1.1fr_0.9fr_1fr] gap-3 items-center px-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
          index % 2 === 0 ? "bg-white" : "bg-slate-50"
        }`}
        onClick={() => {
          if (user.user_id === "__unknown__") return;
          setExpandedUserId((prev) => (prev === user.user_id ? null : user.user_id));
        }}
      >
        <div className="min-w-0" dir="rtl">
          <div className="font-bold text-slate-900 truncate text-right" title={user.full_name}>
            {user.full_name}
          </div>
          <div className="text-xs text-slate-500 truncate text-right" title={user.user_id}>
            {user.user_id === "__unknown__" ? "—" : user.user_id}
          </div>
        </div>

        <div className="min-w-0 text-right" dir="rtl">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium bg-slate-50 text-slate-700 border-slate-200">
            <Camera className="w-3 h-3" />
            {user.camera_count}
          </span>
        </div>

        <div className="min-w-0 flex justify-end" dir="ltr">
          {user.user_id !== "__unknown__" ? (
            (() => {
              const s = userStatus.get(user.user_id) || 'loading';
              if (s === 'loading') {
                return (
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-500"
                    title="בודק סטטוס מצלמות"
                  >
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
                  </span>
                );
              }

              if (s === 'ok') {
                return (
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-green-50 border border-green-200 text-green-700"
                    title="כל המצלמות תקינות"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </span>
                );
              }

              if (s === 'issue') {
                return (
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-red-700"
                    title="יש תקלה באחת המצלמות"
                  >
                    <AlertCircle className="w-4 h-4" />
                  </span>
                );
              }

              return (
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-600"
                  title="יש מצלמה לא מקוונת"
                >
                  <AlertCircle className="w-4 h-4" />
                </span>
              );
            })()
          ) : (
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-400"
              title="אין לקוח משויך"
            >
              <UserIcon className="w-4 h-4" />
            </span>
          )}
        </div>

        <div className="min-w-0" dir="ltr">
          <div className="flex gap-1 justify-start" dir="ltr">
            {user.user_id !== "__unknown__" ? (
              <button
                type="button"
                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                title={isExpanded ? "סגור" : "פתח"}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedUserId((prev) => (prev === user.user_id ? null : user.user_id));
                }}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <span
                className="p-2 bg-slate-100 text-slate-400 rounded-lg"
                title="אין לקוח משויך"
              >
                <UserIcon className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div dir="rtl">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 mb-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש לפי שם לקוח..."
                className="w-full pr-10 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto lg:overflow-x-visible">
          <div className="w-full min-w-[820px] lg:min-w-0">
            <div
              dir="rtl"
              className="grid grid-cols-[3fr_1.1fr_0.9fr_1fr] gap-3 items-center px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700"
            >
              <div className="min-w-0 text-right">לקוח</div>
              <div className="min-w-0 text-right">מצלמות</div>
              <div className="min-w-0 text-right">סטטוס</div>
              <div className="min-w-0 text-right">פעולות</div>
            </div>

            <List
              height={560}
              itemCount={filtered.length}
              itemSize={56}
              width={"100%"}
              outerElementType={ListOuterElement as any}
            >
              {Row as any}
            </List>
          </div>
        </div>
      </div>

      {expandedUserId && expandedUserId !== "__unknown__" ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">
                {filtered.find((u) => u.user_id === expandedUserId)?.full_name || '—'}
              </div>
              <div className="text-xs text-slate-500">מצלמות</div>
            </div>

            <Link
              href={`/admin/cameras/new?user_id=${encodeURIComponent(expandedUserId)}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all hover:shadow-lg group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>הוסף מצלמה ללקוח</span>
            </Link>
          </div>

          <CamerasTable
            cameras={(camerasByUserId.get(expandedUserId) || []) as any}
            variant="embedded"
          />
        </div>
      ) : null}
    </div>
  );
}
