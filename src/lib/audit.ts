import { createClient } from '@supabase/supabase-js';

type AuditAction =
  | 'user.create'
  | 'user.delete'
  | 'user.update'
  | 'payment.create'
  | 'recurring.create'
  | 'recurring.cancel'
  | 'invoice.create'
  | 'invoice.update'
  | 'camera.create'
  | 'camera.delete'
  | 'settings.update';

interface AuditLogEntry {
  admin_email: string;
  action: AuditAction;
  target_type: string;
  target_id: string;
  details?: Record<string, any>;
}

/**
 * Log an admin action to the audit_log table.
 * Fire-and-forget — never throws, never blocks the caller.
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    await supabase.from('audit_log').insert({
      admin_email: entry.admin_email,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id,
      details: entry.details || null,
    });
  } catch (error) {
    console.error('⚠️ Audit log failed (non-blocking):', error);
  }
}
