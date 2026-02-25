"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, Loader2, X } from "lucide-react"
import { toast } from "sonner"

interface Message {
  id: string
  content: string
  sender_role: "user" | "admin"
  created_at: string
  sender_id: string
}

interface Chat {
  id: string
  status: string
  subject: string | null
  created_at: string
}

export function SupportChat() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadOrCreateChat()
    }
  }, [open])

  useEffect(() => {
    if (currentChat) {
      loadMessages()
      const channel = supabase
        .channel(`support-chat-${currentChat.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `chat_id=eq.${currentChat.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message])
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentChat])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const loadOrCreateChat = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First, check if current chat was closed by admin - if so, clear it
      if (currentChat) {
        const { data: chatCheck } = await supabase
          .from("support_chats")
          .select("status")
          .eq("id", currentChat.id)
          .single()
        
        if (chatCheck && chatCheck.status === "closed") {
          setCurrentChat(null)
          setMessages([])
        }
      }

      const { data: existingChats } = await supabase
        .from("support_chats")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)

      if (existingChats && existingChats.length > 0) {
        setCurrentChat(existingChats[0])
      } else {
        // No open chat - clear current chat and messages
        setCurrentChat(null)
        setMessages([])
        
        // Create new chat
        const { data: newChat, error } = await supabase
          .from("support_chats")
          .insert({ user_id: user.id, subject: "Support Request" })
          .select()
          .single()

        if (error) throw error
        setCurrentChat(newChat)
      }
    } catch (error) {
      console.error("Load chat error:", error)
      toast.error("Failed to load chat")
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!currentChat) return
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("chat_id", currentChat.id)
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Load messages error:", error)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !currentChat) return

    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: newMsg, error } = await supabase.from("support_messages").insert({
        chat_id: currentChat.id,
        sender_id: user.id,
        content: message.trim(),
        sender_role: "user",
      }).select().single()

      if (error) throw error
      
      // Optimistically add message to state for instant UI update
      if (newMsg) {
        setMessages(prev => [...prev, newMsg as Message])
      }
      
      setMessage("")
    } catch (error) {
      console.error("Send message error:", error)
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          data-support-chat
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Support Chat</span>
            {currentChat?.status === "open" && (
              <span className="text-xs font-normal text-muted-foreground">
                Live support
              </span>
            )}
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
                      className={`flex ${msg.sender_role === "admin" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.sender_role === "admin"
                            ? "bg-muted text-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="border-t px-6 py-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
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
                  disabled={!message.trim() || sending}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
