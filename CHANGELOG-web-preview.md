# 网页内容展示功能优化

## 变更日期
2024年

## 问题描述
1. 卡片摘要显示原始CSS/JS代码
2. 预览区域内容展示不正确
3. 需要点击卡片才能打开预览

## 修改文件

### 1. scripts/scraper.js
**修改内容：**
- `parsePage()` 方法新增返回字段：
  - `textContent`: 清理后的纯文本（用于显示）
  - `excerpt`: 干净的摘要（用于卡片展示）
- 新增 `extractTextContent()` 方法：从DOM提取纯文本
- 新增 `deepCleanText()` 方法：深度清理文本，移除CSS/JS代码片段
- 新增 `generateExcerpt()` 方法：生成干净的摘要文本

**数据返回格式：**
```javascript
{
    title: '网页标题',
    content: '原始HTML内容',
    textContent: '清理后的纯文本',
    excerpt: '干净的摘要（最多150字）',
    description: 'meta描述',
    imageUrl: '封面图',
    sourceUrl: '原始URL'
}
```

### 2. scripts/db.js
**修改内容：**
- `addContent()` 方法：
  - 支持保存 `textContent` 字段
  - 支持保存 `markdown` 字段
  - 智能生成摘录：优先从 textContent 生成
- `updateContent()` 方法：
  - 支持更新时重新生成摘录
  - 优先从 textContent 重新生成
- `generateExcerpt()` 方法（完全重写）：
  - 支持HTML内容解析
  - 移除CSS/JS代码片段
  - 在句子边界智能截断
  - 代码比例检测，避免纯代码显示

### 3. scripts/renderer.v2.js
**修改内容：**
- `renderContentCard()` 方法：
  - 优先使用 `excerpt` 字段
  - 其次从 `textContent` 生成（最多100字）
  - 最后从 `content` 字段生成
- `renderPreview()` 方法（完全重写）：
  - **网页类型（bookmark）**：
    - 优先使用 `textContent` 显示
    - 分段显示文本内容
    - 提供"查看原文"按钮
    - 不渲染原始HTML
  - **文档类型（document）**：
    - 安全渲染HTML内容
    - 移除危险标签和属性
  - **笔记类型（note）**：
    - 纯文本分段显示
- 新增辅助方法：
  - `truncateText()`: 文本截断
  - `extractTextFromHtml()`: HTML提取纯文本
  - `splitIntoParagraphs()`: 文本分段
  - `sanitizeHtml()`: HTML安全清理

### 4. scripts/app.js
**修改内容：**
- `saveBookmark()` 方法：
  - 保存完整的抓取数据
  - 包含 `textContent` 和 `excerpt`
  - 保留 `markdown` 字段（可选）

### 5. styles/main.css
**新增样式：**
- `.preview-text-content`: 预览文本内容区域
- `.preview-truncated`: 内容截断提示
- `.preview-source`: 来源链接区域
- `.btn-open-source`: 查看原文按钮
- `.preview-actions`: 预览操作按钮
- `.source-link-btn`: 来源链接按钮样式

## 功能改进

### 卡片摘要
- 智能选择摘要来源：excerpt > textContent > content
- 移除所有CSS/JS代码片段
- 智能截断，最长100字符
- 卡片摘录显示3行

### 预览展示
- **网页收藏**：
  - 显示清理后的纯文本内容
  - 自动分段，每段约400字符
  - 最多显示15段
  - 顶部显示"查看原文"按钮
  - 点击按钮跳转到原始网页
- **文档**：
  - 安全渲染HTML
  - 移除危险内容
- **笔记**：
  - 纯文本分段显示

### 数据存储
保存时同时存储：
- `content`: 原始HTML内容
- `textContent`: 清理后的纯文本（用于展示）
- `excerpt`: 摘要（用于卡片）

## 注意事项
1. 旧数据不会自动更新，需重新抓取网页
2. 预览区不渲染原始HTML，避免样式冲突
3. 所有文本展示前都会经过清理处理
