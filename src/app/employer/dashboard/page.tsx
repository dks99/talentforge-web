"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type CandidateMatch = {
  profile: any
  resume: any
  score: number
}

export default function EmployerDashboardPage() {
  const [jobId, setJobId] = useState("")
  const [matches, setMatches] = useState<CandidateMatch[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchMatches() {
    if (!jobId) {
      alert("Enter a Job ID")
      return
    }
    setLoading(true)
    try {
      const { data: jobData, error: jobErr } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle()
      if (jobErr) throw jobErr
      if (!jobData) {
        alert("Job not found")
        return
      }
      const job = jobData as any

      // fetch all profiles and resumes (small scale; for production use paged queries)
      const { data: profiles } = await supabase.from("profiles").select("*")
      const { data: resumes } = await supabase.from("resumes").select("*")

      const candidates: CandidateMatch[] = (profiles || []).map((profile: any) => {
        const r = (resumes || []).find((x: any) => x.profile_id === profile.id)
        const parsedText = (r?.parsed?.text || "").toLowerCase()
        const jobText = (job.title + " " + job.description + " " + ((job.skills || []).join(" "))).toLowerCase()
        // keyword score
        const keywords = jobText.split(/\s+/).filter(Boolean)
        let kwMatches = 0
        for (const k of keywords) {
          if (k.length > 1 && parsedText.includes(k)) kwMatches++
        }
        const kwScore = kwMatches / Math.max(1, keywords.length)
        // skill overlap
        const profileSkills = (profile.skills || []).map((s: string) => (s || "").toLowerCase())
        const jobSkills = (job.skills || []).map((s: string) => (s || "").toLowerCase())
        const overlap = profileSkills.filter((s: string) => jobSkills.includes(s)).length
        const skillScore = overlap / Math.max(1, jobSkills.length)
        const cityScore = (profile.city === job.city) ? 1 : 0
        const score = 0.5 * kwScore + 0.4 * skillScore + 0.1 * cityScore
        return { profile, resume: r, score }
      }).sort((a: any, b: any) => b.score - a.score)

      setMatches(candidates)
    } catch (err: any) {
      alert("Match error: " + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  function whatsappLink(profile: any, jobTitle: string) {
    const phone = (profile.phone || "").replace(/\D/g, "")
    if (!phone) return null
    const text = `Hi ${profile.full_name || ""}, we have a job opening: ${jobTitle}. If interested, reply here.`
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Employer Dashboard — Candidate Matches</h1>

      <div className="mb-4">
        <input placeholder="Job ID" value={jobId} onChange={e => setJobId(e.target.value)} className="border p-2 mr-2" />
        <button onClick={fetchMatches} disabled={loading} className="bg-blue-600 text-white px-3 py-2 rounded">
          {loading ? "Matching..." : "Get Matches"}
        </button>
      </div>

      <div className="space-y-4">
        {matches.length === 0 && !loading && <div className="text-gray-500">No matches yet. Enter a job ID above.</div>}
        {matches.map(m => (
          <div key={m.profile.id} className="border p-4 rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-bold">{m.profile.full_name} <span className="text-sm text-gray-600">— {m.profile.city}</span></div>
                <div className="text-sm text-gray-700">Skills: {(m.profile.skills || []).join(", ")}</div>
                <div className="text-sm">Score: {m.score.toFixed(2)}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {m.resume?.file_path && (
                  <a href={supabase.storage.from("resumes").getPublicUrl(m.resume.file_path as string).data.publicUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    View Resume
                  </a>
                )}
                {m.profile?.consent && m.profile?.phone ? (
                  <a target="_blank" rel="noreferrer" className="bg-green-600 text-white px-3 py-1 rounded" href={whatsappLink(m.profile, (m.profile?.latestAppliedJobTitle || "Job")) ?? "#"}>
                    Contact on WhatsApp
                  </a>
                ) : (
                  <div className="text-sm text-gray-500">No contact (consent or phone missing)</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
