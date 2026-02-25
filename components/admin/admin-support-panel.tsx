"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, MessageCircle, User, Clock, CheckCircle, XCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface SupportChat {
  id: string
  user_id: string
  subject: string
  status: "open" | "closed" | "pending"
  created_at: string
  updated_at: string
  user_email?: string
  user_name?: string
  last_message?: string
}

interface SupportMessage {
  id: string
  chat_id: string
  sender_id: string
  sender_role: "user" | "admin"
  content: string
  created_at: string
}

export function AdminSupportPanel() {
  const [chats, setChats] = useState<SupportChat[]>([])
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load all support chats
  useEffect(() => {
    loadChats()
    
    // Subscribe to new chats
    const channel = supabase
      .channel("admin-support-chats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_chats" },
        () => loadChats()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id)
      
      // Subscribe to messages
      const channel = supabase
        .channel(`admin-chat-${selectedChat.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `chat_id=eq.${selectedChat.id}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as SupportMessage])
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedChat])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadChats = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from("support_chats")
      .select("*")
      .order("updated_at", { ascending: false })

    if (!error && data) {
      // Get user info for each chat
      const chatsWithUserInfo = await Promise.all(
        data.map(async (chat) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", chat.user_id)
            .single()
          
          return {
            ...chat,
            user_email: profile?.email || "Unknown",
            user_name: profile?.full_name || "Unknown User",
          }
        })
      )
      setChats(chatsWithUserInfo)
    }
    setLoading(false)
  }

  const loadMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return

    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: sentMsg, error } = await supabase.from("support_messages").insert({
        chat_id: selectedChat.id,
        sender_id: user.id,
        sender_role: "admin",
        content: newMessage.trim(),
      }).select().single()

      if (error) throw error

      // Optimistically add message to state for instant UI update
      if (sentMsg) {
        setMessages(prev => [...prev, sentMsg as SupportMessage])
      }

      setNewMessage("")
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast.error(error?.message || "Failed to send message - check if you're an admin")
    } finally {
      setSending(false)
    }
  }

  const updateChatStatus = async (chatId: string, status: "open" | "closed" | "pending") => {
    await supabase
      .from("support_chats")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", chatId)
    
    loadChats()
    if (selectedChat?.id === chatId) {
      setSelectedChat({ ...selectedChat, status })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-500/10 text-green-500"
      case "closed": return "bg-muted text-muted-foreground"
      case "pending": return "bg-yellow-500/10 text-yellow-500"
      default: return "bg-muted"
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Chat List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Support Tickets
            {chats.filter(c => c.status === "open").length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {chats.filter(c => c.status === "open").length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No support tickets</div>
            ) : (
              <div className="divide-y">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                      selectedChat?.id === chat.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{chat.user_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{chat.subject}</p>
                      </div>
                      <Badge className={getStatusColor(chat.status)} variant="secondary">
                        {chat.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedChat ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedChat.user_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedChat.subject}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedChat.status === "open" ? "default" : "outline"}
                    onClick={() => updateChatStatus(selectedChat.id, "open")}
                    className={selectedChat.status !== "open" ? "bg-transparent" : ""}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedChat.status === "closed" ? "default" : "outline"}
                    onClick={() => updateChatStatus(selectedChat.id, "closed")}
                    className={selectedChat.status !== "closed" ? "bg-transparent" : ""}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.sender_role === "admin"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
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
                  placeholder="Type your reply..."
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a ticket to view messages</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
