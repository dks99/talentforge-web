"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"


export default function ResumeUploadPage() {
  const [user, setUser] = useState<any | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    // get current user on mount
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))

    // subscribe to auth changes. `onAuthStateChange` returns { data: { subscription } }
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // cleanup: unsubscribe the realtime subscription inside `data`
    return () => {
      try {
        // access the subscription correctly: sub.data.subscription.unsubscribe()
        // use optional chaining to be defensive in case shape changes
        (sub as any)?.data?.subscription?.unsubscribe?.()
      } catch (err) {
        // ignore unsubscribe errors
        // (keeps cleanup safe and prevents runtime crash)
      }
    }
  }, [])

  async function uploadResume() {
    if (!user) {
      alert("Please sign in first.")
      return
    }
    if (!file) {
      alert("Select a file first.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Please upload a file smaller than 10 MB.")
      return
    }
    setLoading(true)
    try {
      // Ensure profile exists and fetch its id
      const { data: profileData } = await supabase.from("profiles").select("id").eq("auth_uid", user.id).maybeSingle()
      if (!profileData) {
        alert("Please create your profile before uploading a resume.")
        return
      }
      const profileId = (profileData as any).id

      const fileName = `${profileId}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadErr } = await supabase.storage.from("resumes").upload(fileName, file)
      if (uploadErr) throw uploadErr

      const { error: insertErr } = await supabase.from("resumes").insert([{
        profile_id: profileId,
        file_path: fileName,
        parsed: { text: null } // placeholder; user will confirm/edit parsed content later
      }])
      if (insertErr) throw insertErr

      alert("Resume uploaded. Please go to Confirm Resume to edit parsed details.")
      setFile(null)
    } catch (err: any) {
      alert("Upload error: " + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Upload Resume</h1>
      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <div className="mt-4">
        <button onClick={uploadResume} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
          {loading ? "Uploading..." : "Upload Resume"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mt-3">Tip: If parsing fails later, you can edit parsed fields manually on the confirm page.</p>
    </div>
  )
}
