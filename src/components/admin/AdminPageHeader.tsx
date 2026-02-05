import React from "react";
import type { LucideIcon } from "lucide-react";

type HeaderTone = "blue" | "green" | "orange" | "red" | "purple" | "slate";

const toneClasses: Record<HeaderTone, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  red: { bg: "bg-red-100", text: "text-red-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
  slate: { bg: "bg-slate-100", text: "text-slate-600" },
};

export function AdminPageHeader({
  title,
  subtitle,
  icon: Icon,
  tone = "blue",
  action,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: HeaderTone;
  action?: React.ReactNode;
}) {
  const t = toneClasses[tone];

  return (
    <div className="flex items-center justify-between">
      <div className="text-right">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">{title}</h1>
        {subtitle ? <p className="text-slate-600">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-4">
        {action ? <div>{action}</div> : null}
        <div className={`w-16 h-16 ${t.bg} rounded-2xl flex items-center justify-center shadow-lg`}>
          <Icon size={32} className={t.text} />
        </div>
      </div>
    </div>
  );
}
