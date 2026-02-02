'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

interface SendInvoiceEmailButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export default function SendInvoiceEmailButton({ 
  invoiceId, 
  invoiceNumber 
}: SendInvoiceEmailButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSendEmail = async () => {
    if (isSending) return;

    setIsSending(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/admin/send-invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        console.error('Failed to send email:', data.error);
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <button
      onClick={handleSendEmail}
      disabled={isSending}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
        status === 'success'
          ? 'bg-green-600 text-white hover:bg-green-700'
          : status === 'error'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-emerald-600 text-white hover:bg-emerald-700'
      } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={`שלח מייל עם קבלה #${invoiceNumber}`}
    >
      {isSending ? (
        <>
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>שולח...</span>
        </>
      ) : status === 'success' ? (
        <>
          <span>✓</span>
          <span>נשלח!</span>
        </>
      ) : status === 'error' ? (
        <>
          <span>✗</span>
          <span>שגיאה</span>
        </>
      ) : (
        <>
          <Mail size={14} />
          <span>שלח מייל</span>
        </>
      )}
    </button>
  );
}
