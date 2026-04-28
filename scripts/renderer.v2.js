/**
 * 渲染模块
 * 处理UI组件的渲染
 */

class Renderer {
    constructor() {
        this.currentView = 'all';
        this.viewMode = 'grid';
        this.sortBy = 'updated';
    }

    /**
     * 渲染内容卡片
     */
    renderContentCard(item) {
        const typeIcons = {
            document: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline>',
            bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>',
            note: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>'
        };

        const typeLabels = {
            document: '文档',
            bookmark: '网页',
            note: '笔记'
        };

        const timeCategory = utils.getTimeCategory(item.createdAt);
        
        // 优先使用excerpt，其次从textContent生成，最后使用content
        let excerptText = item.excerpt || '';
        if (!excerptText && item.textContent) {
            excerptText = this.truncateText(item.textContent, 100);
        } else if (!excerptText && item.content) {
            excerptText = db.generateExcerpt(item.content, 100);
        }
        
        const tagsHtml = item.tags && item.tags.length > 0
            ? `<div class="card-tags">
                ${item.tags.map(tagId => `<span class="card-tag" data-tag-id="${tagId}">${tagId}</span>`).join('')}
               </div>`
            : '';

        return `
            <article class="content-card" data-id="${item.id}">
                ${item.imageUrl 
                    ? `<img class="card-image" src="${utils.escapeHtml(item.imageUrl)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'card-placeholder\\'><svg width=\\'48\\' height=\\'48\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'>${typeIcons[item.type] || typeIcons.document}</svg></div>'">`
                    : `<div class="card-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            ${typeIcons[item.type] || typeIcons.document}
                        </svg>
                       </div>`
                }
                <div class="card-body">
                    <span class="card-type ${item.type}">${typeLabels[item.type] || '文档'}</span>
                    <h3 class="card-title">${utils.escapeHtml(item.title)}</h3>
                    <p class="card-excerpt">${utils.escapeHtml(excerptText)}</p>
                    <div class="card-meta">
                        <span class="card-date">${utils.formatDateTime(item.updatedAt || item.createdAt)}</span>
                        ${item.sourceUrl ? `<span class="card-source">${utils.getDomain(item.sourceUrl)}</span>` : ''}
                    </div>
                    ${tagsHtml}
                </div>
            </article>
        `;
    }
    
    /**
     * 截断文本到指定长度
     */
    truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        
        // 尝试在句子边界截断
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
     * 渲染内容列表
     */
    renderContentList(contents, container) {
        if (contents.length === 0) {
            container.innerHTML = '';
            document.getElementById('emptyState').classList.remove('hidden');
            document.getElementById('contentGrid').classList.add('hidden');
            return;
        }

        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('contentGrid').classList.remove('hidden');

        container.innerHTML = contents.map(item => this.renderContentCard(item)).join('');
    }

    /**
     * 渲染收藏夹列表
     */
    renderFolderList(folders, container, activeFolderId = null) {
        if (folders.length === 0) {
            container.innerHTML = '<div class="nav-item" style="color: var(--text-tertiary); font-size: 0.875rem;">暂无收藏夹</div>';
            return;
        }

        container.innerHTML = folders.map(folder => `
            <div class="folder-item ${folder.id === activeFolderId ? 'active' : ''}" data-folder-id="${folder.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${utils.escapeHtml(folder.name)}</span>
                <div class="folder-actions">
                    <button class="edit-folder-btn" title="编辑">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="delete-folder-btn" title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * 渲染标签列表
     */
    renderTagList(tags, container, activeTagId = null) {
        if (tags.length === 0) {
            container.innerHTML = '<div class="nav-item" style="color: var(--text-tertiary); font-size: 0.875rem;">暂无标签</div>';
            return;
        }

        container.innerHTML = tags.map(tag => `
            <div class="tag-item ${tag.id === activeTagId ? 'active' : ''}" data-tag-id="${tag.id}">
                <span class="tag-dot" style="background-color: ${tag.color}"></span>
                <span>${utils.escapeHtml(tag.name)}</span>
                <div class="tag-actions">
                    <button class="edit-tag-btn" title="编辑">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="delete-tag-btn" title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * 渲染笔记列表
     */
    renderNotesList(notes, container, onEdit, onDelete) {
        if (notes.length === 0) {
            container.innerHTML = '<div class="note-item" style="color: var(--text-tertiary); cursor: default;">暂无笔记</div>';
            return;
        }

        container.innerHTML = notes.map(note => `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-item-title">${utils.escapeHtml(note.title)}</div>
                <div class="note-item-date">${utils.formatDateTime(note.updatedAt)}</div>
                <div class="note-item-actions">
                    <button class="edit-note-btn">编辑</button>
                    <button class="delete-note-btn">删除</button>
                </div>
            </div>
        `).join('');

        // 绑定事件
        container.querySelectorAll('.edit-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = btn.closest('.note-item').dataset.noteId;
                onEdit(noteId);
            });
        });

