interface ParsedEvent {
  title?: string
  date?: Date
  time?: string
  hasDate: boolean
  hasTime: boolean
  reminderMinutes?: number
  description?: string
  startTime?: string
}

const monthMap: Record<string, number> = {
  jan: 0,
  january: 0,
  janurary: 0,
  janaury: 0, // common misspellings
  feb: 1,
  february: 1,
  feburary: 1,
  febuary: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  apirl: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  agust: 7,
  sep: 8,
  sept: 8,
  september: 8,
  setpember: 8,
  oct: 9,
  october: 9,
  octber: 9,
  nov: 10,
  november: 10,
  novemeber: 10,
  dec: 11,
  december: 11,
  decmeber: 11,
}

const dayMap: Record<string, number> = {
  sun: 0,
  sunday: 0,
  sundy: 0,
  mon: 1,
  monday: 1,
  mondy: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  tuesdy: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  wednsday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  thursdy: 4,
  fri: 5,
  friday: 5,
  fridy: 5,
  sat: 6,
  saturday: 6,
  saturdy: 6,
}

function parseOrdinalDate(input: string): { day: number; month?: number } | null {
  // Match patterns like "10th", "1st", "23rd"
  const ordinalMatch = input.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/i)
  if (!ordinalMatch) return null

  const day = Number.parseInt(ordinalMatch[1])
  if (day < 1 || day > 31) return null

  return { day }
}

function inferMonthFromDay(day: number): number {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentDay = today.getDate()

  // If the day has already passed this month, assume next month
  if (day < currentDay) {
    return (currentMonth + 1) % 12
  }

  return currentMonth
}

