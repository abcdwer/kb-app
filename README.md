# 个人知识库

一个简洁高效的個人文档和网页收藏管理工具，基于纯前端技术构建，支持离线使用。

## 功能特性

### 📄 文档管理
- 支持上传 Markdown (.md) 和 HTML (.html/.htm) 文档
- 拖拽上传功能，告别传统文件选择
- 自动解析文档内容，提取标题和正文

### 🔖 网页收藏
- 输入 URL 即可收藏网页内容
- 自动抓取标题、正文和图片
- 支持 CORS 代理，解决跨域问题
- 保留原始链接，方便回访原文

### 🏷️ 分类系统
- **标签分类**：支持多标签，可创建、编辑、删除标签，自定义颜色
- **时间分类**：自动按创建时间分组（今天、本周、本月、更早）
- **收藏夹**：可创建多个收藏夹，方便手动组织内容

### 📝 笔记功能
- 为每个文档/网页添加笔记注释
- 支持创建独立的笔记条目
- 完整的 Markdown 支持，所见即所得

### 🔍 项目分析器
- **上传方式**：支持文件夹上传和 .zip 压缩包自动解压
- **项目识别**：自动识别 Java、JavaScript/TypeScript、Python、Go 等项目类型
- **深度解析**：
  - Java: 解析类/接口结构、注解、Spring Boot 组件
  - 前端: 解析 Vue/React 组件、路由配置、状态管理
- **架构可视化**：生成 Mermaid 架构图和模块依赖关系图
- **AI 增强**：支持 OpenAI、Claude、通义千问、文心一言、Ollama 等 AI 接口
- **一键入库**：分析结果自动生成项目文档，可保存到知识库

### 💾 存储方案
- **本地优先**：使用 IndexedDB 存储所有数据，支持离线访问
- **云端同步**：支持 JSON 格式导出/导入，轻松备份和迁移
- **预留接口**：可自行扩展云端存储（如 Supabase）

### 🎨 界面设计
- 简洁现代的设计风格
- 三栏布局：侧边栏导航 + 内容列表 + 预览面板
- 响应式设计，支持移动端访问
- 明暗主题自由切换

## 快速开始

### 直接使用（推荐）

1. 下载或克隆项目到本地
2. 直接用浏览器打开 `index.html` 即可使用

> ⚠️ 注意：由于浏览器安全限制，部分功能（如网页抓取）可能需要通过本地服务器访问才能正常工作。

### 本地服务器

#### 使用 Python（推荐）

```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

然后访问 http://localhost:8080

#### 使用 Node.js

```bash
npx serve .
```

#### 使用 VS Code Live Server

安装 "Live Server" 扩展，右键点击 `index.html` 选择 "Open with Live Server"

## 部署指南

### Vercel 部署

1. 创建 GitHub 仓库并上传代码
2. 登录 [Vercel](https://vercel.com)
3. 导入项目仓库
4. 点击 Deploy 即可

> Vercel 会自动识别静态网站，无需额外配置

### Netlify 部署

1. 创建 GitHub 仓库并上传代码
2. 登录 [Netlify](https://netlify.com)
3. 点击 "Add new site" → "Import an existing project"
4. 选择仓库，点击 Deploy

### Docker 部署

项目包含 Dockerfile，可使用以下命令构建和运行：

```bash
# 构建镜像
docker build -t knowledge-base .

# 运行容器
docker run -d -p 8080:80 --name knowledge-base knowledge-base

