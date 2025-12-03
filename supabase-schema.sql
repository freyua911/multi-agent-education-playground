-- Supabase 数据库表结构定义
-- 请在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- 1. 前测问卷响应表
CREATE TABLE IF NOT EXISTS public.pretest_responses (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 user_id 创建索引以便快速查询
CREATE INDEX IF NOT EXISTS idx_pretest_responses_user_id ON public.pretest_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_pretest_responses_created_at ON public.pretest_responses(created_at);

-- 2. 后测问卷响应表
CREATE TABLE IF NOT EXISTS public.posttest_responses (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 user_id 创建索引以便快速查询
CREATE INDEX IF NOT EXISTS idx_posttest_responses_user_id ON public.posttest_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_posttest_responses_created_at ON public.posttest_responses(created_at);

-- 3. 对话日志表
CREATE TABLE IF NOT EXISTS public.conversation_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    payload JSONB NOT NULL,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 user_id 和 session_id 创建索引
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_id ON public.conversation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_session_id ON public.conversation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created_at ON public.conversation_logs(created_at);

-- 启用 Row Level Security (RLS) - 如果需要的话
-- 注意：根据您的需求，您可能需要调整这些策略

-- 允许匿名用户插入数据（用于问卷和日志）
ALTER TABLE public.pretest_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posttest_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有用户插入数据
CREATE POLICY "Allow anonymous insert on pretest_responses"
    ON public.pretest_responses
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on posttest_responses"
    ON public.posttest_responses
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on conversation_logs"
    ON public.conversation_logs
    FOR INSERT
    WITH CHECK (true);

-- 如果需要允许服务角色（backend）读取所有数据，可以创建以下策略：
-- 注意：这些策略使用 auth.role()，只有在启用 Supabase Auth 时才有效
-- 如果没有使用 Auth，可能需要使用不同的方法或暂时禁用 RLS

-- 如果您的应用不需要 RLS（例如，只通过服务角色密钥访问），可以禁用 RLS：
-- ALTER TABLE public.pretest_responses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.posttest_responses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conversation_logs DISABLE ROW LEVEL SECURITY;

