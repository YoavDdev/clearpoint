import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await req.formData();

  const message = formData.get("message")?.toString().trim();
  const category = formData.get("category")?.toString();
  const file = formData.get("file") as File | null;

  const userEmail = session?.user?.email;
  if (!userEmail || !message || !category) {
    return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", userEmail)
    .single();

  let fileUrl: string | null = null;

  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop();
    const filePath = `support/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("support_uploads")
      .upload(filePath, file.stream(), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    fileUrl = supabase.storage.from("support_uploads").getPublicUrl(filePath).data.publicUrl;
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
}
