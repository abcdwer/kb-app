/**
 * 工具函数模块
 */

// ===== 日期时间工具 =====

/**
 * 格式化日期时间
 */
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // 小于1分钟
    if (diff < 60000) {
        return '刚刚';
    }
    
    // 小于1小时
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
    }
    
    // 小于24小时
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
    }
    
    // 小于7天
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}天前`;
    }
    
    // 超过7天，显示具体日期
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (year === now.getFullYear()) {
        return `${month}-${day}`;
    }
    
    return `${year}-${month}-${day}`;
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 获取今天开始时间
 */
function getTodayStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

/**
 * 获取本周开始时间
 */
function getWeekStart() {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek + 1);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

/**
 * 获取本月开始时间
 */
function getMonthStart() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
}

/**
 * 判断内容属于哪个时间分类
 */
function getTimeCategory(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = getTodayStart();
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();
    
    if (date >= today) {
        return 'today';
    } else if (date >= weekStart) {
        return 'week';
    } else if (date >= monthStart) {
        return 'month';
    } else {
        return 'older';
    }
}

// ===== 文件工具 =====

/**
 * 读取文件内容
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        
        reader.onerror = () => {
            reject(new Error('读取文件失败'));
        };
        
        // 根据文件类型选择读取方式
        if (file.type.startsWith('text/') || 
            file.name.endsWith('.md') || 
            file.name.endsWith('.html') || 
            file.name.endsWith('.htm')) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    });
}

/**
 * 读取文件为文本
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        
        reader.onerror = () => {
            reject(new Error('读取文件失败'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

/**
 * 获取文件类型
 */
function getFileType(filename) {
    const ext = getFileExtension(filename);
    
    if (['md', 'markdown'].includes(ext)) {
        return 'markdown';
    }
    
    if (['html', 'htm'].includes(ext)) {
        return 'html';
    }
    
    return 'unknown';
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== DOM 工具 =====

/**
 * 创建元素
 */
function createElement(tag, className, innerHTML) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

/**
 * 显示模态框
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * 隐藏模态框
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * 隐藏所有模态框
 */
function hideAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// ===== Toast 通知 =====

const toastContainer = document.getElementById('toastContainer');

/**
 * 显示Toast通知
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = createElement('div', `toast ${type}`);
    
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // 自动移除
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// ===== 确认对话框 =====

let confirmCallback = null;

/**
 * 显示确认对话框
 */
function showConfirm(message, callback) {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    messageEl.textContent = message;
    confirmCallback = callback;
    
    showModal('confirmModal');
}

// ===== 防抖和节流 =====

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== URL 工具 =====

/**
 * 获取URL的基础域名
 */
function getDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return url;
    }
}

/**
 * 检查URL是否有效
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// ===== 文本工具 =====

/**
 * 生成随机字符串
 */
function generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 转义HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 去除HTML标签
 */
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

// ===== 复制工具 =====

/**
 * 复制文本到剪贴板
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板', 'success');
        return true;
    } catch (err) {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            showToast('已复制到剪贴板', 'success');
            return true;
        } catch (e) {
            showToast('复制失败', 'error');
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

// ===== 下载工具 =====

/**
 * 下载文件
 */
function downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * 下载JSON文件
 */
function downloadJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, filename, 'application/json');
}

// ===== 主题工具 =====

/**
 * 切换主题
 */
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    return newTheme;
}

/**
 * 初始化主题
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
}

// ===== 搜索工具 =====

/**
 * 简单的全文搜索
 */
function searchContents(contents, query, options = {}) {
    const { 
        includeTitle = true,
        includeContent = true,
        includeTags = true,
        caseSensitive = false 
    } = options;
    
    if (!query || !query.trim()) {
        return contents;
    }
    
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    
    return contents.filter(item => {
        if (includeTitle) {
            const title = caseSensitive ? item.title : (item.title || '').toLowerCase();
            if (title.includes(searchTerm)) return true;
        }
        
        if (includeContent) {
            const content = caseSensitive ? item.content : (item.content || '').toLowerCase();
            if (content.includes(searchTerm)) return true;
        }
        
        if (includeTags && item.tags) {
            const tags = item.tags.map(t => caseSensitive ? t : t.toLowerCase());
            if (tags.some(tag => tag.includes(searchTerm))) return true;
        }
        
        return false;
    });
}

// ===== 事件工具 =====

/**
 * 绑定键盘快捷键
 */
function bindKeyboardShortcut(key, callback, options = {}) {
    const { ctrl = false, shift = false, alt = false } = options;
    
    document.addEventListener('keydown', (e) => {
        const match = 
            e.key.toLowerCase() === key.toLowerCase() &&
            !!ctrl === (e.ctrlKey || e.metaKey) &&
            !!shift === e.shiftKey &&
            !!alt === e.altKey;
        
        if (match) {
            e.preventDefault();
            callback(e);
        }
    });
}

// ===== 本地存储 =====

const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('localStorage set error:', e);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error('localStorage get error:', e);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }
};

// ===== 导出 =====

window.utils = {
    // 日期
    formatDateTime,
    formatDate,
    getTimeCategory,
    getTodayStart,
    getWeekStart,
    getMonthStart,
    
    // 文件
    readFileContent,
    readFileAsText,
    getFileExtension,
    getFileType,
    formatFileSize,
    
    // DOM
    createElement,
    showModal,
    hideModal,
    hideAllModals,
    
    // Toast
    showToast,
    
    // 确认
    showConfirm,
    
    // 防抖节流
    debounce,
    throttle,
    
    // URL
    getDomain,
    isValidUrl,
    
    // 文本
    generateRandomString,
    escapeHtml,
    stripHtml,
    
    // 复制下载
    copyToClipboard,
    downloadFile,
    downloadJson,
    
    // 主题
    toggleTheme,
    initTheme,
    
    // 搜索
    searchContents,
    
    // 键盘
    bindKeyboardShortcut,
    
    // 存储
    storage
};
