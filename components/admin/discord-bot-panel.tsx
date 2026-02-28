"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type Channel = { id: string; name: string; type: number }

type BotSettings = {
  timezone: string
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  weekly_digest_enabled: boolean
  weekly_digest_day: number
  weekly_digest_time: string
  announcement_enabled: boolean
  announcement_channel_id: string | null
}

export function DiscordBotPanel() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)

  const [settings, setSettings] = useState<BotSettings>({
    timezone: "America/New_York",
    quiet_hours_enabled: true,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    weekly_digest_enabled: false,
    weekly_digest_day: 1,
    weekly_digest_time: "09:00",
    announcement_enabled: false,
    announcement_channel_id: null,
  })

  const [sendChannelId, setSendChannelId] = useState<string>("")
  const [sendAsEmbed, setSendAsEmbed] = useState(true)
  const [message, setMessage] = useState("")
  const [embedTitle, setEmbedTitle] = useState("Announcement")
  const [imageUrlsText, setImageUrlsText] = useState("")
  const [files, setFiles] = useState<FileList | null>(null)
  const imageUrls = useMemo(() => imageUrlsText.split("\n").map(s => s.trim()).filter(Boolean), [imageUrlsText])

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true)
    try {
      const res = await fetch("/api/admin/discord/channels")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load channels")
      setChannels(data.channels || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load channels")
    } finally {
      setLoadingChannels(false)
    }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const uploadFiles = async () => {
    if (!files || files.length === 0) return [] as string[]

    const form = new FormData()
    for (const f of Array.from(files)) {
      form.append("files", f)
    }

    const res = await fetch("/api/admin/discord/upload-assets", {
      method: "POST",
      body: form,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Upload failed")
    }

    return (data.uploaded || []).map((u: any) => u.signedUrl).filter(Boolean)
  }

  const handleSend = async () => {
    if (!sendChannelId) {
      toast.error("Pick a channel")
      return
    }

    try {
      const uploadedUrls = await uploadFiles()
      const allUrls = [...imageUrls, ...uploadedUrls]

      const res = await fetch("/api/admin/discord/send-to-channel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelId: sendChannelId,
          content: message,
          sendAsEmbed,
          embedTitle,
          embedDescription: message,
          imageUrls: allUrls,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.discord_error ? `${data.error}: ${data.discord_error}` : data.error || "Send failed")
      }

      toast.success("Sent")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Discord Bot</CardTitle>
          <CardDescription>Configure bot behavior and send messages to your server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={settings.timezone} onChange={(e) => setSettings(s => ({ ...s, timezone: e.target.value }))} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Quiet Hours</p>
                <p className="text-xs text-muted-foreground">Don’t DM during these hours (EST default)</p>
              </div>
              <Switch checked={settings.quiet_hours_enabled} onCheckedChange={(v) => setSettings(s => ({ ...s, quiet_hours_enabled: v }))} />
            </div>

            <div className="space-y-2">
              <Label>Quiet Start</Label>
              <Input type="time" value={settings.quiet_hours_start} onChange={(e) => setSettings(s => ({ ...s, quiet_hours_start: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Quiet End</Label>
              <Input type="time" value={settings.quiet_hours_end} onChange={(e) => setSettings(s => ({ ...s, quiet_hours_end: e.target.value }))} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
              <div>
                <p className="text-sm font-medium">Weekly Digest</p>
                <p className="text-xs text-muted-foreground">Send weekly upcoming events digest</p>
              </div>
              <Switch checked={settings.weekly_digest_enabled} onCheckedChange={(v) => setSettings(s => ({ ...s, weekly_digest_enabled: v }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Message to Channel</CardTitle>
          <CardDescription>Pick any channel and send as embed or plain text. Add image URLs or upload files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchChannels} disabled={loadingChannels}>
              {loadingChannels ? "Loading..." : "Refresh Channels"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Channel</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={sendChannelId}
                onChange={(e) => setSendChannelId(e.target.value)}
              >
                <option value="">Select a channel</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name} ({c.id})
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <Label>Or paste Channel ID</Label>
                <Input value={sendChannelId} onChange={(e) => setSendChannelId(e.target.value)} placeholder="123..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Embed Title</Label>
              <Input value={embedTitle} onChange={(e) => setEmbedTitle(e.target.value)} />

              <div className="flex items-center justify-between rounded-lg border p-3 mt-3">
                <div>
                  <p className="text-sm font-medium">Send as embed</p>
                  <p className="text-xs text-muted-foreground">If off, will send plain text</p>
                </div>
                <Switch checked={sendAsEmbed} onCheckedChange={setSendAsEmbed} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Image URLs (one per line)</Label>
              <Textarea value={imageUrlsText} onChange={(e) => setImageUrlsText(e.target.value)} rows={4} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Upload images</Label>
              <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
            </div>
          </div>

          <Button onClick={handleSend}>Send</Button>
        </CardContent>
      </Card>
    </div>
  )
}
