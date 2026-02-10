export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "UTC"
  }
}

export function formatTimezone(timezone: string): string {
  try {
    const date = new Date()
    const offset = new Date(date.toLocaleString("en-US", { timeZone: timezone })).getTime() - date.getTime()
    const hours = Math.floor(Math.abs(offset) / (1000 * 60 * 60))
    const minutes = Math.floor((Math.abs(offset) % (1000 * 60 * 60)) / (1000 * 60))
    const sign = offset >= 0 ? "+" : "-"

    return `${timezone} (UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")})`
  } catch {
    return timezone
  }
}
