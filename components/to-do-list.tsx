"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Trash2 } from "lucide-react"

interface ToDoItem {
  id: string
  text: string
  completed: boolean
  created_at: string
}

export function ToDoList() {
  const [todos, setTodos] = useState<ToDoItem[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        body: JSON.stringify({ text: input.trim() }),
      })

      if (!response.ok) {
        throw new Error("Failed to add todo")
      }

      const data = await response.json()
      setTodos([data.todo, ...todos])
      setInput("")
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
    if (e.key === "Enter") {
      handleAddTodo()
    }
  }

  const completedCount = todos.filter((t) => t.completed).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>To-Do List</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount} / {todos.length} completed
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Add a new to-do"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <Button onClick={handleAddTodo} disabled={isSubmitting || input.trim() === ""}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : todos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No todos yet. Add one above!
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onCheckedChange={() => handleToggleTodo(todo.id, todo.completed)}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={`text-sm font-medium ${
                      todo.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {todo.text}
                  </label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
