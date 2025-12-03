// src/app/profile/page.tsx
"use client"

// near top of file
import RoleMenu from "../components/RoleMenu"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

type ResumeRow = {
  id: string
  profile_id: string
  file_path: string
  parsed: any
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any | null>(null)

  // profile fields
  const [fullName, setFullName] = useState("")
  const [headline, setHeadline] = useState("")
  const [city, setCity] = useState("")
  const [skillsInput, setSkillsInput] = useState("") // comma separated
  const [years, setYears] = useState<number | "">("") // number or empty
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<"candidate" | "employer">("candidate")
  const [consent, setConsent] = useState(false)

  // avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // resumes
  const [resumes, setResumes] = useState<ResumeRow[]>([])
  const [resumesLoading, setResumesLoading] = useState(false)

  // messages
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Helper: get public url for a file path
  function getPublicUrl(path: string | null | undefined) {
    if (!path) return null
    try {
      const res = (supabase.storage.from("resumes").getPublicUrl(path) as any)
      return res?.data?.publicUrl ?? null
    } catch {
      return null
    }
  }

  // load session + profile on mount
  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data?.session ?? null
        if (!mounted) return
        if (!session) {
          router.replace("/auth")
          return
        }
        setUser(session.user)

        // fetch profile by auth uid
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("auth_uid", session.user.id)
          .maybeSingle()

        if (pErr) {
          console.warn("profile fetch error:", pErr)
        }
        if (profile) {
          setFullName(profile.full_name ?? "")
          setHeadline(profile.headline ?? "")
          setCity(profile.city ?? "")
          setSkillsInput((profile.skills || []).join(", "))
          setYears(profile.years_experience ?? "")
          setPhone(profile.phone ?? "")
          setRole(profile.role ?? "candidate")
          setConsent(profile.consent ?? false)
          if (profile.avatar_path) {
            // try to load avatar public url (if stored)
            try {
              const av = (supabase.storage.from("avatars").getPublicUrl(profile.avatar_path) as any)
              setAvatarUrl(av?.data?.publicUrl ?? null)
            } catch {}
          }
        }

        // fetch resumes owned by profile (if any)
        await fetchResumes(session.user.id)
      } catch (err) {
        console.error("bootstrap error", err)
        setError("Failed to load profile. Try reloading.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    bootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/auth")
      } else {
        setUser(session.user)
      }
    })

    return () => {
      mounted = false
      try {
        ;(sub as any)?.subscription?.unsubscribe?.()
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function fetchResumes(authUid?: string) {
    setResumesLoading(true)
    try {
      const uid = authUid ?? user?.id
      if (!uid) {
        setResumes([])
        return
      }
      const { data: profile, error: pErr } = await supabase.from("profiles").select("id").eq("auth_uid", uid).maybeSingle()
      if (pErr || !profile) {
        setResumes([])
        return
      }
      const profileId = (profile as any).id
      const { data: rows, error } = await supabase
        .from("resumes")
        .select("id, profile_id, file_path, parsed, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setResumes((rows as ResumeRow[]) || [])
    } catch (err: any) {
      console.error("fetchResumes error:", err)
      setError("Failed to fetch resumes")
    } finally {
      setResumesLoading(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      if (!user) {
        setError("Not signed in")
        return
      }
      const skills = skillsInput.split(",").map(s => s.trim()).filter(Boolean)
      const yearsVal = years === "" ? null : Number(years)

      // upsert profile; conflict on auth_uid
      const { error } = await supabase.from("profiles").upsert([{
        auth_uid: user.id,
        full_name: fullName,
        headline,
        city,
        skills,
        years_experience: yearsVal,
        phone,
        consent,
        role
      }], { onConflict: "auth_uid" })

      if (error) throw error
      setNotice("Profile saved")
      // refresh resumes (profile id may have been created)
      await fetchResumes(user.id)
    } catch (err: any) {
      console.error("saveProfile error:", err)
      setError(err?.message || "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  async function uploadAvatar() {
    if (!avatarFile || !user) return
    setAvatarUploading(true)
    setError(null)
    try {
      const { data: profile } = await supabase.from("profiles").select("id").eq("auth_uid", user.id).maybeSingle()
      if (!profile) {
        setError("Create profile first (save) before uploading avatar.")
        return
      }
      const profileId = (profile as any).id
      const fileName = `${profileId}/avatar_${Date.now()}_${avatarFile.name}`
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true })
      if (uploadErr) throw uploadErr

      // save avatar_path in profiles table
      const { error: upErr } = await supabase.from("profiles").update({ avatar_path: fileName }).eq("id", profileId)
      if (upErr) throw upErr

      const res = (supabase.storage.from("avatars").getPublicUrl(fileName) as any)
      setAvatarUrl(res?.data?.publicUrl ?? null)
      setAvatarFile(null)
      setNotice("Avatar uploaded")
    } catch (err: any) {
      console.error("uploadAvatar error:", err)
      setError(err?.message || "Failed to upload avatar")
    } finally {
      setAvatarUploading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace("/auth")
  }

  // small UI helpers
  function skillsPreview() {
    return skillsInput.split(",").map(s => s.trim()).filter(Boolean).slice(0,8)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading profile…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex gap-4">
          <div className="w-28">
            {/* avatar block (existing) */}
          </div>
          <div className="flex-1">
            <RoleMenu role={role} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/resume-upload")}
              className="px-3 py-2 bg-green-600 text-white rounded-md text-sm"
            >
              Upload Resume
            </button>
            <button
              onClick={() => router.push("/resume/confirm")}
              className="px-3 py-2 bg-amber-600 text-white rounded-md text-sm"
            >
              Confirm Resumes
            </button>
            <button
              onClick={() => router.push("/search")}
              className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm"
            >
              Search Jobs
            </button>
            <button
              onClick={() => router.push("/employer/post")}
              className="px-3 py-2 bg-sky-600 text-white rounded-md text-sm"
            >
              Post Job
            </button>
            <button
              onClick={() => router.push("/employer/dashboard")}
              className="px-3 py-2 bg-violet-600 text-white rounded-md text-sm"
            >
              Employer Dashboard
            </button>
            <button onClick={signOut} className="px-3 py-2 border rounded-md text-sm">Sign out</button>
          </div>
        </div>

        {notice && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded">{notice}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: avatar & quick stats */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 mb-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="avatar" src={avatarUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No avatar</div>
                )}
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700">Upload avatar</label>
                <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] ?? null)} className="mt-2" />
                <div className="flex gap-2 mt-3">
                  <button onClick={uploadAvatar} disabled={!avatarFile || avatarUploading} className="flex-1 bg-indigo-600 text-white py-2 rounded text-sm">
                    {avatarUploading ? "Uploading…" : "Upload"}
                  </button>
                  <button onClick={() => { setAvatarFile(null); setAvatarUrl(null) }} className="flex-1 border rounded py-2 text-sm">Remove</button>
                </div>
              </div>

              <div className="mt-6 w-full text-sm text-gray-600">
                <div><strong>Signed in as:</strong> {user?.email}</div>
                <div className="mt-2"><strong>Role:</strong> {role}</div>
                <div className="mt-2"><strong>Resumes:</strong> {resumes.length}</div>
              </div>
            </div>
          </div>

          {/* Right column: profile form */}
          <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 block w-full border p-3 rounded" placeholder="e.g. Ravi Kumar" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Headline</label>
                <input value={headline} onChange={e => setHeadline(e.target.value)} className="mt-1 block w-full border p-3 rounded" placeholder="Short headline (e.g. Electrician • 5 yrs exp)" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input value={city} onChange={e => setCity(e.target.value)} className="mt-1 block w-full border p-3 rounded" placeholder="Pune" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Years experience</label>
                  <input
                    type="number"
                    min={0}
                    value={years === "" ? "" : String(years)}
                    onChange={e => setYears(e.target.value === "" ? "" : Number(e.target.value))}
                    className="mt-1 block w-full border p-3 rounded"
                    placeholder="e.g. 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border p-3 rounded" placeholder="+91 98..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
                <input value={skillsInput} onChange={e => setSkillsInput(e.target.value)} className="mt-1 block w-full border p-3 rounded" placeholder="wiring, installation, maintenance" />
                <div className="flex gap-2 flex-wrap mt-2">
                  {skillsPreview().map(s => <span key={s} className="text-xs bg-gray-100 px-2 py-1 rounded">{s}</span>)}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                  <span className="text-sm">I consent to share phone with verified employers</span>
                </label>

                <label className="flex items-center gap-2 ml-6">
                  <span className="text-sm">Role</span>
                  <select value={role} onChange={e => setRole(e.target.value as any)} className="border p-2 rounded ml-2">
                    <option value="candidate">Candidate</option>
                    <option value="employer">Employer</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button onClick={saveProfile} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded">
                  {saving ? "Saving…" : "Save Profile"}
                </button>

                <button onClick={() => { setFullName(""); setHeadline(""); setCity(""); setSkillsInput(""); setYears(""); setPhone(""); setConsent(false); }} className="px-4 py-2 border rounded">
                  Reset
                </button>

                <div className="text-sm text-gray-500 ml-auto">
                  Tip: keep your headline short and use city for local matches
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumes section */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">My Resumes</h2>
            <div className="flex gap-2">
              <button onClick={() => router.push("/resume-upload")} className="px-3 py-2 bg-green-600 text-white rounded text-sm">Upload Resume</button>
              <button onClick={() => router.push("/resume/confirm")} className="px-3 py-2 bg-amber-600 text-white rounded text-sm">Confirm Parsed</button>
            </div>
          </div>

          {resumesLoading ? (
            <div>Loading…</div>
          ) : resumes.length === 0 ? (
            <div className="text-sm text-gray-500">No resumes uploaded yet. Use Upload Resume to add one.</div>
          ) : (
            <div className="space-y-3">
              {resumes.map(r => (
                <div key={r.id} className="flex items-center justify-between border p-3 rounded">
                  <div>
                    <div className="font-medium">Uploaded: {new Date(r.created_at).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Parsed fields: {r.parsed ? Object.keys(r.parsed).length : 0}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <a href={getPublicUrl(r.file_path) ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Open</a>
                    <button onClick={() => router.push("/resume/confirm")} className="px-3 py-1 border rounded text-sm">Edit parsed</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-right text-xs text-gray-400">
          <div>Need help? Visit <button onClick={() => router.push("/")} className="text-indigo-600 underline">TalentForge Help</button></div>
        </div>
      </div>
    </div>
  )
}
