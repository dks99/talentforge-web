import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const city = searchParams.get('city') || ''

  let query = supabase.from('jobs').select('*')
  if (q) query = query.ilike('title', `%${q}%`).or(`description.ilike.%${q}%`)
  if (city) query = query.eq('city', city)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}
