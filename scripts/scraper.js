/**
 * 网页抓取模块
 * 处理URL内容的抓取和解析
 */

// CORS代理配置 - 按优先级排序
const CORS_PROXIES = [
    { name: 'allorigins', fn: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
    { name: 'corsproxy', fn: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
    { name: 'cors-anywhere', fn: (url) => `https://cors-anywhere.herokuapp.com/${url}` }
];

/**
 * 网页抓取器类
 */
class WebScraper {
    constructor() {
        this.currentProxyIndex = 0;
    }

    /**
     * 获取CORS代理URL
     */
    getProxyUrl(originalUrl, proxyIndex = 0) {
        if (proxyIndex >= 0 && proxyIndex < CORS_PROXIES.length) {
            return CORS_PROXIES[proxyIndex].fn(originalUrl);
        }
        return null;
    }

    /**
     * 单次抓取尝试
     */
    async fetchOnce(url, options = {}) {
        const { 
            useProxy = true, 
            proxyIndex = 0,
            customProxyUrl = null,
            timeout = 15000 
        } = options;

        let fetchUrl = url;
        let usedProxy = false;

        // 如果使用代理
        if (useProxy) {
            if (customProxyUrl) {
                fetchUrl = `${customProxyUrl}${customProxyUrl.endsWith('/') ? '' : '/'}${encodeURIComponent(url)}`;
                usedProxy = true;
            } else {
                const proxyUrl = this.getProxyUrl(url, proxyIndex);
                if (proxyUrl) {
                    fetchUrl = proxyUrl;
                    usedProxy = true;
                }
            }
        }

        // 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(fetchUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            
            // 如果使用了代理，可能需要处理相对URL
            if (usedProxy) {
                const baseTag = `<base href="${new URL(url).origin}">`;
                if (!html.includes('<base')) {
                    const headMatch = html.match(/<head([^>]*)>/i);
                    if (headMatch) {
                        const insertPos = headMatch.index + headMatch[0].length;
                        return {
                            html: html.slice(0, insertPos) + baseTag + html.slice(insertPos),
                            usedProxy,
                            proxyIndex,
                            originalUrl: url
                        };
                    }
                }
            }

            return {
                html,
                usedProxy,
                proxyIndex,
                originalUrl: url
            };

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * 抓取网页内容 - 自动重试多个代理
     */
    async fetchPage(url, options = {}) {
        const { 
            useProxy = true, 
            customProxyUrl = null,
            maxRetries = 3
        } = options;

        // 验证URL
        if (!utils.isValidUrl(url)) {
            throw new Error('无效的URL格式');
        }

        // 如果有自定义代理，直接使用
        if (customProxyUrl) {
            try {
                return await this.fetchOnce(url, { ...options, customProxyUrl, timeout: 30000 });
            } catch (error) {
                throw new Error(`获取失败：${error.message}`);
            }
        }

        // 不使用代理的情况
        if (!useProxy) {
            try {
                return await this.fetchOnce(url, { ...options, useProxy: false, timeout: 30000 });
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('请求超时，请稍后重试');
                }
                throw error;
            }
        }

        // 使用代理自动重试
        const errors = [];
        for (let i = 0; i < Math.min(maxRetries, CORS_PROXIES.length); i++) {
            const proxyIndex = (this.currentProxyIndex + i) % CORS_PROXIES.length;
            try {
                console.log(`尝试代理 ${CORS_PROXIES[proxyIndex].name}...`);
                const result = await this.fetchOnce(url, { ...options, proxyIndex });
                // 成功后更新默认代理索引
                this.currentProxyIndex = proxyIndex;
                console.log(`代理 ${CORS_PROXIES[proxyIndex].name} 成功`);
                return result;
            } catch (error) {
                const proxyName = CORS_PROXIES[proxyIndex].name;
                const errorMsg = error.name === 'AbortError' ? '超时' : error.message;
                console.warn(`代理 ${proxyName} 失败: ${errorMsg}`);
                errors.push(`${proxyName}: ${errorMsg}`);
            }
        }

        // 所有代理都失败
        throw new Error(`获取失败：所有代理均不可用，请稍后重试`);
    }

    /**
     * 解析网页内容
     */
    parsePage(html, baseUrl = '') {
        try {
            // 创建DOM解析器
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 检查解析是否成功
            if (!doc || !doc.body) {
                throw new Error('DOM解析失败');
            }
            
            // 移除不需要的元素
            const removeSelectors = [
                'script', 'style', 'nav', 'footer', 'header', 'aside',
                'iframe', 'noscript', 'svg', 'canvas', 'video', 'audio',
                '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
                '.nav', '.footer', '.header', '.sidebar', '.menu', '.advertisement',
                '.ad', '.ads', '.social', '.share', '.comment', '.comments'
            ];
            
            removeSelectors.forEach(selector => {
                doc.querySelectorAll(selector).forEach(el => el.remove());
            });

            // 提取标题
            const title = this.extractTitle(doc);

            // 提取正文内容（原始HTML）
            const content = this.extractContent(doc);
            
            // 提取纯文本内容（用于显示）
            const textContent = this.extractTextContent(doc);
            
            // 提取描述和摘要
            const description = this.extractDescription(doc);
            const excerpt = this.generateExcerpt(textContent || description);

            // 提取图片
            const images = this.extractImages(doc, baseUrl);

            // 提取图标
            const favicon = this.extractFavicon(doc, baseUrl);

            return {
                title,
                content,           // 原始HTML内容
                textContent,       // 清理后的纯文本（新增）
                excerpt,           // 干净的摘要（新增）
                description,       // meta描述
                images,
                favicon,
                url: baseUrl
            };
        } catch (error) {
            console.warn('页面解析失败，降级为纯文本提取:', error.message);
            
            // 降级方案：使用正则提取纯文本，避免innerHTML解析
            let textContent = html
                // 移除script和style标签及其内容
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                // 移除所有HTML标签
                .replace(/<[^>]+>/g, ' ')
                // 解码常见HTML实体
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                // 清理多余空白
                .replace(/\s+/g, ' ')
                .trim();
            
            // 尝试提取标题
            let title = '无标题';
            const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
            }
            
            return {
                title,
                content: '',
                textContent: textContent,
                excerpt: textContent.substring(0, 150),
                description: '',
                images: [],
                favicon: '',
                url: baseUrl
            };
        }
    }

    /**
     * 提取标题
     */
    extractTitle(doc) {
        // 优先使用Open Graph标题
        const ogTitle = doc.querySelector('meta[property="og:title"]');
        if (ogTitle) return ogTitle.content;

        // 其次使用Twitter标题
        const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) return twitterTitle.content;

        // 使用普通标题
        const titleEl = doc.querySelector('h1');
        if (titleEl) return titleEl.textContent.trim();

        const docTitle = doc.querySelector('title');
        if (docTitle) return docTitle.textContent.trim();

        return '无标题';
    }

    /**
     * 提取正文内容
     */
    extractContent(doc) {
        // 尝试常见的内容容器选择器
        const contentSelectors = [
            'article',
            '[role="main"]',
            'main',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.content',
            '.post',
            '.article',
            '#content',
            '#main'
        ];

        let contentEl = null;

        for (const selector of contentSelectors) {
            contentEl = doc.querySelector(selector);
            if (contentEl && contentEl.textContent.trim().length > 200) {
                break;
            }
        }

        // 如果没有找到合适的内容容器，尝试获取body
        if (!contentEl || contentEl.textContent.trim().length < 200) {
            contentEl = doc.body;
        }

        if (!contentEl) {
            return '';
        }

        // 清理内容
        let content = contentEl.innerHTML;
        
        // 移除不需要的标签和属性
        content = this.cleanHtml(content);

        return content;
    }

    /**
     * 清理HTML
     */
    cleanHtml(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            if (!doc || !doc.body) {
                throw new Error('DOM解析失败');
            }
            
            // 移除不需要的属性
            const allowedAttrs = ['href', 'src', 'alt', 'title', 'srcset', 'loading'];
            doc.querySelectorAll('*').forEach(el => {
                const attrs = [...el.attributes];
                attrs.forEach(attr => {
                    if (!allowedAttrs.includes(attr.name) && !attr.name.startsWith('data-')) {
                        el.removeAttribute(attr.name);
                    }
                });
                
                // 保留的标签
                const allowedTags = [
                    'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
                    'a', 'strong', 'em', 'b', 'i', 'u', 's',
                    'code', 'pre', 'blockquote',
                    'img', 'figure', 'figcaption',
                    'table', 'thead', 'tbody', 'tr', 'th', 'td',
                    'div', 'span', 'section', 'article'
                ];
                
                if (!allowedTags.includes(el.tagName.toLowerCase())) {
                    // 保留文本内容
                    while (el.firstChild) {
                        el.parentNode.insertBefore(el.firstChild, el);
                    }
                    el.remove();
                }
            });

            // 转换图片URL为绝对路径
            doc.querySelectorAll('img').forEach(img => {
                if (img.src && !img.src.startsWith('http')) {
                    img.remove();
                }
            });

            return doc.body.innerHTML;
        } catch (error) {
            console.warn('HTML清理失败，降级为纯文本:', error.message);
            // 降级：使用正则移除HTML标签，避免innerHTML解析
            return html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim() || html;
        }
    }

    /**
     * 提取描述
     */
    extractDescription(doc) {
        // 优先使用Open Graph描述
        const ogDesc = doc.querySelector('meta[property="og:description"]');
        if (ogDesc && ogDesc.content) return this.cleanText(ogDesc.content);

        // 其次使用Twitter描述
        const twitterDesc = doc.querySelector('meta[name="twitter:description"]');
        if (twitterDesc && twitterDesc.content) return this.cleanText(twitterDesc.content);

        // 使用meta描述
        const metaDesc = doc.querySelector('meta[name="description"]');
        if (metaDesc && metaDesc.content) return this.cleanText(metaDesc.content);

        // 从内容中提取纯文本
        const content = doc.body?.textContent || '';
        if (content.length > 100) {
            return this.cleanText(content.substring(0, 200)) + '...';
        }

        return '';
    }

    /**
     * 清理文本，移除CSS/JS代码片段
     */
    cleanText(text) {
        if (!text) return '';
        
        // 移除CSS变量定义
        text = text.replace(/--[a-zA-Z-]+\s*:\s*[^;]+;?/g, '');
        // 移除CSS属性
        text = text.replace(/[a-z-]+\s*:\s*[0-9a-f#%pxem]+\s*;?/gi, '');
        // 移除多余空格
        text = text.replace(/\s+/g, ' ').trim();
        // 如果结果太短或看起来像代码，返回空
        if (text.length < 10 || /^[{}\[\]():;]+$/.test(text)) {
            return '';
        }
        
        return text;
    }
    
    /**
     * 提取纯文本内容（用于展示）
     */
    extractTextContent(doc) {
        // 尝试常见的内容容器选择器
        const contentSelectors = [
            'article',
            '[role="main"]',
            'main',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.content',
            '.post',
            '.article',
            '#content',
            '#main'
        ];

        let contentEl = null;

        for (const selector of contentSelectors) {
            contentEl = doc.querySelector(selector);
            if (contentEl && contentEl.textContent.trim().length > 200) {
                break;
            }
        }

        // 如果没有找到合适的内容容器，尝试获取body
        if (!contentEl || contentEl.textContent.trim().length < 200) {
            contentEl = doc.body;
        }

        if (!contentEl) {
            return '';
        }

        // 获取纯文本
        let text = contentEl.textContent || '';
        
        // 深度清理文本
        text = this.deepCleanText(text);
        
        return text.trim();
    }
    
    /**
     * 深度清理文本，移除CSS/JS/HTML代码片段
     */
    deepCleanText(text) {
        if (!text) return '';
        
        // 移除CSS代码块
        text = text.replace(/\{[\s\S]*?\}/g, ' ');
        
        // 移除JavaScript代码块
        text = text.replace(/function\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/g, ' ');
        text = text.replace(/const\s+\w+\s*=[\s\S]*?;/g, ' ');
        text = text.replace(/let\s+\w+\s*=[\s\S]*?;/g, ' ');
        text = text.replace(/var\s+\w+\s*=[\s\S]*?;/g, ' ');
        
        // 移除HTML标签（防止遗漏）
        text = text.replace(/<[^>]+>/g, ' ');
        
        // 移除CSS变量
        text = text.replace(/--[\w-]+\s*:\s*[^;]+;?/g, ' ');
        
        // 移除CSS属性
        text = text.replace(/[\w-]+\s*:\s*[0-9a-f#%pxemvhvw%!]+;?/gi, ' ');
        
        // 移除URL
        text = text.replace(/https?:\/\/[^\s]+/gi, ' ');
        
        // 移除邮箱
        text = text.replace(/[\w.-]+@[\w.-]+\.\w+/gi, ' ');
        
        // 移除特殊字符组合（明显的代码模式）
        text = text.replace(/\{\s*['"][^'"]*['"]\s*:\s*[^}]+\}/g, ' ');
        text = text.replace(/\[[\s\S]*?\]/g, ' ');
        
        // 清理多余空白
        text = text.replace(/\s+/g, ' ').trim();
        
        // 检查是否看起来像纯代码文本
        const codeRatio = (text.match(/[{}\[\]();:]/g) || []).length / Math.max(text.length, 1);
        if (codeRatio > 0.15) {
            // 如果特殊字符比例过高，尝试提取可读句子
            const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 20);
            if (sentences.length > 0) {
                text = sentences.join('. ');
            }
        }
        
        return text;
    }
    
    /**
     * 生成摘录
     */
    generateExcerpt(text, maxLength = 150) {
        if (!text) return '';
        
        // 清理文本
        let excerpt = this.deepCleanText(text);
        
        // 如果太短，尝试从描述中获取
        if (excerpt.length < 50) {
            return excerpt.substring(0, maxLength) || '内容预览...';
        }
        
        // 截断到合适长度，优先在句子边界截断
        if (excerpt.length <= maxLength) {
            return excerpt;
        }
        
        // 尝试在句号、逗号或空格处截断
        const truncated = excerpt.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastComma = truncated.lastIndexOf(',');
        const lastSpace = truncated.lastIndexOf(' ');
        
        const breakPoint = Math.max(lastPeriod, lastComma, lastSpace);
        if (breakPoint > maxLength * 0.6) {
            return excerpt.substring(0, breakPoint + 1);
        }
        
        return truncated + '...';
    }

    /**
     * 提取图片
     */
    extractImages(doc, baseUrl) {
        const images = [];
        const seen = new Set();

        // 获取OG图片
        const ogImage = doc.querySelector('meta[property="og:image"]');
        if (ogImage && ogImage.content) {
            const url = this.resolveUrl(ogImage.content, baseUrl);
            if (url && !seen.has(url)) {
                images.push(url);
                seen.add(url);
            }
        }

        // 获取内容中的图片
        doc.querySelectorAll('img').forEach(img => {
            const src = img.src || img.dataset.src;
            if (src) {
                const url = this.resolveUrl(src, baseUrl);
                if (url && !seen.has(url) && !url.includes('data:')) {
                    images.push(url);
                    seen.add(url);
                }
            }
        });

        return images.slice(0, 10); // 最多返回10张图片
    }

    /**
     * 提取网站图标
     */
    extractFavicon(doc, baseUrl) {
        const faviconSelectors = [
            'link[rel="icon"]',
            'link[rel="shortcut icon"]',
            'link[rel="apple-touch-icon"]',
            'link[rel="apple-touch-icon-precomposed"]'
        ];

        for (const selector of faviconSelectors) {
            const link = doc.querySelector(selector);
            if (link && link.href) {
                return this.resolveUrl(link.href, baseUrl);
            }
        }

        // 默认favicon路径
        try {
            const url = new URL(baseUrl);
            return `${url.origin}/favicon.ico`;
        } catch {
            return '';
        }
    }

    /**
     * 解析相对URL为绝对URL
     */
    resolveUrl(relativeUrl, baseUrl) {
        if (!relativeUrl) return '';
        
        try {
            // 如果已经是绝对URL
            if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
                return relativeUrl;
            }
            
            // 如果是协议相对URL
            if (relativeUrl.startsWith('//')) {
                return 'https:' + relativeUrl;
            }
            
            // 解析相对URL
            const base = new URL(baseUrl);
            return new URL(relativeUrl, base).href;
        } catch {
            return relativeUrl;
        }
    }

    /**
     * 转换HTML为Markdown
     */
    htmlToMarkdown(html) {
        if (!html) return '';
        
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        // 简化处理：移除复杂标签，保留基本结构
        let text = html
            // 标题
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
            .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
            // 段落
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            // 换行
            .replace(/<br\s*\/?>/gi, '\n')
            // 强调
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            // 链接
            .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            // 图片
            .replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi, '![$2]($1)')
            .replace(/<img[^>]*alt=["']([^"']+)["'][^>]*src=["']([^"']+)["'][^>]*>/gi, '![$1]($2)')
            .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '![]($1)')
            // 列表
            .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
                return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
            })
            .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
                let index = 1;
                return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${index++}. $1\n`) + '\n';
            })
            // 引用
            .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
                return content.trim().split('\n').map(line => '> ' + line).join('\n') + '\n\n';
            })
            // 代码
            .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
            .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n')
            // 分割线
            .replace(/<hr\s*\/?>/gi, '\n---\n\n')
            // 移除其他HTML标签
            .replace(/<[^>]+>/g, '')
            // 清理多余的空行
            .replace(/\n{3,}/g, '\n\n')
            // 解码HTML实体
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();

        return text;
    }

    /**
     * 完整抓取流程
     */
    async scrape(url, options = {}) {
        const { useProxy = true, proxyType = null, customProxyUrl = null } = options;
        
        try {
            // 1. 抓取页面
            const { html, usedProxy } = await this.fetchPage(url, {
                useProxy,
                proxyType,
                customProxyUrl
            });

            // 2. 解析内容
            const parsed = this.parsePage(html, url);

            // 3. 返回完整结果
            return {
                success: true,
                data: {
                    title: parsed.title,
                    content: parsed.content,          // 原始HTML内容
                    textContent: parsed.textContent,  // 清理后的纯文本
                    excerpt: parsed.excerpt,           // 干净的摘要
                    description: parsed.description,  // meta描述
                    imageUrl: parsed.images[0] || parsed.favicon || '',
                    images: parsed.images,
                    sourceUrl: url,
                    usedProxy
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message || '抓取失败'
            };
        }
    }
}

// 创建全局抓取器实例
const scraper = new WebScraper();

// 导出到全局
window.scraper = scraper;
