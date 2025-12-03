"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [city, setCity] = useState("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function saveProfile() {
    const { error } = await supabase.from("profiles").insert([
      {
        auth_uid: user.id,
        full_name: name,
        city,
        role: "candidate"
      }
    ])
    if (error) alert(error.message)
    else alert("Profile saved!")
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">My Profile</h1>

      <input
        className="border p-2 mt-4"
        placeholder="Full Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <input
        className="border p-2 mt-4"
        placeholder="City"
        value={city}
        onChange={e => setCity(e.target.value)}
      />

      <button
        onClick={saveProfile}
        className="bg-blue-600 text-white px-4 py-2 mt-4"
      >
        Save Profile
      </button>
    </div>
  )
}
