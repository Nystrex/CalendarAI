"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, X, Minimize2, Maximize2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface SupportMessage {
  id: string
  chat_id: string
  sender_id: string
  sender_role: "user" | "admin"
  content: string
  created_at: string
}

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [sending, setSending] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Get user and check for existing open chat
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Check if existing chat was closed - clear if so
        if (chatId) {
          const { data: chatCheck } = await supabase
            .from("support_chats")
            .select("status")
            .eq("id", chatId)
            .single()
          
          if (chatCheck && chatCheck.status === "closed") {
            setChatId(null)
            setMessages([])
          }
        }
        
        // Check for existing open chat
        const { data: existingChat } = await supabase
          .from("support_chats")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
        
        if (existingChat) {
          setChatId(existingChat.id)
        }
      }
    }
    init()
  }, [])

  // Load messages when chat is selected
  useEffect(() => {
    if (chatId) {
      loadMessages()
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`support-chat-${chatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            const newMsg = payload.new as SupportMessage
            setMessages((prev) => [...prev, newMsg])
            if (newMsg.sender_role === "admin" && !isOpen) {
              setHasNewMessage(true)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [chatId, isOpen])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = async () => {
    if (!chatId) return
    
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })

    if (data) {
      setMessages(data)
    }
  }

  const startChat = async () => {
    if (!subject.trim() || !userId) return
    setSending(true)

    const { data, error } = await supabase
      .from("support_chats")
      .insert({
        user_id: userId,
        subject: subject.trim(),
        status: "open",
      })
      .select()
      .single()

    if (!error && data) {
      setChatId(data.id)
      setSubject("")
    }
    setSending(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !userId || sending) return
    setSending(true)

    const { error } = await supabase.from("support_messages").insert({
      chat_id: chatId,
      sender_id: userId,
      sender_role: "user",
      content: newMessage.trim(),
    })

    if (error) {
      console.error("Send message error:", error)
    } else {
      setNewMessage("")
      // Update chat's updated_at
      await supabase
        .from("support_chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chatId)
    }
    setSending(false)
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen)
    setHasNewMessage(false)
    setIsMinimized(false)
  }

  if (!userId) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className={`w-80 shadow-xl border-primary/20 transition-all ${isMinimized ? "h-14" : "h-[450px]"}`}>
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Support Chat
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={toggleOpen}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-[calc(100%-56px)]">
              {!chatId ? (
                // Start new chat
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Need help? Start a conversation with our support team.
                  </p>
                  <div className="space-y-2">
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What do you need help with?"
                    />
                    <Button
                      onClick={startChat}
                      disabled={!subject.trim() || sending}
                      className="w-full"
                    >
                      Start Chat
                    </Button>
                  </div>
                </div>
              ) : (
                // Chat messages
                <>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Send a message to start the conversation
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                                msg.sender_role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-[10px] opacity-70 mt-1">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
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
                        disabled={sending}
                      />
                      <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      ) : (
        <Button
          onClick={toggleOpen}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg relative"
        >
          <MessageCircle className="h-6 w-6" />
          {hasNewMessage && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      )}
    </div>
  )
}
