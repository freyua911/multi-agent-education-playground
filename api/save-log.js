import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase configuration is missing' })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { payload, userId = null, sessionId = null, meta = null } = req.body || {}

    if (!payload) {
      res.status(400).json({ error: 'Missing payload in request body' })
      return
    }

    const { data, error } = await supabase
      .from('conversation_logs')
      .insert({
        user_id: userId,
        session_id: sessionId,
        payload,
        meta
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      res.status(500).json({ error: 'Failed to save log', detail: error.message })
      return
    }

    res.status(200).json({ ok: true, logId: data.id })
  } catch (error) {
    console.error('save-log error:', error)
    res.status(500).json({ error: 'Internal Server Error', detail: error.message })
  }
}


