// pages/test-supabase.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function TestSupabase() {
  const [res, setRes] = useState<any>()
  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('users').select('*').limit(1)
      setRes(data)
    }
    fetch()
  }, [])
  return <div>Supabase test data: {JSON.stringify(res)}</div>
}