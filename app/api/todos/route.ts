import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    //Hi
    const { data: todos, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching todos:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ todos })
  } catch (error) {
    console.error("[v0] Error in GET /api/todos:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { text, priority, due_date } = await request.json()

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const insertData: any = {
      user_id: user.id,
      text: text.trim(),
      completed: false,
    }

    // Only add priority/due_date if provided (for backwards compatibility)
    if (priority) insertData.priority = priority
    if (due_date) insertData.due_date = due_date

    const { data: todo, error } = await supabase
      .from("todos")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating todo:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ todo })
  } catch (error) {
    console.error("[v0] Error in POST /api/todos:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
