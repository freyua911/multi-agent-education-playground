-- ============================================
-- Supabase 对话日志查询集合
-- 在 Supabase Dashboard > SQL Editor 中运行这些查询
-- ============================================

-- ============================================
-- 1. 基础查询
-- ============================================

-- 1.1 查看所有对话日志（基本信息）
SELECT 
    id,
    user_id,
    session_id,
    created_at,
    (payload->>'totalTurns')::int as total_turns,
    payload->>'generatedAt' as generated_at,
    meta->>'language' as language
FROM conversation_logs
ORDER BY created_at DESC
LIMIT 50;

-- 1.2 查看最近的对话日志（带时间格式化）
SELECT 
    id,
    user_id,
    session_id,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_time,
    (payload->>'totalTurns')::int as total_turns,
    meta->>'language' as language
FROM conversation_logs
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 2. 用户相关查询
-- ============================================

-- 2.1 查看特定用户的所有对话
SELECT 
    id,
    session_id,
    created_at,
    (payload->>'totalTurns')::int as total_turns,
    meta->>'language' as language
FROM conversation_logs
WHERE user_id = 'YOUR_USERNAME_HERE'  -- 替换为实际用户名
ORDER BY created_at DESC;

-- 2.2 统计每个用户的对话数量
SELECT 
    user_id,
    COUNT(*) as conversation_count,
    MAX(created_at) as latest_conversation,
    MIN(created_at) as first_conversation
FROM conversation_logs
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY conversation_count DESC;

-- 2.3 查看所有用户列表（去重）
SELECT DISTINCT 
    user_id,
    COUNT(*) as session_count
FROM conversation_logs
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY session_count DESC;

-- ============================================
-- 3. 对话详情查询（展开 JSON）
-- ============================================

-- 3.1 查看完整对话历史（展开 conversationHistory）
SELECT 
    id,
    user_id,
    created_at,
    jsonb_array_length(COALESCE(payload->'conversationHistory', '[]'::jsonb)) as message_count,
    payload->'conversationHistory' as conversation_history
FROM conversation_logs
WHERE id = YOUR_LOG_ID_HERE  -- 替换为实际的日志 ID
ORDER BY created_at DESC;

-- 3.2 查看对话历史中的消息列表（展开数组）
SELECT 
    cl.id as log_id,
    cl.user_id,
    cl.created_at,
    msg.value->>'role' as message_role,
    msg.value->>'agentType' as agent_type,
    msg.value->>'content' as message_content,
    msg.value->>'timestamp' as message_timestamp
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE cl.id = YOUR_LOG_ID_HERE  -- 替换为实际的日志 ID
ORDER BY msg.value->>'timestamp';

-- 3.3 查看所有对话中的用户消息
SELECT 
    cl.id as log_id,
    cl.user_id,
    cl.created_at,
    msg.value->>'content' as user_message,
    msg.value->>'timestamp' as message_time
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE msg.value->>'role' = 'user'
ORDER BY cl.created_at DESC, msg.value->>'timestamp';

-- 3.4 查看所有对话中的 AI 回复（按 agentType 分类）
SELECT 
    cl.id as log_id,
    cl.user_id,
    cl.created_at,
    msg.value->>'agentType' as agent_type,
    LEFT(msg.value->>'content', 100) as message_preview,  -- 只显示前100个字符
    msg.value->>'timestamp' as message_time
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE msg.value->>'role' = 'assistant'
  AND msg.value->>'agentType' IS NOT NULL
ORDER BY cl.created_at DESC, msg.value->>'timestamp';

-- ============================================
-- 4. 测试相关查询
-- ============================================

-- 4.1 查看包含测试的对话
SELECT 
    id,
    user_id,
    created_at,
    jsonb_array_length(COALESCE(payload->'testHistory', '[]'::jsonb)) as test_items_count,
    jsonb_array_length(COALESCE(payload->'feedbackHistory', '[]'::jsonb)) as feedback_count
FROM conversation_logs
WHERE payload->'testHistory' IS NOT NULL
   OR payload->'feedbackHistory' IS NOT NULL
ORDER BY created_at DESC;

-- 4.2 查看测试历史详情
SELECT 
    cl.id as log_id,
    cl.user_id,
    cl.created_at,
    test.value->>'role' as test_role,
    test.value->>'content' as test_content,
    test.value->>'timestamp' as test_time
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'testHistory', '[]'::jsonb)) as test
ORDER BY cl.created_at DESC, test.value->>'timestamp';

-- ============================================
-- 5. 统计和分析查询
-- ============================================

-- 5.1 每日对话统计
SELECT 
    DATE(created_at) as date,
    COUNT(*) as conversation_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG((payload->>'totalTurns')::int) as avg_turns,
    SUM((payload->>'totalTurns')::int) as total_turns
