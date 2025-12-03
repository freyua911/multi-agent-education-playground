# 故障排查指南

## 问题：表不存在错误

如果遇到以下错误：
```
Could not find the table 'public.pretest_responses' in the schema cache
```

## 快速诊断步骤

### 1. 检查环境变量

访问 Vercel Dashboard：
1. 进入您的项目
2. 点击 "Settings" → "Environment Variables"
3. 确认以下变量已设置：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` 或 `SUPABASE_ANON_KEY`

### 2. 使用诊断 API 检查表

部署后，访问以下 URL 来检查表是否存在：
```
https://your-project.vercel.app/api/check-tables
```

或者在本地开发时：
```
http://localhost:3000/api/check-tables
```

这个端点会显示：
- 哪些表存在
- 哪些表缺失
- 具体的错误信息

### 3. 在 Supabase 中创建表

#### 方法 A：使用 SQL Editor（推荐）

1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择您的项目

2. **打开 SQL Editor**
   - 左侧菜单 → "SQL Editor"
   - 点击 "New query"

3. **复制并运行 SQL**
   - 打开项目中的 `supabase-schema-simple.sql` 文件
   - 复制全部内容
   - 粘贴到 SQL Editor
   - 点击 "Run" 或按 `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

4. **验证表已创建**
   - 点击左侧菜单的 "Table Editor"
   - 您应该看到三个表：
     - ✅ `pretest_responses`
     - ✅ `posttest_responses`
     - ✅ `conversation_logs`

#### 方法 B：使用 Table Editor（图形界面）

1. 在 Supabase Dashboard 中点击 "Table Editor"
2. 点击 "New table"
3. 创建每个表（需要手动配置字段）：

**pretest_responses 表：**
- `id` (bigint, primary key, auto increment)
- `user_id` (text, not null)
- `language` (text, nullable)
- `responses` (jsonb, default '{}')
- `created_at` (timestamptz, default now())

**posttest_responses 表：**
- 同 pretest_responses 的结构

**conversation_logs 表：**
- `id` (bigint, primary key, auto increment)
- `user_id` (text, nullable)
- `session_id` (text, nullable)
- `payload` (jsonb, not null)
- `meta` (jsonb, nullable)
- `created_at` (timestamptz, default now())

### 4. 检查 Vercel 部署

确认 API 路由正常工作：

1. **查看 Vercel 函数日志**
   - Vercel Dashboard → 您的项目 → "Deployments"
   - 点击最新的部署
   - 查看 "Functions" 标签页中的日志

2. **测试 API 端点**
   ```bash
   # 测试诊断端点
   curl https://your-project.vercel.app/api/check-tables
   
   # 测试保存端点（需要 POST 请求）
   curl -X POST https://your-project.vercel.app/api/save-pretest \
     -H "Content-Type: application/json" \
     -d '{"username":"test","responses":{}}'
   ```

### 5. 常见问题

#### 问题：环境变量未生效

**解决：**
- 在 Vercel 中修改环境变量后，需要重新部署
- 或者手动触发重新部署

#### 问题：使用了错误的 Supabase 项目

**检查：**
- 确认 `SUPABASE_URL` 指向正确的项目
- 在 Supabase Dashboard 的 Settings → API 中核对 URL

#### 问题：权限错误

**解决：**
- 如果使用 `SUPABASE_SERVICE_ROLE_KEY`，确保已禁用 RLS
- 运行以下 SQL 禁用 RLS：
  ```sql
  ALTER TABLE public.pretest_responses DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.posttest_responses DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.conversation_logs DISABLE ROW LEVEL SECURITY;
  ```

#### 问题：表在 Supabase 中已存在，但仍报错

**可能原因：**
1. **缓存问题** - Supabase 有时需要几秒钟来更新 schema 缓存
   - 等待 10-30 秒后重试
   
2. **Schema 名称问题** - 确认表在 `public` schema 中
   - 在 Supabase SQL Editor 中运行：
     ```sql
     SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('pretest_responses', 'posttest_responses', 'conversation_logs');
     ```

3. **连接到了错误的数据库**
   - 确认环境变量 `SUPABASE_URL` 正确

## 获取帮助

如果问题仍然存在，请提供以下信息：

1. 诊断 API 的输出：`/api/check-tables` 的响应
2. Vercel 函数日志
3. Supabase Dashboard 中 Table Editor 的截图
4. 环境变量配置（隐藏敏感值）

