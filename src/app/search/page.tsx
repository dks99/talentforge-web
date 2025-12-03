"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function SearchJobsPage() {
  const [q, setQ] = useState("")
  const [city, setCity] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function doSearch() {
    setLoading(true)
    try {
      let query = supabase.from("jobs").select("*")
      if (q) {
        // search title OR description (ILIKE)
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      }
      if (city) {
        query = query.eq("city", city)
      }
      const { data, error } = await query.order("created_at", { ascending: false })
      if (error) throw error
      setResults(data || [])
    } catch (err: any) {
      alert("Search error: " + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Search Jobs</h1>

      <input placeholder="Role or keyword" value={q} onChange={e => setQ(e.target.value)} className="w-full border p-2 mb-3" />
      <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="w-full border p-2 mb-3" />

      <button onClick={doSearch} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
        {loading ? "Searching..." : "Search"}
      </button>

      <div className="mt-6 space-y-4">
        {results.map(job => (
          <div key={job.id} className="border p-4 rounded">
            <div className="font-bold">{job.title} <span className="text-sm text-gray-600">— {job.city}</span></div>
            <div className="mt-2">{job.description}</div>
            <div className="mt-2 text-sm text-gray-700">Skills: {(job.skills || []).join(", ")}</div>
          </div>
        ))}
        {results.length === 0 && !loading && <div className="text-gray-500">No results yet.</div>}
      </div>
    </div>
  )
}
