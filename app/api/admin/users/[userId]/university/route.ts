import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const adminPassword = request.headers.get("x-admin-password")

    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { university, university_verified } = await request.json()
    const { userId } = await params
    const adminSupabase = createAdminClient()

    console.log("[CalendarAI] API: Updating university for user:", userId)
    console.log("[CalendarAI] API: Update values:", { university, university_verified })

    // Update user's university affiliation using admin client (bypasses RLS)
    const { data, error } = await adminSupabase
      .from("profiles")
      .update({
        university,
        university_verified,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()

    console.log("[CalendarAI] API: Supabase update result:", { data, error })

    if (error) {
      console.error("[CalendarAI] API: Update university error:", error)
      return NextResponse.json({ error: error.message || "Failed to update university" }, { status: 500 })
    }

    console.log("[CalendarAI] API: University updated successfully")
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[CalendarAI] Admin university update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
