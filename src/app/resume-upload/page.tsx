"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function ResumeUpload() {
  const [user, setUser] = useState<any>()
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function upload() {
    if (!file) return alert("Select a file")

    const fileName = `${user.id}/${Date.now()}_${file.name}`

    const { error: uploadErr } = await supabase.storage
      .from("resumes")
      .upload(fileName, file)

    if (uploadErr) return alert(uploadErr.message)

    const { error: dbErr } = await supabase.from("resumes").insert([
      {
        profile_id: user.id,
        file_path: fileName
      }
    ])

    if (dbErr) alert(dbErr.message)
    else alert("Resume uploaded!")
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Upload Resume</h1>

      <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />

      <button
        onClick={upload}
        className="bg-green-600 text-white px-4 py-2 mt-4"
      >
        Upload Resume
      </button>
    </div>
  )
}
