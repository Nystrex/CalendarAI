"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  Brain, 
  Plus, 
  Clock,
  Target,
  Calendar,
  Play,
  Pause,
  CheckCircle2,
  TrendingUp,
  Sparkles
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { format, addMinutes, differenceInMinutes } from "date-fns"

interface StudySession {
  id: string
  course_id: string | null
  start_time: string
  end_time: string
  duration_minutes: number
  session_type: string
  completed: boolean
  focus_score: number | null
  notes: string | null
  pomodoro_count: number
}

interface StudyGoal {
  id: string
  course_id: string | null
  event_id: string | null
  target_hours: number
  hours_completed: number
  deadline: string
  completed: boolean
}

interface Course {
  id: string
  name: string
  code: string
  color: string
  term?: string | null
}

export function StudyPlanner() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [goals, setGoals] = useState<StudyGoal[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [sessionTime, setSessionTime] = useState(0)
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [addGoalOpen, setAddGoalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (activeSession) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1)
        // Auto-break every 25 minutes (Pomodoro)
        if (sessionTime > 0 && sessionTime % 1500 === 0) {
          setPomodoroCount(prev => prev + 1)
          toast.success("🍅 Pomodoro complete! Take a 5-minute break")
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [activeSession, sessionTime])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [sessionsRes, goalsRes, coursesRes] = await Promise.all([
        supabase.from("study_sessions").select("*").eq("user_id", user.id).order("start_time", { ascending: false }).limit(20),
        supabase.from("study_goals").select("*").eq("user_id", user.id).eq("completed", false),
        supabase.from("school_courses").select("id, name, code, term").eq("user_id", user.id)
      ])

      if (sessionsRes.data) setSessions(sessionsRes.data)
      if (goalsRes.data) setGoals(goalsRes.data)
      if (coursesRes.data) {
        // Add default color to courses since school_courses doesn't have a color field
        const coursesWithColor = coursesRes.data.map((c: any, idx: number) => ({
          ...c,
          color: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][idx % 5]
        }))
        setCourses(coursesWithColor)
      }
    } catch (error) {
      console.error("Error loading study data:", error)
      toast.error("Failed to load study data")
    } finally {
      setLoading(false)
    }
  }

  const startSession = async (courseId?: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const { data, error } = await supabase
        .from("study_sessions")
        .insert({
          user_id: user.id,
          course_id: courseId || null,
          start_time: now.toISOString(),
          end_time: addMinutes(now, 25).toISOString(),
          session_type: "study",
          completed: false,
          pomodoro_count: 0
        })
        .select()
        .single()

      if (error) throw error

      setActiveSession(data.id)
      setSessionTime(0)
      setPomodoroCount(0)
      toast.success("Study session started! 🎯")
    } catch (error) {
      console.error("Error starting session:", error)
      toast.error("Failed to start session")
    }
  }

  const endSession = async (focusScore?: number) => {
    if (!activeSession) return

    try {
      const supabase = createClient()
      const now = new Date()
      
      const { error } = await supabase
        .from("study_sessions")
        .update({
          end_time: now.toISOString(),
          duration_minutes: Math.floor(sessionTime / 60),
          completed: true,
          focus_score: focusScore || null,
          pomodoro_count: pomodoroCount
        })
        .eq("id", activeSession)

      if (error) throw error

      // Award XP
      const xpEarned = Math.floor(sessionTime / 60) * 5 + pomodoroCount * 10
      await supabase.rpc("award_xp", { p_user_id: (await supabase.auth.getUser()).data.user?.id, p_xp: xpEarned })

      toast.success(`Session complete! +${xpEarned} XP earned 🎉`)
      setActiveSession(null)
      setSessionTime(0)
      setPomodoroCount(0)
      loadData()
    } catch (error) {
      console.error("Error ending session:", error)
      toast.error("Failed to end session")
    }
  }

  const handleAddGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("study_goals").insert({
        user_id: user.id,
        course_id: formData.get("course_id") as string || null,
        target_hours: parseFloat(formData.get("target_hours") as string),
        deadline: formData.get("deadline") as string,
        hours_completed: 0,
        completed: false
      })

      if (error) throw error

      toast.success("Study goal created!")
      setAddGoalOpen(false)
      loadData()
      e.currentTarget.reset()
    } catch (error) {
      console.error("Error adding goal:", error)
      toast.error("Failed to add goal")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const totalStudyHours = sessions
    .filter(s => s.completed)
    .reduce((sum, s) => sum + (s.duration_minutes / 60), 0)

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Active Session */}
      {activeSession && (
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-purple-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary animate-pulse" />
              Active Study Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-5xl font-bold mb-2">{formatTime(sessionTime)}</p>
              <div className="flex items-center justify-center gap-4">
                <Badge variant="secondary">
                  🍅 {pomodoroCount} Pomodoros
                </Badge>
                <Badge variant="secondary">
                  ⚡ {Math.floor(sessionTime / 60)} mins
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => endSession(8)} className="flex-1" variant="outline">
                End Session
              </Button>
              <Button onClick={() => endSession(10)} className="flex-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete (Great Focus!)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </div>
            <p className="text-2xl font-bold">{totalStudyHours.toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
            <p className="text-2xl font-bold">{sessions.filter(s => s.completed).length}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">Pomodoros</p>
            </div>
            <p className="text-2xl font-bold">
              {sessions.reduce((sum, s) => sum + s.pomodoro_count, 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">Avg Focus</p>
            </div>
            <p className="text-2xl font-bold">
              {sessions.filter(s => s.focus_score).length > 0
                ? (sessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / sessions.filter(s => s.focus_score).length).toFixed(1)
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      {!activeSession && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Start Study Session
            </CardTitle>
            <CardDescription>Begin a focused study session with Pomodoro timer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button onClick={() => startSession()} variant="outline" className="h-auto py-3 flex-col gap-1">
                <Play className="h-5 w-5" />
                <span className="text-xs">General Study</span>
              </Button>
              {courses.slice(0, 3).map(course => (
                <Button 
                  key={course.id} 
                  onClick={() => startSession(course.id)} 
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
                  <span className="text-xs truncate w-full">{course.code}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Study Goals */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Study Goals
              </CardTitle>
              <CardDescription>Track your study targets</CardDescription>
            </div>
            <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Study Goal</DialogTitle>
                  <DialogDescription>Set a study target for an upcoming deadline</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddGoal} className="space-y-4">
                  <div>
                    <Label htmlFor="course_id">Course (Optional)</Label>
                    <Select name="course_id" defaultValue="">
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">General Study</SelectItem>
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="target_hours">Target Hours</Label>
                    <Input id="target_hours" name="target_hours" type="number" step="0.5" required placeholder="10" />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" name="deadline" type="datetime-local" required />
                  </div>
                  <Button type="submit" className="w-full">Create Goal</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.map(goal => {
            const progress = (goal.hours_completed / goal.target_hours) * 100
            const course = courses.find(c => c.id === goal.course_id)
            
            return (
              <div key={goal.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {course && (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
                    )}
                    <p className="font-medium text-sm">
                      {course ? `${course.code}` : "General Study"}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {goal.hours_completed.toFixed(1)} / {goal.target_hours}h
                  </Badge>
                </div>
                <Progress value={progress} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Due: {format(new Date(goal.deadline), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            )
          })}
          {goals.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active study goals
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions.slice(0, 10).map(session => {
              const course = courses.find(c => c.id === session.course_id)
              
              return (
                <div key={session.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {course && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }} />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {course?.code || "General Study"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.start_time), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{session.duration_minutes} min</p>
                    {session.focus_score && (
                      <p className="text-xs text-muted-foreground">Focus: {session.focus_score}/10</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
