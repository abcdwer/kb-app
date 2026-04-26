/**
 * CORS 代理服务
 * 用于解决网页抓取的跨域问题
 * 
 * 使用方法：
 * 1. npm install
 * 2. node proxy.js
 * 3. 默认运行在 http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 允许的来源
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['*'];

// CORS 配置
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-Target-Url']
}));

app.use(express.json());

// 健康检查
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Knowledge Base Proxy',
        version: '1.0.0',
        endpoints: {
            fetch: 'POST /fetch - Fetch webpage content',
            proxy: 'GET /proxy?url=<url> - Proxy webpage'
        }
    });
});

/**
 * POST /fetch
 * 获取网页内容并解析
 * 
 * Body: { url: string }
 * Response: { success: boolean, data?: object, error?: string }
 */
app.post('/fetch', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'URL is required'
        });
    }

    // 验证 URL
    try {
        new URL(url);
    } catch (e) {
        return res.status(400).json({
            success: false,
            error: 'Invalid URL format'
        });
    }

    try {
        // 获取网页
        const response = await fetch(url, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // 解析 HTML
        const $ = cheerio.load(html);

        // 移除不需要的元素
        $('script, style, nav, footer, header, aside, iframe, noscript, svg, canvas, video, audio').remove();

        // 提取标题
        let title = $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('h1').first().text() ||
            $('title').text() ||
            '无标题';

        title = title.trim();

        // 提取正文内容
        let content = '';
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

        for (const selector of contentSelectors) {
            const el = $(selector);
            if (el.length && el.text().trim().length > 200) {
                content = el.html();
                break;
            }
        }

        if (!content) {
            content = $('body').html() || '';
        }

        // 提取描述
        let description = $('meta[property="og:description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content') ||
            $('meta[name="description"]').attr('content') ||
            '';

        // 提取图片
        const images = [];
        const seenUrls = new Set();

        // OG 图片
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage) {
            const imgUrl = new URL(ogImage, url).href;
            if (!seenUrls.has(imgUrl)) {
                images.push(imgUrl);
                seenUrls.add(imgUrl);
            }
        }

        // 内容图片
        $('img').each((i, el) => {
            const imgSrc = $(el).attr('src') || $(el).attr('data-src');
            if (imgSrc) {
                try {
                    const imgUrl = new URL(imgSrc, url).href;
                    if (!seenUrls.has(imgUrl) && !imgUrl.startsWith('data:')) {
                        images.push(imgUrl);
                        seenUrls.add(imgUrl);
                    }
                } catch (e) {
                    // 忽略无效的 URL
                }
            }
        });

        // 转换 HTML 为 Markdown
        const markdown = htmlToMarkdown(content);

        res.json({
            success: true,
            data: {
                title,
                content,
                markdown,
                description,
                imageUrl: images[0] || '',
                images: images.slice(0, 10),
                sourceUrl: url
            }
        });

    } catch (error) {
        console.error('Fetch error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch webpage'
        });
    }
});

/**
 * GET /proxy
 * 简单的代理转发
 * 
 * Query: url=<url>
 */
app.get('/proxy', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('URL parameter is required');
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        const contentType = response.headers.get('content-type') || 'text/html';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        response.body.pipe(res);

    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).send('Failed to proxy request');
    }
});

/**
 * 简单的 HTML 到 Markdown 转换
 */
function htmlToMarkdown(html) {
    if (!html) return '';

    // 标题
    html = html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n');

    // 段落和换行
    html = html
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n');

    // 强调
    html = html
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

    // 链接
    html = html.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // 图片
    html = html.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi, '![$2]($1)');
    html = html.replace(/<img[^>]*alt=["']([^"']+)["'][^>]*src=["']([^"']+)["'][^>]*>/gi, '![$1]($2)');
    html = html.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '![]($1)');

    // 列表
    html = html.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
    });
    html = html.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let i = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${i++}. $1\n`) + '\n';
    });

    // 引用
    html = html.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
        return content.trim().split('\n').map(line => '> ' + line).join('\n') + '\n\n';
    });

    // 代码
    html = html.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    html = html.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n');

    // 移除所有 HTML 标签
    html = html.replace(/<[^>]+>/g, '');

    // 清理
    html = html
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return html;
}

// 错误处理
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   📚 Knowledge Base Proxy Server                         ║
║                                                          ║
║   Server running at: http://localhost:${PORT}              ║
║                                                          ║
║   Endpoints:                                             ║
║   - POST /fetch    : Fetch and parse webpage             ║
║   - GET  /proxy    : Simple URL proxy                    ║
║                                                          ║
║   Press Ctrl+C to stop                                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    process.exit(0);
});
