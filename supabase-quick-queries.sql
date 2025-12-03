-- ============================================
-- 常用对话日志查询（快速版）
-- 复制需要的查询到 Supabase SQL Editor 运行
-- ============================================

-- ============================================
-- 【最常用】查看最近的所有对话
-- ============================================
SELECT 
    id,
    user_id,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as 创建时间,
    (payload->>'totalTurns')::int as 消息数量,
    meta->>'language' as 语言
FROM conversation_logs
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 【最常用】查看特定用户的对话
-- ============================================
-- 使用方法：将 'USERNAME' 替换为实际用户名
SELECT 
    id,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as 创建时间,
    (payload->>'totalTurns')::int as 消息数量,
    meta->>'language' as 语言
FROM conversation_logs
WHERE user_id = 'USERNAME'
ORDER BY created_at DESC;

-- ============================================
-- 【最常用】查看完整对话内容
-- ============================================
-- 使用方法：将 123 替换为实际的日志 ID
SELECT 
    user_id,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as 创建时间,
    payload->'conversationHistory' as 完整对话
FROM conversation_logs
WHERE id = 123
ORDER BY created_at DESC;

-- ============================================
-- 【最常用】查看对话中的所有消息（展开显示）
-- ============================================
-- 使用方法：将 123 替换为实际的日志 ID
SELECT 
    msg.value->>'role' as 角色,
    msg.value->>'agentType' as AI类型,
    LEFT(msg.value->>'content', 200) as 消息内容,
    msg.value->>'timestamp' as 时间
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE cl.id = 123
ORDER BY msg.value->>'timestamp';

-- ============================================
-- 统计查询
-- ============================================

-- 每日对话数量统计
SELECT 
    DATE(created_at) as 日期,
    COUNT(*) as 对话数量,
    COUNT(DISTINCT user_id) as 用户数量
FROM conversation_logs
GROUP BY DATE(created_at)
ORDER BY 日期 DESC
LIMIT 30;

-- 用户对话数量排行
SELECT 
    user_id as 用户名,
    COUNT(*) as 对话数量,
    MAX(created_at) as 最近对话时间
FROM conversation_logs
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY 对话数量 DESC
LIMIT 20;

-- ============================================
-- 搜索查询
-- ============================================

-- 搜索包含关键词的对话
-- 使用方法：将 '关键词' 替换为您要搜索的内容
SELECT 
    cl.id,
    cl.user_id,
    TO_CHAR(cl.created_at, 'YYYY-MM-DD HH24:MI:SS') as 时间,
    LEFT(msg.value->>'content', 150) as 匹配内容
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE msg.value->>'content' ILIKE '%关键词%'
ORDER BY cl.created_at DESC
LIMIT 50;

-- ============================================
-- 使用提示
-- ============================================
-- 1. 在 Supabase Dashboard > SQL Editor 中运行
-- 2. 替换查询中的占位符（USERNAME、ID、关键词等）
-- 3. 可以根据需要调整 LIMIT 数量
-- ============================================

