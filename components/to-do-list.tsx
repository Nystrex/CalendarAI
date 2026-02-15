
"use client"
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ToDoItem {
  id: number;
  text: string;
  completed: boolean;
}

export function ToDoList() {
  const [todos, setTodos] = useState<ToDoItem[]>([]);
  const [input, setInput] = useState('');

  const handleAddTodo = () => {
    if (input.trim() !== '') {
      setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
      setInput('');
    }
  };

  const handleToggleTodo = (id: number) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleDeleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>To-Do List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="text"
            placeholder="Add a new to-do"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <Button type="submit" onClick={handleAddTodo}>Add</Button>
        </div>
        <ul className="space-y-4 mt-4">
          {todos.map(todo => (
            <li key={todo.id} className="flex items-center space-x-2">
              <Checkbox
                id={`todo-${todo.id}`}
                checked={todo.completed}
                onCheckedChange={() => handleToggleTodo(todo.id)}
              />
      <label
        htmlFor={`todo-${todo.id}`}
        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
          todo.completed ? 'line-through' : ''
        }`}
      >
        {todo.text}
      </label>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteTodo(todo.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