FROM conversation_logs
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- 5.2 按语言统计
SELECT 
    COALESCE(meta->>'language', 'unknown') as language,
    COUNT(*) as conversation_count,
    COUNT(DISTINCT user_id) as unique_users
FROM conversation_logs
GROUP BY meta->>'language'
ORDER BY conversation_count DESC;

-- 5.3 对话长度分布（按消息数量）
SELECT 
    CASE 
        WHEN (payload->>'totalTurns')::int < 10 THEN '1-9'
        WHEN (payload->>'totalTurns')::int < 20 THEN '10-19'
        WHEN (payload->>'totalTurns')::int < 50 THEN '20-49'
        WHEN (payload->>'totalTurns')::int < 100 THEN '50-99'
        ELSE '100+'
    END as turn_range,
    COUNT(*) as conversation_count
FROM conversation_logs
WHERE payload->>'totalTurns' IS NOT NULL
GROUP BY turn_range
ORDER BY MIN((payload->>'totalTurns')::int);

-- 5.4 Agent 类型使用统计
SELECT 
    msg.value->>'agentType' as agent_type,
    COUNT(*) as message_count,
    COUNT(DISTINCT cl.user_id) as unique_users
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE msg.value->>'agentType' IS NOT NULL
GROUP BY msg.value->>'agentType'
ORDER BY message_count DESC;

-- ============================================
-- 6. 搜索查询
-- ============================================

-- 6.1 搜索包含特定关键词的对话
SELECT 
    cl.id,
    cl.user_id,
    cl.created_at,
    msg.value->>'content' as matched_message,
    msg.value->>'role' as message_role,
    msg.value->>'agentType' as agent_type
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE msg.value->>'content' ILIKE '%关键词%'  -- 替换为您要搜索的关键词
ORDER BY cl.created_at DESC
LIMIT 50;

-- 6.2 搜索特定用户的特定关键词
SELECT 
    cl.id,
    cl.created_at,
    msg.value->>'content' as matched_message,
    msg.value->>'role' as message_role
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE cl.user_id = 'YOUR_USERNAME_HERE'  -- 替换为实际用户名
  AND msg.value->>'content' ILIKE '%关键词%'  -- 替换为要搜索的关键词
ORDER BY cl.created_at DESC;

-- ============================================
-- 7. 数据清理和维护查询
-- ============================================

-- 7.1 查看重复的会话（基于 user_id 和时间窗口）
SELECT 
    user_id,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as log_ids,
    array_agg(created_at ORDER BY created_at) as timestamps
FROM conversation_logs
WHERE user_id IS NOT NULL
GROUP BY user_id, DATE_TRUNC('hour', created_at)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 7.2 查看最近24小时的对话数量
SELECT COUNT(*) as conversations_last_24h
FROM conversation_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 7.3 查看数据库大小（对话日志表）
SELECT 
    pg_size_pretty(pg_total_relation_size('conversation_logs')) as total_size,
    pg_size_pretty(pg_relation_size('conversation_logs')) as table_size,
    pg_size_pretty(pg_total_relation_size('conversation_logs') - pg_relation_size('conversation_logs')) as indexes_size,
    COUNT(*) as total_records
FROM conversation_logs;

-- ============================================
-- 8. 导出准备查询
-- ============================================

-- 8.1 导出特定用户的所有对话（JSON 格式）
SELECT 
    jsonb_build_object(
        'user_id', user_id,
        'total_conversations', COUNT(*),
        'conversations', jsonb_agg(
            jsonb_build_object(
                'id', id,
                'session_id', session_id,
                'created_at', created_at,
                'payload', payload,
                'meta', meta
            ) ORDER BY created_at
        )
    ) as export_data
FROM conversation_logs
WHERE user_id = 'YOUR_USERNAME_HERE'  -- 替换为实际用户名
GROUP BY user_id;

-- 8.2 导出特定时间范围内的所有对话
SELECT 
    id,
    user_id,
    session_id,
    created_at,
    payload,
    meta
FROM conversation_logs
WHERE created_at >= '2024-01-01'::date  -- 替换为开始日期
  AND created_at < '2024-12-31'::date   -- 替换为结束日期
ORDER BY created_at;

-- ============================================
-- 使用说明
-- ============================================
-- 
-- 1. 在 Supabase Dashboard 中打开 SQL Editor
-- 2. 复制您需要的查询
-- 3. 替换以下占位符：
--    - YOUR_USERNAME_HERE: 替换为实际用户名
--    - YOUR_LOG_ID_HERE: 替换为实际的日志 ID
--    - '关键词': 替换为您要搜索的关键词
--    - 日期范围: 根据需要修改日期
-- 4. 运行查询
-- 
-- 提示：
-- - 对于大型数据集，建议添加 LIMIT 子句
-- - JSON 查询可能较慢，可以考虑添加索引
-- - 在生产环境中运行删除查询前请先备份
-- ============================================

