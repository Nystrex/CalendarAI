import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const adminPassword = request.headers.get("x-admin-password")
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Delete user's data in order (respecting foreign key constraints)
    await supabase.from("events").delete().eq("user_id", userId)
    await supabase.from("calendars").delete().eq("user_id", userId)
    await supabase.from("oauth_connections").delete().eq("user_id", userId)
    await supabase.from("audit_logs").delete().eq("user_id", userId)
    await supabase.from("profiles").delete().eq("id", userId)

    // Try to delete the auth user using admin client if service role key is available
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin")
      const adminSupabase = createAdminClient()
      await adminSupabase.auth.admin.deleteUser(userId)
    } catch {
      // Service role key not available - auth user remains but all data is deleted
      // The user won't be able to do anything without a profile
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CalendarAI] Delete user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
