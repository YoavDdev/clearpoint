'use client';

import SummaryCard from './SummaryCard';
import {
  BadgeCheck,
  Camera,
  Clock,
  Database,
  Download,
  HelpCircle,
  MonitorSmartphone,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MiniNavbar() {
  const pathname = usePathname();
  const camerasLength = 4;

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setVisible(y < 80); // Show only if at top
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-[58px] z-40 w-full bg-white/60 backdrop-blur-md border-b border-gray-200 transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
<div className="overflow-x-auto scrollbar-hide w-full px-2 py-3">
  <div className="flex gap-4 min-w-max md:justify-center md:mx-auto">
          <SummaryCard
            title="מצלמות"
            value="לחץ כאן"
            tooltip="עמוד המצלמות"
            icon={<MonitorSmartphone className="w-4 h-4" />}
            href="/dashboard"
            active={pathname === "/dashboard"}
          />
          <SummaryCard
            title="החבילה שלך"
            value="7 ימי גיבוי בענן"
            tooltip="ניהול המנוי שלך"
            icon={<BadgeCheck className="w-4 h-4" />}
            href="/dashboard/plan"
            active={pathname === "/dashboard/plan"}
          />
          <SummaryCard
            title="תמיכה"
            value="לחץ כאן"
            tooltip="עבור לעמוד התמיכה"
            icon={<HelpCircle className="w-4 h-4" />}
            href="/dashboard/support"
            active={pathname === "/dashboard/support"}
          />
          <SummaryCard
            title="הורדות"
            value="עבור לקבצים"
            tooltip="צפה או הורד קטעי וידאו"
            icon={<Download className="w-4 h-4" />}
            href="/dashboard/footage"
            active={pathname.startsWith("/dashboard/footage")}
          />
          <SummaryCard
            title="שימוש בענן"
            value="2.4GB / 10GB"
            tooltip="שימוש נפח אחסון"
            icon={<Database className="w-4 h-4" />}
          />
          <SummaryCard
            title="מצלמות פעילות"
            value={`${camerasLength} מתוך 4`}
            tooltip="סטטוס מצלמות"
            icon={<Camera className="w-4 h-4" />}
          />
          <SummaryCard
            title="הקלטה אחרונה"
            value="20/05/2025 - 14:35"
            tooltip="מתי התבצעה ההקלטה האחרונה"
            icon={<Clock className="w-4 h-4" />}
          />
        </div>
      </div>
    </div>
  );
}
