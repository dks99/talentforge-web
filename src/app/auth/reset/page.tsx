// src/app/auth/reset/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  // extract tokens from either query string or hash fragment
  function extractTokensFromLocation(): { access_token?: string | null; refresh_token?: string | null } {
    if (typeof window === "undefined") return { access_token: null, refresh_token: null }

    // 1) parse query string
    const qs = new URLSearchParams(window.location.search)
    const access_q = qs.get("access_token")
    const refresh_q = qs.get("refresh_token")
    if (access_q) return { access_token: access_q, refresh_token: refresh_q }

    // 2) parse hash fragment (some providers put tokens here)
    const hash = window.location.hash.replace(/^#/, "")
    if (hash) {
      const hs = new URLSearchParams(hash)
      const access_h = hs.get("access_token")
      const refresh_h = hs.get("refresh_token")
      if (access_h) return { access_token: access_h, refresh_token: refresh_h }
    }

    return { access_token: null, refresh_token: null }
  }

  useEffect(() => {
    // run only on client
    const tokens = extractTokensFromLocation()
    if (!tokens.access_token) {
      setError("No recovery token found in the URL. Follow the password reset link from your email.")
      setReady(true)
      return
    }

    // create a session from the tokens so updateUser can work
    ;(async () => {
      try {
        // setSession expects tokens; cast to any for compatibility across versions
        const { error: setErr } = await supabase.auth.setSession({
          access_token: tokens.access_token as string,
          refresh_token: tokens.refresh_token ?? undefined
        } as any)

        if (setErr) throw setErr
        setReady(true)
      } catch (err: any) {
        console.error("setSession error:", err)
        setError(err?.message || "Failed to create session from recovery token.")
        setReady(true)
      }
    })()
  }, [])

  async function handleSetPassword() {
    setError(null)
    setMessage(null)
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    setLoading(true)
    try {
      // requires active session created above
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr
      setMessage("Password updated. Redirecting to sign-in...")
      // Redirect after a short pause; the /auth page will redirect to /profile if session present
      setTimeout(() => router.replace("/auth"), 1100)
    } catch (err: any) {
      setError(err?.message || "Failed to update password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: "40px auto" }}>
      <h1 style={{ marginBottom: 8 }}>Reset password</h1>

      {!ready && !error && <div>Preparing…</div>}
      {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}
      {message && <div style={{ color: "green", marginTop: 12 }}>{message}</div>}

      {ready && !message && (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ display: "block", width: "100%", padding: "10px", marginTop: 6 }}
              placeholder="Enter new password (minimum 6 characters)"
            />
          </label>
          <button onClick={handleSetPassword} disabled={loading} style={{ padding: "10px 16px" }}>
            {loading ? "Updating…" : "Set new password"}
          </button>
        </div>
      )}
    </div>
  )
}
