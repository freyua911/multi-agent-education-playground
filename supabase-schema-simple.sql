-- 简化版 Supabase 表结构（不启用 RLS，适合快速设置）
-- 在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 前测问卷响应表
CREATE TABLE IF NOT EXISTS public.pretest_responses (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_id ON public.conversation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_session_id ON public.conversation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created_at ON public.conversation_logs(created_at);

-- 禁用 RLS（如果您的 API 使用 SERVICE_ROLE_KEY，推荐禁用 RLS）
ALTER TABLE public.pretest_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posttest_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs DISABLE ROW LEVEL SECURITY;

