import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if user exists in auth.users
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error("Error listing users:", error)
      return NextResponse.json({ exists: false })
    }

    const userExists = users.users.some((user) => user.email?.toLowerCase() === email.toLowerCase())

    return NextResponse.json({ exists: userExists })
  } catch (error) {
    console.error("Error checking email:", error)
    return NextResponse.json({ exists: false })
  }
}
