"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Trash2, Calendar, Flag, Filter, CheckCircle2, Circle, Clock } from "lucide-react"
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns"

type Priority = "low" | "medium" | "high"

interface ToDoItem {
  id: string
  text: string
  completed: boolean
  priority: Priority
  due_date: string | null
  created_at: string
}

type FilterType = "all" | "active" | "completed"
type SortType = "newest" | "priority" | "due_date"

const priorityConfig = {
  high: { color: "bg-red-500", text: "text-red-600", label: "High", icon: Flag },
  medium: { color: "bg-yellow-500", text: "text-yellow-600", label: "Medium", icon: Flag },
  low: { color: "bg-green-500", text: "text-green-600", label: "Low", icon: Flag },
}

export function ToDoList() {
  const [todos, setTodos] = useState<ToDoItem[]>([])
  const [input, setInput] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [dueDate, setDueDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<FilterType>("all")
  const [sortBy, setSortBy] = useState<SortType>("newest")

  // Load todos on mount
  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/todos")
      if (!response.ok) {
        throw new Error("Failed to fetch todos")
      }
      const data = await response.json()
      setTodos(data.todos || [])
    } catch (error) {
      console.error("[v0] Error fetching todos:", error)
      toast.error("Failed to load todos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTodo = async () => {
    if (input.trim() === "") return

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: input.trim(),
          priority,
          due_date: dueDate || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add todo")
      }

      const data = await response.json()
      setTodos([data.todo, ...todos])
      setInput("")
      setPriority("medium")
      setDueDate("")
      toast.success("Todo added")
    } catch (error) {
      console.error("[v0] Error adding todo:", error)
      toast.error("Failed to add todo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      })

      if (!response.ok) {
        throw new Error("Failed to update todo")
      }

      const data = await response.json()
      setTodos(todos.map((todo) => (todo.id === id ? data.todo : todo)))
    } catch (error) {
      console.error("[v0] Error updating todo:", error)
      toast.error("Failed to update todo")
    }
  }

  const handleDeleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete todo")
      }

      setTodos(todos.filter((todo) => todo.id !== id))
      toast.success("Todo deleted")
    } catch (error) {
      console.error("[v0] Error deleting todo:", error)
      toast.error("Failed to delete todo")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAddTodo()
    }
  }

  // Filter and sort todos
  const filteredAndSortedTodos = useMemo(() => {
    let result = [...todos]

    // Filter
    if (filter === "active") {
      result = result.filter((t) => !t.completed)
    } else if (filter === "completed") {
      result = result.filter((t) => t.completed)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "priority") {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      if (sortBy === "due_date") {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      // newest - by created_at
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result
  }, [todos, filter, sortBy])

  const completedCount = todos.filter((t) => t.completed).length
  const highPriorityCount = todos.filter((t) => t.priority === "high" && !t.completed).length

  function getDueDateBadge(dueDate: string | null) {
    if (!dueDate) return null
    
    const date = parseISO(dueDate)
    const isOverdue = isPast(date) && !isToday(date)
    
    if (isOverdue) {
      return { text: "Overdue", variant: "destructive" as const, icon: Clock }
    }
    if (isToday(date)) {
      return { text: "Today", variant: "default" as const, icon: CheckCircle2 }
    }
    if (isTomorrow(date)) {
      return { text: "Tomorrow", variant: "secondary" as const, icon: Calendar }
    }
    return { text: format(date, "MMM d"), variant: "outline" as const, icon: Calendar }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            To-Do List
          </span>
          <div className="flex items-center gap-2">
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {highPriorityCount} urgent
              </Badge>
            )}
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/{todos.length}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Todo Form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="What needs to be done?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button 
              onClick={handleAddTodo} 
              disabled={isSubmitting || input.trim() === ""}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="w-[120px]">
                <Flag className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    High
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Low
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-[150px]"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Filters & Sort */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortType)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="due_date">Due date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAndSortedTodos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {filter === "completed" ? (
              <>
                <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No completed todos yet</p>
              </>
            ) : filter === "active" ? (
              <>
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All done! No active todos</p>
              </>
            ) : (
              <>
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No todos yet. Add one above!</p>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredAndSortedTodos.map((todo) => {
              const dueBadge = getDueDateBadge(todo.due_date)
              const PriorityIcon = priorityConfig[todo.priority].icon
              
              return (
                <li
                  key={todo.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-all hover:shadow-sm ${
                    todo.completed ? "bg-muted/50" : "hover:bg-muted/30"
                  } ${todo.priority === "high" && !todo.completed ? "border-l-4 border-l-red-500" : ""}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo.id, todo.completed)}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`todo-${todo.id}`}
                        className={`block text-sm font-medium cursor-pointer ${
                          todo.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {todo.text}
                      </label>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Priority Badge */}
                        <span className={`text-xs flex items-center gap-1 ${priorityConfig[todo.priority].text}`}>
                          <PriorityIcon className="h-3 w-3" />
                          {priorityConfig[todo.priority].label}
                        </span>
                        
                        {/* Due Date Badge */}
                        {dueBadge && (
                          <Badge variant={dueBadge.variant} className="text-xs h-5 px-1.5">
                            <dueBadge.icon className="h-3 w-3 mr-1" />
                            {dueBadge.text}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
