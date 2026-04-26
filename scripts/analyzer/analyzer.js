/**
 * 项目分析器主模块
 * 负责项目上传、结构扫描和协调各语言解析器
 */

// 项目类型枚举
const ProjectType = {
    JAVA: 'java',
    JAVASCRIPT: 'javascript',
    TYPESCRIPT: 'typescript',
    PYTHON: 'python',
    GO: 'go',
    UNKNOWN: 'unknown'
};

// 关键目录和配置文件映射
const ProjectIndicators = {
    [ProjectType.JAVA]: {
        dirs: ['src/main/java', 'src/test/java', 'src/main/resources'],
        files: ['pom.xml', 'build.gradle', 'settings.gradle', 'gradlew'],
        extensions: ['.java']
    },
    [ProjectType.JAVASCRIPT]: {
        dirs: ['src', 'src/components', 'src/pages', 'src/views', 'public'],
        files: ['package.json', 'webpack.config.js', 'vite.config.js', 'vue.config.js'],
        extensions: ['.js', '.jsx', '.vue', '.ts', '.tsx']
    },
    [ProjectType.TYPESCRIPT]: {
        dirs: ['src', 'src/components', 'src/pages'],
        files: ['tsconfig.json', 'package.json'],
        extensions: ['.ts', '.tsx']
    },
    [ProjectType.PYTHON]: {
        dirs: ['src', 'tests', 'lib'],
        files: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile', 'manage.py'],
        extensions: ['.py']
    },
    [ProjectType.GO]: {
        dirs: ['cmd', 'pkg', 'internal', 'api'],
        files: ['go.mod', 'go.sum'],
        extensions: ['.go']
    }
};

class ProjectAnalyzer {
    constructor() {
        this.projectFiles = new Map(); // path -> { content, stats }
        this.projectStructure = null;
        this.projectType = ProjectType.UNKNOWN;
        this.projectName = '';
        this.analysisResult = null;
        
        // 加载解析器
        this.javaParser = new JavaParser();
        this.jsParser = new JsParser();
        this.aiService = new AIService();
    }

    /**
     * 检测项目类型
     */
    detectProjectType(files) {
        const scores = {};
        
        for (const [type, indicators] of Object.entries(ProjectIndicators)) {
            let score = 0;
            
            // 检查关键文件
            for (const file of files) {
                if (indicators.files.some(f => file.path.endsWith(f))) {
                    score += 10;
                }
            }
            
            // 检查关键目录
            for (const dir of indicators.dirs) {
                if (files.some(f => f.path.startsWith(dir + '/') || f.path.startsWith(dir + '\\'))) {
                    score += 5;
                }
            }
            
            // 检查扩展名
            for (const ext of indicators.extensions) {
                const count = files.filter(f => f.path.endsWith(ext)).length;
                score += Math.min(count, 20); // 最多加20分
            }
            
            scores[type] = score;
        }
        
        // 返回得分最高的类型
        const maxType = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
        return maxType[1] > 0 ? maxType[0] : ProjectType.UNKNOWN;
    }

    /**
     * 构建项目结构树
     */
    buildProjectTree(files) {
        const root = { name: this.projectName, type: 'root', children: [] };
        const dirMap = new Map();
        
        // 按路径排序，确保父目录在前
        const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
        
        for (const file of sortedFiles) {
            const parts = file.path.replace(/\\/g, '/').split('/');
            let current = root;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;
                const fullPath = parts.slice(0, i + 1).join('/');
                
                if (!dirMap.has(fullPath)) {
                    const node = {
                        name: part,
                        type: isFile ? 'file' : 'directory',
                        path: fullPath,
                        extension: isFile ? this.getExtension(part) : null,
                        size: isFile ? file.size : 0,
                        children: []
                    };
                    
                    dirMap.set(fullPath, node);
                    current.children.push(node);
                }
                
                current = dirMap.get(fullPath);
            }
        }
        
