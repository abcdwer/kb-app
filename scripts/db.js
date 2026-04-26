/**
 * 数据库模块 - IndexedDB 操作封装
 * 管理知识库的所有数据存储
 */

const DB_NAME = 'KnowledgeBaseDB';
const DB_VERSION = 1;

// 对象存储名称
const STORES = {
    CONTENTS: 'contents',      // 文档/网页/笔记内容
    FOLDERS: 'folders',        // 收藏夹
    TAGS: 'tags',              // 标签
    NOTES: 'notes',            // 笔记
    SETTINGS: 'settings'       // 设置
};

class KnowledgeDB {
    constructor() {
        this.db = null;
        this.ready = this._init();
    }

    /**
     * 初始化数据库
     */
    async _init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('数据库打开失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('数据库初始化成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建内容存储
                if (!db.objectStoreNames.contains(STORES.CONTENTS)) {
                    const contentStore = db.createObjectStore(STORES.CONTENTS, { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    contentStore.createIndex('type', 'type', { unique: false });
                    contentStore.createIndex('folderId', 'folderId', { unique: false });
                    contentStore.createIndex('createdAt', 'createdAt', { unique: false });
                    contentStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    contentStore.createIndex('isStandaloneNote', 'isStandaloneNote', { unique: false });
                }

                // 创建收藏夹存储
                if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
                    const folderStore = db.createObjectStore(STORES.FOLDERS, { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    folderStore.createIndex('name', 'name', { unique: true });
                }

                // 创建标签存储
                if (!db.objectStoreNames.contains(STORES.TAGS)) {
                    const tagStore = db.createObjectStore(STORES.TAGS, { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    tagStore.createIndex('name', 'name', { unique: true });
                }

                // 创建笔记存储
                if (!db.objectStoreNames.contains(STORES.NOTES)) {
                    const noteStore = db.createObjectStore(STORES.NOTES, { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    noteStore.createIndex('contentId', 'contentId', { unique: false });
                    noteStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // 创建设置存储
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * 等待数据库就绪
     */
    async waitReady() {
        await this.ready;
        return this.db;
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 通用的增删改查操作
     */
    
    // 添加记录
    async add(storeName, data) {
        await this.waitReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 更新记录
    async update(storeName, data) {
        await this.waitReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 删除记录
    async delete(storeName, id) {
        await this.waitReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 根据ID获取记录
    async get(storeName, id) {
        await this.waitReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 获取所有记录
    async getAll(storeName) {
        await this.waitReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 根据索引查询
    async getByIndex(storeName, indexName, value) {
        await this.waitReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 清空存储
    async clear(storeName) {
        await this.waitReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 内容相关操作
     */
    
    // 添加内容
    async addContent(content) {
        const now = new Date().toISOString();
        
        // 生成摘录
        let excerpt = content.excerpt;
        if (!excerpt) {
            // 优先从textContent生成，其次从content生成
            excerpt = content.textContent 
                ? this.generateExcerpt(content.textContent)
                : this.generateExcerpt(content.content);
        }
        
        const newContent = {
            id: this.generateId(),
            title: content.title || '无标题',
            type: content.type || 'document', // document, bookmark, note
            content: content.content || '',
            textContent: content.textContent || '',  // 清理后的纯文本
            excerpt: excerpt,
            sourceUrl: content.sourceUrl || '',
            imageUrl: content.imageUrl || '',
            markdown: content.markdown || '',         // Markdown版本
            folderId: content.folderId || null,
            tags: content.tags || [],
            createdAt: now,
            updatedAt: now,
            isStandaloneNote: content.isStandaloneNote || false
        };
        
        await this.add(STORES.CONTENTS, newContent);
        return newContent;
    }

    // 更新内容
    async updateContent(id, updates) {
        const content = await this.get(STORES.CONTENTS, id);
        if (!content) throw new Error('内容不存在');
        
        const updatedContent = {
            ...content,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // 如果内容更新了，重新生成摘要
        if (updates.content || updates.textContent) {
            const textSource = updates.textContent || updates.content;
            updatedContent.excerpt = this.generateExcerpt(textSource);
        }
        
        await this.update(STORES.CONTENTS, updatedContent);
        return updatedContent;
    }

    // 删除内容及其关联笔记
    async deleteContent(id) {
        // 先删除关联的笔记
        const notes = await this.getByIndex(STORES.NOTES, 'contentId', id);
        for (const note of notes) {
            await this.delete(STORES.NOTES, note.id);
        }
        
        // 删除内容
        await this.delete(STORES.CONTENTS, id);
    }

    // 获取所有内容
    async getAllContents() {
        return await this.getAll(STORES.CONTENTS);
    }

    // 根据类型获取内容
    async getContentsByType(type) {
        return await this.getByIndex(STORES.CONTENTS, 'type', type);
    }

    // 根据收藏夹获取内容
    async getContentsByFolder(folderId) {
        return await this.getByIndex(STORES.CONTENTS, 'folderId', folderId);
    }

    // 根据标签筛选内容
    async getContentsByTag(tagName) {
        const allContents = await this.getAllContents();
        return allContents.filter(c => c.tags && c.tags.includes(tagName));
    }

    // 获取时间范围内创建的内容
    async getContentsByDateRange(startDate, endDate) {
        const allContents = await this.getAllContents();
        return allContents.filter(c => {
            const createdAt = new Date(c.createdAt);
            return createdAt >= startDate && createdAt <= endDate;
        });
    }

    // 生成摘要
    generateExcerpt(content, maxLength = 150) {
        if (!content) return '';
        
        // 如果内容包含HTML，提取纯文本
        let text = content;
        const isHtml = content.includes('<') && content.includes('>');
        
        if (isHtml) {
            // 创建临时元素解析HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            text = tempDiv.textContent || tempDiv.innerText || '';
        }
        
        // 移除Markdown语法
        text = text
            .replace(/```[\s\S]*?```/g, '')  // 代码块
            .replace(/`[^`]+`/g, '')          // 行内代码
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 链接
            .replace(/[#*`_~>\-\[\]]/g, '')   // Markdown符号
            .replace(/\s+/g, ' ')             // 合并空格
            .trim();
        
        // 移除CSS/JS代码片段
        text = text
            .replace(/\{[\s\S]*?\}/g, ' ')     // CSS块
            .replace(/--[\w-]+\s*:\s*[^;]+;?/g, '')  // CSS变量
            .replace(/[\w-]+\s*:\s*[0-9a-f#%pxemvhvw%!]+;?/gi, '')  // CSS属性
            .replace(/function\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/g, ' ')  // JS函数
            .replace(/const\s+\w+\s*=[\s\S]*?;/g, ' ')  // JS变量
            .replace(/let\s+\w+\s*=[\s\S]*?;/g, ' ')   // JS变量
            .replace(/\s+/g, ' ')
            .trim();
        
        // 清理多余空格
        text = text.replace(/\s+/g, ' ').trim();
        
        // 检查是否看起来像纯代码文本
        const codeRatio = (text.match(/[{}\[\]();:=]/g) || []).length / Math.max(text.length, 1);
        if (codeRatio > 0.15) {
            // 如果特殊字符比例过高，尝试提取可读句子
            const sentences = text.split(/[.!?。！？\n]+/).filter(s => s.trim().length > 15);
            if (sentences.length > 0) {
                text = sentences.slice(0, 3).join('. ');
            }
        }
        
        // 如果文本太短，返回默认文本
        if (text.length < 10) {
            return '内容预览...';
        }
        
        // 截断到合适长度，优先在句子边界截断
        if (text.length <= maxLength) {
            return text;
        }
        
        // 尝试在句号、逗号或空格处截断
        const truncated = text.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastComma = truncated.lastIndexOf(',');
        const lastSpace = truncated.lastIndexOf(' ');
        
        const breakPoint = Math.max(lastPeriod, lastComma, lastSpace);
        if (breakPoint > maxLength * 0.6) {
            return text.substring(0, breakPoint + 1);
        }
        
        return truncated + '...';
    }

    /**
     * 收藏夹相关操作
     */
    
    // 创建收藏夹
    async createFolder(name) {
        const folder = {
            id: this.generateId(),
            name: name,
            createdAt: new Date().toISOString()
        };
        
        await this.add(STORES.FOLDERS, folder);
        return folder;
    }

    // 更新收藏夹
    async updateFolder(id, name) {
        const folder = await this.get(STORES.FOLDERS, id);
        if (!folder) throw new Error('收藏夹不存在');
        
        folder.name = name;
        await this.update(STORES.FOLDERS, folder);
        return folder;
    }

    // 删除收藏夹
    async deleteFolder(id) {
        // 先将该收藏夹下的内容移到根目录
        const contents = await this.getContentsByFolder(id);
        for (const content of contents) {
            content.folderId = null;
            await this.update(STORES.CONTENTS, content);
        }
        
        await this.delete(STORES.FOLDERS, id);
    }

    // 获取所有收藏夹
    async getAllFolders() {
        return await this.getAll(STORES.FOLDERS);
    }

    /**
     * 标签相关操作
     */
    
    // 创建标签
    async createTag(name, color = '#3b82f6') {
        const tag = {
            id: this.generateId(),
            name: name,
            color: color,
            createdAt: new Date().toISOString()
        };
        
        await this.add(STORES.TAGS, tag);
        return tag;
    }

    // 更新标签
    async updateTag(id, updates) {
        const tag = await this.get(STORES.TAGS, id);
        if (!tag) throw new Error('标签不存在');
        
        const updatedTag = { ...tag, ...updates };
        await this.update(STORES.TAGS, updatedTag);
        return updatedTag;
    }

    // 删除标签
    async deleteTag(id) {
        // 从所有内容中移除该标签
        const allContents = await this.getAllContents();
        for (const content of allContents) {
            if (content.tags && content.tags.includes(id)) {
                content.tags = content.tags.filter(t => t !== id);
                await this.update(STORES.CONTENTS, content);
            }
        }
        
        await this.delete(STORES.TAGS, id);
    }

    // 获取所有标签
    async getAllTags() {
        return await this.getAll(STORES.TAGS);
    }

    /**
     * 笔记相关操作
     */
    
    // 添加笔记
    async addNote(note) {
        const newNote = {
            id: this.generateId(),
            contentId: note.contentId || null, // null 表示独立笔记
            title: note.title || '无标题笔记',
            content: note.content || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await this.add(STORES.NOTES, newNote);
        return newNote;
    }

    // 更新笔记
    async updateNote(id, updates) {
        const note = await this.get(STORES.NOTES, id);
        if (!note) throw new Error('笔记不存在');
        
        const updatedNote = {
            ...note,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        await this.update(STORES.NOTES, updatedNote);
        return updatedNote;
    }

    // 删除笔记
    async deleteNote(id) {
        await this.delete(STORES.NOTES, id);
    }

    // 获取内容的所有笔记
    async getNotesByContent(contentId) {
        return await this.getByIndex(STORES.NOTES, 'contentId', contentId);
    }

    // 获取所有独立笔记
    async getStandaloneNotes() {
        return await this.getByIndex(STORES.NOTES, 'contentId', null);
    }

    // 获取所有笔记
    async getAllNotes() {
        return await this.getAll(STORES.NOTES);
    }

    /**
     * 设置相关操作
     */
    
    // 保存设置
    async saveSetting(key, value) {
        await this.update(STORES.SETTINGS, { key, value });
    }

    // 获取设置
    async getSetting(key) {
        const setting = await this.get(STORES.SETTINGS, key);
        return setting ? setting.value : null;
    }

    // 获取所有设置
    async getAllSettings() {
        const settings = await this.getAll(STORES.SETTINGS);
        const result = {};
        settings.forEach(s => result[s.key] = s.value);
        return result;
    }

    /**
     * 数据导出
     */
    async exportAllData() {
        const data = {
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            contents: await this.getAllContents(),
            folders: await this.getAllFolders(),
            tags: await this.getAllTags(),
            notes: await this.getAllNotes(),
            settings: await this.getAllSettings()
        };
        
        return data;
    }

    /**
     * 数据导入
     */
    async importAllData(data) {
        if (!data || !data.version) {
            throw new Error('无效的导入数据格式');
        }

        // 清空现有数据
        await this.clear(STORES.CONTENTS);
        await this.clear(STORES.FOLDERS);
        await this.clear(STORES.TAGS);
        await this.clear(STORES.NOTES);

        // 导入数据
        if (data.folders) {
            for (const folder of data.folders) {
                await this.add(STORES.FOLDERS, folder);
            }
        }

        if (data.tags) {
            for (const tag of data.tags) {
                await this.add(STORES.TAGS, tag);
            }
        }

        if (data.contents) {
            for (const content of data.contents) {
                await this.add(STORES.CONTENTS, content);
            }
        }

        if (data.notes) {
            for (const note of data.notes) {
                await this.add(STORES.NOTES, note);
            }
        }

        if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
                await this.saveSetting(key, value);
            }
        }
    }

    /**
     * 获取存储使用情况
     */
    async getStorageUsage() {
        const contents = await this.getAllContents();
        const folders = await this.getAllFolders();
        const tags = await this.getAllTags();
        const notes = await this.getAllNotes();

        // 计算大致存储大小（JSON字符串化后的字节数）
        const dataString = JSON.stringify({ contents, folders, tags, notes });
        const sizeInBytes = new Blob([dataString]).size;

        return {
            contents: contents.length,
            folders: folders.length,
            tags: tags.length,
            notes: notes.length,
            sizeInBytes,
            sizeFormatted: this.formatBytes(sizeInBytes)
        };
    }

    // 格式化字节大小
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 创建全局数据库实例
const db = new KnowledgeDB();
