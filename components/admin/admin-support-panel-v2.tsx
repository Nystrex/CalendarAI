"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Send, 
  MessageCircle, 
  User, 
  CheckCircle2, 
  XCircle, 
  Archive, 
  Clock,
  AlertCircle,
  Search,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"

interface Chat {
  id: string
  user_id: string
  subject: string
  status: "open" | "closed" | "archived"
  priority: "low" | "normal" | "high" | "urgent"
  created_at: string
  updated_at: string
  last_message_at: string | null
  admin_notes: string | null
  user_name?: string
  user_email?: string
  unread_count?: number
}

interface Message {
  id: string
  chat_id: string
  sender_id: string
  sender_role: "user" | "admin" | "system"
  content: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

type ChatFilter = "all" | "open" | "closed" | "unread" | "urgent"

export function AdminSupportPanelV2() {
  const [chats, setChats] = useState<Chat[]>([])
  const [filteredChats, setFilteredChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<ChatFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showNotes, setShowNotes] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load all chats
  const loadChats = useCallback(async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from("support_chat_summary")
      .select("*")
      .order("updated_at", { ascending: false })
    
    if (error) {
      console.error("Failed to load chats:", error)
      toast.error("Failed to load support chats")
      setLoading(false)
      return
    }
    
    if (data) {
      const typedChats: Chat[] = data.map((chat: any) => ({
        ...chat,
        status: chat.status as Chat["status"],
        priority: chat.priority as Chat["priority"],
        unread_count: chat.unread_user_messages || 0,
      }))
      setChats(typedChats)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadChats()
    
    // Subscribe to chat updates
    const channel = supabase
      .channel("admin-chats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_chats" },
        () => loadChats()
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadChats])

  // Filter and search chats
  useEffect(() => {
    let filtered = chats
    
    // Apply status filter
    if (filter === "open") filtered = filtered.filter(c => c.status === "open")
    else if (filter === "closed") filtered = filtered.filter(c => c.status === "closed")
    else if (filter === "unread") filtered = filtered.filter(c => (c.unread_count || 0) > 0)
    else if (filter === "urgent") filtered = filtered.filter(c => c.priority === "urgent" || c.priority === "high")
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.subject.toLowerCase().includes(query) ||
        c.user_name?.toLowerCase().includes(query) ||
        c.user_email?.toLowerCase().includes(query)
      )
    }
    
    setFilteredChats(filtered)
  }, [chats, filter, searchQuery])

  // Load messages for selected chat
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
      setMessages(data as Message[])
    }
  }

  // Subscribe to messages for selected chat
  useEffect(() => {
    if (!selectedChat?.id) return
    
    loadMessages(selectedChat.id)
    setAdminNotes(selectedChat.admin_notes || "")
    
    // Mark user messages as read
    markMessagesAsRead(selectedChat.id)
    
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
        (payload: { new: Message }) => {
          const newMsg = payload.new
          setMessages(prev => [...prev, newMsg])
          
          // Auto-mark user messages as read
          if (newMsg.sender_role === "user") {
            markMessagesAsRead(selectedChat.id)
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedChat?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const markMessagesAsRead = async (chatId: string) => {
    await supabase
      .from("support_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .eq("sender_role", "user")
      .eq("is_read", false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return
    
    setSending(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Not authenticated")
        return
      }
      
      const { error } = await supabase.from("support_messages").insert({
        chat_id: selectedChat.id,
        sender_id: user.id,
        sender_role: "admin",
        content: newMessage.trim(),
      })
      
      if (error) throw error
      
      setNewMessage("")
    } catch (error: any) {
      console.error("Send message error:", error)
      toast.error(error.message || "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const updateChatStatus = async (chatId: string, status: Chat["status"]) => {
    const { error } = await supabase
      .from("support_chats")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", chatId)
    
    if (error) {
      toast.error("Failed to update status")
      return
    }
    
    // Send system message if closing
    if (status === "closed") {
      await supabase.from("support_messages").insert({
        chat_id: chatId,
        sender_id: "00000000-0000-0000-0000-000000000000",
        sender_role: "system",
        content: "This chat has been closed by support. You can start a new chat if you need further assistance.",
      })
    }
    
    loadChats()
    if (selectedChat?.id === chatId) {
      setSelectedChat({ ...selectedChat, status })
    }
  }

  const updatePriority = async (chatId: string, priority: Chat["priority"]) => {
    const { error } = await supabase
      .from("support_chats")
      .update({ priority })
      .eq("id", chatId)
    
    if (error) {
      toast.error("Failed to update priority")
      return
    }
    
    loadChats()
    if (selectedChat?.id === chatId) {
      setSelectedChat({ ...selectedChat, priority })
    }
  }

  const saveAdminNotes = async () => {
    if (!selectedChat) return
    
    const { error } = await supabase
      .from("support_chats")
      .update({ admin_notes: adminNotes })
      .eq("id", selectedChat.id)
    
    if (error) {
      toast.error("Failed to save notes")
    } else {
      toast.success("Notes saved")
      setSelectedChat({ ...selectedChat, admin_notes: adminNotes })
    }
  }

  const deleteChat = async (chatId: string) => {
    if (!confirm("Are you sure you want to delete this chat? This action cannot be undone.")) return
    
    const { error } = await supabase
      .from("support_chats")
      .delete()
      .eq("id", chatId)
    
    if (error) {
      toast.error("Failed to delete chat")
    } else {
      toast.success("Chat deleted")
      if (selectedChat?.id === chatId) {
        setSelectedChat(null)
        setMessages([])
      }
      loadChats()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Open</Badge>
      case "closed":
        return <Badge variant="secondary">Closed</Badge>
      case "archived":
        return <Badge variant="outline">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>
      case "high":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 text-xs">High</Badge>
      case "low":
        return <Badge variant="outline" className="text-xs">Low</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Normal</Badge>
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      {/* Chat List */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Support Tickets
            {chats.filter(c => c.status === "open" && (c.unread_count || 0) > 0).length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {chats.filter(c => c.status === "open" && (c.unread_count || 0) > 0).length}
              </Badge>
            )}
          </CardTitle>
          
          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          {/* Filters */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as ChatFilter)} className="mt-2">
            <TabsList className="grid grid-cols-5 h-8">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
              <TabsTrigger value="urgent" className="text-xs">Urgent</TabsTrigger>
              <TabsTrigger value="closed" className="text-xs">Closed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? "No chats match your search" : "No support tickets"}
              </div>
            ) : (
              <div className="divide-y">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                      selectedChat?.id === chat.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{chat.user_name || "Unknown"}</p>
                          {(chat.unread_count || 0) > 0 && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">
                              {chat.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{chat.subject}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(chat.status)}
                        {getPriorityBadge(chat.priority)}
                      </div>
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
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedChat.user_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedChat.user_email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedChat.subject}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  {/* Priority Select */}
                  <Select
                    value={selectedChat.priority}
                    onValueChange={(v) => updatePriority(selectedChat.id, v as Chat["priority"])}
                  >
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Status Buttons */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={selectedChat.status === "open" ? "default" : "outline"}
                      onClick={() => updateChatStatus(selectedChat.id, "open")}
                      className="h-8 px-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedChat.status === "closed" ? "default" : "outline"}
                      onClick={() => updateChatStatus(selectedChat.id, "closed")}
                      className="h-8 px-2"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedChat.status === "archived" ? "default" : "outline"}
                      onClick={() => updateChatStatus(selectedChat.id, "archived")}
                      className="h-8 px-2"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteChat(selectedChat.id)}
                      className="h-8 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Admin Notes Toggle */}
            <div className="px-4 py-2 border-b bg-muted/30">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Admin Notes
              </button>
              {showNotes && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this chat..."
                    className="min-h-[80px] text-sm"
                  />
                  <Button size="sm" onClick={saveAdminNotes} className="w-full">
                    Save Notes
                  </Button>
                </div>
              )}
            </div>

            {/* Messages */}
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_role === "admin" ? "justify-end" : 
                          msg.sender_role === "system" ? "justify-center" : 
                          "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            msg.sender_role === "admin"
                              ? "bg-primary text-primary-foreground"
                              : msg.sender_role === "system"
                              ? "bg-muted/50 text-muted-foreground text-xs italic text-center px-6"
                              : "bg-muted border border-border"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_role === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {format(new Date(msg.created_at), "MMM d, h:mm a")}
                            {msg.sender_role === "admin" && msg.is_read && (
                              <span className="ml-2">✓ Read</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t">
              {selectedChat.status === "open" ? (
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
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={sending || !newMessage.trim()}
                  >
                    {sending ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    This chat is {selectedChat.status}. Reopen to send messages.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateChatStatus(selectedChat.id, "open")}
                    className="mt-2"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Reopen Chat
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a ticket to view messages</p>
              <p className="text-sm mt-1">Choose from the list on the left</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
