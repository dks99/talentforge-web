"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert("Check your email to confirm!")
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else router.push("/profile")
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">TalentForge Login / Signup</h1>

      <input
        className="border p-2 mt-4"
        placeholder="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        className="border p-2 mt-4"
        type="password"
        placeholder="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <div className="mt-4 flex gap-4">
        <button onClick={signUp} className="bg-blue-600 text-white px-4 py-2">
          Sign Up
        </button>
        <button onClick={signIn} className="bg-green-600 text-white px-4 py-2">
          Sign In
        </button>
      </div>
    </div>
  )
}
