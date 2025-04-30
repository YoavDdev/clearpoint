"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react"; // at the top


export default function ClientSidebar({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-gray-100 dark:bg-zinc-950 transition-all">
      {/* Toggle Button */}
      <button
  onClick={() => setSidebarOpen(!sidebarOpen)}
  className="fixed right-2 top-[25%] z-50 p-2 bg-white text-gray-900 dark:bg-zinc-800 dark:text-white border border-gray-200 dark:border-zinc-600 rounded-full shadow hover:scale-105 transition"
>
  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
</button>

  
      {/* Overlay (click to close) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
  
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />
  
      {/* Page content (pushed when sidebar is open) */}
      <div className={`transition-all duration-300 ${sidebarOpen ? "pr-64" : "pr-0"}`}>
        <main className="pt-4 px-4 sm:px-6">{children}</main>
      </div>
    </div>
  );
  
}
