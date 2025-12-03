import { createClient } from '@supabase/supabase-js'

// 诊断端点：检查 Supabase 表是否存在
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Supabase configuration is missing',
      tables: {},
      config: {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY
      }
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const tablesToCheck = ['pretest_responses', 'posttest_responses', 'conversation_logs']
  const results = {}

  for (const tableName of tablesToCheck) {
    try {
      // 尝试查询表（使用 limit 1 避免加载太多数据）
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      results[tableName] = {
        exists: !error || !error.message.includes('schema cache'),
        error: error ? error.message : null,
        code: error?.code || null
      }
    } catch (err) {
      results[tableName] = {
        exists: false,
        error: err.message,
        code: null
      }
    }
  }

  const allTablesExist = Object.values(results).every(r => r.exists)
  
  res.status(allTablesExist ? 200 : 404).json({
    status: allTablesExist ? 'ok' : 'missing_tables',
    tables: results,
    message: allTablesExist 
      ? 'All tables exist' 
      : 'Some tables are missing. Please run the SQL script in Supabase Dashboard.',
    sqlFile: 'See supabase-schema-simple.sql for table creation SQL'
  })
}

