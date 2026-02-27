import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@/lib/supabase/server"

// ── Types for multimodal message parts ────────────────────────────────────────
interface TextPart    { type: "text";  text: string }
interface ImagePart   { type: "image"; data: string; mimeType: string; name?: string }
interface FilePart    { type: "file";  data: string; mimeType: string; name?: string }
type MessagePart = TextPart | ImagePart | FilePart

interface IncomingMessage {
  role: "user" | "assistant"
  parts: MessagePart[]
}

// ── PDF text extraction (server-side, no worker needed) ───────────────────────
async function extractPdfText(base64: string): Promise<string> {
  try {
    const { extractText } = await import("unpdf")
    const buffer = Buffer.from(base64, "base64")
    const uint8 = new Uint8Array(buffer)
    const { text } = await extractText(uint8, { mergePages: true })
    return text?.slice(0, 8000) ?? ""
  } catch (err) {
    console.error("[chat] PDF extract error:", err)
    return "[Could not extract PDF text]"
  }
}

// ── Convert our message format to AI SDK CoreMessage format ───────────────────
async function buildCoreMessages(messages: IncomingMessage[]) {
  const result = []
  for (const msg of messages) {
    if (msg.role === "assistant") {
      const text = msg.parts
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => p.text)
        .join("")
      result.push({ role: "assistant" as const, content: text })
      continue
    }

    // user message — may contain text, images, files
    const contentParts: any[] = []

    for (const part of msg.parts) {
      if (part.type === "text" && part.text.trim()) {
        contentParts.push({ type: "text", text: part.text })
      } else if (part.type === "image") {
        // Send directly to GPT-4o vision
        contentParts.push({
          type: "image",
          image: `data:${part.mimeType};base64,${part.data}`,
        })
        contentParts.push({
          type: "text",
          text: `[Image attached: ${part.name ?? "image"}]`,
        })
      } else if (part.type === "file") {
        const ip = part as FilePart
        if (ip.mimeType === "application/pdf") {
          const pdfText = await extractPdfText(ip.data)
          contentParts.push({
            type: "text",
            text: `[PDF: ${ip.name ?? "document"}]\n${pdfText}`,
          })
        } else {
          // Plain text / code / docx decoded as text
          const decoded = Buffer.from(ip.data, "base64").toString("utf-8").slice(0, 8000)
          contentParts.push({
            type: "text",
            text: `[File: ${ip.name ?? "file"}]\n${decoded}`,
          })
        }
      }
    }

    if (contentParts.length > 0) {
      result.push({ role: "user" as const, content: contentParts })
    }
  }
  return result
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, conversationId, userId } = body as {
      messages: IncomingMessage[]
      conversationId: string
      userId: string
    }

    if (!userId || !messages?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
    }

    const supabase = await createClient()

    // ── Rate limiting ──────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, ai_queries_used_today, ai_queries_reset_date")
      .eq("id", userId)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), { status: 404 })
    }

    const isNewDay =
      new Date(profile.ai_queries_reset_date).toDateString() !== new Date().toDateString()

    if (isNewDay) {
      await supabase
        .from("profiles")
        .update({ ai_queries_used_today: 0, ai_queries_reset_date: new Date().toISOString() })
        .eq("id", userId)
      profile.ai_queries_used_today = 0
    }

    if (profile.subscription_tier === "free") {
      const used = profile.ai_queries_used_today || 0
      if (used >= 5) {
        return new Response(
          JSON.stringify({
            error: "AI query limit reached",
            message: "You've used all 5 free AI queries today. Upgrade to Premium for unlimited access.",
            queriesUsed: used,
            limit: 5,
          }),
          { status: 403 }
        )
      }
      await supabase
        .from("profiles")
        .update({ ai_queries_used_today: used + 1 })
        .eq("id", userId)
    }

    // ── Calendar context ───────────────────────────────────────────────────────
    const { data: events } = await supabase
      .from("events")
      .select("title, start_time")
      .eq("user_id", userId)
      .gte("start_time", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte("start_time", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true })
      .limit(20)

    const calendarContext =
      events?.length
        ? `\n\nStudent's upcoming events/deadlines:\n` +
          events.map((e) => `- ${e.title}: ${new Date(e.start_time).toLocaleDateString()}`).join("\n")
        : ""

    // ── System prompt ──────────────────────────────────────────────────────────
    const systemPrompt = `You are CalendarAI's expert homework tutor and study assistant. Your job is to help students deeply understand their coursework, not just get answers.

You can analyze any content the student shares:
- **Images** – handwritten notes, textbook pages, diagrams, screenshots of problems
- **PDFs** – lecture slides, past papers, study guides
- **Text files** – code, essays, notes, problem sets

How to respond:
- Break complex problems into clear, numbered steps
- Explain the *why* behind every step, not just the answer
- For math/science: show full working, highlight formulas used
- For essays/writing: give specific, actionable feedback
- For code: explain what the code does and suggest improvements
- Ask a clarifying question if the request is ambiguous
- Suggest follow-up practice problems when relevant
- Be encouraging — learning is hard, celebrate progress
- Never do the work for them outright; guide them to the answer${calendarContext}`

    // ── Build multimodal messages ──────────────────────────────────────────────
    const coreMessages = await buildCoreMessages(messages)

    // ── Stream ─────────────────────────────────────────────────────────────────
    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0.7,
      maxOutputTokens: 2000,
    })

    // ── Persist to DB (fire-and-forget) ───────────────────────────────────────
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === "user" && conversationId) {
      const userText = lastMsg.parts
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => p.text)
        .join("")
        .trim()

      const fileNames = lastMsg.parts
        .filter((p): p is ImagePart | FilePart => p.type === "image" || p.type === "file")
        .map((p) => p.name ?? p.type)

      const savedContent = [userText, ...fileNames.map((n) => `[${n}]`)].filter(Boolean).join(" ")

      if (savedContent) {
        supabase.from("homework_chat_history").insert({
          user_id: userId,
          conversation_id: conversationId,
          role: "user",
          content: savedContent,
        }).then(() => {})
      }
    }

    void Promise.resolve(result.text).then(async (text) => {
      if (text && conversationId) {
        await supabase.from("homework_chat_history").insert({
          user_id: userId,
          conversation_id: conversationId,
          role: "assistant",
          content: text,
        })
      }
    }).catch((e: unknown) => console.error(e))

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[chat] error:", error)
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), { status: 500 })
  }
}
