import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

// Delete single alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("system_alerts")
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error("Error deleting alert:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Alert ${params.id} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "Alert deleted successfully"
    });

  } catch (error: any) {
    console.error("Error in delete alert route:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Edit alert message
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("system_alerts")
      .update({ message })
      .eq('id', params.id);

    if (error) {
      console.error("Error updating alert:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Alert ${params.id} updated successfully`);

    return NextResponse.json({
      success: true,
      message: "Alert updated successfully"
    });

  } catch (error: any) {
    console.error("Error in update alert route:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
