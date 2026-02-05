import React from "react";

export function AdminTableTop({
  stats,
  controls,
}: {
  stats?: React.ReactNode;
  controls?: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:min-h-[360px] lg:grid-rows-[minmax(152px,auto)_minmax(96px,auto)]">
      <div>{stats}</div>
      <div>{controls}</div>
    </div>
  );
}
