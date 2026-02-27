import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const adminPassword = request.headers.get("x-admin-password")
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    const { data: targetUser, error: userError } = await adminSupabase.auth.admin.getUserById(userId)
    if (userError || !targetUser.user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { error } = await adminSupabase.auth.resetPasswordForEmail(targetUser.user.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://calendarai.dev"}/auth/reset`,
    })

    if (error) {
      return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 })
    }

    await adminSupabase.from("audit_logs").insert({
      user_id: user.id,
      action: "reset_password",
      entity_type: "user",
      entity_id: userId,
      changes: { admin: user.email, target: targetUser.user.email },
    })

    return NextResponse.json({ success: true, email: targetUser.user.email })
  } catch (error) {
    console.error("[CalendarAI] Reset password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
