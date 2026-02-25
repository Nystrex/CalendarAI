import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { text, completed, priority, due_date } = await request.json()

    const updates: { text?: string; completed?: boolean; priority?: string; due_date?: string | null } = {}
    if (text !== undefined) updates.text = text.trim()
    if (completed !== undefined) updates.completed = completed
    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
      }
      updates.priority = priority
    }
    if (due_date !== undefined) updates.due_date = due_date || null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data: todo, error } = await supabase
      .from("todos")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating todo:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ todo })
  } catch (error) {
    console.error("[v0] Error in PUT /api/todos/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("[v0] Error deleting todo:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/todos/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
