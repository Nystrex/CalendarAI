import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.headers.get("x-admin-password")
    
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get("q")
    
    if (!query || query.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    // Search users by email
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, discord_id, discord_username")
      .ilike("email", `%${query}%`)
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      total: users?.length || 0,
      users: users || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
