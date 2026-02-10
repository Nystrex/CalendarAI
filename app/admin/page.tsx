import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminPanel } from "@/components/admin/admin-panel"

const ADMIN_EMAIL = "mohammedcacouni@gmail.com"

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/admin")
  }

  if (user.email !== ADMIN_EMAIL) {
    redirect("/dashboard")
  }

  return <AdminPanel userEmail={user.email!} />
}
