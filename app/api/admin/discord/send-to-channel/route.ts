import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"
const DISCORD_API_BASE = "https://discord.com/api/v10"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { channelId, content, sendAsEmbed, embedTitle, embedDescription, imageUrls } = await request.json()

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: "DISCORD_BOT_TOKEN not configured" }, { status: 500 })
    }

    const payload: any = {
      content: content || "",
    }

    if (sendAsEmbed) {
      const embeds: any[] = []
      const embed: any = {
        title: embedTitle || "Announcement",
        description: embedDescription || content || "",
        color: 0x5865f2,
      }

      if (Array.isArray(imageUrls) && imageUrls.length > 0) {
        // Discord allows one image per embed; if multiple, send multiple embeds
        const [first, ...rest] = imageUrls
        embed.image = { url: first }
        embeds.push(embed)
        for (const url of rest) {
          embeds.push({ title: embedTitle || "", description: "", color: 0x5865f2, image: { url } })
        }
        payload.content = payload.content || " "
      } else {
        embeds.push(embed)
      }

      payload.embeds = embeds
    } else if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      // Non-embed: append urls
      payload.content = `${payload.content}\n${imageUrls.join("\n")}`.trim()
    }

    const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to send message", discord_status: res.status, discord_error: text }, { status: 500 })
    }

    return NextResponse.json({ success: true, discord_response: JSON.parse(text) })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
