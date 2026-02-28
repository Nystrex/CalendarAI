"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Keyboard, Command } from "lucide-react"

interface KeyboardShortcutsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  const shortcuts = [
    { category: "Navigation", items: [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["G", "H"], description: "Go to Home/Overview" },
      { keys: ["G", "C"], description: "Go to Calendar" },
      { keys: ["G", "S"], description: "Go to Settings" },
    ]},
    { category: "Actions", items: [
      { keys: ["N"], description: "New Event" },
      { keys: ["Ctrl", "M"], description: "Mass Event Creator" },
      { keys: ["Ctrl", "I"], description: "AI Extract" },
      { keys: ["Ctrl", "D"], description: "Mark as Done" },
    ]},
    { category: "Calendar", items: [
      { keys: ["←"], description: "Previous period" },
      { keys: ["→"], description: "Next period" },
      { keys: ["T"], description: "Go to Today" },
      { keys: ["D"], description: "Day view" },
      { keys: ["W"], description: "Week view" },
      { keys: ["M"], description: "Month view" },
      { keys: ["Y"], description: "Year view" },
    ]},
    { category: "General", items: [
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close dialog/modal" },
      { keys: ["Ctrl", "S"], description: "Sync now" },
    ]},
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Master these shortcuts to navigate CalendarAI like a pro
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function KeyboardShortcutsTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2 border-dashed hover:border-solid transition-all"
    >
      <Keyboard className="h-4 w-4" />
      <span className="hidden sm:inline">Shortcuts</span>
      <kbd className="hidden sm:inline px-1.5 py-0.5 text-xs bg-muted border rounded">?</kbd>
    </Button>
  )
}
