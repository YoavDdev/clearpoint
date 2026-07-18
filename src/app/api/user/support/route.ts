import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiHandler } from "@/lib/api-handler";
import { supportRequestSchema, parseBody } from "@/lib/validations";

export const dynamic = 'force-dynamic';

export const POST = apiHandler(async (req) => {
  const session = await getServerSession(authOptions);
  const supabase = getSupabaseAdmin();

  const formData = await req.formData();

  const file = formData.get("file") as File | null;

  const parsed = parseBody(supportRequestSchema, {
    message: formData.get("message")?.toString().trim(),
    category: formData.get("category")?.toString(),
  });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }
  const { message, category } = parsed.data;

  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", userEmail)
    .single();

  let fileUrl: string | null = null;

  if (file && file.size > 0) {
    // הגבלת גודל: 10MB מקסימום
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "File too large (max 10MB)" }, { status: 400 });
    }

    // הגבלת סוגי קבצים מותרים
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: "File type not allowed" }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `support/${crypto.randomUUID()}.${fileExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
  .from("supportuploads") // ✅ here
  .upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });


    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    // ✅ Get public URL from the same bucket

fileUrl = supabase.storage
  .from("supportuploads") // ✅ here too
  .getPublicUrl(filePath).data.publicUrl;

  }

  const { error } = await supabase.from("support_requests").insert({
    email: userEmail,
    message,
    category,
    file_url: fileUrl,
    user_id: user?.id ?? null,
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
