# Supabase 对话日志查询指南

## 📚 文件说明

本目录包含多个 SQL 查询文件，帮助您在 Supabase 中查看和分析对话日志：

### 1. **supabase-quick-queries.sql** ⭐ 推荐新手
- 包含最常用的查询
- 每个查询都有中文注释
- 适合快速查看对话日志

### 2. **supabase-conversation-queries.sql** 📊 完整版
- 包含 8 大类、30+ 个查询
- 覆盖基础查询、统计分析、搜索等
- 适合深入分析数据

### 3. **supabase-indexes.sql** ⚡ 性能优化
- 创建索引以加速查询
- 建议在表创建后运行一次
- 可以显著提升查询速度

## 🚀 快速开始

### 步骤 1：运行性能优化（可选但推荐）

```sql
-- 在 Supabase SQL Editor 中运行
-- 打开 supabase-indexes.sql，复制全部内容并执行
```

### 步骤 2：查看最近对话

打开 `supabase-quick-queries.sql`，复制第一个查询：

```sql
SELECT 
    id,
    user_id,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as 创建时间,
    (payload->>'totalTurns')::int as 消息数量,
    meta->>'language' as 语言
FROM conversation_logs
ORDER BY created_at DESC
LIMIT 20;
```

在 Supabase Dashboard > SQL Editor 中运行。

## 📖 常用查询示例

### 查看特定用户的所有对话

```sql
-- 替换 'USERNAME' 为实际用户名
SELECT 
    id,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as 创建时间,
    (payload->>'totalTurns')::int as 消息数量
FROM conversation_logs
WHERE user_id = 'USERNAME'
ORDER BY created_at DESC;
```

### 查看完整对话内容

```sql
-- 替换 123 为实际的日志 ID
SELECT 
    msg.value->>'role' as 角色,
    msg.value->>'agentType' as AI类型,
    msg.value->>'content' as 消息内容,
    msg.value->>'timestamp' as 时间
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE cl.id = 123
ORDER BY msg.value->>'timestamp';
```

### 搜索包含关键词的对话

```sql
-- 替换 '关键词' 为要搜索的内容
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
```

### 每日对话统计

```sql
SELECT 
    DATE(created_at) as 日期,
    COUNT(*) as 对话数量,
    COUNT(DISTINCT user_id) as 用户数量
FROM conversation_logs
GROUP BY DATE(created_at)
ORDER BY 日期 DESC
LIMIT 30;
```

## 🔍 数据结构说明

### conversation_logs 表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGSERIAL | 主键，自动递增 |
| `user_id` | TEXT | 用户 ID |
| `session_id` | TEXT | 会话 ID |
| `payload` | JSONB | 完整对话数据 |
| `meta` | JSONB | 元数据（语言、版本等） |
| `created_at` | TIMESTAMPTZ | 创建时间 |

### payload 字段结构

```json
{
  "generatedAt": "2024-01-01T12:00:00.000Z",
  "totalTurns": 50,
  "conversationHistory": [
    {
      "role": "user",
      "content": "用户消息",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "agentType": null
    },
    {
      "role": "assistant",
      "content": "AI回复",
      "timestamp": "2024-01-01T12:00:01.000Z",
      "agentType": "teacher"
    }
  ],
  "classroomConversation": [...],
  "testConversation": [...],
  "testHistory": [...],
  "feedbackHistory": [...]
}
```

### agentType 可能的值

- `teacher` - 老师
- `peer` - 同伴
- `examiner` - 考官
- `feedback` - 反馈
- `librarian` - 图书管理员
- `mindmap` - 思维导图
- `evaluator` - 评估者

## 💡 使用技巧

### 1. 查找日志 ID

如果您知道用户名和时间，可以先运行：

```sql
SELECT id, created_at
FROM conversation_logs
WHERE user_id = 'USERNAME'
ORDER BY created_at DESC;
```

### 2. 限制结果数量

对于可能返回大量结果的查询，记得添加 `LIMIT`：

```sql
-- 只返回前 50 条
LIMIT 50;
```

### 3. JSON 查询性能

JSON 字段查询可能较慢，建议：
- 使用索引（运行 `supabase-indexes.sql`）
- 添加合适的 WHERE 条件缩小范围
- 使用 `LIMIT` 限制结果

### 4. 时间范围查询

```sql
-- 查询最近 7 天的数据
WHERE created_at >= NOW() - INTERVAL '7 days'

-- 查询特定日期范围
WHERE created_at >= '2024-01-01'::date
  AND created_at < '2024-01-31'::date
```

## 📊 分析场景

### 场景 1：查看用户的学习进度

```sql
-- 查看某个用户的对话数量和测试记录
SELECT 
    cl.id,
    cl.created_at,
    jsonb_array_length(COALESCE(cl.payload->'testHistory', '[]'::jsonb)) as 测试数量
FROM conversation_logs cl
WHERE cl.user_id = 'USERNAME'
ORDER BY cl.created_at;
```

### 场景 2：分析 AI 角色使用情况

```sql
-- 统计不同 AI 角色的使用频率
SELECT 
    msg.value->>'agentType' as AI类型,
    COUNT(*) as 使用次数
FROM conversation_logs cl,
     jsonb_array_elements(COALESCE(cl.payload->'conversationHistory', '[]'::jsonb)) as msg
WHERE msg.value->>'agentType' IS NOT NULL
GROUP BY msg.value->>'agentType'
ORDER BY 使用次数 DESC;
```

### 场景 3：导出数据用于分析

```sql
-- 导出为 JSON 格式（可以复制结果用于后续分析）
SELECT 
    jsonb_build_object(
        'user_id', user_id,
        'created_at', created_at,
        'payload', payload
    ) as data
FROM conversation_logs
WHERE user_id = 'USERNAME'
ORDER BY created_at;
```

## ⚠️ 注意事项

1. **隐私保护**：对话日志可能包含敏感信息，请谨慎分享查询结果

2. **查询性能**：大型 JSON 查询可能较慢，建议：
   - 先添加索引
   - 使用 LIMIT 限制结果
   - 添加时间范围过滤

3. **数据备份**：在进行数据删除或修改操作前，建议先备份

4. **权限管理**：确保只有授权人员可以访问对话日志

## 🆘 遇到问题？

1. **查询很慢**
   - 运行 `supabase-indexes.sql` 创建索引
   - 添加更多的过滤条件
   - 使用 LIMIT 限制结果

2. **找不到数据**
   - 检查 user_id 拼写是否正确
   - 确认时间范围是否合理
   - 查看表是否为空：`SELECT COUNT(*) FROM conversation_logs;`

3. **JSON 查询错误**
   - 检查 JSON 路径是否正确
   - 使用 `COALESCE` 处理 NULL 值
   - 确认字段存在：`SELECT payload->'conversationHistory' FROM conversation_logs LIMIT 1;`

## 📝 更多资源

- [Supabase 官方文档](https://supabase.com/docs)
- [PostgreSQL JSON 函数文档](https://www.postgresql.org/docs/current/functions-json.html)
- 完整查询列表：查看 `supabase-conversation-queries.sql`

---

**提示**：建议将常用的查询保存到 Supabase Dashboard 的 SQL Editor 中，方便下次直接使用！

