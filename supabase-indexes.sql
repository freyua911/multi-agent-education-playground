-- ============================================
-- Supabase 对话日志表索引优化
-- 用于加速常用查询，建议在创建表后运行
-- ============================================

-- 注意：如果表中已有大量数据，创建索引可能需要一些时间

-- ============================================
-- 基础索引（如果表已创建，这些索引可能已存在）
-- ============================================

-- user_id 索引（用于按用户查询）
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_id 
ON public.conversation_logs(user_id);

-- session_id 索引（用于按会话查询）
CREATE INDEX IF NOT EXISTS idx_conversation_logs_session_id 
ON public.conversation_logs(session_id);

-- created_at 索引（用于按时间排序和过滤）
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created_at 
ON public.conversation_logs(created_at DESC);

-- ============================================
-- 组合索引（提升多条件查询性能）
-- ============================================

-- 用户 + 时间的组合索引
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_created 
ON public.conversation_logs(user_id, created_at DESC);

-- ============================================
-- JSON 字段索引（用于 JSON 查询优化）
-- ============================================

-- 索引 payload 中的 totalTurns 字段（GIN 索引用于 JSON 查询）
CREATE INDEX IF NOT EXISTS idx_conversation_logs_payload_gin 
ON public.conversation_logs USING GIN (payload);

-- 索引 meta 字段（用于语言等元数据查询）
CREATE INDEX IF NOT EXISTS idx_conversation_logs_meta_gin 
ON public.conversation_logs USING GIN (meta);

-- 如果经常按语言查询，可以创建表达式索引
CREATE INDEX IF NOT EXISTS idx_conversation_logs_language 
ON public.conversation_logs((meta->>'language')) 
WHERE meta->>'language' IS NOT NULL;

-- ============================================
-- 查看索引状态
-- ============================================

-- 查看 conversation_logs 表的所有索引
-- SELECT
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE tablename = 'conversation_logs'
-- ORDER BY indexname;

-- ============================================
-- 性能监控查询
-- ============================================

-- 查看表统计信息
-- SELECT 
--     schemaname,
--     tablename,
--     n_live_tup as row_count,
--     n_dead_tup as dead_rows,
--     last_vacuum,
--     last_autovacuum,
--     last_analyze,
--     last_autoanalyze
-- FROM pg_stat_user_tables
-- WHERE tablename = 'conversation_logs';

-- ============================================
-- 使用说明
-- ============================================
-- 
-- 1. 这些索引可以显著提升查询性能
-- 2. 索引会占用额外的存储空间
-- 3. 索引会在数据插入/更新时自动维护（轻微影响写入性能）
-- 4. 如果表很大，创建索引可能需要几分钟
-- 5. 建议在业务低峰期创建索引
-- 
-- 如何运行：
-- 1. 在 Supabase Dashboard > SQL Editor 中运行
-- 2. 创建索引时会自动检查是否已存在（使用 IF NOT EXISTS）
-- ============================================