export function parseNaturalLanguage(input: string): ParsedEvent {
  const result: ParsedEvent = {
    hasDate: false,
    hasTime: false,
    reminderMinutes: 120,
  }

  const patterns = {
    description: /\b[dD]:\s*$$([^)]+)$$|\b[dD]:\s+(.+?)(?=\s*$)/i,
    reminder: /\b(?:remind|reminder|alert)\s+(\d+)\s+(hours?|minutes?|mins?)\s+before\b/i,
    tomorrow: /\b(tomorrow|tommorow|tommorrow|2morrow)\b/i,
    timeRange:
      /\b(?:(?:between|from)\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:[–-]|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    time: /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    dayMonthDay: /\b(?:sun|mon|tue|wed|thu|fri|sat)\w*,?\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
    monthDay:
      /\b(jan\w*|feb\w*|mar\w*|apr\w*|may|june?|july?|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
    dayOfWeek: /\b(sun\w*|mon\w*|tue\w*|wed\w*|thu\w*|fri\w*|sat\w*)\b/i,
    nextDay: /\bnext\s+(sun\w*|mon\w*|tue\w*|wed\w*|thu\w*|fri\w*|sat\w*)\b/i,
    ordinalOnly: /\b(\d{1,2})(?:st|nd|rd|th)\b/i,
    dateSlash: /\b(\d{1,2})\/(\d{1,2})\b/,
    today: /\b(today|2day)\b/i,
  }

  let workingText = input

  if (patterns.description.test(input)) {
    const match = input.match(patterns.description)
    if (match) {
      result.description = (match[1] || match[2])?.trim()
      workingText = input.replace(patterns.description, "").trim()
    }
  }

  if (patterns.reminder.test(input)) {
    const match = input.match(patterns.reminder)
    if (match) {
      const amount = Number.parseInt(match[1])
      const unit = match[2].toLowerCase()
      if (unit.startsWith("hour")) {
        result.reminderMinutes = amount * 60
      } else {
        result.reminderMinutes = amount
      }
      workingText = workingText.replace(patterns.reminder, "").trim()
    }
  }

  if (patterns.dayMonthDay.test(input)) {
    const match = input.match(patterns.dayMonthDay)
    if (match) {
      const monthStr = match[1].toLowerCase().replace(/[^a-z]/g, "")
      const day = Number.parseInt(match[2])

      // Try to match month with fuzzy logic
      const month = monthMap[monthStr]
      if (month !== undefined) {
        const year = new Date().getFullYear()
        const date = new Date(year, month, day)
        if (!Number.isNaN(date.getTime())) {
          result.date = date
          result.hasDate = true
          workingText = workingText.replace(patterns.dayMonthDay, "").trim()
        }
      }
    }
  }

  if (!result.hasDate && patterns.tomorrow.test(input)) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    result.date = tomorrow
    result.hasDate = true
    workingText = workingText.replace(patterns.tomorrow, "").trim()
  }

  if (!result.hasDate && patterns.today.test(input)) {
    result.date = new Date()
    result.hasDate = true
    workingText = workingText.replace(patterns.today, "").trim()
  }

  if (!result.hasDate && patterns.monthDay.test(input)) {
    const match = input.match(patterns.monthDay)
    if (match) {
      const monthStr = match[1].toLowerCase().replace(/[^a-z]/g, "")
      const day = Number.parseInt(match[2])

      // Try to match month with fuzzy logic - check first 3 letters
      const monthKey = Object.keys(monthMap).find((key) => key.startsWith(monthStr.substring(0, 3)))
      const month = monthKey ? monthMap[monthKey] : undefined

      if (month !== undefined && day >= 1 && day <= 31) {
        const year = new Date().getFullYear()
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) {
          result.date = date
          result.hasDate = true
          workingText = workingText.replace(patterns.monthDay, "").trim()
        }
      }
    }
  }

  if (!result.hasDate && patterns.nextDay.test(input)) {
    const match = input.match(patterns.nextDay)
    if (match) {
      const targetDay = match[1]
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .substring(0, 3)
      const dayIndex = dayMap[targetDay]
      if (dayIndex !== undefined) {
        const date = getNextDayOfWeek(dayIndex)
        result.date = date
        result.hasDate = true
        workingText = workingText.replace(patterns.nextDay, "").trim()
      }
    }
  }

  if (!result.hasDate && patterns.dayOfWeek.test(input)) {
    const match = input.match(patterns.dayOfWeek)
    if (match) {
      const targetDay = match[1]
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .substring(0, 3)
      const dayIndex = dayMap[targetDay]
      if (dayIndex !== undefined) {
        const date = getNextDayOfWeek(dayIndex)
        result.date = date
        result.hasDate = true
        workingText = workingText.replace(patterns.dayOfWeek, "").trim()
      }
    }
  }

  if (!result.hasDate && patterns.ordinalOnly.test(input)) {
    const parsed = parseOrdinalDate(input)
    if (parsed) {
      const month = parsed.month ?? inferMonthFromDay(parsed.day)
      const year = new Date().getFullYear()
      const date = new Date(year, month, parsed.day)

      if (!Number.isNaN(date.getTime())) {
        result.date = date
        result.hasDate = true
        workingText = workingText.replace(patterns.ordinalOnly, "").trim()
      }
    }
  }

  if (!result.hasDate && patterns.dateSlash.test(input)) {
    const match = input.match(patterns.dateSlash)
    if (match) {
      const month = Number.parseInt(match[1])
      const day = Number.parseInt(match[2])
      const year = new Date().getFullYear()
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) {
        result.date = date
        result.hasDate = true
        workingText = workingText.replace(patterns.dateSlash, "").trim()
      }
    }
  }

  if (patterns.timeRange.test(input)) {
    const match = input.match(patterns.timeRange)
    if (match) {
      // Store as an object with both start and end times
      result.time = match[2] // End time as primary
      result.startTime = match[1] // Store start time separately
      result.hasTime = true
      workingText = workingText.replace(patterns.timeRange, "").trim()
    }
  }

  // Only check for individual time if we haven't found a time range
  if (!result.hasTime && patterns.time.test(input)) {
    const match = input.match(patterns.time)
    if (match) {
      result.time = match[1]
      result.hasTime = true
      workingText = workingText.replace(patterns.time, "").trim()
    }
  }

  workingText = workingText
    .replace(/\b(at|on|due|by|during|lab)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  result.title = workingText || input

  if (result.hasDate && !result.hasTime) {
    result.time = "11:59 PM"
    result.hasTime = true
  }

  return result
}

function getNextDayOfWeek(targetDayIndex: number): Date {
  const today = new Date()
  const currentDay = today.getDay()

  let daysUntilTarget = targetDayIndex - currentDay
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7
  }

  const result = new Date(today)
  result.setDate(today.getDate() + daysUntilTarget)
  return result
}

export function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const cleaned = timeStr.replace(/\s+/g, "").toLowerCase()
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(?:(am|pm))?$/)

  if (!match) return null

  let hours = Number.parseInt(match[1])
  const minutes = Number.parseInt(match[2] || "0")
  const meridiem = match[3]

  if (meridiem === "pm" && hours !== 12) {
    hours += 12
  } else if (meridiem === "am" && hours === 12) {
    hours = 0
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return { hours, minutes }
}

export function parseMultipleEvents(input: string): ParsedEvent[] {
  const lines = input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map((line) => parseNaturalLanguage(line))
}
