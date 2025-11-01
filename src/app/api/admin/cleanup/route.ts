import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    await logger.info("🧹 Starting data cleanup job...");

    // Load settings
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value, setting_type");

    const settings: Record<string, any> = {};
    settingsData?.forEach((setting) => {
      let value = setting.setting_value;
      if (setting.setting_type === 'number') {
        value = parseInt(value, 10);
      }
      settings[setting.setting_key] = value;
    });

    const dataRetentionDays = settings.data_retention_days || 30;
    const alertRetentionDays = settings.alert_retention_days || 14;

    await logger.info(`Data retention: ${dataRetentionDays} days, Alert retention: ${alertRetentionDays} days`);

    const cutoffDate = new Date(Date.now() - dataRetentionDays * 24 * 60 * 60 * 1000).toISOString();
    const alertCutoffDate = new Date(Date.now() - alertRetentionDays * 24 * 60 * 60 * 1000).toISOString();

    let totalDeleted = 0;

    // 1. Delete old camera health data
    const { count: cameraHealthDeleted, error: chError } = await supabase
      .from('camera_health')
      .delete({ count: 'exact' })
      .lt('last_checked', cutoffDate);

    if (chError) {
      await logger.error('Error deleting camera health data:', chError);
    } else {
      totalDeleted += cameraHealthDeleted || 0;
      await logger.info(`Deleted ${cameraHealthDeleted || 0} old camera_health records`);
    }

    // 2. Delete old Mini PC health data
    const { count: miniPcHealthDeleted, error: mphError } = await supabase
      .from('mini_pc_health')
      .delete({ count: 'exact' })
      .lt('last_check_time', cutoffDate);

    if (mphError) {
      await logger.error('Error deleting mini PC health data:', mphError);
    } else {
      totalDeleted += miniPcHealthDeleted || 0;
      await logger.info(`Deleted ${miniPcHealthDeleted || 0} old mini_pc_health records`);
    }

    // 3. Delete old RESOLVED alerts only (keep unresolved alerts!)
    const { count: alertsDeleted, error: alertError } = await supabase
      .from('system_alerts')
      .delete({ count: 'exact' })
      .eq('resolved', true)
      .lt('resolved_at', alertCutoffDate);

    if (alertError) {
      await logger.error('Error deleting resolved alerts:', alertError);
    } else {
      totalDeleted += alertsDeleted || 0;
      await logger.info(`Deleted ${alertsDeleted || 0} old resolved alerts`);
    }

    // 4. Delete old admin emails log
    const { count: emailsDeleted, error: emailError } = await supabase
      .from('admin_emails_log')
      .delete({ count: 'exact' })
      .lt('sent_at', cutoffDate);

    if (emailError) {
      await logger.error('Error deleting email logs:', emailError);
    } else {
      totalDeleted += emailsDeleted || 0;
      await logger.info(`Deleted ${emailsDeleted || 0} old email logs`);
    }

    await logger.info(`✅ Cleanup completed! Total records deleted: ${totalDeleted}`);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deleted: {
        cameraHealth: cameraHealthDeleted || 0,
        miniPcHealth: miniPcHealthDeleted || 0,
        alerts: alertsDeleted || 0,
        emails: emailsDeleted || 0,
        total: totalDeleted,
      },
      settings: {
        dataRetentionDays,
        alertRetentionDays,
      }
    });

  } catch (error: any) {
    await logger.error('Error in cleanup job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Manual trigger for testing
export async function GET() {
  return NextResponse.json({
    message: 'Data cleanup endpoint. Use POST to trigger cleanup.',
    info: 'This job deletes old data based on data_retention_days and alert_retention_days settings.'
  });
}
