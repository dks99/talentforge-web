// src/components/RoleMenu.tsx
"use client"

import React from "react"
import { useRouter } from "next/navigation"

export type Role = "candidate" | "employer" | "admin" | "superadmin" | string

export default function RoleMenu({ role }: { role?: Role }) {
  const router = useRouter()
  const r = (role || "candidate").toLowerCase()

  const CandidateMenu = (
    <>
      <MenuButton onClick={() => router.push("/profile")}>My Profile</MenuButton>
      <MenuButton onClick={() => router.push("/resume-upload")}>Upload Resume</MenuButton>
      <MenuButton onClick={() => router.push("/resume/confirm")}>Confirm Resume</MenuButton>
      <MenuButton onClick={() => router.push("/search")}>Search Jobs</MenuButton>
      <MenuButton onClick={() => router.push("/")} className="mt-2 text-xs text-gray-400">Candidate Help</MenuButton>
    </>
  )

  const EmployerMenu = (
    <>
      <MenuButton onClick={() => router.push("/employer/dashboard")}>Employer Dashboard</MenuButton>
      <MenuButton onClick={() => router.push("/employer/post")}>Post Job</MenuButton>
      <MenuButton onClick={() => router.push("/search")}>Search Candidates</MenuButton>
      <MenuButton onClick={() => router.push("/")} className="mt-2 text-xs text-gray-400">Employer Help</MenuButton>
    </>
  )

  const AdminMenu = (
    <>
      <MenuButton onClick={() => router.push("/admin/users")}>Manage Users</MenuButton>
      <MenuButton onClick={() => router.push("/admin/jobs")}>Manage Jobs</MenuButton>
      <MenuButton onClick={() => router.push("/admin/reports")}>Reports</MenuButton>
      <MenuButton onClick={() => router.push("/admin/settings")}>Settings</MenuButton>
    </>
  )

  const SuperAdminMenu = (
    <>
      {AdminMenu}
      <MenuButton onClick={() => router.push("/admin/system")}>System Console</MenuButton>
      <MenuButton onClick={() => router.push("/admin/billing")}>Billing</MenuButton>
    </>
  )

  return (
    <div className="bg-white rounded-md p-3 border">
      <div className="text-xs text-gray-500 mb-2">Signed in as <strong className="text-sm">{role ?? "candidate"}</strong></div>

      {/* choose menu */}
      <div className="space-y-2">
        {r === "candidate" && CandidateMenu}
        {r === "employer" && EmployerMenu}
        {r === "admin" && AdminMenu}
        {r === "superadmin" && SuperAdminMenu}

        {/* fallback (candidate) */}
        {!["candidate","employer","admin","superadmin"].includes(r) && CandidateMenu}
      </div>
    </div>
  )
}

/* small presentational button used by RoleMenu */
function MenuButton({ children, onClick, className }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <button onClick={onClick} className={`w-full text-left p-2 rounded hover:bg-gray-50 ${className ?? ""}`}>
      {children}
    </button>
  )
}
