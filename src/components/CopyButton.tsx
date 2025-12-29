"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105"
        title={`העתק ${label || 'טקסט'}`}
      >
        {copied ? (
          <>
            <Check size={14} />
            <span>הועתק!</span>
          </>
        ) : (
          <>
            <Copy size={14} />
            <span>העתק</span>
          </>
        )}
      </button>
      <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-mono text-sm truncate max-w-xs">
        {text}
      </div>
    </div>
  );
}
