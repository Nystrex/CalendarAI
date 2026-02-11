import { streamText, convertToModelMessages, UIMessage } from "ai"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    console.log("[v0] Homework chat API called")
    const body = await req.json()
    const { messages, conversationId, userId } = body

    console.log("[v0] Received:", { messagesCount: messages?.length, conversationId, userId })

    if (!userId || !messages) {
      console.error("[v0] Missing required fields")
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
    }

    // Get user's calendar events for context
    const supabase = await createClient()
    
    // Check subscription and AI query limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, ai_queries_used_today, ai_queries_reset_date")
      .eq("id", userId)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), { status: 404 })
    }

    // Reset daily counter if needed (check if it's a new day)
    const resetDate = new Date(profile.ai_queries_reset_date)
    const now = new Date()
    const isNewDay = resetDate.toDateString() !== now.toDateString()

    if (isNewDay) {
      await supabase
        .from("profiles")
        .update({ 
          ai_queries_used_today: 0,
          ai_queries_reset_date: now.toISOString()
        })
        .eq("id", userId)
      profile.ai_queries_used_today = 0
    }

    // Check if user has queries remaining (free tier gets 5 per day)
    if (profile.subscription_tier === "free") {
      const queriesUsed = profile.ai_queries_used_today || 0
      if (queriesUsed >= 5) {
        return new Response(
          JSON.stringify({ 
            error: "AI query limit reached", 
            message: "You've used all 5 free AI queries today. Upgrade to Premium for unlimited access or wait until tomorrow.",
            queriesUsed: queriesUsed,
            limit: 5
          }), 
          { status: 403 }
        )
      }

      // Increment query count for free users
      await supabase
        .from("profiles")
        .update({ ai_queries_used_today: queriesUsed + 1 })
        .eq("id", userId)
    }
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_time", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte("start_time", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true })
      .limit(20)

    if (eventsError) {
      console.error("[v0] Error fetching events:", eventsError)
    }

    // Build context from calendar events
    let calendarContext = ""
    if (events && events.length > 0) {
      const eventsList = events
        .map(
          (event) =>
            `- ${event.title}: ${new Date(event.start_time).toLocaleDateString()} (Calendar: ${event.calendar?.title || "Unnamed"})`
        )
        .join("\n")
      calendarContext = `\n\nUser's upcoming assignments and deadlines:\n${eventsList}`
    }

    // Create system prompt with calendar context and file analysis capability
    const systemPrompt = `You are an expert homework tutor and study assistant. Help students understand concepts, solve problems, and prepare for exams. 

You can analyze files that students upload, including:
- Text documents and notes
- Problem sets and worksheets
- Images of handwritten work or textbook pages
- PDFs of study materials

Guidelines:
- Break down complex concepts into simple steps
- Encourage critical thinking instead of just giving answers
- Ask clarifying questions when needed
- Provide practice problems and study strategies
- When analyzing files, provide specific feedback on content
- Be encouraging and supportive
- If the topic is beyond typical homework (illegal, harmful), politely decline${calendarContext}`

    // Convert UI messages to model messages
    const modelMessages = convertToModelMessages(messages as UIMessage[])

    // Call AI with streaming - using Gemini 2.5 Flash via Vercel AI Gateway
    console.log("[v0] Calling Gemini 2.5 Flash with streamText")
    const result = streamText({
      model: "google/gemini-2.5-flash",
      system: systemPrompt,
      prompt: modelMessages,
      temperature: 0.7,
      maxOutputTokens: 2048,
    })

    console.log("[v0] Returning stream response")
    
    // Save user message immediately
    if (messages.length > 0) {
      const userMessage = messages[messages.length - 1]
      if (userMessage.role === "user" && conversationId && userId) {
        let userContent = ""
        
        if (userMessage.parts && Array.isArray(userMessage.parts)) {
          userContent = userMessage.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => {
              let text = p.text
              text = text.split("\n\n[FILE:")[0]
              return text
            })
            .join("")
        } else if (typeof userMessage.content === "string") {
          userContent = userMessage.content.split("\n\n[FILE:")[0]
        } else if (Array.isArray(userMessage.content)) {
          userContent = userMessage.content
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text.split("\n\n[FILE:")[0])
            .join("")
        }

        if (userContent) {
          await supabase.from("homework_chat_history").insert({
            user_id: userId,
            conversation_id: conversationId,
            role: "user",
            content: userContent,
          })
          console.log("[v0] User message saved")
        }
      }
    }

    // Use onFinish callback on streamText result to save assistant response
    result.text.then(async (text) => {
      console.log("[v0] Stream complete, assistant text length:", text.length)
      if (text && conversationId && userId) {
        const { error } = await supabase.from("homework_chat_history").insert({
          user_id: userId,
          conversation_id: conversationId,
          role: "assistant",
          content: text,
        })
        console.log("[v0] Assistant message saved, error:", error)
      }
    }).catch((err) => {
      console.error("[v0] Error saving assistant message:", err)
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Homework chat error:", error)
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), { status: 500 })
  }
}
