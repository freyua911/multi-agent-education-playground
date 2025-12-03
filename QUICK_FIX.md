# 快速修复：表不存在错误

## ⚡ 3 步快速解决

### 步骤 1：在 Supabase 中创建表

1. **打开 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择您的项目

2. **运行 SQL 脚本**
   - 点击左侧菜单 **"SQL Editor"**
   - 点击 **"New query"**
   - 复制以下 SQL 代码并粘贴：

```sql
-- 创建前测问卷表
CREATE TABLE IF NOT EXISTS public.pretest_responses (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pretest_responses_user_id ON public.pretest_responses(user_id);

-- 创建后测问卷表
CREATE TABLE IF NOT EXISTS public.posttest_responses (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT,
    responses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posttest_responses_user_id ON public.posttest_responses(user_id);

-- 创建对话日志表
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

-- 禁用 RLS（如果需要）
ALTER TABLE public.pretest_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posttest_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs DISABLE ROW LEVEL SECURITY;
```

3. **执行 SQL**
   - 点击 **"Run"** 按钮（或按 `Cmd+Enter` / `Ctrl+Enter`）
   - 确认没有错误信息

### 步骤 2：验证表已创建

在 Supabase Dashboard 中：
- 点击左侧菜单 **"Table Editor"**
- 您应该看到三个表：
  - ✅ `pretest_responses`
  - ✅ `posttest_responses`
  - ✅ `conversation_logs`

### 步骤 3：测试

1. **等待 10-30 秒**（让 Supabase 更新缓存）
2. **重新尝试保存问卷**
3. 如果还有问题，访问诊断端点：
   ```
   https://your-project.vercel.app/api/check-tables
   ```

---

## 🔍 如果仍然失败

### 检查环境变量

在 Vercel Dashboard 中确认：
1. 进入项目 → **Settings** → **Environment Variables**
2. 确认已设置：
   - `SUPABASE_URL` - 您的 Supabase 项目 URL
   - `SUPABASE_SERVICE_ROLE_KEY` - 您的 Service Role Key

**如何获取这些值：**
- 在 Supabase Dashboard → **Settings** → **API**
- **Project URL** = `SUPABASE_URL`
- **service_role key** = `SUPABASE_SERVICE_ROLE_KEY`

### 重新部署

修改环境变量后：
- Vercel 会自动重新部署，或
- 手动触发：**Deployments** → 点击三个点 → **Redeploy**

---

## 📞 需要更多帮助？

查看详细指南：
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - 完整设置说明
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 详细故障排查

