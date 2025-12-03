"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function MyResumes() {
  const [resumes, setResumes] = useState<any[]>([])

  useEffect(() => {
    fetchResumes()
  }, [])

  async function fetchResumes() {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) { setResumes([]); return }
    // get profile id
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_uid", user.id).maybeSingle()
    if (!profile) { setResumes([]); return }
    const profileId = (profile as any).id
    const { data } = await supabase.from("resumes").select("*").eq("profile_id", profileId).order("created_at",{ascending:false})
    setResumes(data || [])
  }

  function getPublicUrl(path: string) {
    const res = supabase.storage.from("resumes").getPublicUrl(path) as any
    return res?.data?.publicUrl || "#"
  }

  return (
    <div style={{ padding:20 }}>
      <h1>My Resumes</h1>
      {resumes.map(r => (
        <div key={r.id} style={{ border:'1px solid #ddd', padding:8, marginBottom:8 }}>
          <div>Uploaded: {new Date(r.created_at).toLocaleString()}</div>
          <a href={getPublicUrl(r.file_path)} target="_blank" rel="noreferrer">Open Resume</a>
          <pre>{JSON.stringify(r.parsed || {}, null, 2)}</pre>
        </div>
      ))}
      {resumes.length===0 && <div>No resumes yet</div>}
    </div>
  )
}
