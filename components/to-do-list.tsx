"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, CheckCircle2, Trash2, Calendar, Flag } from "lucide-react"

type Priority = "low" | "medium" | "high"

interface ToDoItem {
  id: string
  text: string
  completed: boolean
  priority?: Priority
  due_date?: string | null
  created_at: string
}

const priorityColors = {
  high: "bg-red-500",
  medium: "bg-yellow-500", 
  low: "bg-green-500",
}

const priorityLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

export function ToDoList() {
  const [todos, setTodos] = useState<ToDoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTodoText, setNewTodoText] = useState("")
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>("medium")
  const [newTodoDate, setNewTodoDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all")

  useEffect(() => {
    loadTodos()
  }, [])

  const loadTodos = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/todos")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setTodos(data.todos || [])
    } catch {
      toast.error("Failed to load todos")
    } finally {
      setIsLoading(false)
    }
  }

  const addTodo = async () => {
    if (!newTodoText.trim()) return
    
    try {
      setIsSubmitting(true)
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newTodoText.trim(),
          priority: newTodoPriority,
          due_date: newTodoDate || undefined,
        }),
      })
      
      if (!res.ok) throw new Error("Failed to add")
      
      const data = await res.json()
      setTodos([data.todo, ...todos])
      setNewTodoText("")
      setNewTodoPriority("medium")
      setNewTodoDate("")
      setDialogOpen(false)
      toast.success("Todo added!")
    } catch {
      toast.error("Failed to add todo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTodo = async (todo: ToDoItem) => {
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completed }),
      })
      
      if (!res.ok) throw new Error("Failed to update")
      
      const data = await res.json()
      setTodos(todos.map((t) => (t.id === todo.id ? data.todo : t)))
    } catch {
      toast.error("Failed to update")
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      
      setTodos(todos.filter((t) => t.id !== id))
      toast.success("Todo deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed
    if (filter === "completed") return t.completed
    return true
  })

  const completedCount = todos.filter((t) => t.completed).length
  const activeCount = todos.filter((t) => !t.completed).length

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5" />
            To-Do List
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{todos.length}
            </Badge>
          </CardTitle>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Todo
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">What to do?</label>
                  <Input
                    placeholder="Enter your todo..."
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addTodo()}
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Priority
                  </label>
                  <Select value={newTodoPriority} onValueChange={(v) => setNewTodoPriority(v as Priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          High Priority
                        </span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          Medium Priority
                        </span>
                      </SelectItem>
                      <SelectItem value="low">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Low Priority
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Due Date (optional)
                  </label>
                  <Input
                    type="date"
                    value={newTodoDate}
                    onChange={(e) => setNewTodoDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <Button 
                  onClick={addTodo} 
                  disabled={!newTodoText.trim() || isSubmitting}
                  className="mt-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Todo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3 border-b">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === "all" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({todos.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === "active" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === "completed" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Done ({completedCount})
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-1">
              {filter === "completed" 
                ? "No completed todos" 
                : filter === "active" 
                  ? "All done! 🎉" 
                  : "No todos yet"}
            </p>
            <p className="text-sm">
              {filter === "completed" 
                ? "Complete some todos to see them here" 
                : filter === "active" 
                  ? "You've completed all your todos" 
                  : "Click 'Add New' to create your first todo"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2 mt-4">
            {filteredTodos.map((todo) => (
              <li
                key={todo.id}
                className={`group flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${
                  todo.completed 
                    ? "bg-muted/30 opacity-60" 
                    : "bg-card hover:bg-muted/50"
                } ${todo.priority === "high" && !todo.completed ? "border-l-4 border-l-red-500" : ""}`}
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-relaxed ${
                    todo.completed ? "line-through text-muted-foreground" : ""
                  }`}>
                    {todo.text}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {todo.priority && (
                      <span className="text-xs flex items-center gap-1 text-muted-foreground">
                        <span className={`w-2 h-2 rounded-full ${priorityColors[todo.priority]}`} />
                        {priorityLabels[todo.priority]}
                      </span>
                    )}
                    
                    {todo.due_date && (
                      <span className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(todo.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
