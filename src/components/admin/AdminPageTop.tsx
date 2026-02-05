import React from "react";

export function AdminPageTop({
  header,
  stats,
  controls,
  scrollMode = "sections",
  scrollbar = "default",
  spacing = "default",
}: {
  header: React.ReactNode;
  stats?: React.ReactNode;
  controls?: React.ReactNode;
  scrollMode?: "sections" | "single" | "none";
  scrollbar?: "default" | "hidden";
  spacing?: "default" | "compact";
}) {
  const hasStats = stats !== undefined && stats !== null;
  const hasControls = controls !== undefined && controls !== null;

  const scrollbarClass =
    scrollbar === "hidden"
      ? "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      : "";

  const lgGridRowsClass =
    scrollMode === "single"
      ? "lg:grid-rows-[auto_minmax(0,1fr)]"
      : hasStats && hasControls
        ? "lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)]"
        : "lg:grid-rows-[auto_minmax(0,1fr)]";

  const spacingClass = spacing === "compact" ? "mb-6 gap-4" : "mb-8 gap-6";
  const innerStackGapClass = spacing === "compact" ? "gap-4" : "gap-6";

  return (
    <div className={`grid lg:h-[480px] ${lgGridRowsClass} ${spacingClass}`}>
      <div>{header}</div>

      {scrollMode === "single" ? (
        <div className="min-h-0">
          <div className={`max-h-full overflow-auto ${scrollbarClass}`}>
            <div className={`grid ${innerStackGapClass}`}>
              {hasStats ? <div>{stats}</div> : null}
              {hasControls ? <div>{controls}</div> : null}
            </div>
          </div>
        </div>
      ) : scrollMode === "none" ? (
        <>
          {hasStats ? (
            <div className="min-h-0 overflow-hidden">{stats}</div>
          ) : null}
          {hasControls ? (
            <div className="min-h-0 overflow-hidden">{controls}</div>
          ) : null}
        </>
      ) : (
        <>
          {hasStats ? (
            <div className="min-h-0">
              <div className={`max-h-full overflow-auto ${scrollbarClass}`}>{stats}</div>
            </div>
          ) : null}
          {hasControls ? (
            <div className="min-h-0">
              <div className={`max-h-full overflow-auto ${scrollbarClass}`}>{controls}</div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
