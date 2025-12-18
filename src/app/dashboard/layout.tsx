import DashboardSidebar from "@/components/DashboardSidebar";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Suspense fallback={<div className="w-64 bg-white border-l border-slate-200"></div>}>
        <DashboardSidebar />
      </Suspense>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
