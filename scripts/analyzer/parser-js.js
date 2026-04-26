/**
 * JavaScript/TypeScript 代码解析器
 * 解析 Vue、React、Angular 等前端项目的组件、路由、状态管理等
 */

class JsParser {
    constructor() {
        this.patterns = {
            // ES6 类
            es6Class: /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g,
            
            // 函数声明
            function: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
            
            // 箭头函数/变量函数
            arrowFunction: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
            
            // import 语句
            importNamed: /import\s+\{?\s*([^}]+)\s*\}?\s+from\s+['"]([^'"]+)['"]/g,
            importDefault: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
            importAll: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
            
            // export 语句
            exportDefault: /export\s+default\s+(?:class|function|const|let)?\s*(\w+)?/g,
            exportNamed: /export\s+(?:class|function|const|let|var|interface|type)\s+(\w+)/g,
            
            // React 相关
            reactComponent: /(?:export\s+)?(?:default\s+)?(?:const|function)\s+(\w+)(?:\s*(?:=|:))\s*(?:(?:\([^)]*\)\s*)?=>|function)/g,
            reactFC: /(?:export\s+)?(?:default\s+)?(?:const|function)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*)?(?:\:\s*(?:React\.)?FC)?/g,
            reactHook: /(?:const|let)\s+(use\w+)\s*=/g,
            reactUseState: /useState\s*<([^>]+)>/g,
            reactUseEffect: /useEffect\s*\(\s*(?:\(\s*\)\s*=>|function)/g,
            
            // Vue 相关
            vueComponent: /(?:export\s+default\s+)?\{(?:\s*name:\s*['"](\w+)['"])?/g,
            vueData: /data\s*\(\s*\)\s*\{/g,
            vueMethod: /methods\s*:\s*\{/g,
            vueComputed: /computed\s*:\s*\{/g,
            vueWatch: /watch\s*:\s*\{/g,
            vueProps: /props\s*:\s*(?:\{|【)/g,
            vueEmit: /emits\s*:\s*\[/g,
            
            // Vue 3 Composition API
            vueScriptSetup: /<script\s+setup/g,
            vueRef: /ref\s*\(/g,
            vueReactive: /reactive\s*\(/g,
            vueOnMounted: /onMounted\s*\(/g,
            vueWatchEffect: /watchEffect\s*\(/g,
            
            // Angular 相关
            ngComponent: /@Component\s*\(/g,
            ngService: /@Injectable\s*\(/g,
            ngModule: /@NgModule\s*\(/g,
            ngRoute: /@Route\w*\s*\(/g,
            
            // 文件注释
            comment: /\/\*\*[\s\S]*?\*\//,
            
            // 路由配置
            vueRouter: /(?:path|component|components|children)\s*:\s*['"]([^'"]+)['"]/g,
            reactRouter: /<Route(?:\s+[^>]*)?\s+path=['"]([^'"]+)['"]/g,
            
            // 状态管理 (Redux/Vuex)
            reduxAction: /(?:const|function)\s+(\w+)\s*(?:=|:)\s*(?:async\s+)?\([^)]*\)\s*(?:=>|{)/g,
            vuexMutation: /(?:const|let)\s+(\w+)\s*(?:=|:)\s*\(state/,
            vuexAction: /(?:const|let)\s+(\w+)\s*(?:=|:)\s*\(\{commit/,
            
            // API 调用
            apiCall: /(?:axios\.|fetch\(|await\s+)([A-Z]\w+\.(?:get|post|put|delete|patch))\s*\(/g,
            
            // TypeScript 类型
            tsInterface: /interface\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g,
            tsType: /type\s+(\w+)\s*=/g,
            tsEnum: /enum\s+(\w+)/g,
            tsGeneric: /<(\w+)<([^>]+)>>/g,
            
            // 装饰器 (NestJS 等)
            decorator: /@(\w+)(?:\([^)]*\))?/g
        };
        
        // 框架检测
        this.frameworkPatterns = {
            vue: ['vue', 'vuex', '@vue', 'create-vue'],
            react: ['react', 'react-dom', '@types/react'],
            angular: ['@angular/core', 'ng_modules'],
            nextjs: ['next', 'next.config'],
            nuxt: ['nuxt', '@nuxt'],
            svelte: ['svelte']
        };
    }

    /**
     * 分析 JavaScript/TypeScript 项目
     */
    async analyze(files, fileMap, projectType) {
        const result = {
            framework: this.detectFramework(files),
            components: [],
            routes: [],
            hooks: [],
            services: [],
            stores: [],
            imports: [],
            exports: [],
            apiCalls: [],
            dependencies: new Map()
        };
        
        // 过滤代码文件
        const codeFiles = files.filter(f => {
            const ext = f.path.split('.').pop().toLowerCase();
            return ['js', 'jsx', 'ts', 'tsx', 'vue'].includes(ext);
        });
        
        for (const file of codeFiles) {
            const content = file.content || '';
            const fileInfo = this.parseFile(content, file.path);
            
            // 收集组件
            result.components.push(...fileInfo.components.map(c => ({
                ...c,
                path: file.path
            })));
            
            // 收集路由
            result.routes.push(...fileInfo.routes.map(r => ({
                ...r,
                path: file.path
            })));
            
            // 收集 Hooks
            result.hooks.push(...fileInfo.hooks.map(h => ({
                ...h,
                path: file.path
            })));
            
            // 收集服务/API
            result.services.push(...fileInfo.services.map(s => ({
                ...s,
                path: file.path
            })));
            
            // 收集状态管理
            result.stores.push(...fileInfo.stores.map(s => ({
                ...s,
                path: file.path
            })));
            
            // 收集导入
            result.imports.push(...fileInfo.imports.map(i => ({
                ...i,
                    from: file.path
            })));
            
            // 收集导出
            result.exports.push(...fileInfo.exports.map(e => ({
                ...e,
                from: file.path
            })));
            
            // 收集 API 调用
            result.apiCalls.push(...fileInfo.apiCalls.map(a => ({
                ...a,
                    from: file.path
            })));
            
            // 收集依赖
            for (const [dep, version] of Object.entries(fileInfo.dependencies)) {
                if (!result.dependencies.has(dep)) {
                    result.dependencies.set(dep, { version, usedIn: [] });
                }
                result.dependencies.get(dep).usedIn.push(file.path);
            }
        }
        
        // 去重
        result.components = this.deduplicate(result.components);
        result.routes = this.deduplicate(result.routes);
        result.hooks = this.deduplicate(result.hooks);
        result.services = this.deduplicate(result.services);
        result.stores = this.deduplicate(result.stores);
        
        // 分析模块依赖关系
        result.dependencies = this.analyzeModuleDependencies(result);
        
        // 统计
        result.stats = {
            totalComponents: result.components.length,
            totalRoutes: result.routes.length,
            totalHooks: result.hooks.length,
            totalServices: result.services.length,
            totalStores: result.stores.length,
            detectedFramework: result.framework
        };
        
        return result;
    }

    /**
     * 检测前端框架
     */
    detectFramework(files) {
        const frameworkCounts = {};
        
        for (const file of files) {
            const content = (file.content || '').toLowerCase();
            const path = file.path.toLowerCase();
            
            for (const [framework, patterns] of Object.entries(this.frameworkPatterns)) {
                for (const pattern of patterns) {
                    if (content.includes(pattern) || path.includes(pattern)) {
                        frameworkCounts[framework] = (frameworkCounts[framework] || 0) + 1;
                    }
                }
            }
            
            // 检测 Vue 特定文件
            if (file.path.endsWith('.vue')) {
                frameworkCounts['vue'] = (frameworkCounts['vue'] || 0) + 5;
            }
            
            // 检测 React 特定文件
            if (file.path.endsWith('.tsx') || file.path.endsWith('.jsx')) {
                frameworkCounts['react'] = (frameworkCounts['react'] || 0) + 3;
            }
        }
        
        // 返回得分最高的框架
        const sorted = Object.entries(frameworkCounts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 && sorted[0][1] > 0 ? sorted[0][0] : 'vanilla';
    }

    /**
     * 解析单个文件
     */
    parseFile(content, path) {
        const isVue = path.endsWith('.vue');
        const isTs = path.endsWith('.ts') || path.endsWith('.tsx');
        const isJsx = path.endsWith('.jsx') || path.endsWith('.tsx');
        
        const result = {
            components: [],
            routes: [],
            hooks: [],
            services: [],
            stores: [],
            imports: [],
            exports: [],
            apiCalls: [],
            dependencies: {}
        };
        
        // 提取依赖声明
        const packageMatch = content.match(/(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        if (packageMatch) {
            for (const match of packageMatch) {
                const depMatch = match.match(/['"]([^'"]+)['"]/);
                if (depMatch) {
                    result.dependencies[depMatch[1]] = null;
                }
            }
        }
        
        // 根据文件类型选择解析策略
        if (isVue) {
            this.parseVueFile(content, result);
        } else if (isJsx || (isTs && content.includes('React'))) {
            this.parseReactFile(content, result);
        } else {
            this.parseJsFile(content, result);
        }
        
        // 通用解析
        this.parseImports(content, result);
        this.parseExports(content, result);
        this.parseApiCalls(content, result);
        
        return result;
    }

    /**
     * 解析 Vue 文件
     */
    parseVueFile(content, result) {
        // 提取 script 部分
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        const scriptContent = scriptMatch ? scriptMatch[1] : '';
        
        // 提取 template 部分
        const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
        const templateContent = templateMatch ? templateMatch[1] : '';
        
        // 检测组件名称
        const nameMatch = scriptContent.match(/name:\s*['"](\w+)['"]/);
        const fileName = 'Component'; // 默认名
        
        result.components.push({
            name: nameMatch ? nameMatch[1] : fileName,
            type: 'Vue Component',
            hasScriptSetup: scriptContent.includes('setup'),
            hasProps: scriptContent.includes('props'),
            hasData: scriptContent.includes('data('),
            hasComputed: scriptContent.includes('computed'),
            hasMethods: scriptContent.includes('methods'),
            hasLifecycle: scriptContent.includes('onMounted') || scriptContent.includes('mounted'),
            hasAsync: scriptContent.includes('async') || scriptContent.includes('await')
        });
        
        // 提取路由
        this.parseVueRoutes(templateContent, result);
        
        // 提取 API 调用
        this.parseApiCalls(scriptContent, result);
    }

    /**
     * 解析 Vue 路由
     */
    parseVueRoutes(templateContent, result) {
        // Vue Router 配置方式
        const routes = templateContent.match(/path:\s*['"]([^'"]+)['"]/g);
        if (routes) {
            for (const route of routes) {
                const pathMatch = route.match(/['"]([^'"]+)['"]/);
                if (pathMatch) {
                    result.routes.push({
                        path: pathMatch[1],
                        type: 'route'
                    });
                }
            }
        }
        
        // Router-Link
        const routerLinks = templateContent.match(/<router-link[^>]*to=['"]([^'"]+)['"]/g);
        if (routerLinks) {
            for (const link of routerLinks) {
                const toMatch = link.match(/to=['"]([^'"]+)['"]/);
                if (toMatch) {
                    result.routes.push({
                        path: toMatch[1],
                        type: 'link'
                    });
                }
            }
        }
    }

    /**
     * 解析 React 文件
     */
    parseReactFile(content, result) {
        // 提取组件
        const componentMatches = content.matchAll(/(?:export\s+)?(?:default\s+)?(?:const|function)\s+(\w+)(?:\s*=\s*(?:\([^)]*\)\s*)?(?::\s*(?:React\.)?FC)?|:?\s*(?:\([^)]*\)\s*)?=>|function\s+(\w+))/g);
        
        for (const match of componentMatches) {
            const componentName = match[1] || match[2];
            if (componentName && !this.isCommonWord(componentName)) {
                result.components.push({
                    name: componentName,
                    type: 'React Component',
                    isFunctional: content.includes('=>') || content.includes('function ' + componentName),
                    isClass: content.includes('extends React.Component') || content.includes('extends Component'),
                    hasHooks: this.detectReactHooks(content).length > 0
                });
            }
        }
        
        // 提取 Hooks
        const hooks = this.detectReactHooks(content);
        result.hooks.push(...hooks);
        
        // 提取路由
        this.parseReactRoutes(content, result);
        
        // 提取 Redux 相关
        this.parseRedux(content, result);
    }

    /**
     * 检测 React Hooks
     */
    detectReactHooks(content) {
        const hooks = [];
        const hookMatches = content.matchAll(/(?:const|let)\s+(use\w+)\s*=/g);
        
        for (const match of hookMatches) {
            const hookName = match[1];
            hooks.push({
                name: hookName,
                type: this.categorizeHook(hookName)
            });
        }
        
        return hooks;
    }

    /**
     * 分类 Hook
     */
    categorizeHook(hookName) {
        if (hookName.startsWith('useState')) return 'state';
        if (hookName.startsWith('useEffect')) return 'effect';
        if (hookName.startsWith('useCallback')) return 'memoization';
        if (hookName.startsWith('useMemo')) return 'memoization';
        if (hookName.startsWith('useRef')) return 'ref';
        if (hookName.startsWith('useContext')) return 'context';
        if (hookName.startsWith('useReducer')) return 'state';
        if (hookName.startsWith('useSelector') || hookName.startsWith('useDispatch')) return 'redux';
        if (hookName.startsWith('useQuery') || hookName.startsWith('useMutation')) return 'query';
        return 'custom';
    }

    /**
     * 解析 React 路由
     */
    parseReactRoutes(content, result) {
        // Route 组件
        const routeMatches = content.matchAll(/<Route(?:\s+[^>]*)?\s+path=['"]([^'"]+)['"](?:\s+[^>]*)?component=\{(\w+)\}/g);
        for (const match of routeMatches) {
            result.routes.push({
                path: match[1],
                component: match[2],
                type: 'Route'
            });
        }
        
        // useNavigate
        const navMatches = content.matchAll(/useNavigate\s*\(\s*\)/g);
        for (const match of navMatches) {
            result.routes.push({
                type: 'navigation'
            });
        }
    }

    /**
     * 解析 Redux
     */
    parseRedux(content, result) {
        // useSelector / useDispatch
        if (content.includes('useSelector') || content.includes('useDispatch')) {
            result.stores.push({
                name: 'Redux Store',
                type: 'redux'
            });
        }
        
        // Redux Toolkit
        if (content.includes('createSlice') || content.includes('createAsyncThunk')) {
            result.stores.push({
                name: 'Redux Toolkit Slice',
                type: 'rtk'
            });
        }
    }

    /**
     * 解析普通 JS 文件
     */
    parseJsFile(content, result) {
        // 提取函数
        const functionMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g);
        for (const match of functionMatches) {
            result.services.push({
                name: match[1],
                type: 'function'
            });
        }
        
        // 提取常量/变量函数
        const varMatches = content.matchAll(/(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/g);
        for (const match of varMatches) {
            const name = match[1];
            if (!this.isCommonWord(name) && !name.startsWith('_')) {
                result.services.push({
                    name: name,
                    type: 'variable function'
                });
            }
        }
    }

    /**
     * 解析 import 语句
     */
    parseImports(content, result) {
        let match;
        
        // 命名导入
        this.patterns.importNamed.lastIndex = 0;
        while ((match = this.patterns.importNamed.exec(content)) !== null) {
            result.imports.push({
                type: 'named',
                names: match[1].split(',').map(n => n.trim()),
                from: match[2]
            });
        }
        
        // 默认导入
        this.patterns.importDefault.lastIndex = 0;
        while ((match = this.patterns.importDefault.exec(content)) !== null) {
            result.imports.push({
                type: 'default',
                name: match[1],
                from: match[2]
            });
        }
        
        // 全局导入
        this.patterns.importAll.lastIndex = 0;
        while ((match = this.patterns.importAll.exec(content)) !== null) {
            result.imports.push({
                type: 'namespace',
                name: match[1],
                from: match[2]
            });
        }
    }

    /**
     * 解析 export 语句
     */
    parseExports(content, result) {
        let match;
        
        // 默认导出
        this.patterns.exportDefault.lastIndex = 0;
        while ((match = this.patterns.exportDefault.exec(content)) !== null) {
            result.exports.push({
                type: 'default',
                name: match[1] || 'anonymous'
            });
        }
        
        // 命名导出
        this.patterns.exportNamed.lastIndex = 0;
        while ((match = this.patterns.exportNamed.exec(content)) !== null) {
            result.exports.push({
                type: 'named',
                name: match[1]
            });
        }
    }

    /**
     * 解析 API 调用
     */
    parseApiCalls(content, result) {
        const apiPatterns = [
            /\baxios\.(get|post|put|delete|patch|head|options)\s*\(/g,
            /\bfetch\s*\(/g,
            /\bhttp\.(get|post|put|delete|patch)\s*\(/g,
            /\bapi\.(\w+)\s*\(/g
        ];
        
        for (const pattern of apiPatterns) {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(content)) !== null) {
                const method = match[1] || 'request';
                if (!result.apiCalls.some(a => a.method === method && a.from === content.substring(match.index - 20, match.index + 50).includes(match[0]))) {
                    result.apiCalls.push({
                        method: method,
                        url: this.extractUrl(content, match.index)
                    });
                }
            }
        }
    }

    /**
     * 提取 URL
     */
    extractUrl(content, index) {
        // 简单提取：找到最近的字符串
        const before = content.substring(Math.max(0, index - 200), index);
        const after = content.substring(index, index + 200);
        
        const combined = before + after;
        const urlMatch = combined.match(/['"]([^'"]+)['"]/);
        
        if (urlMatch) {
            const fullMatch = before + urlMatch[0];
            return fullMatch.substring(fullMatch.lastIndexOf("'") + 1 || fullMatch.lastIndexOf('"') + 1);
        }
        
        return null;
    }

    /**
     * 分析模块依赖关系
     */
    analyzeModuleDependencies(result) {
        const deps = [];
        const moduleMap = new Map();
        
        // 建立模块映射
        for (const comp of result.components) {
            moduleMap.set(comp.name, { type: 'component', path: comp.path });
        }
        for (const svc of result.services) {
            moduleMap.set(svc.name, { type: 'service', path: svc.path });
        }
        
        // 分析依赖
        for (const imp of result.imports) {
            const importedFrom = imp.from;
            const moduleName = importedFrom.split('/').pop().replace(/['"]/g, '');
            
            for (const impName of (imp.names || [imp.name])) {
                if (moduleMap.has(impName)) {
                    deps.push({
                        from: moduleName,
                        to: impName,
                        type: 'import'
                    });
                }
            }
        }
        
        return deps;
    }

    /**
     * 去重
     */
    deduplicate(arr) {
        const seen = new Set();
        return arr.filter(item => {
            const key = item.name;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * 判断是否为常见词
     */
    isCommonWord(word) {
        const common = ['if', 'else', 'for', 'while', 'switch', 'try', 'catch', 'finally', 'return', 'break', 'continue', 'class', 'function', 'const', 'let', 'var', 'true', 'false', 'null', 'undefined', 'new', 'this', 'super', 'extends', 'import', 'export', 'from', 'default', 'async', 'await', 'yield', 'static', 'get', 'set'];
        return common.includes(word);
    }

    /**
     * 生成组件关系图
     */
    generateComponentDiagram(result) {
        let mermaid = 'graph TD\n';
        
        // 按文件分组
        const byPath = new Map();
        for (const comp of result.components) {
            const dir = comp.path.split('/').slice(0, -1).join('/') || 'root';
            if (!byPath.has(dir)) {
                byPath.set(dir, []);
            }
            byPath.get(dir).push(comp);
        }
        
        // 创建子图
        for (const [dir, comps] of byPath) {
            if (comps.length > 0) {
                mermaid += `    subgraph ${dir || 'components'}\n`;
                for (const comp of comps.slice(0, 10)) {
                    const id = comp.name.replace(/[^a-zA-Z0-9]/g, '_');
                    mermaid += `        ${id}((${comp.name}))\n`;
                }
                mermaid += `    end\n`;
            }
        }
        
        // 组件关系 (基于 import)
        for (const dep of result.dependencies.slice(0, 20)) {
            const fromId = dep.from.replace(/[^a-zA-Z0-9]/g, '_');
            const toId = dep.to.replace(/[^a-zA-Z0-9]/g, '_');
            mermaid += `    ${fromId} --> ${toId}\n`;
        }
        
        return mermaid;
    }

    /**
     * 生成路由图
     */
    generateRoutesDiagram(result) {
        let mermaid = 'graph LR\n';
        
        // 首页
        mermaid += '    Home((/))\n';
        
        for (const route of result.routes.slice(0, 15)) {
            if (route.path && route.path !== '/') {
                const pathId = route.path.replace(/[^a-zA-Z0-9]/g, '_').replace(/__/g, '_');
                mermaid += `    ${pathId}((${route.path}))\n`;
                mermaid += `    Home --> ${pathId}\n`;
            }
        }
        
        return mermaid;
    }
}

// 导出到全局
window.JsParser = JsParser;
