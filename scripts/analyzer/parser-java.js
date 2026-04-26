/**
 * Java 代码解析器
 * 解析 Java 项目的类、接口、注解等结构
 */

class JavaParser {
    constructor() {
        this.patterns = {
            // 包声明
            package: /package\s+([\w.]+)\s*;/,
            
            // 类声明 (普通类、抽象类、枚举、注解)
            class: /(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g,
            
            // 接口声明
            interface: /(?:public|private|protected)?\s*interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?/g,
            
            // 枚举声明
            enum: /(?:public|private|protected)?\s*enum\s+(\w+)/g,
            
            // 注解 (在类/方法/字段上)
            annotation: /@(\w+)(?:\([^)]*\))?/g,
            
            // Spring 注解
            springAnnotations: ['@Controller', '@RestController', '@Service', '@Repository', '@Component', '@Configuration', '@Bean', '@Autowired', '@Resource', '@Qualifier'],
            
            // Spring Boot 入口
            springBootMain: /@SpringBootApplication/g,
            
            // Mapper 注解
            mapperAnnotations: ['@Mapper', '@Select', '@Insert', '@Update', '@Delete'],
            
            // JPA 注解
            jpaAnnotations: ['@Entity', '@Table', '@Column', '@Id', '@GeneratedValue', '@OneToMany', '@ManyToOne', '@JoinColumn'],
            
            // 方法声明
            method: /(?:public|private|protected)?\s*(?:static)?\s*(?:final)?\s*(?:synchronized)?\s*[\w<>\[\],\s]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/g,
            
            // 字段声明
            field: /(?:private|public|protected)?\s*(?:static)?\s*(?:final)?\s*[\w<>\[\]]+\s+(\w+)\s*(?:=\s*[^;]+)?;/g,
            
            // import 语句
            import: /import\s+([\w.]+)\s*;/g,
            
            //@RestController 路由
            restMapping: /@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)\s*(?:\(\s*["']([^"']+)["']\s*\))?/g,
            
            // 文件头注释
            fileComment: /\/\*\*[\s\S]*?\*\//,
            
            // 类注释 (Javadoc)
            classComment: /public\s+(?:class|interface|enum)\s+\w+[\s\S]*?\{/
        };
    }

    /**
     * 分析 Java 项目
     */
    async analyze(files, fileMap) {
        const result = {
            classes: [],
            interfaces: [],
            enums: [],
            packages: new Set(),
            imports: new Set(),
            annotations: {
                spring: [],
                jpa: [],
                mapper: [],
                other: []
            },
            dependencies: [],
            entryPoints: [],
            components: []
        };
        
        // 过滤 Java 文件
        const javaFiles = files.filter(f => f.path.endsWith('.java'));
        
        for (const file of javaFiles) {
            const content = file.content || '';
            const fileInfo = this.parseFile(content, file.path);
            
            // 收集包名
            if (fileInfo.package) {
                result.packages.add(fileInfo.package);
            }
            
            // 收集导入
            result.imports = new Set([...result.imports, ...fileInfo.imports]);
            
            // 分类收集
            if (fileInfo.classes.length > 0) {
                result.classes.push(...fileInfo.classes.map(c => ({
                    ...c,
                    path: file.path
                })));
            }
            
            if (fileInfo.interfaces.length > 0) {
                result.interfaces.push(...fileInfo.interfaces.map(i => ({
                    ...i,
                    path: file.path
                })));
            }
            
            if (fileInfo.enums.length > 0) {
                result.enums.push(...fileInfo.enums.map(e => ({
                    ...e,
                    path: file.path
                })));
            }
            
            // 收集注解
            for (const ann of fileInfo.annotations) {
                if (this.patterns.springAnnotations.includes(ann)) {
                    result.annotations.spring.push({
                        name: ann,
                        className: fileInfo.classes[0]?.name || 'Unknown',
                        path: file.path
                    });
                } else if (this.patterns.jpaAnnotations.includes(ann)) {
                    result.annotations.jpa.push({ name: ann, path: file.path });
                } else if (this.patterns.mapperAnnotations.includes(ann)) {
                    result.annotations.mapper.push({ name: ann, path: file.path });
                } else {
                    result.annotations.other.push({ name: ann, path: file.path });
                }
            }
            
            // 识别入口类 (有 main 方法)
            if (fileInfo.hasMain || fileInfo.annotations.includes('SpringBootApplication')) {
                result.entryPoints.push({
                    name: fileInfo.classes[0]?.name || file.path.split('/').pop(),
                    path: file.path,
                    type: fileInfo.annotations.includes('SpringBootApplication') ? 'Spring Boot' : 'Main Class'
                });
            }
            
            // 识别 Spring 组件
            for (const ann of this.patterns.springAnnotations) {
                if (fileInfo.annotations.includes(ann)) {
                    result.components.push({
                        name: fileInfo.classes[0]?.name || 'Unknown',
                        type: ann.replace('@', ''),
                        path: file.path,
                        package: fileInfo.package
                    });
                    break;
                }
            }
        }
        
        // 分析包依赖关系
        result.dependencies = this.analyzeDependencies(result);
        
        // 移除 Set 的空占位
        result.packages = Array.from(result.packages);
        result.imports = Array.from(result.imports);
        
        // 统计
        result.stats = {
            totalClasses: result.classes.length,
            totalInterfaces: result.interfaces.length,
            totalEnums: result.enums.length,
            totalPackages: result.packages.length,
            springComponents: result.components.length,
            entryPoints: result.entryPoints.length
        };
        
        return result;
    }

