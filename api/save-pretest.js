import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase config:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY
    })
    res.status(500).json({ 
      error: 'Supabase configuration is missing',
      detail: 'Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
    })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // 尝试检查表是否存在（仅用于诊断）
  if (process.env.NODE_ENV !== 'production') {
    const { error: tableCheckError } = await supabase
      .from('pretest_responses')
      .select('id')
      .limit(1)
    
    if (tableCheckError && tableCheckError.message.includes('schema cache')) {
      console.error('Table does not exist:', tableCheckError)
    }
  }

  try {
    const { username, language, responses } = req.body || {}

    if (!username) {
      res.status(400).json({ error: 'Missing username in request body' })
      return
    }

    const { data, error } = await supabase
      .from('pretest_responses')
      .insert({
        user_id: username,
        language: language || null,
        responses: responses || {},
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      // 提供更友好的错误信息
      let errorDetail = error.message
      if (error.message.includes('schema cache')) {
        errorDetail = 'Table "pretest_responses" does not exist. Please run the SQL script in Supabase Dashboard to create the table. See SUPABASE_SETUP.md for instructions.'
      }
      
      res.status(500).json({ 
        error: 'Failed to save pretest', 
        detail: errorDetail,
        code: error.code,
        hint: 'Check SUPABASE_SETUP.md for table creation instructions'
      })
      return
    }

    res.status(200).json({ ok: true, pretestId: data.id })
  } catch (error) {
    console.error('save-pretest error:', error)
    res.status(500).json({ error: 'Internal Server Error', detail: error.message })
  }
}

