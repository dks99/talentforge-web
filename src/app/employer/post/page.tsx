"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function PostJobPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [city, setCity] = useState("")
  const [skillsInput, setSkillsInput] = useState("")
  const [loading, setLoading] = useState(false)

  async function createJob() {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        alert("Please sign in first.")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("id").eq("auth_uid", user.id).maybeSingle()
      if (!profileData) {
        alert("Please create your employer profile first at /profile (set role to employer).")
        return
      }
      const employerProfileId = (profileData as any).id
      const skills = skillsInput.split(",").map(s => s.trim()).filter(Boolean)

      const { error } = await supabase.from("jobs").insert([{
        employer_profile_id: employerProfileId,
        title,
        description,
        city,
        skills
      }])
      if (error) throw error
      alert("Job posted successfully.")
      setTitle(""); setDescription(""); setCity(""); setSkillsInput("")
    } catch (err: any) {
      alert("Error posting job: " + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Post a Job</h1>
      <label className="block text-sm">Job Title</label>
      <input className="w-full border p-2 mb-3" value={title} onChange={e => setTitle(e.target.value)} />

      <label className="block text-sm">Description</label>
      <textarea className="w-full border p-2 mb-3" value={description} onChange={e => setDescription(e.target.value)} />

      <label className="block text-sm">City</label>
      <input className="w-full border p-2 mb-3" value={city} onChange={e => setCity(e.target.value)} />

      <label className="block text-sm">Skills (comma separated)</label>
      <input className="w-full border p-2 mb-3" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />

      <div>
        <button onClick={createJob} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? "Posting..." : "Post Job"}
        </button>
      </div>
    </div>
  )
}
