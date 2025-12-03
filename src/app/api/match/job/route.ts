// web/src/app/api/match/job/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * GET /api/match/job/[id]
 *
 * Returns a ranked list of candidate profiles for a job.
 *
 * Note: Use a permissive type for `context` to avoid TypeScript incompatibilities
 * with Next's generated dev-time route types.
 */
export async function GET(request: NextRequest, context: any) {
  try {
    // Safe extraction of jobId
    const jobId = context?.params?.id ?? null;
    if (!jobId) {
      return NextResponse.json({ error: "Missing job id" }, { status: 400 });
    }

    // fetch job
    const { data: jobData, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr) {
      console.error("supabase job fetch error:", jobErr);
      return NextResponse.json({ error: jobErr.message }, { status: 500 });
    }

    if (!jobData) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobData as any;

    // Fetch profiles & resumes (small scale approach)
    const [{ data: profiles, error: profilesErr }, { data: resumes, error: resumesErr }] =
      await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("resumes").select("*"),
      ]);

    if (profilesErr || resumesErr) {
      console.error("supabase fetch error:", profilesErr || resumesErr);
      return NextResponse.json({ error: (profilesErr || resumesErr)?.message || "DB error" }, { status: 500 });
    }

    const profilesList = profiles || [];
    const resumesList = resumes || [];

    // Scoring logic
    const candidates = profilesList.map((profile: any) => {
      const r = resumesList.find((x: any) => x.profile_id === profile.id);
      const parsedText = ((r?.parsed?.text) || "").toString().toLowerCase();
      const jobText = ((job.title || "") + " " + (job.description || "") + " " + ((job.skills || []).join(" "))).toLowerCase();

      // keyword matching
      const keywords = jobText.split(/\s+/).filter(Boolean);
      let kwMatches = 0;
      for (const k of keywords) {
        if (k.length > 1 && parsedText.includes(k)) kwMatches++;
      }
      const kwScore = kwMatches / Math.max(1, keywords.length);

      // skills overlap
      const profileSkills = (profile.skills || []).map((s: string) => (s || "").toLowerCase());
      const jobSkills = (job.skills || []).map((s: string) => (s || "").toLowerCase());
      const overlap = profileSkills.filter((s: string) => jobSkills.includes(s)).length;
      const skillScore = overlap / Math.max(1, jobSkills.length || 1);

      // city bonus
      const cityScore = (profile.city && job.city && profile.city.toLowerCase() === (job.city || "").toLowerCase()) ? 1 : 0;

      const score = 0.5 * kwScore + 0.4 * skillScore + 0.1 * cityScore;

      return {
        profile,
        resume: r,
        score,
      };
    }).sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({ candidates });
  } catch (err: any) {
    console.error("match job route error:", err);
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
