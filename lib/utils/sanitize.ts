/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return ""
  
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim()
}

/**
 * Sanitize search query to prevent SQL injection
 * Escapes special characters used in SQL patterns
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return ""
  
  return query
    .replace(/[%_]/g, "\\$&") // Escape SQL wildcards
    .replace(/[<>"']/g, "") // Remove dangerous characters
    .trim()
    .slice(0, 200) // Limit length
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  // IPv4
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 127) return true // loopback
    if (a === 10) return true // private
    if (a === 172 && b >= 16 && b <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    if (a === 169 && b === 254) return true // link-local / cloud metadata
    if (a === 0) return true
    return false
  }
  // IPv6
  const lower = ip.toLowerCase()
  if (lower === "::1") return true // loopback
  if (lower.startsWith("fe80:") || lower.startsWith("fe80::")) return true // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true // unique local
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 address
    return isPrivateOrLoopbackIp(lower.replace("::ffff:", ""))
  }
  return false
}

/**
 * Validate that a user-supplied URL is safe to fetch server-side:
 * only http/https, and does not resolve to a loopback/private/link-local
 * address (blocks SSRF against internal services and cloud metadata endpoints).
 * Throws on any violation.
 */
export async function assertSafeExternalUrl(url: string): Promise<URL> {
  const sanitized = sanitizeUrl(url)
  if (!sanitized) {
    throw new Error("Invalid URL: only http and https URLs are allowed")
  }

  const parsed = new URL(sanitized)
  const hostname = parsed.hostname.toLowerCase()

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Invalid URL: local addresses are not allowed")
  }

  const { lookup } = await import("node:dns/promises")
  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new Error("Invalid URL: could not resolve host")
  }

  if (addresses.length === 0 || addresses.some((a) => isPrivateOrLoopbackIp(a.address))) {
    throw new Error("Invalid URL: host resolves to a disallowed address")
  }

  return parsed
}
