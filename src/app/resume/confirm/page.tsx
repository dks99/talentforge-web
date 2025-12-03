"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type ResumeRow = {
  id: string
  profile_id: string
  file_path: string
  parsed: any
  created_at: string
}

export default function ConfirmResumePage() {
  const [resumes, setResumes] = useState<ResumeRow[]>([])
  const [editing, setEditing] = useState<ResumeRow | null>(null)
  const [editingText, setEditingText] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchResumesForCurrentUser()
  }, [])

  async function fetchResumesForCurrentUser() {
    try {
      setLoading(true)
      // get current auth user
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        setResumes([])
        return
      }

      // find profile id for that auth user
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_uid", user.id)
        .single()

      if (profileErr) {
        console.warn("No profile found for user:", profileErr.message)
        setResumes([])
        return
      }

      const profileId = (profileData as any).id

      // fetch resumes for this profile
      const { data, error } = await supabase
        .from("resumes")
        .select("id, profile_id, file_path, parsed, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setResumes((data as ResumeRow[]) || [])
    } catch (err) {
      console.error("fetchResumesForCurrentUser error:", err)
      setResumes([])
    } finally {
      setLoading(false)
    }
  }

  // Correct way to get public URL with supabase-js v2
  function getPublicUrl(path: string) {
    // getPublicUrl returns { data: { publicUrl: string } }
    const result = supabase.storage.from("resumes").getPublicUrl(path) as any
    return result?.data?.publicUrl || null
  }

  async function saveParsed(resumeId: string, parsedObj: any) {
    try {
      setLoading(true)
      const { error } = await supabase.from("resumes").update({ parsed: parsedObj }).eq("id", resumeId)
      if (error) throw error
      // refresh list
      await fetchResumesForCurrentUser()
      setEditing(null)
      setEditingText("")
      alert("Saved")
    } catch (err: any) {
      console.error("saveParsed error:", err)
      alert("Error saving parsed data: " + (err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-semibold mb-4">Confirm / Edit Parsed Resume</h2>

      {loading && <div className="mb-4">Loading…</div>}

      {resumes.length === 0 && !loading && <div>No resumes uploaded yet.</div>}

      {resumes.map(r => (
        <div key={r.id} className="border rounded p-4 mb-3">
          <div className="text-sm text-gray-600">Uploaded: {new Date(r.created_at).toLocaleString()}</div>
          <div className="mt-2">
            <a
              href={getPublicUrl(r.file_path) || "#"}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              Open Resume
            </a>
          </div>

          <div className="mt-3">
            <div className="font-medium">Parsed preview:</div>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto" style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(r.parsed ?? { text: "" }, null, 2)}
            </pre>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setEditing(r)
                setEditingText(JSON.stringify(r.parsed ?? {}, null, 2))
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Edit parsed
            </button>
          </div>
        </div>
      ))}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-6">
          <div className="bg-white rounded p-4 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-2">Edit parsed JSON</h3>
            <textarea
              rows={12}
              value={editingText}
              onChange={e => setEditingText(e.target.value)}
              className="w-full border p-2 monospace"
            />
            <div className="mt-3 flex gap-2">
              <button
                className="bg-green-600 text-white px-3 py-1 rounded"
                onClick={() => {
                  try {
                    const parsedObj = JSON.parse(editingText)
                    saveParsed(editing.id, parsedObj)
                  } catch (err) {
                    alert("Invalid JSON: " + (err as any).message)
                  }
                }}
              >
                Save
              </button>

              <button
                className="bg-gray-300 px-3 py-1 rounded"
                onClick={() => {
                  setEditing(null)
                  setEditingText("")
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
