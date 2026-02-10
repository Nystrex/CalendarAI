'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ChevronRight,
  Calendar,
  Brain,
  Settings,
  MessageCircle,
  Zap,
  BookOpen,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"
import { useState } from "react"

interface OnboardingGuideProps {
  open: boolean
  onComplete: () => void
}

export function OnboardingGuide({ open, onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Welcome to CalendarAI",
      description: "Your smart academic calendar with AI assistance",
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            CalendarAI is an intelligent calendar designed specifically for students. Let's take a quick tour of all the amazing features you'll have access to!
          </p>
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg">
            <p className="font-medium text-sm">✨ Tip: You can skip this guide anytime and access it later from settings</p>
          </div>
        </div>
      ),
    },
    {
      title: "Calendar Management",
      description: "View and organize your entire academic life",
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Manage your calendar with multiple views:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Month View:</strong> See your full month at a glance</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Week View:</strong> Detailed view of your week</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Day View:</strong> Hour-by-hour schedule</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Year View:</strong> Semester overview (Premium)</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "AI Homework Helper",
      description: "Get instant help with your assignments",
      icon: Brain,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            The AI Homework Helper uses GPT-4o to assist you with:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Explain homework concepts</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Review your work and provide feedback</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Upload files (PDFs, images, documents) for analysis (Premium)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Unlimited queries with Premium</span>
            </li>
          </ul>
          <Badge variant="secondary">Free: 5 queries/day • Premium: Unlimited</Badge>
        </div>
      ),
    },
    {
      title: "Google Calendar Sync",
      description: "Sync with your existing calendars",
      icon: Zap,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Connect your Google Calendar to:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">View all your calendars in one place</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Sync bidirectionally (changes sync both ways)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Support for 5 calendars on Free plan, unlimited on Premium</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Auto-sync keeps everything up to date</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground italic">You can connect Google Calendar from the Settings page</p>
        </div>
      ),
    },
    {
      title: "Event Creation & Management",
      description: "Powerful tools for managing your schedule",
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Create and organize events with:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Quick Add:</strong> Click anywhere to create an event</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Mass Create:</strong> Add multiple events at once</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>AI Extraction:</strong> Paste text and AI creates events</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Color Coding:</strong> Organize by subject or type</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Customization & Themes",
      description: "Make CalendarAI your own",
      icon: Settings,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Personalize your experience:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Dark & Light Modes:</strong> Switch anytime</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>University Themes:</strong> 1 basic theme included</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Premium Themes:</strong> Unlock all 10+ themes</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Flexible Settings:</strong> Calendar view preferences, notifications, and more</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Support & Help",
      description: "We're here to help you succeed",
      icon: MessageCircle,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Get help whenever you need it:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Live Chat:</strong> Click the chat button in the bottom-right</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Priority Support:</strong> Instant responses with Premium</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm"><strong>Settings Help:</strong> Access support from any settings page</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Premium Features",
      description: "Unlock the full potential",
      icon: Zap,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Upgrade to Premium for:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Unlimited Google Calendar syncing</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Unlimited AI homework queries</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">AI file analysis (PDFs, images, documents)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Year view and all premium themes</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Priority support chat</span>
            </li>
          </ul>
          <Badge variant="default">Try Premium Free for 14 Days!</Badge>
        </div>
      ),
    },
    {
      title: "You're All Set!",
      description: "Ready to ace your semester",
      icon: CheckCircle2,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            You're now ready to make the most of CalendarAI. Here are your next steps:
          </p>
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <span className="font-bold text-primary">1</span>
              <div>
                <p className="font-medium text-sm">Connect Google Calendar</p>
                <p className="text-xs text-muted-foreground">Go to Settings → Integrations</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-bold text-primary">2</span>
              <div>
                <p className="font-medium text-sm">Create Your First Event</p>
                <p className="text-xs text-muted-foreground">Click on any day to get started</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-bold text-primary">3</span>
              <div>
                <p className="font-medium text-sm">Try the AI Homework Helper</p>
                <p className="text-xs text-muted-foreground">Ask your first homework question</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const step = steps[currentStep]
  const StepIcon = step.icon

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onComplete()
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">{step.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {step.content}
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-1 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="bg-transparent"
          >
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </div>

          {currentStep === steps.length - 1 ? (
            <Button onClick={onComplete} className="gap-2">
              Start Using CalendarAI
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep(currentStep + 1)} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Skip option */}
        <button
          onClick={onComplete}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-3"
        >
          Skip Tutorial
        </button>
      </DialogContent>
    </Dialog>
  )
}
