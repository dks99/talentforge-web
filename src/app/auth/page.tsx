// src/app/auth/page.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Redirect to /profile if already signed in (client-side detection)
  useEffect(() => {
    let mounted = true
    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (data?.session) {
        router.replace("/profile")
      }
    }
    checkSession()

    // subscribe to auth changes so we redirect right after login
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace("/profile")
      }
    })

    return () => {
      mounted = false
      // unsubscribe cleanup (safe)
      try {
        ;(sub as any)?.subscription?.unsubscribe?.()
      } catch {}
    }
  }, [router])

  // small validators
  const validEmail = (e: string) => /\S+@\S+\.\S+/.test(e)
  const validPassword = (p: string) => p.length >= 6

  async function handleSignIn() {
    setError(null)
    setMessage(null)
    if (!validEmail(email)) return setError("Please enter a valid email address.")
    if (!validPassword(password)) return setError("Password must be at least 6 characters.")
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setMessage("Signed in successfully. Redirecting...")
      // leave redirect to auth listener to handle (short delay for UX)
    } catch (err: any) {
      setError(err?.message || "Sign-in failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp() {
    setError(null)
    setMessage(null)
    if (!validEmail(email)) return setError("Please enter a valid email address.")
    if (!validPassword(password)) return setError("Password must be at least 6 characters.")
    setLoading(true)
    try {
      // include redirectTo so that reset/recovery links come back to your site
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/auth" }
      })
      if (error) throw error
      setMessage("Check your email for a confirmation link (if SMTP configured). You can sign in once confirmed.")
      setMode("signIn")
    } catch (err: any) {
      setError(err?.message || "Sign-up failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + "/profile" },
      })
      // Supabase will redirect to provider — nothing further here
    } catch (err: any) {
      setError(err?.message || "OAuth sign-in failed")
      setLoading(false)
    }
  }

  // Trigger password reset email
  async function handleResetPassword() {
    setError(null)
    setMessage(null)
    if (!validEmail(email)) return setError("Enter the email address you used to sign up.")
    setLoading(true)
    try {
      // IMPORTANT: redirectTo should point to the next page that handles completion (see reset page below)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth/reset"
      })
      if (error) throw error
      setMessage("Password reset email sent. Check your inbox.")
    } catch (err: any) {
      setError(err?.message || "Failed to send password reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-md bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold">TalentForge</h1>
            <p className="text-sm text-gray-500">Sign in to manage your profile & applications</p>
          </div>
        </div>

        <div className="flex gap-1 mb-4 bg-gray-100 rounded-md overflow-hidden">
          <button onClick={() => setMode("signIn")} className={`w-1/2 py-2 text-sm font-medium ${mode === "signIn" ? "bg-white shadow-sm" : "text-gray-600"}`}>Sign in</button>
          <button onClick={() => setMode("signUp")} className={`w-1/2 py-2 text-sm font-medium ${mode === "signUp" ? "bg-white shadow-sm" : "text-gray-600"}`}>Create account</button>
        </div>

        {message && <div className="mb-4 text-sm text-green-600">{message}</div>}
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-3 focus:ring-2 focus:ring-indigo-200" placeholder="you@example.com" />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-3 focus:ring-2 focus:ring-indigo-200" placeholder="••••••••" />
          </label>

          <div className="flex items-center justify-between text-sm">
            <button onClick={handleResetPassword} className="text-indigo-600 hover:underline">Forgot password?</button>
            <div className="text-sm text-gray-500">Minimum 6 characters</div>
          </div>

          <div>
            {mode === "signIn" ? (
              <button onClick={handleSignIn} disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-60">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            ) : (
              <button onClick={handleSignUp} disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-md font-medium hover:bg-violet-700 disabled:opacity-60">
                {loading ? "Creating…" : "Create account"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          By continuing, you agree to our <span className="text-indigo-600">Terms</span> and <span className="text-indigo-600">Privacy Policy</span>.
        </div>
      </div>
    </div>
  )
}
