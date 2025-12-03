// src/app/profile/page.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      const { data } = await supabase.auth.getSession()
      const session = data?.session ?? null
      if (!mounted) return
      if (!session) {
        // no session -> redirect to auth
        router.replace("/auth")
        return
      }
      setUser(session.user)
      setLoading(false)
    }
    bootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/auth")
      } else {
        setUser(session.user)
      }
    })

    return () => {
      mounted = false
      try {
        ;(sub as any)?.subscription?.unsubscribe?.()
      } catch {}
    }
  }, [router])

  if (loading) {
    return <div style={{ padding: 20 }}>Loading profile…</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>My Profile</h1>
      <p>Signed in as: {user?.email}</p>
      {/* your existing profile form below — you can keep previous UI and logic */}
    </div>
  )
}