        return root;
    }

    /**
     * 获取文件扩展名
     */
    getExtension(filename) {
        const idx = filename.lastIndexOf('.');
        return idx > 0 ? filename.substring(idx).toLowerCase() : '';
    }

    /**
     * 统计项目规模
     */
    calculateStats(files) {
        const stats = {
            totalFiles: 0,
            totalDirs: 0,
            totalSize: 0,
            codeFiles: 0,
            codeLines: 0,
            byExtension: {}
        };
        
        const seenDirs = new Set();
        
        for (const file of files) {
            stats.totalFiles++;
            stats.totalSize += file.size || 0;
            
            const ext = this.getExtension(file.path) || '(无扩展名)';
            stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
            
            // 统计代码文件
            const codeExtensions = ['.java', '.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.go', '.c', '.cpp', '.h', '.cs'];
            if (codeExtensions.includes(ext)) {
                stats.codeFiles++;
                // 估算代码行数（每字节约0.8行）
                stats.codeLines += Math.ceil((file.size || 0) * 0.8);
            }
            
            // 统计目录
            const parts = file.path.replace(/\\/g, '/').split('/');
            for (let i = 1; i < parts.length; i++) {
                const dir = parts.slice(0, i).join('/');
                if (!seenDirs.has(dir)) {
                    seenDirs.add(dir);
                    stats.totalDirs++;
                }
            }
        }
        
        return stats;
    }

    /**
     * 识别关键目录
     */
    identifyKeyDirectories(structure) {
        const keyDirs = {
            source: [],
            test: [],
            config: [],
            resources: [],
            build: [],
            docs: []
        };
        
        const searchDirs = (node, parent = '') => {
            if (node.type === 'directory') {
                const path = node.path.toLowerCase();
                
                if (/\bsrc\b/.test(path)) {
                    if (/\btest\b/.test(path)) {
                        keyDirs.test.push(node.path);
                    } else if (/\b(main|src)\b/.test(path)) {
                        keyDirs.source.push(node.path);
                    }
                }
                
                if (/\b(config|cfg)\b/.test(path)) {
                    keyDirs.config.push(node.path);
                }
                
                if (/\b(resources|assets|static)\b/.test(path)) {
                    keyDirs.resources.push(node.path);
                }
                
                if (/\b(target|dist|build|out)\b/.test(path)) {
                    keyDirs.build.push(node.path);
                }
                
                if (/\b(docs?|doc|documentation)\b/.test(path)) {
                    keyDirs.docs.push(node.path);
                }
                
                for (const child of node.children) {
                    searchDirs(child, node.path);
                }
            }
        };
        
        searchDirs(structure);
        return keyDirs;
    }

    /**
     * 识别配置文件
     */
    identifyConfigFiles(structure, files) {
        const configFiles = {
            build: [],      // 构建配置
            dependency: [], // 依赖配置
            env: [],        // 环境配置
            framework: [],  // 框架配置
            other: []        // 其他配置
        };
        
        const buildPatterns = ['pom.xml', 'build.gradle', 'build.xml', 'Makefile', 'CMakeLists.txt', 'webpack.config', 'vite.config', 'vue.config', 'rollup.config', 'esbuild.config'];
        const depPatterns = ['package.json', 'requirements.txt', 'Pipfile', 'pyproject.toml', 'go.mod', 'Gemfile', 'Cargo.toml', 'composer.json'];
        const envPatterns = ['.env', '.env.local', '.env.development', '.env.production', 'application.properties', 'application.yml', 'application.yaml'];
        const frameworkPatterns = ['spring.factories', 'mybatis-config.xml', 'hibernate.cfg.xml', '.babelrc', '.eslintrc', '.prettierrc', 'tsconfig.json'];
        
        for (const file of files) {
            const name = file.path.split(/[/\\]/).pop().toLowerCase();
            
            if (buildPatterns.some(p => name.includes(p.toLowerCase()))) {
                configFiles.build.push(file.path);
            } else if (depPatterns.some(p => name === p || name.includes(p.toLowerCase()))) {
                configFiles.dependency.push(file.path);
            } else if (envPatterns.some(p => name.includes(p.toLowerCase()))) {
                configFiles.env.push(file.path);
            } else if (frameworkPatterns.some(p => name.includes(p.toLowerCase()))) {
                configFiles.framework.push(file.path);
            } else if (name.startsWith('.') && (name.includes('rc') || name === 'gitignore' || name === 'editorconfig')) {
                configFiles.other.push(file.path);
            }
        }
        
        return configFiles;
    }

    /**
     * 分析项目
     */
    async analyze(files, options = {}) {
        try {
            this.projectFiles.clear();
            
            // 存储文件信息
            for (const file of files) {
                this.projectFiles.set(file.path, {
                    content: file.content || '',
                    size: file.size || 0
                });
            }
            
            // 检测项目类型
            this.projectType = this.detectProjectType(files);
            
            // 提取项目名称
            this.projectName = options.name || this.extractProjectName(files);
            
            // 构建项目结构
            this.projectStructure = this.buildProjectTree(files);
            
            // 统计信息
            const stats = this.calculateStats(files);
            
            // 识别关键目录
            const keyDirs = this.identifyKeyDirectories(this.projectStructure);
            
            // 识别配置文件
            const configFiles = this.identifyConfigFiles(this.projectStructure, files);
            
            // 根据项目类型调用对应解析器
            let codeAnalysis = null;
            switch (this.projectType) {
                case ProjectType.JAVA:
                    codeAnalysis = await this.javaParser.analyze(files, this.projectFiles);
                    break;
                case ProjectType.JAVASCRIPT:
                case ProjectType.TYPESCRIPT:
                    codeAnalysis = await this.jsParser.analyze(files, this.projectFiles, this.projectType);
                    break;
                // 其他类型可以继续扩展
            }
            
            // 组装分析结果
            this.analysisResult = {
                name: this.projectName,
                type: this.projectType,
                typeLabel: this.getTypeLabel(this.projectType),
                stats,
                structure: this.projectStructure,
                keyDirectories: keyDirs,
                configFiles,
                codeAnalysis,
                analyzedAt: new Date().toISOString()
            };
            
            return this.analysisResult;
        } catch (error) {
            console.error('项目分析失败:', error);
            throw error;
        }
    }

    /**
     * 提取项目名称
     */
    extractProjectName(files) {
        // 优先从配置文件获取
        for (const file of files) {
            if (file.path.endsWith('package.json')) {
                try {
                    const content = JSON.parse(file.content || '{}');
                    if (content.name) return content.name;
                } catch (e) {}
            }
            if (file.path.endsWith('pom.xml')) {
                const match = file.content?.match(/<artifactId>([^<]+)<\/artifactId>/);
                if (match) return match[1];
            }
            if (file.path.endsWith('go.mod')) {
                const match = file.content?.match(/module\s+([^\s]+)/);
                if (match) return match[1].split('/').pop();
            }
        }
        
        // 从文件路径提取
        if (files.length > 0) {
            const firstPath = files[0].path;
            const parts = firstPath.replace(/\\/g, '/').split('/');
            return parts[0] || '未命名项目';
        }
        
        return '未命名项目';
    }

    /**
     * 获取项目类型标签
     */
    getTypeLabel(type) {
        const labels = {
            [ProjectType.JAVA]: 'Java',
            [ProjectType.JAVASCRIPT]: 'JavaScript',
            [ProjectType.TYPESCRIPT]: 'TypeScript',
            [ProjectType.PYTHON]: 'Python',
            [ProjectType.GO]: 'Go',
            [ProjectType.UNKNOWN]: '未知'
        };
        return labels[type] || '未知';
    }

    /**
     * 生成项目文档 (Markdown)
     */
    generateDocumentation(aiInsights = null) {
        if (!this.analysisResult) {
            throw new Error('请先调用 analyze() 方法');
        }
        
        const { name, type, typeLabel, stats, structure, keyDirectories, configFiles, codeAnalysis } = this.analysisResult;
        
        let md = `# ${name} - 项目分析报告\n\n`;
        md += `> 分析时间: ${new Date(this.analysisResult.analyzedAt).toLocaleString('zh-CN')}\n\n`;
        
        // 项目概览
        md += `## 📋 项目概览\n\n`;
        md += `| 属性 | 值 |\n`;
        md += `|------|-----|\n`;
        md += `| 项目名称 | ${name} |\n`;
        md += `| 项目类型 | ${typeLabel} |\n`;
        md += `| 总文件数 | ${stats.totalFiles} |\n`;
        md += `| 总目录数 | ${stats.totalDirs} |\n`;
        md += `| 代码文件 | ${stats.codeFiles} |\n`;
        md += `| 代码行数 | ~${stats.codeLines.toLocaleString()} |\n`;
        md += `| 总大小 | ${this.formatSize(stats.totalSize)} |\n\n`;
        
        // 文件类型分布
        md += `## 📊 文件类型分布\n\n`;
        md += `\`\`\`\n`;
        for (const [ext, count] of Object.entries(stats.byExtension).sort((a, b) => b[1] - a[1])) {
            md += `${ext.padEnd(15)} ${count}\n`;
        }
        md += `\`\`\`\n\n`;
        
        // 目录结构
        md += `## 📁 项目结构\n\n`;
        md += `\`\`\`\n`;
        md += this.renderTreeToMarkdown(structure, 0, 3);
        md += `\`\`\`\n\n`;
        
        // 关键目录
        if (Object.values(keyDirectories).some(v => v.length > 0)) {
            md += `## 🔑 关键目录\n\n`;
            for (const [type, dirs] of Object.entries(keyDirectories)) {
                if (dirs.length > 0) {
                    const labels = {
                        source: '源代码',
                        test: '测试代码',
                        config: '配置目录',
                        resources: '资源文件',
                        build: '构建输出',
                        docs: '文档目录'
                    };
                    md += `- **${labels[type] || type}**: ${dirs.join(', ')}\n`;
                }
            }
            md += '\n';
        }
        
        // 配置文件
        if (Object.values(configFiles).some(v => v.length > 0)) {
            md += `## ⚙️ 配置文件\n\n`;
            for (const [type, files] of Object.entries(configFiles)) {
                if (files.length > 0) {
                    const labels = {
                        build: '构建配置',
                        dependency: '依赖配置',
                        env: '环境配置',
                        framework: '框架配置',
                        other: '其他配置'
                    };
                    md += `### ${labels[type] || type}\n\n`;
                    md += files.map(f => `- \`${f}\``).join('\n') + '\n\n';
                }
            }
        }
        
        // 代码分析结果
        if (codeAnalysis) {
            md += `\n---\n\n`;
            md += this.renderCodeAnalysisMarkdown(codeAnalysis);
        }
        
        // AI 洞察
        if (aiInsights) {
            md += `\n---\n\n`;
            md += `## 🤖 AI 智能分析\n\n`;
            md += aiInsights;
        }
        
        md += `\n---\n\n`;
        md += `*本文档由知识库项目分析器自动生成*\n`;
        
        return md;
    }

    /**
     * 渲染树结构为 Markdown
     */
    renderTreeToMarkdown(node, depth, maxDepth = 3) {
        if (depth > maxDepth) return '';
        
        let result = '';
        const indent = '  '.repeat(depth);
        const prefix = depth === 0 ? '' : '├─ ';
        
        if (depth === 0) {
            result += `${node.name}/\n`;
        } else {
            result += `${indent}${prefix}${node.name}${node.type === 'directory' ? '/' : ''}\n`;
        }
        
        if (node.children && node.children.length > 0) {
            const sortedChildren = [...node.children].sort((a, b) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            
            for (let i = 0; i < sortedChildren.length; i++) {
                const child = sortedChildren[i];
                result += this.renderTreeToMarkdown(child, depth + 1, maxDepth);
            }
        }
        
        return result;
    }

    /**
     * 渲染代码分析结果为 Markdown
     */
    renderCodeAnalysisMarkdown(analysis) {
        let md = '';
        
        if (analysis.classes || analysis.interfaces) {
            md += `## 🏗️ 类与接口\n\n`;
            
            if (analysis.classes?.length) {
                md += `### 类 (${analysis.classes.length})\n\n`;
                md += '| 类名 | 包/模块 | 注解 | 描述 |\n';
                md += '|------|---------|------|------|\n';
                for (const cls of analysis.classes.slice(0, 50)) {
                    md += `| \`${cls.name}\` | ${cls.package || cls.module || '-'} | ${cls.annotations?.join(', ') || '-'} | ${cls.description || '-'} |\n`;
                }
                if (analysis.classes.length > 50) {
                    md += `\n*...还有 ${analysis.classes.length - 50} 个类*\n`;
                }
                md += '\n';
            }
            
            if (analysis.interfaces?.length) {
                md += `### 接口 (${analysis.interfaces.length})\n\n`;
                md += '| 接口名 | 包/模块 | 描述 |\n';
                md += '|--------|---------|------|\n';
                for (const iface of analysis.interfaces.slice(0, 30)) {
                    md += `| \`${iface.name}\` | ${iface.package || iface.module || '-'} | ${iface.description || '-'} |\n`;
                }
                if (analysis.interfaces.length > 30) {
                    md += `\n*...还有 ${analysis.interfaces.length - 30} 个接口*\n`;
                }
                md += '\n';
            }
        }
        
        if (analysis.components) {
            md += `### 组件 (${analysis.components.length})\n\n`;
            md += '| 组件名 | 路径 | 类型 |\n';
            md += '|--------|------|------|\n';
            for (const comp of analysis.components.slice(0, 30)) {
                md += `| \`${comp.name}\` | \`${comp.path}\` | ${comp.type || '组件'} |\n`;
            }
            if (analysis.components.length > 30) {
                md += `\n*...还有 ${analysis.components.length - 30} 个组件*\n`;
            }
            md += '\n';
        }
        
        if (analysis.routes) {
            md += `### 路由 (${analysis.routes.length})\n\n`;
            md += '| 路径 | 组件 | 方法 |\n';
            md += '|------|------|------|\n';
            for (const route of analysis.routes.slice(0, 30)) {
                md += `| \`${route.path}\` | \`${route.component || '-'}\` | ${route.methods?.join(', ') || '-'} |\n`;
            }
            if (analysis.routes.length > 30) {
                md += `\n*...还有 ${analysis.routes.length - 30} 个路由*\n`;
            }
            md += '\n';
        }
        
        if (analysis.dependencies) {
            md += `### 依赖关系\n\n`;
            md += '```mermaid\ngraph TD\n';
            for (const dep of analysis.dependencies.slice(0, 20)) {
                md += `    ${dep.from} --> ${dep.to}\n`;
            }
            md += '```\n\n';
        }
        
        return md;
    }

    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 导出到全局
window.ProjectAnalyzer = ProjectAnalyzer;
window.ProjectType = ProjectType;
