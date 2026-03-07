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

    const systemPrompt = `You are an expert at extracting event and assignment information from syllabi, course schedules, screenshots, and text.

SYLLABUS EXTRACTION EXPERTISE:
- Recognize common syllabus sections: "Schedule", "Important Dates", "Assignments", "Exams", "Grading"
- Extract ALL assignments, quizzes, exams, projects, labs, and deadlines
- Identify course codes from headers (e.g., "CIS*1500", "MATH 101", "CS 201")
- Parse date formats: "Jan 15", "1/15", "Week 3", "Monday, January 15"
- Recognize assignment types from keywords and context

CATEGORIZATION RULES (CRITICAL):
1. **Assignment**: homework, assignment, lab, project, essay, paper, report, problem set, exercise, deliverable, submission
2. **Quiz**: quiz, test, midterm quiz, weekly quiz, pop quiz, assessment (if short)
3. **Exam**: exam, midterm, final exam, final, test (if major), examination

EXTRACTION RULES:
1. Extract title, date, time (if specified), and description for each item
2. Always extract the course code if visible (MATH 101, CIS*1500, etc.)
3. If no time specified, assume 11:59 PM (23:59) for assignments/quizzes/exams
4. Convert dates to YYYY-MM-DD format (assume 2026 if year not specified)
5. Convert times to 24-hour HH:MM format
6. For time ranges like "2:30 PM - 4:30 PM", extract both start and end
7. Include point values, percentages, or weights in description if mentioned
8. Be thorough - extract EVERYTHING that has a due date or deadline
9. For weekly recurring items, create separate entries for each occurrence

EXAMPLES:
- "Assignment 1 (10%) - Due Jan 15" → assignment, title: "Assignment 1", description: "10%", date: 2026-01-15
- "Midterm Exam - Feb 20, 2:00 PM" → exam, title: "Midterm Exam", date: 2026-02-20, time: 14:00
- "Lab 3: Data Structures - Submit by Friday" → assignment, title: "Lab 3: Data Structures"
- "Quiz on Chapters 1-3" → quiz, title: "Quiz on Chapters 1-3"

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
