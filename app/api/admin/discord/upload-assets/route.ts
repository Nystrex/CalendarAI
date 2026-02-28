import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"
export const runtime = "nodejs"

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const files = form.getAll("files")

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const uploaded: { path: string; signedUrl: string }[] = []

    for (const f of files) {
      if (!(f instanceof File)) continue
      const arrayBuffer = await f.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const ext = f.name.includes(".") ? f.name.split(".").pop() : "bin"
      const path = `admin/${Date.now()}_${Math.random().toString(16).slice(2)}_${safeFileName(f.name)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("discord-assets")
        .upload(path, buffer, {
          contentType: f.type || "application/octet-stream",
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const { data, error: signedErr } = await supabase.storage
        .from("discord-assets")
        .createSignedUrl(path, 60 * 30) // 30 minutes

      if (signedErr || !data?.signedUrl) {
        return NextResponse.json({ error: signedErr?.message || "Failed to sign url" }, { status: 500 })
      }

      uploaded.push({ path, signedUrl: data.signedUrl })
    }

    return NextResponse.json({ uploaded })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
