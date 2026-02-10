interface GoogleCalendar {
  id: string
  summary: string
  description?: string
  backgroundColor?: string
  accessRole: string
}

interface GoogleEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: string
      minutes: number
    }>
  }
}

interface EventListResponse {
  items: GoogleEvent[]
  nextSyncToken?: string
  nextPageToken?: string
}

export class GoogleCalendarAPI {
  private accessToken: string
  private lastRequestTime = 0
  private requestCount = 0
  private readonly minRequestInterval: number = 2000
  private readonly maxRetries: number = 5

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async rateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    const dynamicInterval = this.minRequestInterval + this.requestCount * 200 // More aggressive rate limiting - add 200ms per request
    const cappedInterval = Math.min(dynamicInterval, 3000) // Cap at 3 seconds

    if (timeSinceLastRequest < cappedInterval) {
      const delay = cappedInterval - timeSinceLastRequest
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
  }

  resetRateLimiter() {
    this.requestCount = 0
  }

  private async fetch(url: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    await this.rateLimit()

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      // For DELETE: resource already deleted, which is what we wanted
      // For PUT/PATCH: resource doesn't exist, return null so caller can create it instead
      if (response.status === 410 || response.status === 404) {
        const method = options.method?.toUpperCase()
        if (method === "DELETE" || method === "PUT" || method === "PATCH") {
          return null
        }
      }

      if (response.status === 429) {
        if (retryCount < this.maxRetries) {
          const backoffDelay = Math.pow(2, retryCount + 1) * 1500
          console.log(
            `[CalendarAI] Rate limited (429), waiting ${backoffDelay / 1000}s before retry ${retryCount + 1}/${this.maxRetries}`,
          )
          await new Promise((resolve) => setTimeout(resolve, backoffDelay))
          return this.fetch(url, options, retryCount + 1)
        }
        throw new Error(`Rate limit exceeded after ${this.maxRetries} retries. Please wait before trying again.`)
      }

      const responseText = await response.text()

      if (
        responseText.includes("Too Many Requests") ||
        responseText.includes("rate limit") ||
        responseText.includes("Rate Limit")
      ) {
        if (retryCount < this.maxRetries) {
          const backoffDelay = Math.pow(2, retryCount + 1) * 1500
          console.log(
            `[CalendarAI] Rate limit in response, waiting ${backoffDelay / 1000}s before retry ${retryCount + 1}/${this.maxRetries}`,
          )
          await new Promise((resolve) => setTimeout(resolve, backoffDelay))
          return this.fetch(url, options, retryCount + 1)
        }
        throw new Error(`Rate limit exceeded after ${this.maxRetries} retries. Please wait before trying again.`)
      }

      if (response.status === 410) {
        const errorBody = responseText.substring(0, 200)
        throw new Error(`410 - ${errorBody}`)
      }

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status} - ${responseText.substring(0, 200)}`)
      }

      // Handle empty responses
      if (response.status === 204 || !responseText.trim()) {
        return null
      }

      // Parse JSON safely
      try {
        return JSON.parse(responseText)
      } catch (error) {
        throw new Error(`Invalid JSON response from Google API`)
      }
    } catch (error: any) {
      if (error.message === "Failed to fetch" && retryCount < this.maxRetries) {
        const backoffDelay = Math.pow(2, retryCount + 1) * 1500 // Longer backoff for network errors too
        console.log(
          `[CalendarAI] Network error, waiting ${backoffDelay / 1000}s before retry ${retryCount + 1}/${this.maxRetries}`,
        )
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
        return this.fetch(url, options, retryCount + 1)
      }
      throw error
    }
  }

  async listCalendars(): Promise<GoogleCalendar[]> {
    const data = await this.fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList")
    if (!data || !data.items) {
      return []
    }
    return data.items || []
  }

  async listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GoogleEvent[]> {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    })

    const data = await this.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    )

    if (!data || !data.items) {
      return []
    }

    return data.items || []
  }

  async listEventsIncremental(
    calendarId: string,
    syncToken?: string,
    timeMin?: string,
    timeMax?: string,
  ): Promise<EventListResponse> {
    const params = new URLSearchParams({
      singleEvents: "true",
      maxResults: "250",
    })

    // If we have a sync token, use it for incremental sync (much fewer API calls)
    if (syncToken) {
      params.set("syncToken", syncToken)
    } else {
      // Full sync - only needed on first sync
      if (timeMin) params.set("timeMin", timeMin)
      if (timeMax) params.set("timeMax", timeMax)
      params.set("orderBy", "startTime")
    }

    try {
      const data = await this.fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      )

      if (!data) {
        return { items: [], nextSyncToken: undefined }
      }

      return {
        items: data.items || [],
        nextSyncToken: data.nextSyncToken,
        nextPageToken: data.nextPageToken,
      }
    } catch (error: any) {
        // If sync token is invalid (410 Gone), we need to do a full sync
        if (error.message?.includes("410") || error.message?.includes("Sync token")) {
          // Remove sync token and do full sync
        const fullParams = new URLSearchParams({
          singleEvents: "true",
          maxResults: "250",
          orderBy: "startTime",
        })
        if (timeMin) fullParams.set("timeMin", timeMin)
        if (timeMax) fullParams.set("timeMax", timeMax)

        const data = await this.fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${fullParams}`,
        )

        return {
          items: data?.items || [],
          nextSyncToken: data?.nextSyncToken,
        }
      }
      throw error
    }
  }

  async getEvent(calendarId: string, eventId: string): Promise<GoogleEvent> {
    return await this.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    )
  }

  async createEvent(calendarId: string, event: Partial<GoogleEvent>): Promise<GoogleEvent> {
    return await this.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        body: JSON.stringify(event),
      },
    )
  }

  async createCalendar(calendar: {
    summary: string
    description?: string
    timeZone?: string
  }): Promise<GoogleCalendar> {
    return await this.fetch("https://www.googleapis.com/calendar/v3/calendars", {
      method: "POST",
      body: JSON.stringify(calendar),
    })
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<GoogleEvent>): Promise<GoogleEvent> {
    return await this.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: "PUT",
        body: JSON.stringify(event),
      },
    )
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: "DELETE",
      },
    )
  }

  async moveEvent(sourceCalendarId: string, eventId: string, destinationCalendarId: string): Promise<GoogleEvent> {
    return await this.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sourceCalendarId)}/events/${eventId}/move?destination=${encodeURIComponent(destinationCalendarId)}`,
      {
        method: "POST",
      },
    )
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
      {
        method: "DELETE",
      },
    )
  }

  async getUserInfo() {
    return await this.fetch("https://www.googleapis.com/oauth2/v2/userinfo")
  }
}
