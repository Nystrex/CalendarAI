"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, X, Minimize2, Maximize2, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface Message {
  id: string
  chat_id: string
  sender_id: string
  sender_role: "user" | "admin" | "system"
  content: string
  is_read: boolean
  created_at: string
}

interface Chat {
  id: string
  subject: string
  status: "open" | "closed" | "archived"
  priority: "low" | "normal" | "high" | "urgent"
  created_at: string
  updated_at: string
  last_message_at: string | null
}

type ViewState = "closed" | "minimized" | "open" | "new-chat"

export function SupportChatWidget() {
  const [viewState, setViewState] = useState<ViewState>("closed")
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Initialize - get user and check for active chat
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setUserId(user.id)
      
      // Look for existing open chat
      const { data: existingChat } = await supabase
        .from("support_chats")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      
      if (existingChat) {
        setChat(existingChat)
        loadMessages(existingChat.id)
      }
    }
    init()
  }, [])

  // Load messages for a chat
  const loadMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
    
    if (error) {
      console.error("Failed to load messages:", error)
      return
    }
    
    if (data) {
      setMessages(data)
      // Check for unread admin messages
      const hasUnreadAdmin = data.some(m => m.sender_role === "admin" && !m.is_read)
      setHasUnread(hasUnreadAdmin)
    }
  }

  // Subscribe to real-time updates
  useEffect(() => {
    if (!chat?.id) return

    const channel = supabase
      .channel(`chat-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload: { new: Message }) => {
          const newMsg = payload.new
          setMessages(prev => [...prev, newMsg])
          
          // If admin message and widget is closed/minimized, show notification
          if (newMsg.sender_role === "admin" && viewState !== "open") {
            setHasUnread(true)
            toast.info("New message from support", {
              description: newMsg.content.substring(0, 50) + (newMsg.content.length > 50 ? "..." : ""),
            })
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_chats",
          filter: `id=eq.${chat.id}`,
        },
        (payload: { new: Chat }) => {
          const updatedChat = payload.new
          setChat(updatedChat)
          
          // If chat was closed by admin, notify user
          if (updatedChat.status === "closed") {
            toast.info("This chat has been closed by support")
            setTimeout(() => {
              setChat(null)
              setMessages([])
              setViewState("new-chat")
            }, 2000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chat?.id, viewState])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Mark messages as read when opening chat
  useEffect(() => {
    if (viewState === "open" && chat?.id) {
      markMessagesAsRead()
    }
  }, [viewState, chat?.id])

  const markMessagesAsRead = async () => {
    if (!chat?.id) return
    
    const unreadMessages = messages.filter(m => m.sender_role === "admin" && !m.is_read)
    if (unreadMessages.length === 0) return
    
    await supabase
      .from("support_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("chat_id", chat.id)
      .eq("sender_role", "admin")
      .eq("is_read", false)
    
    setHasUnread(false)
    setMessages(prev => prev.map(m => 
      m.sender_role === "admin" ? { ...m, is_read: true } : m
    ))
  }

  const startNewChat = async () => {
    if (!userId || !subject.trim() || loading) return
    
    setLoading(true)
    
    const { data, error } = await supabase
      .from("support_chats")
      .insert({
        user_id: userId,
        subject: subject.trim(),
        status: "open",
        priority: "normal",
      })
      .select()
      .single()
    
    if (error) {
      toast.error("Failed to start chat: " + error.message)
      setLoading(false)
      return
    }
    
    setChat(data)
    setSubject("")
    setViewState("open")
    setLoading(false)
    
    // Send welcome system message
    await supabase.from("support_messages").insert({
      chat_id: data.id,
      sender_id: userId,
      sender_role: "system",
      content: "Support request created. An agent will respond shortly.",
    })
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat?.id || !userId || chat.status !== "open") return
    
    const content = newMessage.trim()
    setNewMessage("")
    
    const { error } = await supabase.from("support_messages").insert({
      chat_id: chat.id,
      sender_id: userId,
      sender_role: "user",
      content,
    })
    
    if (error) {
      toast.error("Failed to send message: " + error.message)
      setNewMessage(content) // Restore message on error
    }
  }

  const toggleWidget = () => {
    if (viewState === "closed") {
      if (chat) {
        setViewState("open")
        setHasUnread(false)
      } else {
        setViewState("new-chat")
      }
    } else {
      setViewState("closed")
    }
  }

  if (!userId) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Button */}
      {viewState === "closed" && (
        <Button
          onClick={toggleWidget}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg relative"
        >
          <MessageCircle className="h-6 w-6" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      )}

      {/* Chat Widget */}
      {viewState !== "closed" && (
        <Card className="w-80 sm:w-96 shadow-xl border-primary/20">
          {/* Header */}
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">
                {viewState === "new-chat" ? "New Support Request" : "Support Chat"}
              </CardTitle>
              {chat?.status === "open" && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewState(viewState === "minimized" ? "open" : "minimized")}
              >
                {viewState === "minimized" ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={toggleWidget}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>

          {/* Content */}
          {!viewState.includes("minimized") && (
            <CardContent className="p-0">
              {viewState === "new-chat" ? (
                // New Chat Form
                <div className="p-4 space-y-4">
                  <div className="text-center py-4">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Need help? Start a conversation with our support team.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">What do you need help with?</label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Calendar sync not working"
                      onKeyDown={(e) => e.key === "Enter" && startNewChat()}
                    />
                  </div>
                  <Button
                    onClick={startNewChat}
                    disabled={!subject.trim() || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Start Chat
                      </>
                    )}
                  </Button>
                  {chat && (
                    <Button
                      variant="outline"
                      onClick={() => setViewState("open")}
                      className="w-full"
                    >
                      Resume Current Chat
                    </Button>
                  )}
                </div>
              ) : (
                // Chat Messages
                <div className="flex flex-col h-[400px]">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No messages yet. Send a message to get started.
                          </p>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender_role === "user" ? "justify-end" : 
                              msg.sender_role === "system" ? "justify-center" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                msg.sender_role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : msg.sender_role === "system"
                                  ? "bg-muted/50 text-muted-foreground text-xs italic"
                                  : "bg-muted border border-border"
                              }`}
                            >
                              <p>{msg.content}</p>
                              <p className="text-[10px] opacity-70 mt-1">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                {msg.sender_role === "user" && msg.is_read && (
                                  <CheckCircle2 className="h-3 w-3 inline ml-1" />
                                )}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  {chat?.status === "open" ? (
                    <div className="p-3 border-t">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          sendMessage()
                        }}
                        className="flex gap-2"
                      >
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="text-sm"
                          disabled={!chat}
                        />
                        <Button 
                          type="submit" 
                          size="icon" 
                          disabled={!newMessage.trim() || !chat}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-3 border-t bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">
                        This chat has been closed. Start a new chat for further assistance.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setChat(null)
                          setMessages([])
                          setViewState("new-chat")
                        }}
                        className="mt-2"
                      >
                        Start New Chat
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
