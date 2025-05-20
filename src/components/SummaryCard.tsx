import { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

interface Props {
  title: string;
  value: string;
  icon?: ReactNode;
  href?: string; // optional, but will be guarded
  active?: boolean;
  tooltip?: string;
}

export default function SummaryCard({
  title,
  value,
  icon,
  href,
  active,
  tooltip,
}: Props) {
  const isLink = typeof href === "string";
  const tooltipText = tooltip || value || title;

  const baseClasses = clsx(
    "min-w-[200px] flex-shrink-0 flex items-center justify-between rounded-lg px-4 py-3 transition-all duration-200 ease-in-out",
    "border shadow-sm",
    isLink
      ? "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md cursor-pointer"
      : "bg-zinc-50 border-gray-200"
  );

  const activeClasses = active ? "border-indigo-500 bg-indigo-50" : "";

  const cardContent = (
    <div title={tooltipText} className={clsx(baseClasses, activeClasses)}>
      <div className="flex flex-col text-right">
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
      {icon && <div className="text-gray-400">{icon}</div>}
    </div>
  );

  return isLink ? <Link href={href}>{cardContent}</Link> : cardContent;
}