# 访问 http://localhost:8080
```

### 静态文件部署

项目所有文件都是静态的，可以部署到任何静态托管服务：
- GitHub Pages
- Cloudflare Pages
- 阿里云 OSS
- 腾讯云 COS
- 等等...

## 网页抓取说明

由于浏览器同源策略限制，直接使用 JavaScript 抓取外部网页可能会失败。提供以下解决方案：

### 方案一：使用前端 CORS 代理（默认）

应用内置了多个免费的 CORS 代理服务：
- **allorigins** - 默认选项，稳定可靠
- **cors-anywhere** - 需要临时授权
- **corsproxy** - 备用选项

勾选"使用 CORS 代理"即可启用。

### 方案二：部署后端代理

如果需要更稳定的服务，可以部署后端代理服务：

```bash
cd server
npm install
node proxy.js
```

然后在应用中配置自定义代理地址。

## 数据备份

### 导出数据

1. 点击右上角"导出"按钮
2. 选择保存位置
3. 生成 `.json` 格式的备份文件

### 导入数据

1. 点击右上角"导入"按钮
2. 选择之前导出的 `.json` 文件
3. 确认覆盖现有数据

> ⚠️ 警告：导入会覆盖所有现有数据，请谨慎操作

## 技术架构

### 前端技术
- **HTML5 + CSS3 + JavaScript**：纯原生代码，无框架依赖
- **IndexedDB**：本地数据库，支持离线存储
- **Marked.js**：Markdown 解析
- **Highlight.js**：代码高亮

### 文件结构

```
知识库/
├── index.html              # 主页面
├── styles/
│   ├── main.css            # 主样式
│   ├── components.css      # 组件样式
│   └── analyzer.css        # 项目分析器样式
├── scripts/
│   ├── db.js               # 数据库模块
│   ├── utils.js            # 工具函数
│   ├── scraper.js          # 网页抓取
│   ├── renderer.js         # 渲染模块
│   ├── app.js              # 主应用
│   └── analyzer/           # 项目分析器模块
│       ├── analyzer.js     # 分析器主模块
│       ├── parser-java.js  # Java 代码解析
│       ├── parser-js.js    # JavaScript 解析
│       ├── ai-service.js   # AI 服务调用
│       └── ui.js           # 分析器 UI
├── assets/                 # 静态资源
├── server/
│   ├── proxy.js            # 后端代理服务
│   └── package.json        # 依赖配置
└── README.md               # 使用说明
```

## 浏览器兼容性

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13.1+ |
| Edge | 80+ |

> 不支持 IE 浏览器

## 项目分析器使用指南

### 快速开始

1. 点击顶部导航栏的 **"项目分析"** 按钮
2. 将项目文件夹拖拽到上传区域，或点击选择文件
3. 支持上传 `.zip` 压缩包，会自动解压
4. 点击 **"开始分析"** 按钮进行分析

### 支持的项目类型

| 类型 | 检测方式 | 分析内容 |
|------|----------|----------|
| Java | pom.xml, build.gradle | 类/接口结构、注解、Spring Boot 组件 |
| JavaScript/TypeScript | package.json, tsconfig.json | Vue/React 组件、路由、API 调用 |
| Python | requirements.txt, setup.py | 模块结构、依赖关系 |
| Go | go.mod | 包结构、依赖关系 |

### AI 功能配置

项目分析器支持 AI 增强分析，可以自动生成项目概述、设计模式识别等。

1. 点击 AI 状态指示器（显示"未配置"）
2. 选择 AI 服务商：
   - **OpenAI**: GPT-3.5/GPT-4
   - **Claude**: Anthropic Claude
   - **通义千问**: 阿里云
   - **文心一言**: 百度
   - **Ollama**: 本地大模型
   - **LM Studio**: 本地大模型
3. 填写 API Key（如需要）
4. 点击 **"测试连接"** 验证配置
5. 点击 **"保存配置"**

> 💡 提示：Ollama 和 LM Studio 是本地部署方案，无需 API Key

### 分析结果

分析完成后会自动生成 Markdown 格式的项目文档，包含：

- **项目概览**: 名称、类型、规模统计
- **目录结构**: 可视化项目树
- **技术架构图**: Mermaid 格式架构图
- **模块说明**: 各模块/包功能描述
- **核心代码**: 关键类/组件说明
- **依赖关系**: 模块依赖图
- **AI 分析**: 智能解读和建议

点击 **"保存到知识库"** 可将分析结果存入知识库。

### 本地服务器要求

由于浏览器安全限制，部分功能需要通过本地服务器访问：

```bash
# 使用 Python
python -m http.server 8080

# 使用 Node.js
npx serve .
```

## 常见问题

### Q: 数据存储在哪里？
A: 所有数据存储在浏览器的 IndexedDB 中，不会上传到任何服务器。

### Q: 如何清除所有数据？
A: 可以使用浏览器开发者工具清除站点数据，或者导入空白数据覆盖。

### Q: 如何转移数据到另一台设备？
A: 使用导出功能生成备份文件，然后在目标设备上导入即可。

### Q: 网页抓取失败怎么办？
A: 
1. 确认网址可访问
2. 尝试更换 CORS 代理
3. 部分网站有防爬措施，可能无法抓取

### Q: 如何自定义样式？
A: 可以修改 `styles/` 目录下的 CSS 文件。

## 更新日志

### v1.0.0 (2024)
- 初始版本发布
- 支持文档上传和网页收藏
- 标签和收藏夹分类
- 笔记功能
- 全文搜索
- 明暗主题切换

## 许可证

MIT License

---

如果你觉得这个项目有用，请给个 ⭐️
