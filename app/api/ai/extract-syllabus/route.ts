import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

interface SyllabusExtraction {
  courseCode?: string
  courseName?: string
  instructor?: string
  semester?: string
  assignments: Array<{
    name: string
    dueDate: string
    weight?: number
    description?: string
  }>
  exams: Array<{
    name: string
    date: string
    weight?: number
    description?: string
  }>
  gradeBreakdown?: Record<string, number>
}

async function extractSyllabusContent(base64: string): Promise<string> {
  try {
    const { extractText } = await import("unpdf")
    const buffer = Buffer.from(base64, "base64")
    const uint8 = new Uint8Array(buffer)
    const { text } = await extractText(uint8, { mergePages: true })
    return text?.slice(0, 16000) ?? ""
  } catch (err) {
    console.error("[syllabus] PDF extract error:", err)
    return ""
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Extract PDF text
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const pdfText = await extractSyllabusContent(base64)

    if (!pdfText) {
      return NextResponse.json({ error: "Could not extract PDF content" }, { status: 400 })
    }

    // Use AI to extract structured syllabus data
    const systemPrompt = `You are an expert at extracting course information from syllabi. Extract the following information from the syllabus text and return it as valid JSON:
- courseCode: The course code (e.g., "CS 101")
- courseName: The full course name
- instructor: The instructor's name
- semester: The semester/term (e.g., "Spring 2024")
- assignments: Array of {name, dueDate (YYYY-MM-DD format), weight (percentage), description}
- exams: Array of {name, date (YYYY-MM-DD format), weight (percentage), description}
- gradeBreakdown: Object mapping assessment type to percentage (e.g., {"Assignments": 40, "Exams": 60})

Return ONLY valid JSON, no other text.`

    const result = await streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Extract syllabus information from this text:\n\n${pdfText}`,
        },
      ],
      temperature: 0.3,
      maxOutputTokens: 2000,
    })

    const extractedText = await result.text
    let syllabusData: SyllabusExtraction

    try {
      syllabusData = JSON.parse(extractedText)
    } catch {
      return NextResponse.json({
        error: "Failed to parse AI response",
        raw: extractedText,
      }, { status: 400 })
    }

    // Auto-create or update school calendar/tracker
    const courseCode = syllabusData.courseCode || file.name.split("-")[0] || "COURSE"
    const courseName = syllabusData.courseName || file.name.replace(".pdf", "")

    // Create or get calendar for this course
    const { data: existingCal } = await supabase
      .from("calendars")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", `%${courseCode}%`)
      .single()

    let calendarId = existingCal?.id

    if (!calendarId) {
      const { data: newCal, error: calError } = await supabase
        .from("calendars")
        .insert({
          user_id: user.id,
          name: `${courseCode}: ${courseName}`,
          color: "#8b5cf6",
          is_visible: true,
        })
        .select("id")
        .single()

      if (calError) throw calError
      calendarId = newCal.id
    }

    // Create events for assignments and exams
    const events = []

    // Add assignments
    for (const assignment of syllabusData.assignments || []) {
      if (assignment.dueDate) {
        const dueDate = new Date(assignment.dueDate)
        events.push({
          user_id: user.id,
          calendar_id: calendarId,
          title: assignment.name,
          description: assignment.description || `Weight: ${assignment.weight || "N/A"}%`,
          start_time: dueDate.toISOString(),
          end_time: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
          all_day: true,
          reminder_minutes: 1440, // 24 hours before
        })
      }
    }

    // Add exams
    for (const exam of syllabusData.exams || []) {
      if (exam.date) {
        const examDate = new Date(exam.date)
        events.push({
          user_id: user.id,
          calendar_id: calendarId,
          title: exam.name,
          description: exam.description || `Weight: ${exam.weight || "N/A"}%`,
          start_time: examDate.toISOString(),
          end_time: new Date(examDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
          all_day: false,
          reminder_minutes: 2880, // 48 hours before
        })
      }
    }

    // Batch insert events
    if (events.length > 0) {
      const { error: eventsError } = await supabase
        .from("events")
        .insert(events)

      if (eventsError) throw eventsError
    }

    return NextResponse.json({
      success: true,
      courseCode,
      courseName,
      calendarId,
      eventsCreated: events.length,
      syllabusData,
    })
  } catch (error) {
    console.error("[syllabus] error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    )
  }
}
