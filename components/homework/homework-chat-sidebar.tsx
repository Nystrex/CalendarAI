"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"

interface ChatConversation {
  id: string
  created_at: string
  first_message: string
}

interface HomeworkChatSidebarProps {
  userId: string
  currentConversationId: string
  onCreateNew: () => void
  onSelectConversation: (conversationId: string) => void
  onDeleteConversation: (conversationId: string) => void
  refreshTrigger?: number
}

export function HomeworkChatSidebar({
  userId,
  currentConversationId,
  onCreateNew,
  onSelectConversation,
  onDeleteConversation,
  refreshTrigger,
}: HomeworkChatSidebarProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadConversations()
  }, [userId, refreshTrigger])

  const loadConversations = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("homework_chat_history")
        .select("conversation_id, created_at, content")
        .eq("user_id", userId)
        .eq("role", "user")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Group by conversation_id and get first message of each
      const grouped = new Map<string, { created_at: string; content: string }>()
      data?.forEach((msg) => {
        if (!grouped.has(msg.conversation_id)) {
          grouped.set(msg.conversation_id, {
            created_at: msg.created_at,
            content: msg.content,
          })
        }
      })

      const conversations: ChatConversation[] = Array.from(grouped).map(
        ([id, { created_at, content }]) => ({
          id,
          created_at,
          first_message: content.slice(0, 50),
        }),
      )

      setConversations(conversations)
    } catch (error) {
      console.error("Error loading conversations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("homework_chat_history")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)

      if (error) throw error
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      onDeleteConversation(conversationId)
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  return (
    <div className="flex flex-col h-full w-72 border-r bg-card shrink-0">
      <div className="p-4 border-b">
        <Button onClick={onCreateNew} className="w-full" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Loading chats...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all border ${
                  currentConversationId === conv.id 
                    ? "bg-primary/20 border-primary/50" 
                    : "bg-card hover:bg-accent border-transparent hover:border-border"
                }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="flex items-start gap-2 pr-8">
                  <MessageCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight line-clamp-2">
                      {conv.first_message || "New conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(conv.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(conv.id)
                  }}
                  className="absolute right-2 top-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
