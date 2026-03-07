"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Send, Loader2, Upload, X, Calendar, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useChat } from "ai/react"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  toolInvocations?: any[]
}

export function AIChatAssistant() {
  const [file, setFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/ai/chat",
    onError: (error) => {
      toast.error("AI Error: " + error.message)
    },
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleExtractFromFile = async () => {
    if (!file) return

    setIsExtracting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/ai/extract-events", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      // Add extracted events to chat context
      const eventsText = data.events
        .map((e: any, i: number) => 
          `${i + 1}. ${e.title}${e.courseCode ? ` [${e.courseCode}]` : ""} - ${e.date || "No date"} ${e.time || ""}${e.itemType ? ` (${e.itemType})` : ""}`
        )
        .join("\n")

      const userMessage = `I uploaded a file (${file.name}). Here's what I found:\n\n${eventsText}\n\nPlease create these events in my calendar. Put assignments in the Assignments calendar, quizzes in Quizzes, and exams in Exams.`

      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          role: "user",
          content: userMessage,
        },
      ])

      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      toast.success(`Extracted ${data.events.length} events!`)
    } catch (error) {
      console.error("Extraction error:", error)
      toast.error("Failed to extract events")
    } finally {
      setIsExtracting(false)
    }
  }

  const renderToolInvocation = (toolInvocation: any) => {
    const { toolName, state, result } = toolInvocation

    if (toolName === "createEvent" && state === "result") {
      return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-green-500">Event Created</p>
            <p className="text-muted-foreground">{result.event?.title}</p>
          </div>
        </div>
      )
    }

    if (toolName === "createSchoolItem" && state === "result") {
      return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Calendar className="h-4 w-4 text-blue-500 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-500">School Item Created</p>
            <p className="text-muted-foreground">{result.course}: {result.item?.title}</p>
          </div>
        </div>
      )
    }

    if (state === "result" && result.error) {
      return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-red-500">Error</p>
            <p className="text-muted-foreground">{result.error}</p>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Card className="flex flex-col h-[600px] border-2">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          AI Assistant
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Hi! I'm your AI assistant. I can help you:
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Extract events from syllabi and screenshots</p>
                  <p>• Create assignments, quizzes, and exams</p>
                  <p>• Manage your calendar and schedule</p>
                  <p>• Answer questions about your events</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.toolInvocations.map((tool, idx) => (
                        <div key={idx}>{renderToolInvocation(tool)}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* File Upload Area */}
        {file && (
          <div className="px-4 py-2 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4 text-primary" />
                <span className="truncate">{file.name}</span>
              </div>
              <Button
                size="sm"
                onClick={handleExtractFromFile}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Extract Events"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me anything or upload a syllabus..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
