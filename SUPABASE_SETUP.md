# Supabase 数据库设置指南

## 问题说明

如果遇到以下错误：
```
Could not find the table 'public.pretest_responses' in the schema cache
```

说明 Supabase 数据库中还没有创建相应的数据表。

## 解决步骤

### 1. 登录 Supabase Dashboard

访问您的 Supabase 项目：https://supabase.com/dashboard

### 2. 打开 SQL Editor

1. 在左侧菜单中点击 "SQL Editor"
2. 点击 "New query" 创建新查询

### 3. 运行 SQL 脚本

打开项目根目录下的 `supabase-schema.sql` 文件，复制全部内容，粘贴到 SQL Editor 中，然后点击 "Run" 执行。

或者直接执行以下 SQL（简化版，不启用 RLS）：

```sql
-- 1. 前测问卷响应表
CREATE TABLE IF NOT EXISTS public.pretest_responses (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pretest_responses_user_id ON public.pretest_responses(user_id);

-- 2. 后测问卷响应表
CREATE TABLE IF NOT EXISTS public.posttest_responses (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posttest_responses_user_id ON public.posttest_responses(user_id);

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
```

### 4. 禁用 Row Level Security (RLS)（推荐用于开发/测试）

如果您的 API 使用 SERVICE_ROLE_KEY，并且不需要行级安全，可以在 SQL Editor 中执行：

```sql
ALTER TABLE public.pretest_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posttest_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs DISABLE ROW LEVEL SECURITY;
```

### 5. 验证表已创建

在 Supabase Dashboard 中：
1. 点击左侧菜单的 "Table Editor"
2. 您应该能看到三个表：
   - `pretest_responses`
   - `posttest_responses`
   - `conversation_logs`

## 环境变量配置

确保您的 Vercel 环境变量中配置了以下变量：

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  (推荐使用这个)
# 或者
SUPABASE_ANON_KEY=your_anon_key
```

### 如何获取这些值：

1. 在 Supabase Dashboard 中，点击左侧菜单的 "Settings"
2. 点击 "API"
3. 您会看到：
   - **Project URL** → 这是 `SUPABASE_URL`
   - **anon/public key** → 这是 `SUPABASE_ANON_KEY`
   - **service_role key** → 这是 `SUPABASE_SERVICE_ROLE_KEY`（注意：这个密钥有完整权限，不要在前端暴露）

### 在 Vercel 中配置环境变量：

1. 进入您的 Vercel 项目
2. 点击 "Settings" → "Environment Variables"
3. 添加上述变量
4. 重新部署项目

## 故障排查

### 问题 1：仍然报错 "table not found"

- 确认 SQL 脚本已成功执行（检查是否有错误信息）
- 在 Table Editor 中确认表已创建
- 确认环境变量 `SUPABASE_URL` 指向正确的项目

### 问题 2：权限错误

- 如果使用 `SUPABASE_SERVICE_ROLE_KEY`，确保已禁用 RLS 或配置了适当的策略
- 如果使用 `SUPABASE_ANON_KEY`，需要启用并配置 RLS 策略

### 问题 3：表存在但无法插入数据

- 检查 RLS 策略是否允许插入
- 检查字段类型是否匹配（特别是 JSONB 字段）

## 完成！

完成以上步骤后，您的应用应该能够正常保存问卷和日志数据了。

