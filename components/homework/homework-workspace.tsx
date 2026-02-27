"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HomeworkChatSidebar } from "@/components/homework/homework-chat-sidebar"
import { 
  Send, 
  Loader2, 
  Clock, 
  Calculator, 
  FileText, 
  Brain,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  Paperclip,
  X,
  Download,
  Image as ImageIcon,
  Upload,
  Sparkles,
  BookOpen,
  Lightbulb,
  Code2,
  PenLine,
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import ReactMarkdown from "react-markdown"
import { createClient } from "@/lib/supabase/client"

// ── Attachment types sent to the API ──────────────────────────────────────────
interface AttachedFile {
  file: File
  dataUrl: string        // for images: preview URL; for others: empty
  base64: string         // raw base64 for sending to API
  mimeType: string
}

interface QuickTask {
  id: string
  text: string
  completed: boolean
}

// ── Suggestion chips shown on empty state ─────────────────────────────────────
const SUGGESTIONS = [
  { icon: Sparkles,   label: "Explain a concept",   text: "Can you explain "  },
  { icon: BookOpen,   label: "Solve step by step",   text: "Help me solve this step by step: " },
  { icon: PenLine,    label: "Review my essay",      text: "Please review my essay and give feedback:\n\n" },
  { icon: Code2,      label: "Debug my code",        text: "Help me debug this code:\n\n```\n\n```" },
  { icon: Lightbulb,  label: "Study tips",           text: "Give me study tips for " },
]

const ACCEPTED = ".pdf,.txt,.md,.csv,.py,.js,.ts,.json,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx"
const MAX_MB = 15

// ── Helpers ───────────────────────────────────────────────────────────────────
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(",")[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

async function processFiles(files: File[]): Promise<AttachedFile[]> {
  const result: AttachedFile[] = []
  for (const file of files) {
    if (file.size > MAX_MB * 1024 * 1024) continue
    const base64 = await readFileAsBase64(file)
    const dataUrl = file.type.startsWith("image/") ? await readFileAsDataUrl(file) : ""
    result.push({ file, dataUrl, base64, mimeType: file.type || "application/octet-stream" })
  }
  return result
}

interface HomeworkWorkspaceProps {
  userId: string
  userAvatar?: string
}

export function HomeworkWorkspace({ userId, userAvatar }: HomeworkWorkspaceProps) {
  const [conversationId, setConversationId] = useState<string>(uuidv4())
  const [localInput, setLocalInput]         = useState("")
  const [attached, setAttached]             = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging]         = useState(false)
  const [previewFile, setPreviewFile]       = useState<AttachedFile | null>(null)
  // tools panel
  const [notes, setNotes]                   = useState("")
  const [quickTasks, setQuickTasks]         = useState<QuickTask[]>([])
  const [newTask, setNewTask]               = useState("")
  const [pomodoroTime, setPomodoroTime]     = useState(25 * 60)
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false)
  const [calcInput, setCalcInput]           = useState("")
  const [calcResult, setCalcResult]         = useState("")

  const scrollRef             = useRef<HTMLDivElement>(null)
  const fileInputRef          = useRef<HTMLInputElement>(null)
  const dropZoneRef           = useRef<HTMLDivElement>(null)
  const pomodoroRef           = useRef<NodeJS.Timeout | null>(null)
  const [refreshSidebar, setRefreshSidebar] = useState(0)

  const { messages, status, setMessages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/homework/chat",
      prepareSendMessagesRequest: ({ messages: msgs, body: bodyExtra }) => ({
        body: { messages: msgs, conversationId, userId, ...((bodyExtra as object) ?? {}) },
      }),
    }),
    onError: (e) => console.error("[chat]", e),
    onFinish: () => setRefreshSidebar(n => n + 1),
  })

  const isChatLoading = status === "streaming" || status === "submitted"

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // ── Pomodoro timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPomodoroRunning) {
      pomodoroRef.current = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) { setIsPomodoroRunning(false); return 25 * 60 }
          return prev - 1
        })
      }, 1000)
    } else {
      if (pomodoroRef.current) clearInterval(pomodoroRef.current)
    }
    return () => { if (pomodoroRef.current) clearInterval(pomodoroRef.current) }
  }, [isPomodoroRunning])

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) setIsDragging(false)
  }, [])

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const processed = await processFiles(files)
    setAttached(prev => [...prev, ...processed])
  }, [])

  // ── File input / clipboard paste ──────────────────────────────────────────
  const onFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const processed = await processFiles(files)
    setAttached(prev => [...prev, ...processed])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const onPaste = useCallback(async (e: React.ClipboardEvent) => {
    const imageItems = Array.from(e.clipboardData.items).filter(i => i.type.startsWith("image/"))
    if (imageItems.length === 0) return
    e.preventDefault()
    const files = imageItems.map(i => i.getAsFile()).filter(Boolean) as File[]
    const processed = await processFiles(files)
    setAttached(prev => [...prev, ...processed])
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!localInput.trim() && attached.length === 0) return

    const fileParts: any[] = []
    for (const af of attached) {
      if (af.mimeType.startsWith("image/")) {
        fileParts.push({ type: "image", data: af.base64, mimeType: af.mimeType, name: af.file.name })
      } else {
        fileParts.push({ type: "file", data: af.base64, mimeType: af.mimeType, name: af.file.name })
      }
    }

    const text = localInput.trim() || (attached.length > 0 ? "Please analyze the attached file(s)." : "")
    setLocalInput("")
    setAttached([])

    await sendMessage(
      { text },
      { body: { fileParts: fileParts.length > 0 ? fileParts : undefined } }
    )
  }, [localInput, attached, sendMessage])

  // ── Conversation management ───────────────────────────────────────────────
  const createNewConversation = () => {
    setConversationId(uuidv4())
    setMessages([])
    setAttached([])
  }

  const selectConversation = async (convId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("homework_chat_history")
      .select("*")
      .eq("conversation_id", convId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (!error && data) {
      setMessages(data.map((msg: any) => ({
        id: msg.id || uuidv4(),
        role: msg.role as "user" | "assistant",
        parts: [{ type: "text", text: msg.content }],
      })))
    }
    setConversationId(convId)
  }

  // ── Tools helpers ─────────────────────────────────────────────────────────
  const addQuickTask = () => {
    if (!newTask.trim()) return
    setQuickTasks(prev => [...prev, { id: uuidv4(), text: newTask, completed: false }])
    setNewTask("")
  }

  const calculateExpression = () => {
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`'use strict'; return (${calcInput})`)()
      setCalcResult(String(result))
    } catch { setCalcResult("Error") }
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  const downloadFile = (af: AttachedFile) => {
    const url = URL.createObjectURL(af.file)
    const a = document.createElement("a")
    a.href = url; a.download = af.file.name
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Conversation sidebar */}
      <HomeworkChatSidebar
        userId={userId}
        currentConversationId={conversationId}
        onCreateNew={createNewConversation}
        onSelectConversation={selectConversation}
        onDeleteConversation={(id) => { if (id === conversationId) createNewConversation() }}
        refreshTrigger={refreshSidebar}
      />

      {/* Main workspace */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">

          {/* ── Chat column (2/3) ── */}
          <Card
            ref={dropZoneRef}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`lg:col-span-2 flex flex-col overflow-hidden relative transition-colors ${
              isDragging ? "border-primary bg-primary/5" : ""
            }`}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-primary/10 backdrop-blur-sm rounded-lg pointer-events-none">
                <Upload className="h-12 w-12 text-primary animate-bounce" />
                <p className="text-lg font-semibold text-primary">Drop files to attach</p>
                <p className="text-sm text-muted-foreground">Images, PDFs, docs, code files — up to {MAX_MB} MB each</p>
              </div>
            )}

            {/* Chat header */}
            <CardHeader className="border-b shrink-0 py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">AI</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">CalendarAI Tutor</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">Drag files · paste images · ask anything</p>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="rounded-full bg-primary/10 p-5 mb-4">
                    <Brain className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Your AI Study Tutor</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Ask questions, upload homework photos, drop PDFs, or paste screenshots — I'll analyze and guide you step by step.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => setLocalInput(s.text)}
                        className="flex items-center gap-2 text-left p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                      >
                        <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                        <span className="text-sm font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1">
                    <Upload className="h-3 w-3" /> You can also drag &amp; drop files anywhere on this panel
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">AI</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[75%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        {msg.role === "assistant" && (
                          <span className="text-xs font-medium text-muted-foreground px-1">CalendarAI Tutor</span>
                        )}
                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}>
                          {(msg as any).parts ? (
                            (msg as any).parts.map((part: any, i: number) => {
                              if (part.type === "text") {
                                return (
                                  <div key={i} className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                      components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                        code: ({ children }) => <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                                        pre: ({ children }) => <pre className="bg-background/50 p-3 rounded-lg overflow-x-auto my-2 text-xs">{children}</pre>,
                                        h1: ({ children }) => <h1 className="font-bold text-lg mt-3 mb-1">{children}</h1>,
                                        h2: ({ children }) => <h2 className="font-bold text-base mt-3 mb-1">{children}</h2>,
                                        h3: ({ children }) => <h3 className="font-semibold mt-2 mb-1">{children}</h3>,
                                      }}
                                    >{part.text}</ReactMarkdown>
                                  </div>
                                )
                              }
                              if (part.type === "image" && part.dataUrl) {
                                return (
                                  <img key={i} src={part.dataUrl} alt="attached" className="rounded-lg max-h-48 mt-2 object-contain" />
                                )
                              }
                              return null
                            })
                          ) : (msg as any).content ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{(msg as any).content}</ReactMarkdown>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                          {userAvatar
                            ? <AvatarImage src={userAvatar} alt="You" />
                            : <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">You</AvatarFallback>
                          }
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">AI</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex gap-1.5 items-center">
                          <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input area */}
            <div className="border-t p-3 shrink-0 space-y-2 bg-card">
              {/* Attached file chips */}
              {attached.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attached.map((af, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg border bg-muted text-xs cursor-pointer hover:bg-accent transition-colors group"
                      onClick={() => setPreviewFile(af)}
                    >
                      {af.mimeType.startsWith("image/") ? (
                        <img src={af.dataUrl} alt={af.file.name} className="h-6 w-6 rounded object-cover shrink-0" />
                      ) : af.mimeType === "application/pdf" ? (
                        <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      )}
                      <span className="truncate max-w-[120px] font-medium">{af.file.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAttached(prev => prev.filter((_, i) => i !== idx)) }}
                        className="ml-0.5 opacity-50 hover:opacity-100 hover:text-destructive transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea + buttons */}
              <form onSubmit={handleSend} className="flex gap-2 items-end">
                <textarea
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  onPaste={onPaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any) }
                  }}
                  placeholder="Ask a question, drop a file, or paste a screenshot… (Enter to send, Shift+Enter for newline)"
                  disabled={isChatLoading}
                  rows={2}
                  className="flex-1 resize-none px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 max-h-36"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  onChange={onFileInputChange}
                  className="hidden"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isChatLoading}
                    title="Attach files (or drag & drop)"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9"
                    disabled={isChatLoading || (!localInput.trim() && attached.length === 0)}
                  >
                    {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          {/* ── Tools column (1/3) ── */}
          <div className="flex flex-col gap-4 overflow-y-auto">
            {/* Quick Tasks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Check className="h-4 w-4" /> Quick Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a task..."
                    onKeyDown={(e) => e.key === "Enter" && addQuickTask()}
                    className="text-sm h-8"
                  />
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={addQuickTask}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {quickTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm group">
                      <button
                        onClick={() => setQuickTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                        className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          task.completed ? "bg-primary border-primary" : "border-muted-foreground hover:border-primary"
                        }`}
                      >
                        {task.completed && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </button>
                      <span className={`flex-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.text}</span>
                      <button
                        onClick={() => setQuickTasks(prev => prev.filter(t => t.id !== task.id))}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pomodoro */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Focus Timer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <span className="text-4xl font-bold tabular-nums tracking-tight">{formatTime(pomodoroTime)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsPomodoroRunning(r => !r)}
                  >
                    {isPomodoroRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    {isPomodoroRunning ? "Pause" : "Start"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { setIsPomodoroRunning(false); setPomodoroTime(25 * 60) }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calculator */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  value={calcInput}
                  onChange={(e) => setCalcInput(e.target.value)}
                  placeholder="e.g. 2 + 2 * 3"
                  onKeyDown={(e) => e.key === "Enter" && calculateExpression()}
                  className="text-sm font-mono h-8"
                />
                <Button onClick={calculateExpression} variant="outline" className="w-full h-8 text-sm">
                  Calculate
                </Button>
                {calcResult && (
                  <div className="text-center p-2 bg-muted rounded-lg text-xl font-bold tabular-nums">
                    = {calcResult}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Quick Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jot things down while you study…"
                  className="min-h-[120px] text-sm resize-none"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── File preview dialog ── */}
      <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2 min-w-0">
                {previewFile?.mimeType.startsWith("image/")
                  ? <ImageIcon className="h-4 w-4 shrink-0" />
                  : <FileText className="h-4 w-4 shrink-0" />}
                <span className="truncate text-sm">{previewFile?.file.name}</span>
              </div>
              <Button
                variant="outline" size="sm" className="shrink-0"
                onClick={() => previewFile && downloadFile(previewFile)}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {previewFile?.mimeType.startsWith("image/") ? (
                <img
                  src={previewFile.dataUrl}
                  alt={previewFile.file.name}
                  className="max-w-full rounded-lg shadow-md object-contain mx-auto"
                />
              ) : previewFile?.mimeType === "application/pdf" ? (
                <div className="text-center py-10 space-y-3">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="font-medium">{previewFile.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    PDF · {(previewFile.file.size / 1024).toFixed(1)} KB · The AI will extract and read its text
                  </p>
                  <Button onClick={() => previewFile && downloadFile(previewFile)}>
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </Button>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="font-medium">{previewFile?.file.name}</p>
                  <p className="text-sm text-muted-foreground">{previewFile?.mimeType} · {((previewFile?.file.size ?? 0) / 1024).toFixed(1)} KB</p>
                  <Button onClick={() => previewFile && downloadFile(previewFile)}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
