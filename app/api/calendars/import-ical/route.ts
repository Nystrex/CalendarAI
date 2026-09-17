import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import ICAL from "ical.js"
import { assertSafeExternalUrl } from "@/lib/utils/sanitize"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { icalUrl, calendarId } = await request.json()

    if (!icalUrl || !calendarId) {
      return NextResponse.json({ error: "iCal URL and calendar ID required" }, { status: 400 })
    }

    // Validate the URL doesn't point at an internal/private/loopback address before fetching
    let safeUrl: URL
    try {
      safeUrl = await assertSafeExternalUrl(icalUrl)
    } catch (validationError) {
      console.error("[iCal Import] URL validation failed:", validationError)
      return NextResponse.json({ error: "Invalid or disallowed iCal URL" }, { status: 400 })
    }

    // Fetch the iCal feed. Redirects are not followed automatically since a public
    // URL could redirect to an internal address after the safety check above.
    console.log("[iCal Import] Fetching from:", safeUrl.toString())
    const response = await fetch(safeUrl, { redirect: "manual" })
    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json({ error: "Redirects are not allowed for iCal URLs" }, { status: 400 })
    }
    if (!response.ok) {
      console.error("[iCal Import] Fetch failed:", response.status, response.statusText)
      return NextResponse.json({ error: "Failed to fetch iCal feed" }, { status: 400 })
    }

    const icalData = await response.text()
    console.log("[iCal Import] Fetched data length:", icalData.length)
    console.log("[iCal Import] First 500 chars:", icalData.substring(0, 500))

    // Parse iCal data
    const jcalData = ICAL.parse(icalData)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents("vevent")
    console.log("[iCal Import] Found", vevents.length, "events in feed")

    const events = []
    const skipped = []

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent)
      
      const title = event.summary || "Untitled Event"
      const description = event.description || null
      const location = event.location || null
      const startTime = event.startDate.toJSDate()
      const endTime = event.endDate.toJSDate()
      const isAllDay = event.startDate.isDate

      // Check if event already exists (avoid duplicates)
      const { data: existing } = await supabase
        .from("events")
        .select("id")
        .eq("user_id", user.id)
        .eq("calendar_id", calendarId)
        .eq("title", title)
        .eq("start_time", startTime.toISOString())
        .single()

      if (existing) {
        console.log("[iCal Import] Skipping duplicate:", title)
        skipped.push(title)
        continue // Skip duplicate
      }

      // Create event
      const { data: newEvent, error } = await supabase
        .from("events")
        .insert({
          user_id: user.id,
          calendar_id: calendarId,
          title,
          description,
          location,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          all_day: isAllDay,
          provider: "ical",
        })
        .select()
        .single()

      if (!error && newEvent) {
        events.push(newEvent)
      }
    }

    console.log("[iCal Import] Import complete. Imported:", events.length, "Skipped:", skipped.length)
    
    return NextResponse.json({ 
      success: true, 
      imported: events.length,
      skipped: skipped.length,
      total: vevents.length,
      events 
    })

  } catch (error) {
    console.error("iCal import error:", error)
    return NextResponse.json({ error: "Failed to import iCal feed" }, { status: 500 })
  }
}
