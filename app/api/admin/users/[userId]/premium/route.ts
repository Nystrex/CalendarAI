import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function PATCH(
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

    const body = await request.json()
    const { action, duration = 12 } = body // "grant" or "revoke", duration in months (default 12)

    const adminSupabase = createAdminClient()

    // Update user's subscription tier
    const updates: any = {
      subscription_tier: action === "grant" ? "premium" : "free",
      subscription_status: action === "grant" ? "active" : "inactive",
      updated_at: new Date().toISOString(),
    }

    // For premium grant, set expiry based on duration
    if (action === "grant") {
      const expiryDate = new Date()
      expiryDate.setMonth(expiryDate.getMonth() + duration)
      updates.subscription_current_period_end = expiryDate.toISOString()
    } else {
      updates.subscription_current_period_end = null
    }

    const { error: updateError } = await adminSupabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)

    if (updateError) {
      console.error("[CalendarAI] Error updating user subscription:", updateError)
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
    }

    // Log this action in subscription history
    await adminSupabase.from("subscription_history").insert({
      user_id: userId,
      subscription_tier: action === "grant" ? "premium" : "free",
      subscription_status: action === "grant" ? "active" : "inactive",
      stripe_subscription_id: null,
      metadata: {
        granted_by: "admin",
        admin_email: user.email,
        action: action,
      },
    })

    return NextResponse.json({
      success: true,
      message: action === "grant" ? "Premium access granted" : "Premium access revoked",
    })
  } catch (error) {
    console.error("[CalendarAI] Grant/revoke premium error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
