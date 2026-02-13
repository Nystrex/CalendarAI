"use client"

import React, { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HomeworkChatSidebar } from "@/components/homework/homework-chat-sidebar"
import { 
  Send, 
  Loader2, 
  Calendar, 
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
  Eye,
  Download
} from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import ReactMarkdown from "react-markdown"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"

interface HomeworkWorkspaceProps {
  userId: string
  userAvatar?: string
}

interface Note {
  id: string
  title: string
  content: string
  updated_at: string
}

interface QuickTask {
  id: string
  text: string
  completed: boolean
}

export function HomeworkWorkspace({ userId, userAvatar }: HomeworkWorkspaceProps) {
  const [conversationId, setConversationId] = useState<string>(uuidv4())
  const [localInput, setLocalInput] = useState("")
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [notes, setNotes] = useState("")
  const [quickTasks, setQuickTasks] = useState<QuickTask[]>([])
  const [newTask, setNewTask] = useState("")
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60)
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false)
  const [calcInput, setCalcInput] = useState("")
  const [calcResult, setCalcResult] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewContent, setPreviewContent] = useState<string>("")
  const [showSidebar, setShowSidebar] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([]); // Declare chatMessages variable

  const [pendingFileAttachments, setPendingFileAttachments] = useState<Array<{ name: string; type: string; data: string }>>([])

  const { messages, status, setMessages, sendMessage } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: "/api/homework/chat",
      prepareSendMessagesRequest: ({ messages, requestBodyExtra }) => ({
        body: {
          messages,
          conversationId,
          userId,
          ...requestBodyExtra,
        },
      }),
    }),
    onError: (error) => {
      console.error("Chat error:", error)
    },
  })

  const isChatLoading = status === "streaming" || status === "submitted"

  // Load upcoming events
  useEffect(() => {
    const loadEvents = async () => {
      if (!userId) return
      const supabase = createClient()
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", userId)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5)

      if (events) setUpcomingEvents(events)
    }
    loadEvents()
  }, [userId])

  // Sync messages from useChat to chatMessages for display
  // Only sync when messages come from AI SDK (have parts), not when manually loaded
  useEffect(() => {
    if (messages.length > 0) {
      // Check if these are AI SDK messages (have parts) or database messages (have content)
      const hasAiSdkFormat = messages.some((msg: any) => msg.parts)
      if (hasAiSdkFormat) {
        setChatMessages(messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts,
          content: typeof msg.content === 'string' ? msg.content : 
            msg.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || ''
        })))
      }
    }
  }, [messages])

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  // Pomodoro timer
  useEffect(() => {
    if (isPomodoroRunning) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            setIsPomodoroRunning(false)
            return 25 * 60
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current)
      }
    }
    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current)
      }
    }
  }, [isPomodoroRunning])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!localInput.trim() && uploadedFiles.length === 0) {
      return
    }
    
    // Convert all files to base64 for the API
    const fileAttachments: Array<{ name: string; type: string; data: string }> = []
    
    for (const file of uploadedFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            const base64Data = result.split(",")[1]
            resolve(base64Data)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        fileAttachments.push({ name: file.name, type: file.type, data: base64 })
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error)
      }
    }

    const messageText = localInput.trim() || `Please analyze these files: ${uploadedFiles.map(f => f.name).join(", ")}`

    await sendMessage(
      { text: messageText },
      { body: { fileAttachments } }
    )
    setLocalInput("")
    setUploadedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      // Limit file size to 10MB and accept common document/image types
      const maxSize = 10 * 1024 * 1024
      const validTypes = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      return file.size <= maxSize && (validTypes.includes(file.type) || file.name.match(/\.(pdf|txt|png|jpg|jpeg|webp|doc|docx)$/i))
    })
    setUploadedFiles(prev => {
      const newFiles = [...prev, ...validFiles]
      return newFiles
    })
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const openFile = (file: File) => {
    setPreviewFile(file)
    
    // Read file content based on type
    const reader = new FileReader()
    
    if (file.type === 'application/pdf') {
      // For PDFs, we'll show a download button and use a PDF viewer
      setPreviewContent("")
    } else if (file.type.startsWith('image/')) {
      // For images, read as data URL
      reader.onload = (e) => {
        setPreviewContent(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      // For text files
      reader.onload = (e) => {
        setPreviewContent(e.target?.result as string)
      }
      reader.readAsText(file)
    } else {
      // For other files (docx, etc.), show a message
      setPreviewContent(`Cannot preview ${file.name}. Please download to view.`)
    }
  }

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const createNewConversation = () => {
    setConversationId(uuidv4())
    setMessages([])
    setChatMessages([]); // Reset chatMessages when creating a new conversation
  }

  const selectConversation = async (convId: string) => {
    // Load messages first
    const supabase = createClient()
    const { data, error } = await supabase
      .from("homework_chat_history")
      .select("*")
      .eq("conversation_id", convId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (!error && data) {
      const loadedMessages = data.map((msg: any) => ({
        id: msg.id || uuidv4(),
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }))
      // Set messages before changing conversation ID
      setMessages(loadedMessages)
      setChatMessages(loadedMessages); // Update chatMessages when selecting a conversation
    }
    
    // Change conversation ID after messages are loaded
    setConversationId(convId)
  }

  const addQuickTask = () => {
    if (!newTask.trim()) return
    setQuickTasks([...quickTasks, { id: uuidv4(), text: newTask, completed: false }])
    setNewTask("")
  }

  const toggleTask = (id: string) => {
    setQuickTasks(quickTasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const removeTask = (id: string) => {
    setQuickTasks(quickTasks.filter(task => task.id !== id))
  }

  const calculateExpression = () => {
    try {
      // Basic calculator using Function constructor (safe for simple math)
      const result = Function(`'use strict'; return (${calcInput})`)()
      setCalcResult(result.toString())
    } catch {
      setCalcResult("Error")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Chat Sidebar */}
      <HomeworkChatSidebar
        userId={userId}
        currentConversationId={conversationId}
        onCreateNew={createNewConversation}
        onSelectConversation={selectConversation}
        onDeleteConversation={(convId) => {
          if (convId === conversationId) {
            createNewConversation()
          }
        }}
        refreshTrigger={chatMessages.length}
      />

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden flex flex-col bg-background">
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
          {/* Left Column - AI Chat */}
          <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden">
            <CardHeader className="border-b shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="bg-primary">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    C
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>CalendarAI Assistant</CardTitle>
                  <CardDescription>Ask questions about your assignments and get study help</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 min-h-0">
              <div className="space-y-4" ref={scrollRef}>
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                    <Brain className="h-12 w-12 mb-4 opacity-50" />
                    <p>Ask me anything about your homework or studying</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        {message.role === "assistant" && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                              <Calendar className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-lg rounded-lg px-4 py-3 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                            {/* Handle both AI SDK parts format and simple content string */}
                            {message.parts ? (
                              message.parts.map((part: any, index: number) => {
                                if (part.type === "text") {
                                  return (
                                    <div key={index}>
                                      <ReactMarkdown
                                        components={{
                                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                          code: ({ children }) => <code className="bg-background/50 px-1 rounded text-xs">{children}</code>,
                                        }}
                                      >
                                        {part.text}
                                      </ReactMarkdown>
                                    </div>
                                  )
                                }
                                return null
                              })
                            ) : message.content ? (
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                  code: ({ children }) => <code className="bg-background/50 px-1 rounded text-xs">{children}</code>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            ) : null}
                          </div>
                        </div>
                        {message.role === "user" && userAvatar && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <img src={userAvatar || "/placeholder.svg"} alt="User" />
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            {/* Input Section - Outside CardContent */}
            <div className="border-t p-4 space-y-3 shrink-0 bg-card">
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => {
                    // Determine icon based on file type
                    const getFileIcon = () => {
                      if (file.type.startsWith('image/')) {
                        return <Eye className="h-3 w-3" />
                      } else if (file.type === 'application/pdf') {
                        return <FileText className="h-3 w-3 text-red-500" />
                      } else if (file.type === 'text/plain') {
                        return <FileText className="h-3 w-3 text-blue-500" />
                      } else {
                        return <FileText className="h-3 w-3" />
                      }
                    }
                    
                    return (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="flex items-center gap-2 cursor-pointer hover:bg-accent/80 transition-colors"
                        onClick={() => openFile(file)}
                      >
                        {getFileIcon()}
                        <span className="truncate max-w-[150px] text-xs">
                          {file.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadFile(file)
                          }}
                          className="ml-1 hover:opacity-70 transition-opacity"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="ml-1 hover:opacity-70 transition-opacity"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <textarea
                    value={localInput}
                    onChange={(e) => setLocalInput(e.target.value)}
                    onPaste={(e) => {
                      // Handle image paste
                      const items = e.clipboardData?.items || []
                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                          const file = items[i].getAsFile()
                          if (file) {
                            e.preventDefault()
                            handleFileSelect({ target: { files: [file] } } as any)
                          }
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSendMessage(e as any)
                      }
                    }}
                    placeholder="Ask a question, describe your homework, or paste an image..."
                    disabled={isChatLoading}
                    className="flex-1 px-4 py-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 resize-none max-h-32"
                    rows={3}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isChatLoading}
                    title="Attach files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                <Button 
                  type="submit" 
                  disabled={isChatLoading || (!localInput.trim() && uploadedFiles.length === 0)} 
                  size="icon"
                >
                  {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
                </form>
              </div>
            </Card>

          {/* Right Column - Additional Features */}
          <div className="flex flex-col gap-4">
            {/* Quick Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Quick Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a quick task..."
                    onKeyDown={(e) => e.key === "Enter" && addQuickTask()}
                    className="text-sm"
                  />
                  <Button size="icon" variant="outline" onClick={addQuickTask}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {quickTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleTask(task.id)}
                      >
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${task.completed ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                          {task.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </Button>
                      <span className={task.completed ? "line-through text-muted-foreground" : ""}>{task.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Focus Timer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Focus Timer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-4xl font-bold tabular-nums">{formatTime(pomodoroTime)}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                  >
                    {isPomodoroRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setIsPomodoroRunning(false)
                      setPomodoroTime(25 * 60)
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  value={calcInput}
                  onChange={(e) => setCalcInput(e.target.value)}
                  placeholder="Enter expression (e.g., 2+2*3)"
                  onKeyDown={(e) => e.key === "Enter" && calculateExpression()}
                  className="text-sm font-mono"
                />
                <Button onClick={calculateExpression} variant="outline" className="w-full bg-transparent">
                  Calculate
                </Button>
                {calcResult && (
                  <div className="text-center p-2 bg-muted rounded text-lg font-semibold">
                    = {calcResult}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Quick Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jot down quick notes..."
                  className="min-h-[100px] text-sm"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* File Preview Dialog */}
      <Dialog 
        open={!!previewFile} 
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null)
            setPreviewContent("")
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="truncate">{previewFile?.name}</span>
              </div>
              <Button 
                onClick={() => previewFile && downloadFile(previewFile)}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 w-full">
            <div className="p-4">
              {previewFile?.type === 'application/pdf' ? (
                <div className="space-y-4">
                  <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">{previewFile.name}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      PDF • {(previewFile.size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                      PDF files cannot be previewed inline. Download to view the full document.
                    </p>
                    <Button onClick={() => previewFile && downloadFile(previewFile)} size="lg">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ) : previewFile?.type.startsWith('image/') ? (
                <div className="flex flex-col items-center gap-4">
                  <img 
                    src={previewContent || "/placeholder.svg"} 
                    alt={previewFile.name}
                    className="max-w-full max-h-[60vh] rounded-lg shadow-lg object-contain"
                  />
                  <p className="text-sm text-muted-foreground">
                    {previewFile.name} • {(previewFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : previewFile?.type === 'text/plain' || previewFile?.name.endsWith('.txt') ? (
                <div className="rounded-lg border bg-muted/30 p-6">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {previewContent}
                  </pre>
                </div>
              ) : (
                <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">{previewFile?.name}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {previewFile?.type || 'Unknown file type'} • {((previewFile?.size || 0) / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                    This file type cannot be previewed. Download to view the content.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
