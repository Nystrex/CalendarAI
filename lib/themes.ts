export const universityThemes = {
  guelph: {
    name: "University of Guelph",
    colors: {
      primary: "oklch(0.50 0.20 25)", // Guelph Red
      accent: "oklch(0.75 0.15 85)", // Gold
      ring: "oklch(0.50 0.20 25)",
      border: "oklch(0.30 0.08 25)",
      chart1: "oklch(0.50 0.20 25)",
      chart2: "oklch(0.75 0.15 85)",
      chart3: "oklch(0.35 0.12 25)",
    },
  },
  mcmaster: {
    name: "McMaster University",
    colors: {
      primary: "oklch(0.45 0.18 15)", // Maroon
      accent: "oklch(0.70 0.12 60)", // Gold
      ring: "oklch(0.45 0.18 15)",
      border: "oklch(0.30 0.10 15)",
      chart1: "oklch(0.45 0.18 15)",
      chart2: "oklch(0.70 0.12 60)",
      chart3: "oklch(0.35 0.12 15)",
    },
  },
  toronto: {
    name: "University of Toronto",
    colors: {
      primary: "oklch(0.48 0.22 265)", // U of T Blue
      accent: "oklch(0.72 0.14 60)", // Gold
      ring: "oklch(0.48 0.22 265)",
      border: "oklch(0.30 0.10 265)",
      chart1: "oklch(0.48 0.22 265)",
      chart2: "oklch(0.72 0.14 60)",
      chart3: "oklch(0.35 0.15 265)",
    },
  },
  waterloo: {
    name: "University of Waterloo",
    colors: {
      primary: "oklch(0.65 0.15 85)", // Gold
      accent: "oklch(0.30 0.08 265)", // Black/Blue
      ring: "oklch(0.65 0.15 85)",
      border: "oklch(0.35 0.08 85)",
      chart1: "oklch(0.65 0.15 85)",
      chart2: "oklch(0.30 0.08 265)",
      chart3: "oklch(0.50 0.12 85)",
    },
  },
  western: {
    name: "Western University",
    colors: {
      primary: "oklch(0.48 0.22 285)", // Purple
      accent: "oklch(0.65 0.08 50)", // Grey
      ring: "oklch(0.48 0.22 285)",
      border: "oklch(0.30 0.12 285)",
      chart1: "oklch(0.48 0.22 285)",
      chart2: "oklch(0.65 0.08 50)",
      chart3: "oklch(0.35 0.15 285)",
    },
  },
  queens: {
    name: "Queen's University",
    colors: {
      primary: "oklch(0.42 0.20 25)", // Red
      accent: "oklch(0.52 0.22 265)", // Blue
      ring: "oklch(0.42 0.20 25)",
      border: "oklch(0.28 0.10 25)",
      chart1: "oklch(0.42 0.20 25)",
      chart2: "oklch(0.52 0.22 265)",
      chart3: "oklch(0.75 0.15 85)",
    },
  },
  york: {
    name: "York University",
    colors: {
      primary: "oklch(0.45 0.20 25)", // Red
      accent: "oklch(0.35 0.08 265)", // Dark Blue
      ring: "oklch(0.45 0.20 25)",
      border: "oklch(0.28 0.10 25)",
      chart1: "oklch(0.45 0.20 25)",
      chart2: "oklch(0.35 0.08 265)",
      chart3: "oklch(0.60 0.08 50)",
    },
  },
} as const

export type ThemeKey = keyof typeof universityThemes

export function applyTheme(themeKey: ThemeKey) {
  const theme = universityThemes[themeKey]

  if (!theme) {
    console.warn(`[CalendarAI] Theme "${themeKey}" not found, falling back to guelph`)
    applyTheme("guelph")
    return
  }

  const root = document.documentElement

  if (!root.classList.contains("dark")) {
    root.classList.add("dark")
  }

  // Primary colors (buttons, links, active states)
  root.style.setProperty("--primary", theme.colors.primary)
  root.style.setProperty("--sidebar-primary", theme.colors.primary)

  // Accent colors (badges, highlights)
  root.style.setProperty("--accent", theme.colors.accent)
  root.style.setProperty("--accent-foreground", "oklch(0.145 0 0)")

  // Focus rings and outlines
  root.style.setProperty("--ring", theme.colors.ring)
  root.style.setProperty("--sidebar-ring", theme.colors.ring)

  // Borders with theme color
  root.style.setProperty("--border", theme.colors.border)
  root.style.setProperty("--sidebar-border", theme.colors.border)
  root.style.setProperty("--input", theme.colors.border)

  // Chart colors
  root.style.setProperty("--chart-1", theme.colors.chart1)
  root.style.setProperty("--chart-2", theme.colors.chart2)
  root.style.setProperty("--chart-3", theme.colors.chart3)

  // Store preference
  localStorage.setItem("theme", themeKey)
}

export function getStoredTheme(): ThemeKey {
  if (typeof window === "undefined") return "guelph"
  const stored = localStorage.getItem("theme") as ThemeKey
  if (stored && universityThemes[stored]) {
    return stored
  }
  return "guelph"
}
