import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const adminPassword = request.headers.get("x-admin-password")
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { university, university_verified } = await request.json()
    const { userId } = await params

    const { data, error } = await supabase
      .from("profiles")
      .update({
        university,
        university_verified,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update university" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[CalendarAI] Admin university update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
