import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"
const DISCORD_API_BASE = "https://discord.com/api/v10"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  const guildId = process.env.DISCORD_GUILD_ID

  if (!botToken) {
    return NextResponse.json({ error: "DISCORD_BOT_TOKEN not configured" }, { status: 500 })
  }
  if (!guildId) {
    return NextResponse.json({ error: "DISCORD_GUILD_ID not configured" }, { status: 500 })
  }

  const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${botToken}` },
  })

  const text = await res.text()
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch channels", discord_status: res.status, discord_error: text }, { status: 500 })
  }

  const channels = JSON.parse(text)
    .filter((c: any) => c && (c.type === 0 || c.type === 5) && !c.is_thread)
    .map((c: any) => ({ id: c.id, name: c.name, type: c.type }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name))

  return NextResponse.json({ channels })
}
