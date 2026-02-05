import React from "react";

export function AdminPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="max-w-7xl mx-auto">{children}</div>
  );
}
