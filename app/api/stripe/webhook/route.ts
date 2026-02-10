import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createClient()

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        
        // Get user by customer ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (!profile) {
          console.error("Profile not found for customer:", customerId)
          break
        }

        // Update subscription status
        const status = subscription.status === "active" || subscription.status === "trialing" 
          ? "active" 
          : subscription.status === "past_due"
          ? "past_due"
          : subscription.status === "canceled"
          ? "canceled"
          : "inactive"

        const tier = status === "active" ? "premium" : "free"

        await supabase
          .from("profiles")
          .update({
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: subscription.id,
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("id", profile.id)

        // Log subscription history
        await supabase
          .from("subscription_history")
          .insert({
            user_id: profile.id,
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: subscription.id,
            metadata: { event_type: event.type },
          })

        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (!profile) break

        // Downgrade to free tier
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
            subscription_current_period_end: null,
          })
          .eq("id", profile.id)

        // Log history
        await supabase
          .from("subscription_history")
          .insert({
            user_id: profile.id,
            subscription_tier: "free",
            subscription_status: "canceled",
            metadata: { event_type: event.type },
          })

        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (!profile) break

        await supabase
          .from("profiles")
          .update({
            subscription_status: "past_due",
          })
          .eq("id", profile.id)

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
