import { NextRequest } from "next/server"

export function requireBotSecretFromAdminTool(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.DISCORD_BOT_WEBHOOK_SECRET}`) {
    return false
  }
  return true
}
