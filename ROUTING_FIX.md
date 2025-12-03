# 路由修复说明 / Routing Fix Guide

## 问题 / Issues

1. **刷新页面后显示404错误** / Refresh page shows 404 error
2. **希望刷新后保留当前界面** / Keep current page after refresh
3. **禁用浏览器前进后退功能** / Disable browser forward/back buttons

## 解决方案 / Solutions

### 1. 修复刷新404问题 / Fix Refresh 404

创建了 `vercel.json` 配置文件，将所有路由请求重定向到 `index.html`，这样无论用户访问哪个路径，都会加载React应用，然后由React Router处理路由。

**文件：`vercel.json`**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

这个配置会在Vercel部署时生效。如果你使用其他平台部署，需要类似的配置：
- **Netlify**: 创建 `_redirects` 文件，内容：`/*    /index.html   200`
- **Apache**: 创建 `.htaccess` 文件，添加重写规则
- **Nginx**: 在配置中添加 `try_files $uri $uri/ /index.html;`

### 2. 刷新后保留状态 / Preserve State After Refresh

在 `App.jsx` 中添加了 localStorage 支持，会自动保存和恢复：
- 语言选择 (`app_language`)
- 用户名 (`app_username`)

这样刷新页面后，用户不需要重新选择语言和输入用户名。

**代码位置：** `src/App.jsx`

### 3. 禁用前进后退 / Disable Forward/Back Navigation

创建了 `disableBrowserNavigation` 工具函数来阻止浏览器前进后退按钮。

**实现方式：**
- 监听 `popstate` 事件（用户点击前进/后退时触发）
- 立即将URL恢复到当前路径
- 在历史栈中push多个状态，防止后退

**文件：** `src/utils/disableNavigation.js`

**注意：** 这个功能使用了浏览器历史API，可能无法完全阻止所有浏览器的所有前进后退操作，但能有效防止大多数意外跳转。

## 部署说明 / Deployment Notes

### Vercel部署
1. 确保 `vercel.json` 文件在项目根目录
2. 部署后，所有路由都会被重定向到 `index.html`
3. 刷新任何路径都不会出现404

### 本地开发
Vite开发服务器默认已经处理了这个问题，所以本地开发时刷新页面应该正常工作。

如果遇到问题，可以在 `vite.config.js` 中添加：
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true
  }
})
```

## 测试 / Testing

1. **测试刷新功能：**
   - 导航到任意页面（如 `/game`, `/test`）
   - 按F5或点击浏览器刷新按钮
   - 应该保持在当前页面，不出现404

2. **测试状态保留：**
   - 选择语言和输入用户名
   - 刷新页面
   - 应该自动恢复语言和用户名

3. **测试禁用前进后退：**
   - 导航到不同页面
   - 尝试点击浏览器的后退按钮
   - 应该无法后退或立即返回当前页面

## 文件清单 / File List

- `vercel.json` - Vercel路由配置（新增）
- `src/utils/disableNavigation.js` - 禁用导航工具（新增）
- `src/App.jsx` - 添加了状态保存和禁用导航功能（修改）

## 注意事项 / Notes

1. localStorage存储的数据在用户清除浏览器数据后会被删除
2. 禁用前进后退功能可能无法在所有浏览器中完美工作
3. 如果使用其他部署平台，需要相应的路由配置

