import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Deactivate Google OAuth connection
    const { error } = await supabase
      .from("oauth_connections")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("provider", "google")

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Google disconnect error:", error)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }
}
