/**
 * AI 服务模块
 * 支持多种 AI 接口调用，包括 OpenAI、Claude、通义千问等
 */

class AIService {
    constructor() {
        this.config = {
            provider: 'openai', // openai, claude, qwen, wenxin, ollama, lmstudio
            apiKey: '',
            apiUrl: '',
            model: 'gpt-3.5-turbo',
            maxTokens: 2000,
            temperature: 0.7
        };
        
        // 默认 API 地址
        this.defaultEndpoints = {
            openai: 'https://api.openai.com/v1/chat/completions',
            claude: 'https://api.anthropic.com/v1/messages',
            qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            wenxin: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
            ollama: 'http://localhost:11434/api/chat',
            lmstudio: 'http://localhost:1234/v1/chat/completions'
        };
        
        // 默认模型
        this.defaultModels = {
            openai: 'gpt-3.5-turbo',
            claude: 'claude-3-haiku-20240307',
            qwen: 'qwen-turbo',
            wenxin: 'ernie-4.0-8k-latest',
            ollama: 'llama2',
            lmstudio: 'local-model'
        };
        
        this.loadConfig();
    }

    /**
     * 加载配置
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('ai_service_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) {
            console.error('加载 AI 配置失败:', e);
        }
    }

    /**
     * 保存配置
     */
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        localStorage.setItem('ai_service_config', JSON.stringify(this.config));
    }

    /**
     * 获取配置
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * 检查是否已配置
     */
    isConfigured() {
        if (!this.config.apiKey && !this.config.provider.includes('ollama')) {
            // Ollama/LMStudio 可以不配置 API Key
            return false;
        }
        if (!this.config.apiUrl && this.config.provider !== 'custom') {
            // 检查是否有默认端点
            return !!this.defaultEndpoints[this.config.provider];
        }
        return true;
    }

    /**
     * 设置 provider
     */
    setProvider(provider) {
        this.config.provider = provider;
        this.config.model = this.defaultModels[provider] || 'gpt-3.5-turbo';
        
        // 设置默认端点
        if (this.defaultEndpoints[provider]) {
            this.config.apiUrl = '';
        }
        
        this.saveConfig();
    }

    /**
     * 构建请求头
     */
    buildHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        switch (this.config.provider) {
            case 'openai':
            case 'qwen':
            case 'lmstudio':
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
                break;
            case 'claude':
                headers['x-api-key'] = this.config.apiKey;
                headers['anthropic-version'] = '2023-06-01';
                headers['anthropic-dangerous-direct-browser-access'] = 'true';
                break;
            case 'wenxin':
                // 百度使用 Access Token，这里简化处理
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
                break;
            case 'ollama':
                // Ollama 可能不需要认证
                break;
        }
        
        return headers;
    }

    /**
     * 构建请求体
     */
    buildRequestBody(messages, options = {}) {
        const body = {
            model: this.config.model,
            messages: messages,
            max_tokens: options.maxTokens || this.config.maxTokens,
            temperature: options.temperature || this.config.temperature
        };
        
        // 流式响应
        if (options.stream) {
            body.stream = true;
        }
        
        // provider 特定参数
        switch (this.config.provider) {
            case 'qwen':
                body.stream = options.stream || false;
                break;
        }
        
        return body;
    }

    /**
     * 获取 API 地址
     */
    getApiUrl() {
        if (this.config.apiUrl) {
            return this.config.apiUrl;
        }
        return this.defaultEndpoints[this.config.provider] || this.defaultEndpoints.openai;
    }

    /**
     * 发送请求
     */
    async chat(messages, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('AI 服务未配置，请先配置 API Key');
        }
        
        const url = this.getApiUrl();
        const headers = this.buildHeaders();
        const body = this.buildRequestBody(messages, options);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API 请求失败: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }
            
            if (options.stream) {
                return this.handleStreamResponse(response);
            }
            
            return await this.parseResponse(response);
        } catch (error) {
            console.error('AI 请求失败:', error);
            throw error;
        }
    }

    /**
     * 处理流式响应
     */
    async *handleStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                // 处理 SSE 格式
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            return;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            const content = this.extractStreamContent(parsed);
                            if (content) {
                                yield content;
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * 提取流式内容
     */
    extractStreamContent(data) {
        switch (this.config.provider) {
            case 'openai':
            case 'qwen':
            case 'lmstudio':
                return data.choices?.[0]?.delta?.content || '';
            case 'claude':
                return data.delta?.text || '';
            default:
                return data.choices?.[0]?.delta?.content || '';
        }
    }

    /**
     * 解析响应
     */
    async parseResponse(response) {
        const data = await response.json();
        
        switch (this.config.provider) {
            case 'openai':
            case 'qwen':
            case 'lmstudio':
                return {
                    content: data.choices?.[0]?.message?.content || '',
                    usage: data.usage,
                    model: data.model
                };
            case 'claude':
                return {
                    content: data.content?.[0]?.text || '',
                    usage: data.usage,
                    model: this.config.model
                };
            default:
                return data;
        }
    }

    /**
     * 分析项目
     */
    async analyzeProject(projectData) {
        const prompt = this.buildAnalysisPrompt(projectData);
        
        const messages = [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
        ];
        
        const response = await this.chat(messages);
        return response.content;
    }

    /**
     * 获取系统提示词
     */
    getSystemPrompt() {
        return `你是一位专业的代码分析师和技术文档专家。你的任务是分析用户提供的代码项目，生成清晰、准确、有价值的技术文档。

请用中文回复，文档应包含：
1. 项目整体概述
2. 核心功能模块说明
3. 技术架构分析
4. 代码设计模式识别
5. 代码质量评估
6. 学习建议和最佳实践
7. 项目导读

请保持语言简洁、专业，文档结构清晰。`;
    }

    /**
     * 构建分析提示词
     */
    buildAnalysisPrompt(projectData) {
        const { name, type, stats, structure, codeAnalysis } = projectData;
        
        let prompt = `请分析以下代码项目：

# 项目基本信息
- 项目名称: ${name}
- 项目类型: ${type}
- 代码文件数: ${stats.codeFiles}
- 代码行数: ~${stats.codeLines}
`;
        
        // 添加代码分析结果
        if (codeAnalysis) {
            if (codeAnalysis.classes) {
                prompt += `\n## 类信息 (前20个)
`;
                for (const cls of codeAnalysis.classes.slice(0, 20)) {
                    prompt += `- ${cls.name} (${cls.package || ''}) ${cls.annotations?.length ? `[${cls.annotations.join(', ')}]` : ''}\n`;
                }
            }
            
            if (codeAnalysis.interfaces) {
                prompt += `\n## 接口信息
`;
                for (const iface of codeAnalysis.interfaces.slice(0, 10)) {
                    prompt += `- ${iface.name} (${iface.package || ''})\n`;
                }
            }
            
            if (codeAnalysis.components) {
                prompt += `\n## 组件信息 (前20个)
`;
                for (const comp of codeAnalysis.components.slice(0, 20)) {
                    prompt += `- ${comp.name} (${comp.type}) - ${comp.path}\n`;
                }
            }
            
            if (codeAnalysis.routes) {
                prompt += `\n## 路由信息
`;
                for (const route of codeAnalysis.routes.slice(0, 15)) {
                    prompt += `- ${route.path} -> ${route.component || 'anonymous'}\n`;
                }
            }
        }
        
        prompt += `\n请基于以上信息，生成一份完整的项目分析文档。`;
        
        return prompt;
    }

    /**
     * 生成项目文档
     */
    async generateDocumentation(projectData) {
        const aiAnalysis = await this.analyzeProject(projectData);
        return aiAnalysis;
    }
}

// 导出到全局
window.AIService = AIService;