    /**
     * 解析单个 Java 文件
     */
    parseFile(content, path) {
        const result = {
            package: null,
            classes: [],
            interfaces: [],
            enums: [],
            imports: [],
            annotations: [],
            hasMain: false
        };
        
        // 提取包名
        const packageMatch = content.match(this.patterns.package);
        if (packageMatch) {
            result.package = packageMatch[1];
        }
        
        // 提取所有注解
        let annMatch;
        this.patterns.annotation.lastIndex = 0;
        while ((annMatch = this.patterns.annotation.exec(content)) !== null) {
            if (!result.annotations.includes(annMatch[1])) {
                result.annotations.push(annMatch[1]);
            }
        }
        
        // 检查是否有 main 方法
        if (/public\s+static\s+void\s+main\s*\(\s*String\s*(?:\[\]|<\w+>)\s*\w+\s*\)/.test(content)) {
            result.hasMain = true;
        }
        
        // 提取类
        result.classes = this.extractClasses(content, result.package, result.annotations);
        
        // 提取接口
        result.interfaces = this.extractInterfaces(content, result.package);
        
        // 提取枚举
        result.enums = this.extractEnums(content, result.package);
        
        // 提取导入
        let importMatch;
        this.patterns.import.lastIndex = 0;
        while ((importMatch = this.patterns.import.exec(content)) !== null) {
            result.imports.push(importMatch[1]);
        }
        
        return result;
    }

    /**
     * 提取类信息
     */
    extractClasses(content, packageName, fileAnnotations = []) {
        const classes = [];
        
        // 匹配类声明
        const classRegex = /(?:(public|private|protected)\s+)?(?:(abstract|final)\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;
        let match;
        
        while ((match = classRegex.exec(content)) !== null) {
            const className = match[3];
            const extendsClass = match[4];
            const implementsInterfaces = match[5]?.split(',').map(s => s.trim()).filter(Boolean) || [];
            
            // 获取该类之前的注解
            const beforeClass = content.substring(0, match.index);
            const recentAnnotations = this.getRecentAnnotations(beforeClass);
            const allAnnotations = [...recentAnnotations, ...fileAnnotations];
            
            // 获取该类周围的注释
            const description = this.extractClassDescription(content, match.index);
            
            classes.push({
                name: className,
                package: packageName,
                extends: extendsClass,
                implements: implementsInterfaces,
                annotations: allAnnotations,
                description: description,
                accessModifier: match[1] || 'default'
            });
        }
        
        return classes;
    }

    /**
     * 提取接口信息
     */
    extractInterfaces(content, packageName) {
        const interfaces = [];
        
        const ifaceRegex = /(?:(public|private|protected)\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?/g;
        let match;
        
        while ((match = ifaceRegex.exec(content)) !== null) {
            const ifaceName = match[2];
            const extendsInterfaces = match[3]?.split(',').map(s => s.trim()).filter(Boolean) || [];
            
            const beforeIface = content.substring(0, match.index);
            const recentAnnotations = this.getRecentAnnotations(beforeIface);
            
            interfaces.push({
                name: ifaceName,
                package: packageName,
                extends: extendsInterfaces,
                annotations: recentAnnotations,
                accessModifier: match[1] || 'default'
            });
        }
        
        return interfaces;
    }

    /**
     * 提取枚举信息
     */
    extractEnums(content, packageName) {
        const enums = [];
        
        const enumRegex = /(?:(public|private|protected)\s+)?enum\s+(\w+)(?:\s+implements\s+([\w,\s]+))?/g;
        let match;
        
        while ((match = enumRegex.exec(content)) !== null) {
            enums.push({
                name: match[2],
                package: packageName,
                implements: match[3]?.split(',').map(s => s.trim()).filter(Boolean) || [],
                accessModifier: match[1] || 'default'
            });
        }
        
        return enums;
    }

    /**
     * 获取最近的注解
     */
    getRecentAnnotations(text) {
        const annotations = [];
        const lines = text.split('\n');
        const recentLines = lines.slice(-10).join('\n');
        
        let match;
        this.patterns.annotation.lastIndex = 0;
        while ((match = this.patterns.annotation.exec(recentLines)) !== null) {
            annotations.push(match[1]);
        }
        
        return annotations;
    }

    /**
     * 提取类描述
     */
    extractClassDescription(content, classIndex) {
        // 查找类之前的 Javadoc 注释
        const beforeClass = content.substring(0, classIndex);
        const lines = beforeClass.split('\n');
        
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('/**')) {
                // 找到 Javadoc 开始
                let desc = '';
                for (let j = i + 1; j < lines.length && !lines[j].includes('*/'); j++) {
                    const descLine = lines[j].replace(/^\s*\*\s*/, '').trim();
                    if (descLine && !descLine.startsWith('@')) {
                        desc += descLine + ' ';
                    }
                }
                return desc.trim() || null;
            }
            if (line && !line.startsWith('*') && !line.startsWith('@')) {
                break;
            }
        }
        return null;
    }