        container.querySelectorAll('.delete-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = btn.closest('.note-item').dataset.noteId;
                onDelete(noteId);
            });
        });
    }

    /**
     * 渲染预览内容
     */
    renderPreview(content, notes, tags) {
        const previewContent = document.getElementById('previewContent');
        const notesList = document.getElementById('notesList');
        
        if (!previewContent) {
            console.error('previewContent 元素不存在');
            return;
        }
        
        // 防止content为空或无效
        if (!content) {
            previewContent.innerHTML = '<div class="preview-error">内容不存在</div>';
            return;
        }
        
        try {
            // 渲染内容
            let html = '';
            
            // 显示标题
            const title = content.title || '无标题';
            html += `<h2 class="preview-title">${utils.escapeHtml(title)}</h2>`;
            
            // 网页类型显示来源链接
            if (content.type === 'bookmark' && content.sourceUrl) {
                html += `
                    <div class="preview-source">
                        <a href="${utils.escapeHtml(content.sourceUrl)}" target="_blank" rel="noopener">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            ${utils.getDomain(content.sourceUrl)}
                        </a>
                    </div>
                `;
            }

            // 渲染标签
            if (content.tags && content.tags.length > 0 && tags && Array.isArray(tags)) {
                try {
                    const contentTags = tags.filter(t => content.tags.includes(t.id));
                    if (contentTags.length > 0) {
                        html += `<div class="preview-tags">`;
                        contentTags.forEach(tag => {
                            const color = tag.color || '#60a5fa';
                            html += `<span class="tag" style="background-color: ${color}20; color: ${color}">${utils.escapeHtml(tag.name || '')}</span>`;
                        });
                        html += `</div>`;
                    }
                } catch (e) {
                    console.warn('渲染标签失败:', e);
                }
            }

            // 渲染正文 - 根据内容类型智能展示
            const rawContent = content.content || '';
            const textContent = content.textContent || '';
            
            if (content.type === 'bookmark') {
                // 网页类型：优先使用textContent，否则清理HTML内容
                let displayText = textContent;
                
                if (!displayText && rawContent) {
                    // 从HTML中提取纯文本
                    displayText = this.extractTextFromHtml(rawContent);
                }
                
                if (displayText && displayText.trim()) {
                    // 分段显示文本内容 - 添加 contenteditable 属性用于快速编辑
                    const paragraphs = this.splitIntoParagraphs(displayText);
                    html += `<div class="preview-text-content" id="previewTextContent" contenteditable="false">`;
                    
                    if (paragraphs.length > 0) {
                        paragraphs.slice(0, 15).forEach(p => {
                            const trimmed = (p || '').trim();
                            if (trimmed.length > 10) {
                                html += `<p>${utils.escapeHtml(trimmed)}</p>`;
                            }
                        });
                        if (paragraphs.length > 15) {
                            html += `<p class="preview-truncated">... 内容已截断 ...</p>`;
                        }
                    } else {
                        // 没有分段，直接显示
                        html += `<p>${utils.escapeHtml(displayText.substring(0, 1000))}</p>`;
                    }
                    html += `</div>`;
                } else {
                    html += `<div class="preview-empty">暂无内容预览</div>`;
                }
                
                // 添加查看原文按钮
                if (content.sourceUrl) {
                    html += `
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="${utils.escapeHtml(content.sourceUrl)}" target="_blank" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                查看原文
                            </a>
                        </div>
                    `;
                }
            } else if (content.type === 'document' || content.type === 'note') {
                // 文档或笔记类型
                if (rawContent) {
                    const isMarkdown = content.markdown || rawContent.includes('```');
                    const isHtml = rawContent.includes('<') && rawContent.includes('>');
                    
                    if (isMarkdown && typeof marked !== 'undefined') {
                        html += `<div class="markdown-body">${marked.parse(rawContent)}</div>`;
                    } else if (isHtml) {
                        const cleanHtml = this.sanitizeHtml(rawContent);
                        html += `<div class="markdown-body">${cleanHtml}</div>`;
                    } else {
                        // 纯文本 - 支持快速编辑
                        const paragraphs = rawContent.split(/\n\n+/).filter(p => p && p.trim());
                        html += `<div class="preview-text-content" id="previewTextContent" contenteditable="false">`;
                        paragraphs.forEach(p => {
                            html += `<p>${utils.escapeHtml(p).replace(/\n/g, '<br>')}</p>`;
                        });
                        html += `</div>`;
                    }
                } else {
                    html += `<div class="preview-empty">暂无内容</div>`;
                }
            } else {
                // 未知类型
                html += `<div class="preview-empty">未知内容类型</div>`;
            }

            previewContent.innerHTML = html;

            // 渲染笔记
            if (notesList && notes) {
                this.renderNotesList(notes, notesList,
                    (noteId) => window.app && window.app.editNote(noteId),
                    (noteId) => window.app && window.app.deleteNote(noteId)
                );
            }

            // 代码高亮
            if (typeof hljs !== 'undefined') {
                previewContent.querySelectorAll('pre code').forEach(block => {
                    try {
                        hljs.highlightElement(block);
                    } catch (e) {
                        console.warn('代码高亮失败:', e);
                    }
                });
            }
        } catch (error) {
            console.error('渲染预览失败:', error);
            previewContent.innerHTML = `<div class="preview-error">内容渲染失败: ${error.message}</div>`;
        }
    }
    
    /**
     * 从HTML中提取纯文本
     */
    extractTextFromHtml(html) {
        if (!html) return '';
        
        // 创建临时元素解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 获取纯文本
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // 清理文本
        text = text
            .replace(/\s+/g, ' ')           // 合并空格
            .replace(/[\r\n]+/g, '\n')     // 规范化换行
            .trim();
        
        return text;
    }
    
    /**
     * 将文本分割成段落
     */
    splitIntoParagraphs(text) {
        if (!text) return [];
        
        // 先按段落分割
        let paragraphs = text.split(/\n\n+/);
        
        // 进一步处理长段落
        const result = [];
        paragraphs.forEach(p => {
            const trimmed = p.trim();
            if (!trimmed) return;
            
            // 如果段落太长，按句子分割
            if (trimmed.length > 500) {
                const sentences = trimmed.split(/(?<=[.!?。！？])\s+/);
                let currentParagraph = '';
                
                sentences.forEach(sentence => {
                    if ((currentParagraph + ' ' + sentence).length > 400) {
                        if (currentParagraph) {
                            result.push(currentParagraph.trim());
                        }
                        currentParagraph = sentence;
                    } else {
                        currentParagraph = currentParagraph ? currentParagraph + ' ' + sentence : sentence;
                    }
                });
                
                if (currentParagraph) {
                    result.push(currentParagraph.trim());
                }
            } else {
                result.push(trimmed);
            }
        });
        
        return result;
    }
    
    /**
     * 清理HTML，防止XSS
     */
    sanitizeHtml(html) {
        if (!html) return '';
        
        // 创建一个安全的div来清理HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 移除script和style标签
        const scripts = tempDiv.querySelectorAll('script, style, link, iframe, object, embed');
        scripts.forEach(el => el.remove());
        
        // 移除事件处理器属性
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(el => {
            const attrs = [...el.attributes];
            attrs.forEach(attr => {
                // 保留安全属性，移除事件处理器
                if (attr.name.startsWith('on') || 
                    ['href', 'src', 'alt', 'title', 'class', 'id'].indexOf(attr.name) === -1) {
                    el.removeAttribute(attr.name);
                }
            });
            
            // 处理href，防止javascript:协议
            if (el.href && el.href.startsWith('javascript:')) {
                el.removeAttribute('href');
            }
        });
        
        return tempDiv.innerHTML;
    }

    /**
     * 渲染空预览
     */
    renderEmptyPreview() {
        const previewContent = document.getElementById('previewContent');
        previewContent.innerHTML = `
            <div class="preview-placeholder">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p>选择一项内容查看预览</p>
            </div>
        `;
        
        document.getElementById('notesList').innerHTML = '';
    }

    /**
     * 渲染上传列表
     */
    renderUploadList(files, container) {
        container.innerHTML = files.map((file, index) => `
            <div class="upload-item" data-index="${index}">
                <div class="upload-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                </div>
                <div class="upload-item-info">
                    <div class="upload-item-name">${utils.escapeHtml(file.name)}</div>
                    <div class="upload-item-size">${utils.formatFileSize(file.size)}</div>
                </div>
                <button class="upload-item-remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    /**
     * 渲染标签选择器
     */
    renderTagSelector(tags, selectedIds, container, inputContainer) {
        // 渲染已选标签
        const selectedContainer = inputContainer.querySelector('.selected-tags') || 
            (inputContainer.innerHTML = '<div class="selected-tags"></div>' + inputContainer.innerHTML, inputContainer.querySelector('.selected-tags'));
        
        const selectedTags = tags.filter(t => selectedIds.includes(t.id));
        selectedContainer.innerHTML = selectedTags.map(tag => `
            <span class="selected-tag">
                <span class="tag-dot" style="background-color: ${tag.color}"></span>
                ${utils.escapeHtml(tag.name)}
                <button data-tag-id="${tag.id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </span>
        `).join('');

        // 渲染可用标签
        const availableTags = tags.filter(t => !selectedIds.includes(t.id));
        container.innerHTML = availableTags.map(tag => `
            <span class="available-tag" data-tag-id="${tag.id}" style="border-left: 3px solid ${tag.color}">
                ${utils.escapeHtml(tag.name)}
            </span>
        `).join('');
    }

    /**
     * 渲染统计数字
     */
    renderStats(stats) {
        const elements = {
            countAll: document.getElementById('countAll'),
            countDocs: document.getElementById('countDocs'),
            countBookmarks: document.getElementById('countBookmarks'),
            countNotes: document.getElementById('countNotes'),
            countToday: document.getElementById('countToday'),
            countWeek: document.getElementById('countWeek'),
            countMonth: document.getElementById('countMonth'),
            countOlder: document.getElementById('countOlder')
        };
        
        if (elements.countAll) elements.countAll.textContent = stats.all;
        if (elements.countDocs) elements.countDocs.textContent = stats.documents;
        if (elements.countBookmarks) elements.countBookmarks.textContent = stats.bookmarks;
        if (elements.countNotes) elements.countNotes.textContent = stats.notes;
        if (elements.countToday) elements.countToday.textContent = stats.today;
        if (elements.countWeek) elements.countWeek.textContent = stats.week;
        if (elements.countMonth) elements.countMonth.textContent = stats.month;
        if (elements.countOlder) elements.countOlder.textContent = stats.older;
    }

    /**
     * 渲染存储信息
     */
    renderStorageInfo(usage) {
        const sizeEl = document.getElementById('storageSize');
        const usedEl = document.getElementById('storageUsed');
        
        if (!sizeEl || !usedEl) return;
        
        sizeEl.textContent = usage.sizeFormatted;
        // 假设最大存储为100MB
        const percent = Math.min((usage.sizeInBytes / (100 * 1024 * 1024)) * 100, 100);
        usedEl.style.width = `${percent}%`;
    }

    /**
     * 渲染视图标题
     */
    renderViewTitle(title) {
        document.getElementById('currentViewTitle').textContent = title;
    }

    /**
     * 更新搜索结果数量
     */
    updateSearchCount(query, total, filtered) {
        const countEl = document.getElementById('searchResultsCount');
        if (query) {
            countEl.textContent = `${filtered}/${total}`;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }
    }
}

// 创建全局渲染器实例
const renderer = new Renderer();

// 导出到全局
window.renderer = renderer;
