import { createClient } from "@/lib/supabase/server"
import { streamText, tool } from "ai"
import { z } from "zod"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages } = await req.json()

    // Get user's calendars for context
    const { data: calendars } = await supabase
      .from("calendars")
      .select("id, name, color")
      .eq("user_id", user.id)

    // Get user's upcoming events for context
    const { data: events } = await supabase
      .from("events")
      .select("id, title, description, start_time, end_time, calendar_id, all_day")
      .eq("user_id", user.id)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(20)

    // Get user's courses for context
    const { data: courses } = await supabase
      .from("school_courses")
      .select("id, code, name, term")
      .eq("user_id", user.id)

    const systemPrompt = `You are CalendarAI Assistant, an intelligent AI that helps users manage their calendar, events, assignments, and academic life.

Current User Context:
- User ID: ${user.id}
- Available Calendars: ${calendars?.map(c => `${c.name} (${c.color})`).join(", ") || "None"}
- Courses: ${courses?.map(c => `${c.code} - ${c.name}`).join(", ") || "None"}
- Upcoming Events: ${events?.length || 0} events

You can help users with:
1. Creating events, assignments, quizzes, and exams
2. Viewing and managing their schedule
3. Extracting events from syllabi, screenshots, or text
4. Managing calendars and courses
5. Answering questions about their schedule
6. Setting reminders and notifications
7. Analyzing their workload and suggesting optimizations

When creating events:
- Automatically categorize assignments/quizzes/exams to the correct calendar
- Assignments → "Assignments" calendar
- Quizzes → "Quizzes" calendar  
- Exams → "Exams" calendar
- Other events → "Personal" or appropriate calendar

Be conversational, helpful, and proactive. If you need clarification, ask. If you make a mistake, acknowledge it and offer to fix it.

Current date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`

    const result = await streamText({
      model: "openai/gpt-4o",
      system: systemPrompt,
      messages,
      maxTokens: 2000,
      tools: {
        createEvent: tool({
          description: "Create a new event in the user's calendar",
          parameters: z.object({
            title: z.string().describe("Event title"),
            description: z.string().nullable().describe("Event description"),
            startTime: z.string().describe("Start time in ISO format"),
            endTime: z.string().describe("End time in ISO format"),
            calendarName: z.string().describe("Calendar name (Personal, Work, School, Assignments, Quizzes, Exams)"),
            allDay: z.boolean().describe("Whether this is an all-day event"),
            reminderMinutes: z.number().optional().describe("Reminder minutes before event"),
          }),
          execute: async ({ title, description, startTime, endTime, calendarName, allDay, reminderMinutes }) => {
            // Find the calendar
            const calendar = calendars?.find(c => c.name.toLowerCase() === calendarName.toLowerCase())
            if (!calendar) {
              return { success: false, error: `Calendar "${calendarName}" not found` }
            }

            // Create the event
            const { data, error } = await supabase
              .from("events")
              .insert({
                user_id: user.id,
                calendar_id: calendar.id,
                title,
                description,
                start_time: startTime,
                end_time: endTime,
                all_day: allDay,
                reminder_minutes: reminderMinutes || 30,
                provider: "local",
              })
              .select()
              .single()

            if (error) {
              return { success: false, error: error.message }
            }

            return { success: true, event: data }
          },
        }),
        createSchoolItem: tool({
          description: "Create a school assignment, quiz, or exam",
          parameters: z.object({
            courseCode: z.string().describe("Course code (e.g., MATH 101)"),
            itemType: z.enum(["assignment", "quiz", "exam"]).describe("Type of school item"),
            title: z.string().describe("Assignment/quiz/exam title"),
            dueDate: z.string().describe("Due date in ISO format"),
            pointsPossible: z.number().nullable().describe("Points possible"),
            description: z.string().nullable().describe("Additional details"),
          }),
          execute: async ({ courseCode, itemType, title, dueDate, pointsPossible, description }) => {
            // Find or create the course
            let course = courses?.find(c => c.code.toLowerCase() === courseCode.toLowerCase())
            
            if (!course) {
              const { data: newCourse, error: courseError } = await supabase
                .from("school_courses")
                .insert({
                  user_id: user.id,
                  code: courseCode.toUpperCase(),
                  name: courseCode,
                  term: null,
                })
                .select()
                .single()

              if (courseError) {
                return { success: false, error: `Failed to create course: ${courseError.message}` }
              }
              course = newCourse
            }

            // Create the school item
            const { data: item, error: itemError } = await supabase
              .from("school_items")
              .insert({
                user_id: user.id,
                course_id: course.id,
                item_type: itemType,
                title,
                due_at: dueDate,
                points_possible: pointsPossible,
                description,
                is_completed: false,
                reminder_1_minutes: 1440,
                reminder_2_minutes: 120,
              })
              .select()
              .single()

            if (itemError) {
              return { success: false, error: itemError.message }
            }

            // Create corresponding calendar event
            const calendarName = itemType === "assignment" ? "Assignments" : itemType === "quiz" ? "Quizzes" : "Exams"
            const calendar = calendars?.find(c => c.name === calendarName)

            if (calendar) {
              await supabase.from("events").insert({
                user_id: user.id,
                calendar_id: calendar.id,
                title: `${courseCode}: ${title}`,
                description,
                start_time: dueDate,
                end_time: dueDate,
                all_day: false,
                reminder_minutes: 120,
                provider: "local",
              })
            }

            return { success: true, item, course: course.code }
          },
        }),
        getUpcomingEvents: tool({
          description: "Get the user's upcoming events",
          parameters: z.object({
            limit: z.number().optional().describe("Number of events to return (default 10)"),
          }),
          execute: async ({ limit = 10 }) => {
            const { data, error } = await supabase
              .from("events")
              .select("id, title, description, start_time, end_time, all_day, calendars(name, color)")
              .eq("user_id", user.id)
              .gte("start_time", new Date().toISOString())
              .order("start_time", { ascending: true })
              .limit(limit)

            if (error) {
              return { success: false, error: error.message }
            }

            return { success: true, events: data }
          },
        }),
        deleteEvent: tool({
          description: "Delete an event by ID",
          parameters: z.object({
            eventId: z.string().describe("Event ID to delete"),
          }),
          execute: async ({ eventId }) => {
            const { error } = await supabase
              .from("events")
              .delete()
              .eq("id", eventId)
              .eq("user_id", user.id)

            if (error) {
              return { success: false, error: error.message }
            }

            return { success: true, message: "Event deleted successfully" }
          },
        }),
        updateEvent: tool({
          description: "Update an existing event",
          parameters: z.object({
            eventId: z.string().describe("Event ID to update"),
            title: z.string().optional().describe("New title"),
            description: z.string().nullable().optional().describe("New description"),
            startTime: z.string().optional().describe("New start time"),
            endTime: z.string().optional().describe("New end time"),
          }),
          execute: async ({ eventId, title, description, startTime, endTime }) => {
            const updates: any = {}
            if (title) updates.title = title
            if (description !== undefined) updates.description = description
            if (startTime) updates.start_time = startTime
            if (endTime) updates.end_time = endTime

            const { data, error } = await supabase
              .from("events")
              .update(updates)
              .eq("id", eventId)
              .eq("user_id", user.id)
              .select()
              .single()

            if (error) {
              return { success: false, error: error.message }
            }

            return { success: true, event: data }
          },
        }),
      },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("AI chat error:", error)
    return Response.json({ error: "Failed to process chat" }, { status: 500 })
  }
}
