import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const adminPassword = request.headers.get("x-admin-password")
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    let memoryStats = {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
    }

    try {
      if (typeof process !== "undefined" && typeof process.memoryUsage === "function") {
        const memoryUsage = process.memoryUsage()
        memoryStats = {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        }
      }
    } catch {
      // Memory usage not available in this environment
    }

    let cpuStats = { user: 0, system: 0 }
    try {
      if (typeof process !== "undefined" && typeof process.cpuUsage === "function") {
        const cpuUsage = process.cpuUsage()
        cpuStats = {
          user: Math.round(cpuUsage.user / 1000),
          system: Math.round(cpuUsage.system / 1000),
        }
      }
    } catch {
      // CPU usage not available
    }

    let uptime = 0
    try {
      if (typeof process !== "undefined" && typeof process.uptime === "function") {
        uptime = Math.round(process.uptime())
      }
    } catch {
      // Uptime not available
    }

    const loadAverage = [0, 0, 0]

    const platform = typeof process !== "undefined" ? process.platform || "serverless" : "serverless"
    const nodeVersion = typeof process !== "undefined" ? process.version || "N/A" : "N/A"

    const serverStats = {
      memory: memoryStats,
      cpu: cpuStats,
      uptime,
      loadAverage: loadAverage.map((load: number) => load.toFixed(2)),
      platform,
      nodeVersion,
      timestamp: new Date().toISOString(),
      environment: "serverless", // Indicate this is a serverless environment
    }

    return NextResponse.json(serverStats)
  } catch (error) {
    console.error("Server stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
