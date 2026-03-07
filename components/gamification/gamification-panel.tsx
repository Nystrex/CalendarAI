"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Flame,
  Star,
  Zap,
  Award,
  Target,
  TrendingUp,
  Lock,
  Sparkles
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface UserStats {
  level: number
  xp: number
  total_xp: number
  current_streak: number
  longest_streak: number
  tasks_completed: number
  study_hours: number
  perfect_days: number
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  xp_reward: number
  rarity: string
  unlocked: boolean
  progress?: number
  requirement_value?: number
}

interface DailyChallenge {
  id: string
  challenge_type: string
  target_value: number
  current_value: number
  xp_reward: number
  completed: boolean
}

export function GamificationPanel() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [challenges, setChallenges] = useState<DailyChallenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user stats
      let { data: userStats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (!userStats) {
        // Create initial stats
        const { data: newStats } = await supabase
          .from("user_stats")
          .insert({ user_id: user.id })
          .select()
          .single()
        userStats = newStats
      }

      setStats(userStats)

      // Load achievements
      const { data: allAchievements } = await supabase
        .from("achievements")
        .select("*")
        .order("xp_reward", { ascending: true })

      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at, progress")
        .eq("user_id", user.id)

      const unlockedIds = new Set(userAchievements?.map((a: any) => a.achievement_id) || [])
      
      const achievementsWithStatus = allAchievements?.map((ach: any) => ({
        ...ach,
        unlocked: unlockedIds.has(ach.id),
        progress: userAchievements?.find((ua: any) => ua.achievement_id === ach.id)?.progress || 0
      })) || []

      setAchievements(achievementsWithStatus)

      // Load or create daily challenges
      const today = new Date().toISOString().split('T')[0]
      let { data: dailyChallenges } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)

      if (!dailyChallenges || dailyChallenges.length === 0) {
        // Generate daily challenges
        const challengeTypes = [
          { type: "complete_tasks", target: 5, xp: 50 },
          { type: "study_minutes", target: 60, xp: 75 },
          { type: "early_start", target: 1, xp: 30 }
        ]

        const newChallenges = await Promise.all(
          challengeTypes.map(async (challenge) => {
            const { data } = await supabase
              .from("daily_challenges")
              .insert({
                user_id: user.id,
                challenge_type: challenge.type,
                target_value: challenge.target,
                xp_reward: challenge.xp,
                date: today
              })
              .select()
              .single()
            return data
          })
        )

        dailyChallenges = newChallenges.filter(Boolean) as DailyChallenge[]
      }

      setChallenges(dailyChallenges)
    } catch (error) {
      console.error("Error loading gamification data:", error)
      toast.error("Failed to load progress")
    } finally {
      setLoading(false)
    }
  }

  const getXPForNextLevel = (level: number) => {
    return 100 + (level * 50)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common": return "text-gray-500"
      case "rare": return "text-blue-500"
      case "epic": return "text-purple-500"
      case "legendary": return "text-amber-500"
      default: return "text-gray-500"
    }
  }

  const getChallengeLabel = (type: string) => {
    switch (type) {
      case "complete_tasks": return "Complete Tasks"
      case "study_minutes": return "Study Time"
      case "early_start": return "Early Bird"
      default: return type
    }
  }

  if (loading || !stats) {
    return <div className="p-6">Loading...</div>
  }

  const xpForNext = getXPForNextLevel(stats.level)
  const xpProgress = (stats.xp / xpForNext) * 100

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Level & XP Card */}
      <Card className="border-2 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                Level {stats.level}
              </CardTitle>
              <CardDescription>
                {stats.xp} / {xpForNext} XP
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total XP</p>
              <p className="text-2xl font-bold text-primary">{stats.total_xp.toLocaleString()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={xpProgress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {xpForNext - stats.xp} XP until level {stats.level + 1}
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
            <p className="text-2xl font-bold">{stats.current_streak}</p>
            <p className="text-xs text-muted-foreground">Best: {stats.longest_streak}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-green-500" />
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
            <p className="text-2xl font-bold">{stats.tasks_completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <p className="text-xs text-muted-foreground">Study</p>
            </div>
            <p className="text-2xl font-bold">{stats.study_hours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <p className="text-xs text-muted-foreground">Perfect</p>
            </div>
            <p className="text-2xl font-bold">{stats.perfect_days}</p>
            <p className="text-xs text-muted-foreground">Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Challenges */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Daily Challenges
          </CardTitle>
          <CardDescription>Complete challenges to earn bonus XP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {challenges.map(challenge => (
            <div key={challenge.id} className="p-3 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{getChallengeLabel(challenge.challenge_type)}</p>
                  {challenge.completed && (
                    <Badge variant="default" className="bg-green-500">
                      <Award className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>
                <Badge variant="outline">+{challenge.xp_reward} XP</Badge>
              </div>
              <Progress 
                value={(challenge.current_value / challenge.target_value) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {challenge.current_value} / {challenge.target_value}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Achievements
          </CardTitle>
          <CardDescription>
            {achievements.filter(a => a.unlocked).length} / {achievements.length} unlocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map(achievement => (
              <div
                key={achievement.id}
                className={`p-3 rounded-lg border transition-all ${
                  achievement.unlocked
                    ? "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30"
                    : "bg-muted/30 border-muted opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {achievement.unlocked ? achievement.icon : <Lock className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{achievement.name}</p>
                      <Badge variant="outline" className={`text-xs ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                    {!achievement.unlocked && achievement.requirement_value && (
                      <Progress 
                        value={(achievement.progress! / achievement.requirement_value) * 100} 
                        className="h-1"
                      />
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        +{achievement.xp_reward} XP
                      </span>
                      {achievement.unlocked && (
                        <Badge variant="secondary" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          Unlocked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
