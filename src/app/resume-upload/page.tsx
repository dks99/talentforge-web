"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState<any | null>(null)
  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [skillsInput, setSkillsInput] = useState("") // "pharmacy, billing"
  const [years, setYears] = useState<number | "">("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // load current user on mount and subscribe to auth changes
  useEffect(() => {
    let mounted = true

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setAuthUser(data?.user ?? null)
    }
    loadUser()

    // optional: listen to auth changes (keeps authUser fresh)
    const { data: subs } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subs?.subscription?.unsubscribe?.()
    }
  }, [])

  async function saveProfile() {
    setLoading(true)
    try {
      // Always re-check user at action time (avoid stale/null)
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) {
        alert("You must be signed in to save the profile. Please sign in.")
        router.push("/auth")
        return
      }

      // normalize inputs
      const skills = skillsInput.split(",").map(s => s.trim()).filter(Boolean)
      const yearsVal = years === "" ? null : Number(years)

      // upsert by auth_uid (make sure constraint exists in DB)
      const { error } = await supabase
        .from("profiles")
        .upsert(
          [{
            auth_uid: user.id,
            full_name: name,
            city,
            skills,
            years_experience: yearsVal,
            role: "candidate"
          }],
          { onConflict: "auth_uid" }
        )

      if (error) {
        console.error("Save profile error:", error)
        alert("Error saving profile: " + error.message)
      } else {
        alert("Profile saved!")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">My Profile</h1>

      <div className="mb-2">
        <label className="block text-sm">Full name</label>
        <input className="w-full border p-2" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="block text-sm">City</label>
        <input className="w-full border p-2" value={city} onChange={e => setCity(e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="block text-sm">Top skills (comma separated)</label>
        <input className="w-full border p-2" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />
      </div>

      <div className="mb-2">
        <label className="block text-sm">Years experience</label>
        <input className="w-full border p-2" value={years as any} onChange={e => setYears(e.target.value)} />
      </div>

      <div className="mt-4">
        <button
          onClick={saveProfile}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  )
}
