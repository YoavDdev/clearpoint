import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYSTEM_PRESETS = [
  {
    preset_key: "night_guard",
    name: "שומר לילה",
    detection_type: "person",
    schedule_start: "22:00",
    schedule_end: "06:00",
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    cooldown_minutes: 3,
    min_confidence: 0.5,
    is_preset: true,
    is_active: true,
    notify_email: true,
    notify_sms: false,
    notify_push: true,
  },
  {
    preset_key: "intrusion",
    name: "חדירה",
    detection_type: "person",
    schedule_start: null,
    schedule_end: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    cooldown_minutes: 5,
    min_confidence: 0.6,
    is_preset: true,
    is_active: false,
    notify_email: true,
    notify_sms: false,
    notify_push: true,
  },
  {
    preset_key: "vehicle",
    name: "רכב בשעות לילה",
    detection_type: "vehicle",
    schedule_start: "00:00",
    schedule_end: "05:00",
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    cooldown_minutes: 10,
    min_confidence: 0.5,
    is_preset: true,
    is_active: false,
    notify_email: true,
    notify_sms: false,
    notify_push: true,
  },
  {
    preset_key: "suspicious_object",
    name: "חפץ חשוד",
    detection_type: "suspicious_object",
    schedule_start: null,
    schedule_end: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    cooldown_minutes: 5,
    min_confidence: 0.6,
    is_preset: true,
    is_active: false,
    notify_email: true,
    notify_sms: false,
    notify_push: true,
  },
  {
    preset_key: "weapon",
    name: "זיהוי נשק",
    detection_type: "weapon",
    schedule_start: null,
    schedule_end: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    cooldown_minutes: 1,
    min_confidence: 0.5,
    is_preset: true,
    is_active: false,
    notify_email: true,
    notify_sms: true,
    notify_push: true,
  },
  {
    preset_key: "fire_smoke",
    name: "זיהוי אש ועשן",
    detection_type: "fire",
    schedule_start: null,
    schedule_end: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    cooldown_minutes: 1,
    min_confidence: 0.4,
    is_preset: true,
    is_active: true,
    notify_email: true,
    notify_sms: true,
    notify_push: true,
  },
  {
    preset_key: "fire_smoke",
    name: "זיהוי אש ועשן (עשן)",
    detection_type: "smoke",
    schedule_start: null,
    schedule_end: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    cooldown_minutes: 1,
    min_confidence: 0.4,
    is_preset: true,
    is_active: true,
    notify_email: true,
    notify_sms: true,
    notify_push: true,
  },
];

async function getAuthUser(supabase: any, email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", email)
    .single();
  if (error || !data) return null;
  return data;
}

// GET — fetch user's alert rules (auto-create presets if none exist)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser(supabase, session.user.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if user has any rules
  const { data: rules, error } = await supabase
    .from("alert_rules")
    .select("*, camera:cameras(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-create presets if user has no rules yet
  if (!rules || rules.length === 0) {
    const presetRows = SYSTEM_PRESETS.map((p) => ({
      ...p,
      user_id: user.id,
      camera_id: null,
    }));

    const { error: insertError } = await supabase
      .from("alert_rules")
      .insert(presetRows);

    if (insertError) {
      console.error("Failed to create presets:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Re-fetch
    const { data: newRules } = await supabase
      .from("alert_rules")
      .select("*, camera:cameras(id, name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ success: true, rules: newRules || [] });
  }

  return NextResponse.json({ success: true, rules });
}

// POST — create a new alert rule
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser(supabase, session.user.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();

  const row = {
    user_id: user.id,
    camera_id: body.camera_id || null,
    name: body.name,
    detection_type: body.detection_type,
    exclude_types: body.exclude_types || [],
    schedule_start: body.schedule_start || null,
    schedule_end: body.schedule_end || null,
    days_of_week: body.days_of_week || [0, 1, 2, 3, 4, 5, 6],
    notify_email: body.notify_email ?? true,
    notify_sms: body.notify_sms ?? false,
    notify_push: body.notify_push ?? true,
    cooldown_minutes: body.cooldown_minutes ?? 5,
    min_confidence: body.min_confidence ?? 0.5,
    is_active: body.is_active ?? true,
    is_preset: false,
  };

  const { data, error } = await supabase
    .from("alert_rules")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, rule: data });
}

// PUT — update an existing rule
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser(supabase, session.user.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing rule id" }, { status: 400 });
  }

  // Remove fields that shouldn't be updated directly
  delete updates.user_id;
  delete updates.is_preset;
  delete updates.preset_key;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("alert_rules")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, rule: data });
}

// DELETE — delete a rule
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const user = await getAuthUser(supabase, session.user.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing rule id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
