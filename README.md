# Education Game

一个基于Bloom分类法的教育小游戏，通过对话学习的方式帮助学生完成6个不同层次的学习任务。

## 功能特点

- 🌍 支持中文和英文两种语言
- 👨‍🏫 两个AI角色：老师和同伴，使用DeepSeek API驱动
- 📚 基于Bloom分类法的6个学习阶段任务
- 💬 实时对话交互
- 📊 任务评分系统
- 📝 完整的对话记录和JSON导出功能

## 安装和运行

1. 安装依赖：
```bash
npm install
```

2. 配置DeepSeek API密钥：
创建 `.env` 文件，添加：
```
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

3. 启动开发服务器：
```bash
npm run dev
```

4. 构建生产版本：
```bash
npm run build
```

## 游戏说明

### Bloom的6个学习阶段

1. **记忆 (Remember)** - 回忆和识别信息
2. **理解 (Understand)** - 理解概念和意义
3. **应用 (Apply)** - 应用知识解决问题
4. **分析 (Analyze)** - 分析信息和结构
5. **评估 (Evaluate)** - 评估和判断
6. **创造 (Create)** - 创造新内容

### 游戏流程

1. 选择语言（中文/英文）
2. 选择角色开始对话（老师/同伴）
3. 与AI角色对话学习
4. 回答老师提出的问题
5. 完成所有6个任务（每个任务得分≥6分）
6. 导出游戏记录（JSON格式）

## 技术栈

- React 18
- Vite
- DeepSeek API

## 项目结构

```
multi-agent-platform/
├── src/
│   ├── components/
│   │   ├── LanguageSelector.jsx
│   │   ├── LanguageSelector.css
│   │   ├── Game.jsx
│   │   └── Game.css
│   ├── utils/
│   │   ├── api.js
│   │   └── tasks.js
│   ├── styles/
│   │   └── App.css
│   ├── App.jsx
│   └── main.jsx
├── background.png
├── package.json
├── vite.config.js
└── README.md
```

