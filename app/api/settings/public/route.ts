import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings: Record<string, unknown> = {}
  for (const row of data || []) {
    let value = row.value
    
    // Convert string boolean values to actual booleans
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        value = true
      } else if (value.toLowerCase() === "false") {
        value = false
      } else if (!isNaN(Number(value))) {
        // Try to convert to number if it's a numeric string
        value = Number(value)
      }
    }
    
    settings[row.key] = value
  }

  return NextResponse.json(settings)
}
