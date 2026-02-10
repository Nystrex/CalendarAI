"use client"

import React, { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Loader2, Plus, Calendar, MessageSquare, History } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import ReactMarkdown from "react-markdown"
import { createClient } from "@/lib/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HomeworkChatProps {
  userId: string | null
}

interface Conversation {
  id: string
  title: string
  updated_at: string
}

export function HomeworkChat({ userId }: HomeworkChatProps) {
  const [conversationId, setConversationId] = useState<string>(uuidv4())
  const [localInput, setLocalInput] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, status, setMessages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/homework/chat",
      prepareSendMessagesRequest: ({ messages, requestBodyExtra }) => {
        return {
          body: {
            messages,
            conversationId,
            userId,
            ...requestBodyExtra,
          },
        }
      },
    }),
    onError: (error) => {
      console.error("[v0] Chat error:", error)
    },
  })

  const isChatLoading = status === "streaming" || status === "submitted"

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) return
      const supabase = createClient()
      const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", userId).single()
      if (profile?.avatar_url) {
        setUserAvatar(profile.avatar_url)
      }
    }
    loadUserProfile()
  }, [userId])

  // Load conversation history
  useEffect(() => {
    const loadConversations = async () => {
      if (!userId) return
      console.log("[v0] Loading conversations for user:", userId)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("homework_chat_history")
        .select("conversation_id, content, created_at")
        .eq("user_id", userId)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(50)

      console.log("[v0] Conversations data:", data, "error:", error)

      if (data) {
        // Group by conversation and get first message as title
        const convMap = new Map<string, Conversation>()
        data.forEach((msg) => {
          if (!convMap.has(msg.conversation_id)) {
            convMap.set(msg.conversation_id, {
              id: msg.conversation_id,
              title: msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : ""),
              updated_at: msg.created_at,
            })
          }
        })
        console.log("[v0] Loaded conversations:", Array.from(convMap.values()))
        setConversations(Array.from(convMap.values()))
      }
    }
    loadConversations()
  }, [userId])

  // Load messages for selected conversation
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!conversationId || !userId) return

      console.log("[v0] Loading messages for conversation:", conversationId)
      const supabase = createClient()
      const { data: history, error } = await supabase
        .from("homework_chat_history")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })

      console.log("[v0] Chat history:", history, "error:", error)

      if (history && history.length > 0) {
        const formattedMessages = history.map((msg) => ({
          id: `${msg.id}`,
          role: msg.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: msg.content }],
        }))
        console.log("[v0] Setting messages:", formattedMessages)
        setMessages(formattedMessages)
      } else {
        console.log("[v0] No history found, clearing messages")
        setMessages([])
      }
    }
    loadChatHistory()
  }, [conversationId, userId, setMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!localInput.trim() || !userId) return

    await sendMessage({ text: localInput }, { body: { conversationId, userId } })
    setLocalInput("")
  }

  const handleNewConversation = () => {
    const newId = uuidv4()
    setConversationId(newId)
    setMessages([])
    setShowHistory(false)
  }

  const handleLoadConversation = (convId: string) => {
    setConversationId(convId)
    setShowHistory(false)
  }

  return (
    <div className="flex h-full bg-background">
      {/* Conversation History Sidebar */}
      {showHistory && (
        <div className="w-64 border-r bg-card/50 flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              Chat History
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <Button
                  key={conv.id}
                  variant={conv.id === conversationId ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleLoadConversation(conv.id)}
                >
                  <MessageSquare className="h-3 w-3 shrink-0 mr-2" />
                  <span className="text-xs truncate">{conv.title}</span>
                </Button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No previous conversations</p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Homework Help</h2>
              <p className="text-sm text-muted-foreground">Get instant help with homework questions and study challenges</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-2 bg-transparent">
                <History className="h-4 w-4" />
                {showHistory ? "Hide" : "History"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewConversation} className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto">
            <div className="p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Start Your Homework Session</h3>
                  <p className="text-muted-foreground max-w-md mb-6">
                    Ask questions about any subject, request help understanding concepts, or get study tips. I know about your upcoming assignments and deadlines!
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left w-full max-w-md">
                    <Card className="p-3 cursor-pointer hover:bg-accent transition-colors">
                      <p className="font-medium text-sm">Explain a concept</p>
                      <p className="text-xs text-muted-foreground">Clear explanations on any topic</p>
                    </Card>
                    <Card className="p-3 cursor-pointer hover:bg-accent transition-colors">
                      <p className="font-medium text-sm">Problem solving</p>
                      <p className="text-xs text-muted-foreground">Work through problems step-by-step</p>
                    </Card>
                    <Card className="p-3 cursor-pointer hover:bg-accent transition-colors">
                      <p className="font-medium text-sm">Study tips</p>
                      <p className="text-xs text-muted-foreground">Personalized study strategies</p>
                    </Card>
                    <Card className="p-3 cursor-pointer hover:bg-accent transition-colors">
                      <p className="font-medium text-sm">Exam prep</p>
                      <p className="text-xs text-muted-foreground">Prepare for upcoming tests</p>
                    </Card>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                            <Calendar className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`flex flex-col gap-1 max-w-2xl ${
                          message.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <p className="text-xs font-semibold text-muted-foreground px-1">CalendarAI</p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {message.parts.map((part, index) => {
                              if (part.type === "text") {
                                return (
                                  <ReactMarkdown
                                    key={index}
                                    components={{
                                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                      li: ({ children }) => <li>{children}</li>,
                                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                      h1: ({ children }) => <h1 className="font-bold text-xl mt-4 mb-2">{children}</h1>,
                                      h2: ({ children }) => <h2 className="font-bold text-lg mt-3 mb-2">{children}</h2>,
                                      h3: ({ children }) => <h3 className="font-bold text-base mt-3 mb-2">{children}</h3>,
                                      code: ({ children }) => (
                                        <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                                      ),
                                      pre: ({ children }) => (
                                        <pre className="bg-background/50 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>
                                      ),
                                    }}
                                  >
                                    {part.text}
                                  </ReactMarkdown>
                                )
                              }
                              return null
                            })}
                          </div>
                        </div>
                      </div>
                      {message.role === "user" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          {userAvatar ? (
                            <AvatarImage src={userAvatar || "/placeholder.svg"} alt="You" />
                          ) : (
                            <AvatarFallback className="bg-secondary text-secondary-foreground">You</AvatarFallback>
                          )}
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                          <Calendar className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted text-foreground rounded-2xl px-4 py-3">
                        <div className="flex gap-2">
                          <div className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce" />
                          <div className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-card/50 backdrop-blur-sm px-6 py-4 flex-shrink-0">
          <form onSubmit={handleFormSubmit} className="flex gap-3">
            <Input
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isChatLoading || !userId}
              className="flex-1"
            />
            <Button type="submit" disabled={isChatLoading || !localInput?.trim() || !userId} size="icon">
              {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2">Always review AI responses carefully. AI may make mistakes.</p>
        </div>
      </div>
    </div>
  )
}
