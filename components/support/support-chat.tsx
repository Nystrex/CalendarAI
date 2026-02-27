"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow, format } from "date-fns"

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
  user_id: string
  subject: string
  status: "open" | "closed" | "archived"
  priority: "low" | "normal" | "high" | "urgent"
  created_at: string
  updated_at: string
  last_message_at: string | null
}

export function SupportChat() {
  const [open, setOpen] = useState(false)
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasUnread, setHasUnread] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Initialize
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setUserId(user.id)
    }
    init()
  }, [])

  // Load or create chat when dialog opens
  useEffect(() => {
    if (open && userId) {
      loadOrCreateChat()
    }
  }, [open, userId])

  const loadOrCreateChat = async () => {
    setLoading(true)
    
    try {
      // Check for existing open chat
      const { data: existingChat } = await supabase
        .from("support_chats")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      
      if (existingChat) {
        setChat(existingChat)
        loadMessages(existingChat.id)
      } else {
        // Create new chat
        const { data: newChat, error } = await supabase
          .from("support_chats")
          .insert({
            user_id: userId,
            subject: "Support Request",
            status: "open",
            priority: "normal",
          })
          .select()
          .single()
        
        if (error) throw error
        
        setChat(newChat)
        setMessages([])
        
        // Add welcome message
        await supabase.from("support_messages").insert({
          chat_id: newChat.id,
          sender_id: userId,
          sender_role: "system",
          content: "Support request created. An agent will respond shortly.",
        })
      }
    } catch (error) {
      console.error("Load chat error:", error)
      toast.error("Failed to load chat")
    } finally {
      setLoading(false)
    }
  }

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
      const hasUnreadAdmin = data.some((m: Message) => m.sender_role === "admin" && !m.is_read)
      setHasUnread(hasUnreadAdmin)
    }
  }

  // Subscribe to real-time updates
  useEffect(() => {
    if (!chat?.id) return

    const channel = supabase
      .channel(`support-dialog-${chat.id}`)
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
          
          if (newMsg.sender_role === "admin" && !open) {
            setHasUnread(true)
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
          
          if (updatedChat.status === "closed") {
            toast.info("This chat has been closed by support")
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chat?.id, open])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Mark messages as read when opening
  useEffect(() => {
    if (open && chat?.id) {
      markMessagesAsRead()
    }
  }, [open, chat?.id])

  const markMessagesAsRead = async () => {
    if (!chat?.id) return
    
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat?.id || chat.status !== "open") return
    
    setSending(true)
    
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
      setNewMessage(content)
    }
    
    setSending(false)
  }

  const getStatusBadge = () => {
    if (!chat) return null
    
    switch (chat.status) {
      case "open":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
            <Clock className="h-3 w-3 mr-1" />
            Live
          </Badge>
        )
      case "closed":
        return <Badge variant="secondary">Closed</Badge>
      case "archived":
        return <Badge variant="outline">Archived</Badge>
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          data-support-chat
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90 relative"
        >
          <MessageCircle className="h-6 w-6" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Support Chat
              {getStatusBadge()}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Start a conversation with our support team
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_role === "user" ? "justify-end" : 
                        msg.sender_role === "system" ? "justify-center" : 
                        "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.sender_role === "user"
                            ? "bg-primary text-primary-foreground"
                            : msg.sender_role === "system"
                            ? "bg-muted/50 text-muted-foreground text-xs italic text-center px-6"
                            : "bg-muted border border-border"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}>
                          {format(new Date(msg.created_at), "h:mm a")}
                          {msg.sender_role === "admin" && (
                            <span className="ml-2">
                              {msg.is_read ? "✓ Read" : "• Unread"}
                            </span>
                          )}
                          {msg.sender_role === "user" && msg.is_read && (
                            <CheckCircle2 className="h-3 w-3 inline ml-1" />
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {chat?.status === "open" ? (
              <div className="border-t px-6 py-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="icon"
                    className="shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t px-6 py-4 bg-muted/50">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    This chat has been closed by support
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChat(null)
                      loadOrCreateChat()
                    }}
                    className="mt-2"
                  >
                    Start New Chat
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
