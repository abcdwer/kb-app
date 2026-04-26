/**
 * 项目分析器 UI 模块
 * 处理上传、界面交互和结果展示
 */

class AnalyzerUI {
    constructor() {
        this.analyzer = new ProjectAnalyzer();
        this.aiService = typeof AIService !== 'undefined' ? new AIService() : null;
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        
        // DOM 元素
        this.elements = {};
    }

    /**
     * 初始化
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.checkAIService();
    }

    /**
     * 缓存 DOM 元素
     */
    cacheElements() {
        this.elements = {
            analyzerBtn: document.getElementById('analyzerBtn'),
            analyzerModal: document.getElementById('analyzerModal'),
            analyzerPanel: document.getElementById('analyzerPanel'),
            aiConfigModal: document.getElementById('aiConfigModal'),
            dropZone: document.getElementById('analyzerDropZone'),
            fileInput: document.getElementById('analyzerFileInput'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            saveToKnowledgeBtn: document.getElementById('saveToKnowledgeBtn'),
            progressBar: document.getElementById('analyzerProgress'),
            progressText: document.getElementById('analyzerProgressText'),
            analysisResult: document.getElementById('analysisResult'),
            projectTree: document.getElementById('projectTree'),
            architectureDiagram: document.getElementById('architectureDiagram'),
            aiStatus: document.getElementById('aiStatus'),
            aiConfigBtn: document.getElementById('aiConfigBtn')
        };
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 打开分析器
        if (this.elements.analyzerBtn) {
            this.elements.analyzerBtn.addEventListener('click', () => this.showModal());
        }

        // 拖放上传
        if (this.elements.dropZone) {
            this.elements.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.dropZone.classList.add('dragover');
            });
            
            this.elements.dropZone.addEventListener('dragleave', () => {
                this.elements.dropZone.classList.remove('dragover');
            });
            
            this.elements.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.dropZone.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });
        }

        // 点击选择文件
        if (this.elements.dropZone) {
            this.elements.dropZone.addEventListener('click', () => {
                this.elements.fileInput.click();
            });
        }

        // 文件选择
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        // 开始分析
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.addEventListener('click', () => this.startAnalysis());
        }

        // 保存到知识库
        if (this.elements.saveToKnowledgeBtn) {
            this.elements.saveToKnowledgeBtn.addEventListener('click', () => this.saveToKnowledgeBase());
        }

        // AI 配置
        if (this.elements.aiConfigBtn) {
            this.elements.aiConfigBtn.addEventListener('click', () => this.showAIConfig());
        }

        // 模态框关闭
        this.bindModalClose();
    }

    /**
     * 绑定模态框关闭
     */
    bindModalClose() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    /**
     * 显示模态框
     */
    showModal(modalId = 'analyzerModal') {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * 隐藏模态框
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * 检查 AI 服务状态
     */
    checkAIService() {
        if (this.elements.aiStatus) {
            if (this.aiService.isConfigured()) {
                this.elements.aiStatus.innerHTML = `
                    <span class="ai-status-dot configured"></span>
                    AI 已配置 (${this.aiService.config.provider})
                `;
                this.elements.aiStatus.classList.add('configured');
            } else {
                this.elements.aiStatus.innerHTML = `
                    <span class="ai-status-dot unconfigured"></span>
                    AI 未配置
                `;
                this.elements.aiStatus.classList.remove('configured');
            }
        }
    }

    /**
     * 显示 AI 配置面板
     */
    showAIConfig() {
        this.showModal('aiConfigModal');
        this.renderAIConfig();
    }

    /**
     * 渲染 AI 配置界面
     */
    renderAIConfig() {
        const container = document.getElementById('aiConfigForm');
        if (!container) return;

        const config = this.aiService.getConfig();

        container.innerHTML = `
            <div class="form-group">
                <label for="aiProvider">AI 服务商</label>
                <select id="aiProvider" class="form-control">
                    <option value="openai" ${config.provider === 'openai' ? 'selected' : ''}>OpenAI (GPT)</option>
                    <option value="claude" ${config.provider === 'claude' ? 'selected' : ''}>Claude (Anthropic)</option>
                    <option value="qwen" ${config.provider === 'qwen' ? 'selected' : ''}>通义千问 (阿里)</option>
                    <option value="wenxin" ${config.provider === 'wenxin' ? 'selected' : ''}>文心一言 (百度)</option>
                    <option value="ollama" ${config.provider === 'ollama' ? 'selected' : ''}>Ollama (本地)</option>
                    <option value="lmstudio" ${config.provider === 'lmstudio' ? 'selected' : ''}>LM Studio (本地)</option>
                </select>
            </div>
            
            <div class="form-group" id="apiKeyGroup">
                <label for="aiApiKey">API Key</label>
                <input type="password" id="aiApiKey" class="form-control" 
                    placeholder="输入 API Key" value="${config.apiKey || ''}">
                <small class="form-text">API Key 将仅保存在本地浏览器中</small>
            </div>
            
            <div class="form-group" id="apiUrlGroup" style="display: none;">
                <label for="aiApiUrl">API 地址</label>
                <input type="url" id="aiApiUrl" class="form-control" 
                    placeholder="https://api.example.com/v1/chat" value="${config.apiUrl || ''}">
            </div>
            
            <div class="form-group">
                <label for="aiModel">模型</label>
                <input type="text" id="aiModel" class="form-control" 
                    placeholder="如: gpt-3.5-turbo" value="${config.model || ''}">
            </div>
            
            <div class="form-group">
                <label for="aiMaxTokens">最大 Token 数</label>
                <input type="number" id="aiMaxTokens" class="form-control" 
                    value="${config.maxTokens || 2000}" min="100" max="32000">
            </div>
            
            <button class="btn btn-primary" id="saveAiConfigBtn">保存配置</button>
            <button class="btn btn-secondary" id="testAiConfigBtn">测试连接</button>
        `;

        // 绑定配置保存
        document.getElementById('saveAiConfigBtn').addEventListener('click', () => this.saveAIConfig());
        document.getElementById('testAiConfigBtn').addEventListener('click', () => this.testAIConfig());

        // 监听服务商切换
        document.getElementById('aiProvider').addEventListener('change', (e) => {
            const needsKey = !['ollama', 'lmstudio'].includes(e.target.value);
            document.getElementById('apiKeyGroup').style.display = needsKey ? 'block' : 'none';
        });
    }

    /**
     * 保存 AI 配置
     */
    saveAIConfig() {
        const provider = document.getElementById('aiProvider').value;
        const apiKey = document.getElementById('aiApiKey').value;
        const apiUrl = document.getElementById('aiApiUrl').value;
        const model = document.getElementById('aiModel').value;
        const maxTokens = parseInt(document.getElementById('aiMaxTokens').value) || 2000;

        this.aiService.saveConfig({
            provider,
            apiKey,
            apiUrl,
            model,
            maxTokens
        });

        utils.showToast('AI 配置已保存', 'success');
        this.checkAIService();
    }

    /**
     * 测试 AI 连接
     */
    async testAIConfig() {
        const btn = document.getElementById('testAiConfigBtn');
        btn.disabled = true;
        btn.textContent = '测试中...';

        try {
            const response = await this.aiService.chat([
                { role: 'user', content: '你好，请回复"连接成功"' }
            ]);

            if (response.content.includes('连接成功')) {
                utils.showToast('AI 连接测试成功！', 'success');
            } else {
                utils.showToast('AI 响应异常', 'warning');
            }
        } catch (error) {
            utils.showToast(`连接失败: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '测试连接';
        }
    }

    /**
     * 处理上传的文件
     */
    async handleFiles(files) {
        const fileList = [];
        
        for (const file of files) {
            if (file.name.endsWith('.zip')) {
                // 解压 ZIP 文件
                const extractedFiles = await this.extractZip(file);
                fileList.push(...extractedFiles);
            } else if (file.webkitRelativePath || file.name === file.webkitRelativePath.split('/')[0]) {
                // 文件夹
                fileList.push(...await this.readFileEntry(file));
            } else {
                // 普通文件
                fileList.push({
                    path: file.name,
                    content: await this.readFileAsText(file),
                    size: file.size
                });
            }
        }

        if (fileList.length > 0) {
            this.displayFileList(fileList);
            this.pendingFiles = fileList;
            this.elements.analyzeBtn.disabled = false;
        }
    }

    /**
     * 解压 ZIP 文件
     */
    async extractZip(file) {
        const files = [];
        
        try {
            // 使用 JSZip (如果可用)
            if (typeof JSZip !== 'undefined') {
                const zip = await JSZip.loadAsync(file);
                
                for (const [path, zipEntry] of Object.entries(zip.files)) {
                    if (!zipEntry.dir) {
                        const content = await zipEntry.async('string');
                        files.push({
                            path: path,
                            content: content,
                            size: zipEntry._data ? zipEntry._data.uncompressedSize : 0
                        });
                    }
                }
            } else {
                // 提示用户需要 JSZip
                utils.showToast('请引入 JSZip 库以支持 ZIP 文件解压', 'warning');
            }
        } catch (error) {
            console.error('解压失败:', error);
            utils.showToast('解压文件失败', 'error');
        }
        
        return files;
    }

    /**
     * 读取文件条目
     */
    async readFileEntry(fileEntry) {
        return new Promise((resolve) => {
            const files = [];
            
            if (fileEntry.file) {
                fileEntry.file((file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        files.push({
                            path: fileEntry.fullPath || fileEntry.name,
                            content: e.target.result,
                            size: file.size
                        });
                        resolve(files);
                    };
                    reader.readAsText(file);
                }, () => resolve(files));
            } else {
                resolve(files);
            }
        });
    }

    /**
     * 读取文件为文本
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('读取失败'));
            reader.readAsText(file);
        });
    }

    /**
     * 显示文件列表
     */
    displayFileList(files) {
        const container = document.getElementById('analyzerFileList');
        if (!container) return;

        const fileCount = files.length;
        const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

        container.innerHTML = `
            <div class="file-list-summary">
                <span class="file-count">${fileCount} 个文件</span>
                <span class="file-size">${this.formatSize(totalSize)}</span>
            </div>
            <div class="file-list-items">
                ${files.slice(0, 100).map(f => `
                    <div class="file-item">
                        <span class="file-icon">${this.getFileIcon(f.path)}</span>
                        <span class="file-path">${this.escapeHtml(f.path)}</span>
                    </div>
                `).join('')}
                ${fileCount > 100 ? `<div class="file-more">...还有 ${fileCount - 100} 个文件</div>` : ''}
            </div>
        `;
    }

    /**
     * 获取文件图标
     */
    getFileIcon(path) {
        const ext = path.split('.').pop().toLowerCase();
        const icons = {
            java: '☕',
            js: '📜',
            ts: '📘',
            vue: '💚',
            jsx: '⚛️',
            tsx: '⚛️',
            py: '🐍',
            go: '🔵',
            md: '📝',
            json: '{ }',
            xml: '< >',
            html: '🌐',
            css: '🎨'
        };
        return icons[ext] || '📄';
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 格式化大小
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 开始分析
     */
    async startAnalysis() {
        if (!this.pendingFiles || this.pendingFiles.length === 0) {
            utils.showToast('请先上传项目文件', 'warning');
            return;
        }

        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        this.elements.analyzeBtn.disabled = true;
        this.elements.analyzeBtn.innerHTML = '<span class="spinner"></span> 分析中...';
        this.showProgress(0, '正在扫描项目结构...');

        try {
            // 阶段 1: 基础分析
            this.showProgress(10, '分析项目结构...');
            await this.delay(300);

            const result = await this.analyzer.analyze(this.pendingFiles, {
                name: this.pendingFiles[0].path.split('/')[0] || '未命名项目'
            });

            this.showProgress(40, '解析代码结构...');
            await this.delay(300);

            // 阶段 2: 代码分析
            if (result.codeAnalysis) {
                this.showProgress(60, '提取模块信息...');
                await this.delay(200);
            }

            this.currentAnalysis = result;

            // 阶段 3: AI 分析 (可选)
            let aiInsights = null;
            if (this.aiService.isConfigured()) {
                this.showProgress(70, '正在请求 AI 分析...');
                try {
                    aiInsights = await this.aiService.analyzeProject(result);
                } catch (e) {
                    console.error('AI 分析失败:', e);
                    aiInsights = null;
                }
            }

            this.showProgress(90, '生成文档...');
            await this.delay(200);

            // 渲染结果
            this.renderResults(result, aiInsights);

            this.showProgress(100, '分析完成！');
            utils.showToast('项目分析完成', 'success');

        } catch (error) {
            console.error('分析失败:', error);
            utils.showToast('分析失败: ' + error.message, 'error');
        } finally {
            this.isAnalyzing = false;
            this.elements.analyzeBtn.disabled = false;
            this.elements.analyzeBtn.innerHTML = '开始分析';
        }
    }

    /**
     * 显示进度
     */
    showProgress(percent, text) {
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = percent + '%';
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = text;
        }
    }

    /**
     * 延迟
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 渲染分析结果
     */
    renderResults(result, aiInsights) {
        if (this.elements.analysisResult) {
            this.elements.analysisResult.classList.remove('hidden');
        }

        // 生成 Markdown 文档
        const markdown = this.analyzer.generateDocumentation(aiInsights);

        // 渲染 Markdown
        if (this.elements.analysisResult) {
            this.elements.analysisResult.innerHTML = `
                <div class="analysis-header">
                    <div class="analysis-info">
                        <h2>📊 ${result.name}</h2>
                        <div class="analysis-meta">
                            <span class="badge">${result.typeLabel}</span>
                            <span>${result.stats.totalFiles} 文件</span>
                            <span>~${result.stats.codeLines.toLocaleString()} 行代码</span>
                        </div>
                    </div>
                    <div class="analysis-actions">
                        <button class="btn btn-secondary" id="toggleTreeBtn">目录结构</button>
                        <button class="btn btn-secondary" id="toggleDiagramBtn">架构图</button>
                    </div>
                </div>
                
                <div class="analysis-content">
                    <div class="markdown-body" id="analysisMarkdown">
                        ${this.renderMarkdown(markdown)}
                    </div>
                    
                    <div class="analysis-sidebar hidden" id="analysisSidebar">
                        <div class="sidebar-section" id="treeSection">
                            <h3>📁 项目结构</h3>
                            <div class="project-tree">${this.renderTreeHTML(result.structure)}</div>
                        </div>
                        
                        ${result.codeAnalysis ? `
                        <div class="sidebar-section" id="diagramSection">
                            <h3>🏗️ 架构图</h3>
                            <div class="mermaid">
                                ${this.generateMermaidDiagram(result)}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="analysis-footer">
                    <button class="btn btn-primary" id="saveToKnowledgeBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        保存到知识库
                    </button>
                </div>
            `;

            // 绑定事件
            document.getElementById('toggleTreeBtn').addEventListener('click', () => {
                document.getElementById('analysisSidebar').classList.toggle('hidden');
                document.getElementById('treeSection').classList.toggle('hidden');
            });

            document.getElementById('toggleDiagramBtn').addEventListener('click', () => {
                document.getElementById('analysisSidebar').classList.toggle('hidden');
                document.getElementById('diagramSection').classList.toggle('hidden');
            });

            document.getElementById('saveToKnowledgeBtn').addEventListener('click', () => {
                this.saveToKnowledgeBase(markdown);
            });

            // 渲染 Mermaid 图
            this.renderMermaid();
        }
    }

    /**
     * 渲染树形结构 HTML
     */
    renderTreeHTML(node, depth = 0) {
        if (!node || depth > 3) return '';
        
        let html = `<div class="tree-item depth-${depth}">`;
        html += `<span class="tree-icon">${node.type === 'directory' ? '📁' : '📄'}</span>`;
        html += `<span class="tree-name">${node.name}</span>`;
        
        if (node.children && node.children.length > 0 && depth < 3) {
            html += '<div class="tree-children">';
            for (const child of node.children.slice(0, 20)) {
                html += this.renderTreeHTML(child, depth + 1);
            }
            if (node.children.length > 20) {
                html += `<div class="tree-more">...还有 ${node.children.length - 20} 项</div>`;
            }
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * 生成 Mermaid 图
     */
    generateMermaidDiagram(result) {
        let mermaid = '';
        
        if (result.codeAnalysis?.components?.length) {
            mermaid += this.analyzer.javaParser?.generateArchitectureDiagram?.(result.codeAnalysis) ||
                      this.analyzer.jsParser?.generateComponentDiagram?.(result.codeAnalysis) ||
                      'graph TD\n    Start[开始] --> End[结束]';
        } else {
            mermaid = 'graph TD\n    Project[项目] --> Structure[结构]\n    Structure --> Files[文件]\n    Files --> Components[组件]';
        }
        
        return mermaid;
    }

    /**
     * 渲染 Mermaid
     */
    renderMermaid() {
        if (typeof mermaid !== 'undefined') {
            mermaid.init({
                startOnLoad: false,
                theme: document.body.dataset.theme === 'dark' ? 'dark' : 'default'
            }, '.mermaid');
        }
    }

    /**
     * 渲染 Markdown (简单实现)
     */
    renderMarkdown(md) {
        // 使用 marked 库 (如果可用)
        if (typeof marked !== 'undefined') {
            return marked.parse(md);
        }
        
        // 简单降级处理
        return md
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/^\|(.*\|)+$/gm, (match) => {
                const cells = match.split('|').filter(c => c.trim());
                return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
            })
            .replace(/\n/g, '<br>');
    }

    /**
     * 保存到知识库
     */
    async saveToKnowledgeBase(markdown) {
        if (!this.currentAnalysis) {
            utils.showToast('请先进行分析', 'warning');
            return;
        }

        try {
            const content = {
                id: db.generateId(),
                type: 'document',
                title: `[项目分析] ${this.currentAnalysis.name}`,
                content: markdown,
                excerpt: this.currentAnalysis.typeLabel + ' 项目分析报告',
                tags: ['项目分析', this.currentAnalysis.typeLabel],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {
                    projectType: this.currentAnalysis.type,
                    stats: this.currentAnalysis.stats,
                    analyzedAt: this.currentAnalysis.analyzedAt
                }
            };

            await db.add('contents', content);
            
            // 刷新知识库
            if (typeof app !== 'undefined') {
                app.contents.push(content);
                app.renderContents();
            }

            utils.showToast('已保存到知识库', 'success');
            this.hideModal('analyzerModal');

        } catch (error) {
            console.error('保存失败:', error);
            utils.showToast('保存失败: ' + error.message, 'error');
        }
    }
}

// 初始化
window.AnalyzerUI = AnalyzerUI;
