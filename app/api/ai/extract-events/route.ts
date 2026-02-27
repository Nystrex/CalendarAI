import { generateObject } from "ai"
import { z } from "zod"
import { extractText, getDocumentProxy } from "unpdf"

export const maxDuration = 60

const extractedEventSchema = z.object({
  events: z.array(
    z.object({
      title: z.string().describe("The title or name of the event/assignment"),
      description: z.string().nullable().describe("Additional details or notes about the event, or null if none"),
      date: z.string().nullable().describe("The date in YYYY-MM-DD format, or null if not specified"),
      time: z.string().nullable().describe("The time in HH:MM format (24-hour), or null if not specified"),
      endTime: z.string().nullable().describe("The end time in HH:MM format if this is a time range, or null"),
      isAllDay: z.boolean().describe("Whether this is an all-day event (true if no specific time given)"),
      itemType: z
        .enum(["assignment", "quiz", "exam"])
        .nullable()
        .describe("If this is a school item, classify it as assignment, quiz, or exam. Otherwise null."),
      courseCode: z
        .string()
        .nullable()
        .describe("Course code if this is a school assignment (e.g., MATH 101), or null"),
    }),
  ),
})

async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(buffer)

    // Get the document proxy
    const pdf = await getDocumentProxy(uint8Array)

    // Extract text from all pages
    const { text } = await extractText(pdf, { mergePages: true })

    return text || ""
  } catch (error) {
    console.error("[v0] unpdf parse error:", error)
    throw new Error("Failed to parse PDF")
  }
}

export async function POST(req: Request) {
  try {
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (formError) {
      console.error("[v0] FormData parsing error:", formError)
      return Response.json({ error: "Invalid form data" }, { status: 400 })
    }

    const file = formData.get("file") as File | null
    const text = formData.get("text") as string | null

    if (!file && !text) {
      return Response.json({ error: "No file or text provided" }, { status: 400 })
    }

    const contentParts: any[] = []

    const systemPrompt = `You are an expert at extracting event and assignment information from documents, screenshots, and text.
        
Extract ALL events, assignments, due dates, exams, quizzes, and deadlines from the provided content.

Important rules:
1. For each event, extract the title, date, time (if specified), and any description
2. If you see a course code (like MATH 101, CS 201, etc.), include it in the title as [COURSE_CODE] prefix
3. If no specific time is given but a date is, assume it's due at 11:59 PM (23:59)
4. Convert all dates to YYYY-MM-DD format (assume current year 2026 if not specified)
5. Convert all times to 24-hour HH:MM format
6. If you see time ranges like "2:30 PM - 4:30 PM", extract both start and end time
7. Extract descriptions from parentheses or additional context
8. Be thorough - don't miss any events!
9. If the item is clearly a school item, set itemType to one of: assignment, quiz, exam.
   - quiz: quiz, test, midterm quiz
   - exam: exam, midterm, final, final exam
   - assignment: assignment, homework, lab, project, essay

Current date context: January 2026`

    if (file) {
      let bytes: ArrayBuffer
      try {
        bytes = await file.arrayBuffer()
      } catch (fileError) {
        console.error("[v0] File read error:", fileError)
        return Response.json({ error: "Failed to read uploaded file" }, { status: 400 })
      }

      const buffer = Buffer.from(bytes)
      const mediaType = file.type || "application/octet-stream"

      if (mediaType.startsWith("image/")) {
        const base64 = buffer.toString("base64")
        contentParts.push({
          type: "image",
          image: `data:${mediaType};base64,${base64}`,
        })
      } else if (mediaType === "application/pdf") {
        try {
          const pdfText = await parsePDF(buffer)

          if (!pdfText || pdfText.trim().length === 0) {
            return Response.json(
              {
                error:
                  "Could not extract text from PDF. The PDF might be image-based (scanned). Please take a screenshot of it instead so the AI can read the image.",
              },
              { status: 400 },
            )
          }

          contentParts.push({
            type: "text",
            text: `PDF Document Content:\n${pdfText}`,
          })
        } catch (pdfError) {
          console.error("[v0] PDF parsing error:", pdfError)
          return Response.json(
            {
              error: "Failed to parse PDF. Please try taking a screenshot of the content instead.",
            },
            { status: 400 },
          )
        }
      } else {
        // Try to read as text
        const textContent = buffer.toString("utf-8")
        contentParts.push({
          type: "text",
          text: `Document content:\n${textContent}`,
        })
      }
    }

    if (text) {
      contentParts.push({
        type: "text",
        text: `Text content to extract events from:\n${text}`,
      })
    }

    try {
      const { object } = await generateObject({
        model: "openai/gpt-4o",
        schema: extractedEventSchema,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
        maxTokens: 4000,
      })

      return Response.json({ events: object.events })
    } catch (aiError) {
      console.error("[v0] OpenAI API error:", aiError)
      const errorMessage = aiError instanceof Error ? aiError.message : "AI processing failed"

      if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
        return Response.json(
          {
            error: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
            requiresApiKey: true,
          },
          { status: 401 },
        )
      }

      return Response.json({ error: `AI extraction failed: ${errorMessage}` }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] AI extraction error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to extract events"
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