    /**
     * 分析包依赖关系
     */
    analyzeDependencies(result) {
        const dependencies = [];
        const packageMap = new Map();
        
        // 建立包到类的映射
        for (const cls of result.classes) {
            if (cls.package) {
                if (!packageMap.has(cls.package)) {
                    packageMap.set(cls.package, []);
                }
                packageMap.get(cls.package).push(cls.name);
            }
        }
        
        // 分析依赖关系 (基于 extends 和 implements)
        for (const cls of result.classes) {
            if (cls.extends) {
                dependencies.push({
                    from: cls.name,
                    to: cls.extends,
                    type: 'extends'
                });
            }
            
            for (const iface of cls.implements || []) {
                dependencies.push({
                    from: cls.name,
                    to: iface,
                    type: 'implements'
                });
            }
        }
        
        // 分析 Spring 组件依赖 (基于 @Autowired 字段)
        for (const comp of result.components) {
            const compFile = result.classes.find(c => c.path === comp.path);
            if (compFile) {
                // 这里可以进一步分析字段注入
            }
        }
        
        return dependencies;
    }

    /**
     * 生成 Mermaid 架构图
     */
    generateArchitectureDiagram(result) {
        let mermaid = 'graph TD\n';
        
        // 包的依赖关系
        const packages = [...new Set(result.classes.map(c => c.package).filter(Boolean))];
        
        // 定义子图 (按包分组)
        for (const pkg of packages.slice(0, 10)) {
            const classes = result.classes.filter(c => c.package === pkg);
            mermaid += `    subgraph ${pkg}\n`;
            for (const cls of classes.slice(0, 15)) {
                mermaid += `        ${cls.name.replace(/[^a-zA-Z0-9]/g, '_')}[\`${cls.name}\`]\n`;
            }
            mermaid += `    end\n`;
        }
        
        // 类关系
        for (const dep of result.dependencies.slice(0, 30)) {
            const fromId = dep.from.replace(/[^a-zA-Z0-9]/g, '_');
            const toId = dep.to.replace(/[^a-zA-Z0-9]/g, '_');
            
            if (dep.type === 'extends') {
                mermaid += `    ${fromId} -->|extends| ${toId}\n`;
            } else {
                mermaid += `    ${fromId} ..>|implements| ${toId}\n`;
            }
        }
        
        return mermaid;
    }

    /**
     * 生成 Spring Boot 分层架构图
     */
    generateSpringLayersDiagram(result) {
        const layers = {
            controller: result.annotations.spring.filter(a => a.name === 'Controller' || a.name === 'RestController'),
            service: result.annotations.spring.filter(a => a.name === 'Service'),
            repository: result.annotations.spring.filter(a => a.name === 'Repository'),
            component: result.annotations.spring.filter(a => a.name === 'Component' || a.name === 'Configuration')
        };
        
        let mermaid = 'graph LR\n';
        mermaid += '    subgraph Controller层\n';
        mermaid += `        C[${layers.controller.length} Controllers]\n`;
        mermaid += '    end\n';
        mermaid += '    subgraph Service层\n';
        mermaid += `        S[${layers.service.length} Services]\n`;
        mermaid += '    end\n';
        mermaid += '    subgraph DAO层\n';
        mermaid += `        D[${layers.repository.length} Repositories]\n`;
        mermaid += '    end\n';
        mermaid += '    C -->|调用| S\n';
        mermaid += '    S -->|调用| D\n';
        
        return mermaid;
    }
}

// 导出到全局
window.JavaParser = JavaParser;
