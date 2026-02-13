import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user exists by looking up profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    return NextResponse.json({ exists: !!profile })
  } catch (error) {
    console.error("Error checking email:", error)
    return NextResponse.json({ exists: false })
  }
}
