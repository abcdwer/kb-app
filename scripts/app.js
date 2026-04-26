/**
 * 主应用模块
 * 整合所有功能模块，提供完整的知识库应用
 */

class KnowledgeBaseApp {
    constructor() {
        this.version = '1.0.2'; // 版本标识
        this.contents = [];
        this.folders = [];
        this.tags = [];
        this.notes = [];
        
        this.currentView = 'all';
        this.currentContent = null;
        this.currentFolderId = null;
        this.currentTagId = null;
        
        this.selectedFiles = [];
        this.selectedTags = [];
        this.searchQuery = '';
        this.searchFilters = {
            tags: [],
            dateFrom: null,
            dateTo: null,
            types: ['document', 'bookmark', 'note']
        };
        
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 检查浏览器环境
            if (typeof indexedDB === 'undefined') {
                throw new Error('您的浏览器不支持 IndexedDB，请使用现代浏览器（Chrome/Firefox/Edge/Safari）');
            }
            
            // 检查必要模块是否加载
            if (typeof utils === 'undefined') {
                throw new Error('工具模块加载失败，请刷新页面重试');
            }
            if (typeof renderer === 'undefined') {
                throw new Error('渲染模块加载失败，请刷新页面重试');
            }
            
            // 检查是否为 file:// 协议
            const isFileProtocol = window.location.protocol === 'file:';
            if (isFileProtocol) {
                console.warn('当前使用 file:// 协议，部分功能可能受限。建议通过本地服务器访问。');
            }
            
            // 等待数据库就绪
            await db.waitReady();
            
            // 初始化主题
            utils.initTheme();
            
            // 加载数据
            await this.loadAllData();
            
            // 渲染初始界面
            this.renderInitialUI();
            
            // 绑定事件
            this.bindEvents();
            
            // 初始化项目分析器
            this.initAnalyzer();
            
            // 如果是 file:// 协议，显示提示
            if (isFileProtocol) {
                setTimeout(() => {
                    utils.showToast('建议通过本地服务器访问以获得完整功能', 'warning', 5000);
                }, 1000);
            }
            
            console.log('知识库应用初始化完成');
        } catch (error) {
            console.error('初始化失败:', error);
            this.showErrorPage(error);
        }
    }
    
    /**
     * 显示错误页面
     */
    showErrorPage(error) {
        const app = document.getElementById('app');
        const isFileProtocol = window.location.protocol === 'file:';
        
        let errorHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="font-size: 48px; margin-bottom: 20px;">😕</div>
                <h2 style="margin: 0 0 10px 0; color: #333;">初始化失败</h2>
                <p style="color: #666; margin: 0 0 20px 0; max-width: 500px;">${error.message || '未知错误'}</p>
        `;
        
        if (isFileProtocol) {
            errorHtml += `
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px 20px; margin-bottom: 20px; max-width: 500px; text-align: left;">
                    <strong style="color: #856404;">建议使用本地服务器访问：</strong>
                    <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #856404;">
                        <li>打开命令行/终端</li>
                        <li>进入项目目录</li>
                        <li>运行: <code style="background: #fff; padding: 2px 6px; border-radius: 4px;">python -m http.server 8080</code></li>
                        <li>浏览器打开: <code style="background: #fff; padding: 2px 6px; border-radius: 4px;">http://localhost:8080</code></li>
                    </ol>
                </div>
            `;
        }
        
        errorHtml += `
                <button onclick="location.reload()" style="padding: 10px 24px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">刷新页面</button>
            </div>
        `;
        
        app.innerHTML = errorHtml;
    }

    /**
     * 初始化项目分析器
     */
    initAnalyzer() {
        // 初始化分析器 UI
        if (typeof AnalyzerUI !== 'undefined') {
            this.analyzerUI = new AnalyzerUI();
            this.analyzerUI.init();
        }
        
        // 绑定分析器按钮
        const analyzerBtn = document.getElementById('analyzerBtn');
        if (analyzerBtn) {
            analyzerBtn.addEventListener('click', () => {
                if (this.analyzerUI) {
                    this.analyzerUI.showModal();
                }
            });
        }
        
        // 绑定重置按钮
        const resetBtn = document.getElementById('resetAnalyzerBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.analyzerUI) {
                    this.analyzerUI.pendingFiles = null;
                    document.getElementById('analyzerFileList').innerHTML = '';
                    document.getElementById('analysisResult').classList.add('hidden');
                    document.getElementById('analyzerProgress').classList.add('hidden');
                    document.getElementById('analyzeBtn').disabled = true;
                }
            });
        }
    }

    /**
     * 加载所有数据
     */
    async loadAllData() {
        this.contents = await db.getAllContents();
        this.folders = await db.getAllFolders();
        this.tags = await db.getAllTags();
        this.notes = await db.getAllNotes();
    }

    /**
     * 渲染初始界面
     */
    renderInitialUI() {
        // 渲染统计
        this.updateStats();
        
        // 渲染收藏夹列表
        renderer.renderFolderList(this.folders, document.getElementById('folderList'));
        
        // 渲染标签列表
        renderer.renderTagList(this.tags, document.getElementById('tagList'));
        
        // 渲染内容列表
        this.renderContents();
        
        // 渲染空预览
        renderer.renderEmptyPreview();
        
        // 渲染存储信息
        this.updateStorageInfo();
    }

    /**
     * 绑定所有事件
     */
    bindEvents() {
        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => {
            utils.toggleTheme();
        });

        // 侧边栏切换
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // 关闭预览
        document.getElementById('closePreviewBtn').addEventListener('click', () => {
            document.getElementById('previewPanel').classList.add('collapsed');
            document.getElementById('previewPanel').classList.remove('expanded');
            this.currentContent = null;
            this.highlightSelectedCard(null);
        });

        // 展开/收起预览面板
        document.getElementById('expandBtn').addEventListener('click', () => {
            const panel = document.getElementById('previewPanel');
            panel.classList.toggle('expanded');
        });

        // 添加内容按钮
        document.getElementById('addContentBtn').addEventListener('click', () => this.showAddContentModal());
        document.getElementById('emptyAddDoc').addEventListener('click', () => this.showAddContentModal('upload'));
        document.getElementById('emptyAddBookmark').addEventListener('click', () => this.showAddContentModal('bookmark'));

        // 导入导出
        document.getElementById('importBtn').addEventListener('click', () => this.importData());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());

        // 搜索
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', utils.debounce((e) => {
            this.searchQuery = e.target.value.trim();
            this.renderContents();
        }, 300));

        // 高级筛选
        document.getElementById('searchFilterBtn').addEventListener('click', () => this.showSearchFilter());
        document.getElementById('clearFilterBtn').addEventListener('click', () => this.clearFilters());
        document.getElementById('applyFilterBtn').addEventListener('click', () => this.applyFilters());

        // 排序
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.renderContents();
        });

        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setViewMode(btn.dataset.view));
        });

        // 导航点击
        this.bindNavEvents();

        // 添加内容模态框
        this.bindAddContentModal();

        // 编辑模态框
        this.bindEditModal();

        // 笔记模态框
        this.bindNoteModal();

        // 文件夹管理
        this.bindFolderModal();

        // 标签管理
        this.bindTagModal();

        // 移动模态框
        this.bindMoveModal();

        // 内容标签管理
        this.bindContentTagModal();

        // 确认删除模态框
        this.bindConfirmModal();

        // 全局模态框关闭
        this.bindModalClose();

        // 键盘快捷键
        this.bindKeyboardShortcuts();

        // 拖拽上传
        this.bindDragDrop();

        // 预览面板操作按钮
        this.bindPreviewActions();

        // 模态框标签页切换
        this.bindTabSwitch();
    }

    /**
     * 绑定导航事件
     */
    bindNavEvents() {
        // 主导航
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.setCurrentView(view);
            });
        });

        // 收藏夹点击
        document.getElementById('folderList').addEventListener('click', (e) => {
            const folderItem = e.target.closest('.folder-item');
            if (folderItem) {
                e.stopPropagation();
                const folderId = folderItem.dataset.folderId;
                if (e.target.closest('.edit-folder-btn')) {
                    this.editFolder(folderId);
                } else if (e.target.closest('.delete-folder-btn')) {
                    this.deleteFolder(folderId);
                } else {
                    this.setCurrentView('folder', folderId);
                }
            }
        });

        // 标签点击
        document.getElementById('tagList').addEventListener('click', (e) => {
            const tagItem = e.target.closest('.tag-item');
            if (tagItem) {
                const tagId = tagItem.dataset.tagId;
                if (e.target.closest('.edit-tag-btn')) {
                    this.editTag(tagId);
                } else if (e.target.closest('.delete-tag-btn')) {
                    this.deleteTag(tagId);
                } else {
                    this.setCurrentView('tag', tagId);
                }
            }
        });

        // 新建收藏夹
        document.getElementById('addFolderBtn').addEventListener('click', () => this.showFolderModal());

        // 新建标签
        document.getElementById('addTagBtn').addEventListener('click', () => this.showTagModal());
    }

    /**
     * 绑定添加内容模态框事件
     */
    bindAddContentModal() {
        const modal = document.getElementById('addContentModal');
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const selectFileBtn = document.getElementById('selectFileBtn');

        // 选择文件
        selectFileBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // 拖拽上传
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        });

        // 抓取网页
        document.getElementById('fetchUrlBtn').addEventListener('click', () => this.fetchUrl());

        // CORS代理选择
        document.getElementById('useCorsProxy').addEventListener('change', (e) => {
            document.getElementById('corsProxySelect').disabled = !e.target.checked;
        });

        document.getElementById('corsProxySelect').addEventListener('change', (e) => {
            const customInput = document.getElementById('customCorsProxy');
            if (e.target.value === 'custom') {
                customInput.classList.remove('hidden');
            } else {
                customInput.classList.add('hidden');
            }
        });

        // 保存内容
        document.getElementById('saveContentBtn').addEventListener('click', () => this.saveContent());

        // 更新收藏夹下拉框
        this.updateFolderSelect('contentFolder');
    }

    /**
     * 绑定编辑模态框事件
     */
    bindEditModal() {
        const toolbar = document.getElementById('editorToolbar');
        const textarea = document.getElementById('editContent');
        const preview = document.getElementById('editorPreview');
        const togglePreview = document.getElementById('togglePreview');

        // 工具栏按钮
        toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                
                if (action === 'preview') {
                    this.toggleEditorPreview(textarea, preview, btn);
                } else {
                    this.insertMarkdown(action, textarea);
                }
            });
        });

        // 保存编辑
        document.getElementById('saveEditBtn').addEventListener('click', () => this.saveEdit());
    }

    /**
     * 绑定笔记模态框事件
     */
    bindNoteModal() {
        document.getElementById('addNoteBtn').addEventListener('click', () => this.showNoteModal());
        document.getElementById('saveNoteBtn').addEventListener('click', () => this.saveNote());
    }

    /**
     * 绑定文件夹模态框事件
     */
    bindFolderModal() {
        document.getElementById('createFolderBtn').addEventListener('click', () => this.createFolder());
        document.getElementById('newFolderName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createFolder();
        });
    }

    /**
     * 绑定标签模态框事件
     */
    bindTagModal() {
        document.getElementById('createTagBtn').addEventListener('click', () => this.createTag());
        document.getElementById('newTagName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createTag();
        });
    }

    /**
     * 绑定移动模态框事件
     */
    bindMoveModal() {
        document.getElementById('confirmMoveBtn').addEventListener('click', () => this.confirmMove());
    }

    /**
     * 绑定内容标签模态框事件
     */
    bindContentTagModal() {
        document.getElementById('saveContentTagsBtn').addEventListener('click', () => this.saveContentTags());
    }

    /**
     * 绑定确认删除模态框
     */
    bindConfirmModal() {
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.executeDelete());
    }

    /**
     * 绑定模态框关闭事件
     */
    bindModalClose() {
        document.querySelectorAll('.modal').forEach(modal => {
            const backdrop = modal.querySelector('.modal-backdrop');
            const cancelBtns = modal.querySelectorAll('.modal-cancel');

            backdrop?.addEventListener('click', () => {
                utils.hideModal(modal.id);
            });

            cancelBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    utils.hideModal(modal.id);
                });
            });
        });
    }

    /**
     * 绑定键盘快捷键
     */
    bindKeyboardShortcuts() {
        // Ctrl/Cmd + N: 新建内容
        utils.bindKeyboardShortcut('n', () => this.showAddContentModal(), { ctrl: true });
        
        // Ctrl/Cmd + F: 聚焦搜索
        utils.bindKeyboardShortcut('f', () => {
            document.getElementById('searchInput').focus();
        }, { ctrl: true });

        // Escape: 关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                utils.hideAllModals();
            }
        });
    }

    /**
     * 绑定拖拽上传
     */
    bindDragDrop() {
        const dropOverlay = document.getElementById('dropOverlay');
        let dragCounter = 0;

        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            dropOverlay.classList.add('active');
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                dropOverlay.classList.remove('active');
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            dropOverlay.classList.remove('active');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files);
            }
        });
    }

    /**
     * 绑定预览面板操作按钮
     */
    bindPreviewActions() {
        document.getElementById('editBtn').addEventListener('click', () => {
            if (this.currentContent) {
                this.showEditModal(this.currentContent);
            }
        });

        document.getElementById('moveBtn').addEventListener('click', () => {
            if (this.currentContent) {
                this.showMoveModal(this.currentContent);
            }
        });

        document.getElementById('tagManageBtn').addEventListener('click', () => {
            if (this.currentContent) {
                this.showContentTagModal(this.currentContent);
            }
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            if (this.currentContent) {
                this.confirmDeleteContent(this.currentContent);
            }
        });
    }

    /**
     * 绑定标签页切换
     */
    bindTabSwitch() {
        document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchAddContentTab(tab);
            });
        });
    }

    /**
     * 切换添加内容标签页
     */
    switchAddContentTab(tab) {
        document.querySelectorAll('.add-content-tabs .tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tab}Panel`);
        });
    }

    /**
     * 设置当前视图
     */
    setCurrentView(view, id = null) {
        // 更新导航高亮
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === view) {
                item.classList.add('active');
            }
        });

        document.querySelectorAll('.folder-item, .tag-item').forEach(item => {
            item.classList.remove('active');
        });

        this.currentView = view;
        this.currentFolderId = null;
        this.currentTagId = null;

        // 设置视图标题
        const titles = {
            'all': '全部内容',
            'documents': '文档',
            'bookmarks': '网页收藏',
            'notes': '独立笔记',
            'today': '今天',
            'week': '本周',
            'month': '本月',
            'older': '更早'
        };

        if (view === 'folder' && id) {
            this.currentFolderId = id;
            const folder = this.folders.find(f => f.id === id);
            renderer.renderViewTitle(folder ? folder.name : '收藏夹');
            document.querySelector(`.folder-item[data-folder-id="${id}"]`)?.classList.add('active');
        } else if (view === 'tag' && id) {
            this.currentTagId = id;
            const tag = this.tags.find(t => t.id === id);
            renderer.renderViewTitle(tag ? tag.name : '标签');
            document.querySelector(`.tag-item[data-tag-id="${id}"]`)?.classList.add('active');
        } else {
            renderer.renderViewTitle(titles[view] || '全部内容');
        }

        this.renderContents();
    }

    /**
     * 设置视图模式
     */
    setViewMode(mode) {
        this.viewMode = mode;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });

        const grid = document.getElementById('contentGrid');
        grid.classList.toggle('list-view', mode === 'list');
    }

    /**
     * 更新统计数据
     */
    updateStats() {
        const stats = {
            all: this.contents.length,
            documents: this.contents.filter(c => c.type === 'document').length,
            bookmarks: this.contents.filter(c => c.type === 'bookmark').length,
            notes: this.contents.filter(c => c.isStandaloneNote).length,
            today: 0,
            week: 0,
            month: 0,
            older: 0
        };

        this.contents.forEach(c => {
            const category = utils.getTimeCategory(c.createdAt);
            if (category === 'today') stats.today++;
            else if (category === 'week') stats.week++;
            else if (category === 'month') stats.month++;
            else stats.older++;
        });

        renderer.renderStats(stats);
    }

    /**
     * 更新存储信息
     */
    async updateStorageInfo() {
        const usage = await db.getStorageUsage();
        renderer.renderStorageInfo(usage);
    }

    /**
     * 渲染内容列表
     */
    renderContents() {
        let filtered = [...this.contents];

        // 根据视图筛选
        switch (this.currentView) {
            case 'documents':
                filtered = filtered.filter(c => c.type === 'document');
                break;
            case 'bookmarks':
                filtered = filtered.filter(c => c.type === 'bookmark');
                break;
            case 'notes':
                filtered = filtered.filter(c => c.isStandaloneNote);
                break;
            case 'today':
                const today = utils.getTodayStart();
                filtered = filtered.filter(c => new Date(c.createdAt) >= today);
                break;
            case 'week':
                const weekStart = utils.getWeekStart();
                filtered = filtered.filter(c => new Date(c.createdAt) >= weekStart);
                break;
            case 'month':
                const monthStart = utils.getMonthStart();
                filtered = filtered.filter(c => new Date(c.createdAt) >= monthStart);
                break;
            case 'older':
                const monthStart2 = utils.getMonthStart();
                filtered = filtered.filter(c => new Date(c.createdAt) < monthStart2);
                break;
            case 'folder':
                if (this.currentFolderId) {
                    filtered = filtered.filter(c => c.folderId === this.currentFolderId);
                }
                break;
            case 'tag':
                if (this.currentTagId) {
                    filtered = filtered.filter(c => c.tags && c.tags.includes(this.currentTagId));
                }
                break;
        }

        // 应用搜索
        if (this.searchQuery) {
            filtered = utils.searchContents(filtered, this.searchQuery, {
                includeTitle: true,
                includeContent: true,
                includeTags: true
            });
        }

        // 应用筛选
        if (this.searchFilters.tags.length > 0) {
            filtered = filtered.filter(c => 
                c.tags && this.searchFilters.tags.some(tagId => c.tags.includes(tagId))
            );
        }

        if (this.searchFilters.dateFrom) {
            const fromDate = new Date(this.searchFilters.dateFrom);
            filtered = filtered.filter(c => new Date(c.createdAt) >= fromDate);
        }

        if (this.searchFilters.dateTo) {
            const toDate = new Date(this.searchFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(c => new Date(c.createdAt) <= toDate);
        }

        if (this.searchFilters.types.length < 3) {
            filtered = filtered.filter(c => this.searchFilters.types.includes(c.type));
        }

        // 排序
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                case 'updated':
                default:
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
        });

        // 更新搜索结果数量
        renderer.updateSearchCount(this.searchQuery, this.contents.length, filtered.length);

        // 渲染
        renderer.renderContentList(filtered, document.getElementById('contentGrid'));

        // 绑定内容卡片点击事件
        this.bindContentCardEvents();

        // 更新标签名显示
        this.updateTagNamesInCards();
    }

    /**
     * 更新卡片中的标签名称
     */
    updateTagNamesInCards() {
        document.querySelectorAll('.card-tag[data-tag-id]').forEach(tagEl => {
            const tagId = tagEl.dataset.tagId;
            const tag = this.tags.find(t => t.id === tagId);
            if (tag) {
                tagEl.textContent = tag.name;
            }
        });
    }

    /**
     * 绑定内容卡片事件
     */
    bindContentCardEvents() {
        document.querySelectorAll('.content-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                this.selectContent(id);
            });

            card.addEventListener('dblclick', () => {
                const id = card.dataset.id;
                const content = this.contents.find(c => c.id === id);
                if (content) {
                    this.showEditModal(content);
                }
            });
        });
    }

    /**
     * 选择内容
     */
    async selectContent(id) {
        const content = this.contents.find(c => c.id === id);
        if (!content) return;

        this.currentContent = content;
        this.highlightSelectedCard(id);

        // 显示预览面板
        document.getElementById('previewPanel').classList.remove('collapsed');

        // 加载关联笔记
        const contentNotes = this.notes.filter(n => n.contentId === id);

        // 渲染预览
        renderer.renderPreview(content, contentNotes, this.tags);
    }

    /**
     * 高亮选中的卡片
     */
    highlightSelectedCard(id) {
        document.querySelectorAll('.content-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.id === id);
        });
    }

    /**
     * 处理文件选择
     */
    async handleFileSelect(files) {
        const validFiles = Array.from(files).filter(file => {
            const ext = utils.getFileExtension(file.name);
            return ['md', 'markdown', 'html', 'htm'].includes(ext);
        });

        if (validFiles.length === 0) {
            utils.showToast('请选择 MD 或 HTML 文件', 'warning');
            return;
        }

        this.selectedFiles = [...this.selectedFiles, ...validFiles];
        renderer.renderUploadList(this.selectedFiles, document.getElementById('uploadList'));
    }

    /**
     * 抓取网页
     */
    async fetchUrl() {
        const url = document.getElementById('bookmarkUrl').value.trim();
        
        if (!url) {
            utils.showToast('请输入网址', 'warning');
            return;
        }

        if (!utils.isValidUrl(url)) {
            utils.showToast('请输入有效的网址', 'warning');
            return;
        }

        const statusEl = document.getElementById('fetchStatus');
        const useProxy = document.getElementById('useCorsProxy').checked;
        const proxyType = useProxy ? document.getElementById('corsProxySelect').value : null;
        const customProxy = document.getElementById('customCorsProxy').value.trim();

        statusEl.className = 'fetch-status loading';
        statusEl.textContent = '正在获取网页内容...';
        statusEl.style.display = 'block';

        try {
            const result = await scraper.scrape(url, {
                useProxy,
                proxyType,
                customProxyUrl: customProxy || null
            });

            if (result.success) {
                statusEl.className = 'fetch-status success';
                statusEl.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    获取成功！${result.data.title}
                `;
                
                // 保存到临时变量，供保存时使用
                this.pendingBookmark = result.data;
            } else {
                statusEl.className = 'fetch-status error';
                statusEl.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    获取失败：${result.error}
                `;
            }
        } catch (error) {
            statusEl.className = 'fetch-status error';
            statusEl.textContent = `获取失败：${error.message}`;
        }
    }

    /**
     * 显示添加内容模态框
     */
    showAddContentModal(tab = 'upload') {
        this.switchAddContentTab(tab);
        
        // 重置表单
        this.selectedFiles = [];
        this.selectedTags = [];
        this.pendingBookmark = null;
        
        document.getElementById('uploadList').innerHTML = '';
        document.getElementById('bookmarkUrl').value = '';
        document.getElementById('fetchStatus').style.display = 'none';
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        
        // 渲染标签
        this.renderNoteTags();
        
        utils.showModal('addContentModal');
    }

    /**
     * 渲染笔记标签选择
     */
    renderNoteTags() {
        const inputContainer = document.getElementById('noteTagInput');
        renderer.renderTagSelector(this.tags, this.selectedTags, 
            document.getElementById('noteAvailableTags'), inputContainer);
        
        // 绑定标签事件
        document.getElementById('noteAvailableTags').addEventListener('click', (e) => {
            const tagEl = e.target.closest('.available-tag');
            if (tagEl) {
                const tagId = tagEl.dataset.tagId;
                if (!this.selectedTags.includes(tagId)) {
                    this.selectedTags.push(tagId);
                    this.renderNoteTags();
                }
            }
        });

        document.getElementById('noteTagInput').addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.selected-tag button');
            if (removeBtn) {
                const tagId = removeBtn.dataset.tagId;
                this.selectedTags = this.selectedTags.filter(id => id !== tagId);
                this.renderNoteTags();
            }
        });

        // 回车添加标签
        document.getElementById('noteTags').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const name = e.target.value.trim();
                if (name) {
                    this.createAndSelectTag(name);
                }
            }
        });
    }

    /**
     * 创建并选中标签
     */
    async createAndSelectTag(name) {
        try {
            const tag = await db.createTag(name);
            this.tags.push(tag);
            this.selectedTags.push(tag.id);
            this.renderNoteTags();
            document.getElementById('noteTags').value = '';
            utils.showToast('标签已创建', 'success');
        } catch (error) {
            utils.showToast('创建标签失败', 'error');
        }
    }

    /**
     * 保存内容
     */
    async saveContent() {
        const activeTab = document.querySelector('.add-content-tabs .tab-btn.active')?.dataset.tab;

        try {
            if (activeTab === 'upload') {
                await this.saveUploadedFiles();
            } else if (activeTab === 'bookmark') {
                await this.saveBookmark();
            } else if (activeTab === 'note') {
                await this.saveStandaloneNote();
            }
        } catch (error) {
            utils.showToast(error.message || '保存失败', 'error');
        }
    }

    /**
     * 保存上传的文件
     */
    async saveUploadedFiles() {
        if (this.selectedFiles.length === 0) {
            utils.showToast('请选择要上传的文件', 'warning');
            return;
        }

        const folderId = document.getElementById('contentFolder').value || null;
        let saved = 0;

        for (const file of this.selectedFiles) {
            try {
                const content = await utils.readFileAsText(file);
                const fileType = utils.getFileType(file.name);
                
                const doc = {
                    type: 'document',
                    title: file.name.replace(/\.(md|markdown|html|htm)$/i, ''),
                    content: content,
                    markdown: fileType === 'markdown' ? content : null,
                    folderId: folderId,
                    tags: [...this.selectedTags]
                };

                await db.addContent(doc);
                saved++;
            } catch (error) {
                console.error(`保存文件 ${file.name} 失败:`, error);
            }
        }

        if (saved > 0) {
            utils.showToast(`已保存 ${saved} 个文件`, 'success');
            await this.refreshData();
            utils.hideModal('addContentModal');
        }
    }

    /**
     * 保存网页收藏
     */
    async saveBookmark() {
        if (!this.pendingBookmark) {
            utils.showToast('请先获取网页内容', 'warning');
            return;
        }

        const folderId = document.getElementById('contentFolder').value || null;

        // 构建完整的内容对象
        const content = {
            type: 'bookmark',
            title: this.pendingBookmark.title || '无标题',
            content: this.pendingBookmark.content || '',          // 原始HTML内容
            textContent: this.pendingBookmark.textContent || '',  // 清理后的纯文本（新增）
            excerpt: this.pendingBookmark.excerpt || db.generateExcerpt(this.pendingBookmark.textContent || this.pendingBookmark.content || '', 150),
            sourceUrl: this.pendingBookmark.sourceUrl || '',
            imageUrl: this.pendingBookmark.imageUrl || '',
            markdown: this.pendingBookmark.markdown || '',         // 保留Markdown版本（可选）
            folderId: folderId,
            tags: [...this.selectedTags]
        };

        await db.addContent(content);
        utils.showToast('网页已收藏', 'success');
        
        await this.refreshData();
        utils.hideModal('addContentModal');
    }

    /**
     * 保存独立笔记
     */
    async saveStandaloneNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title && !content) {
            utils.showToast('请输入标题或内容', 'warning');
            return;
        }

        const folderId = document.getElementById('contentFolder').value || null;

        // 创建笔记内容
        const noteContent = await db.addContent({
            type: 'note',
            title: title || '无标题笔记',
            content: content,
            isStandaloneNote: true,
            folderId: folderId,
            tags: [...this.selectedTags]
        });

        utils.showToast('笔记已创建', 'success');
        
        await this.refreshData();
        utils.hideModal('addContentModal');
    }

    /**
     * 显示编辑模态框
     */
    showEditModal(content) {
        document.getElementById('editModalTitle').textContent = '编辑内容';
        document.getElementById('editTitle').value = content.title;
        
        // 对于网页类型，编辑纯文本内容而不是HTML
        if (content.type === 'bookmark' && content.textContent) {
            document.getElementById('editContent').value = content.textContent;
        } else {
            document.getElementById('editContent').value = content.content || '';
        }

        // 隐藏预览
        document.getElementById('editorPreview').style.display = 'none';
        document.getElementById('editorPreview').classList.add('hidden');
        document.getElementById('editContent').style.display = 'block';
        document.getElementById('togglePreview').classList.remove('active');

        this.editingContentId = content.id;
        utils.showModal('editModal');
    }

    /**
     * 切换编辑器预览
     */
    toggleEditorPreview(textarea, preview, btn) {
        const isPreview = preview.style.display !== 'none';
        
        if (isPreview) {
            preview.style.display = 'none';
            preview.classList.add('hidden');
            textarea.style.display = 'block';
            btn.classList.remove('active');
        } else {
            const content = textarea.value;
            preview.innerHTML = marked.parse(content);
            preview.style.display = 'block';
            preview.classList.remove('hidden');
            textarea.style.display = 'none';
            btn.classList.add('active');
            
            // 高亮代码
            preview.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    }

    /**
     * 插入Markdown语法
     */
    insertMarkdown(action, textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);

        let insert = '';
        let cursorOffset = 0;

        switch (action) {
            case 'bold':
                insert = `**${selected || '粗体文本'}**`;
                cursorOffset = selected ? 0 : -2;
                break;
            case 'italic':
                insert = `*${selected || '斜体文本'}*`;
                cursorOffset = selected ? 0 : -1;
                break;
            case 'heading':
                insert = `## ${selected || '标题'}`;
                break;
            case 'link':
                insert = `[${selected || '链接文本'}](url)`;
                cursorOffset = selected ? -1 : -4;
                break;
            case 'code':
                if (selected.includes('\n')) {
                    insert = `\`\`\`\n${selected}\n\`\`\``;
                } else {
                    insert = `\`${selected || '代码'}\``;
                    cursorOffset = selected ? 0 : -1;
                }
                break;
            case 'quote':
                insert = selected.split('\n').map(line => `> ${line}`).join('\n');
                break;
            case 'list':
                insert = selected.split('\n').map(line => `- ${line}`).join('\n');
                break;
            case 'image':
                insert = `![${selected || '图片描述'}](图片URL)`;
                cursorOffset = selected ? -4 : -9;
                break;
        }

        textarea.value = text.substring(0, start) + insert + text.substring(end);
        
        // 设置光标位置
        const newPos = start + insert.length + cursorOffset;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
    }

    /**
     * 保存编辑
     */
    async saveEdit() {
        const title = document.getElementById('editTitle').value.trim();
        const contentText = document.getElementById('editContent').value;

        if (!title && !contentText) {
            utils.showToast('标题和内容不能都为空', 'warning');
            return;
        }

        try {
            // 获取原始内容
            const originalContent = this.contents.find(c => c.id === this.editingContentId);
            
            // 构建更新数据
            const updateData = {
                title: title || '无标题'
            };
            
            // 对于网页类型，更新textContent
            if (originalContent && originalContent.type === 'bookmark') {
                updateData.textContent = contentText;
                updateData.excerpt = contentText.substring(0, 150);
                // 保留原始HTML内容不变
            } else {
                // 其他类型直接更新content
                updateData.content = contentText;
            }

            await db.updateContent(this.editingContentId, updateData);

            utils.showToast('保存成功', 'success');
            await this.refreshData();
            utils.hideModal('editModal');

            // 更新预览
            if (this.currentContent && this.currentContent.id === this.editingContentId) {
                this.selectContent(this.editingContentId);
            }
        } catch (error) {
            utils.showToast('保存失败', 'error');
        }
    }

    /**
     * 显示笔记模态框
     */
    showNoteModal(note = null) {
        const modal = document.getElementById('noteEditModal');
        const titleInput = document.getElementById('noteEditTitle');
        const contentInput = document.getElementById('noteEditContent');

        if (note) {
            document.getElementById('noteEditModalTitle').textContent = '编辑笔记';
            titleInput.value = note.title;
            contentInput.value = note.content;
            this.editingNoteId = note.id;
        } else {
            document.getElementById('noteEditModalTitle').textContent = '添加笔记';
            titleInput.value = '';
            contentInput.value = '';
            this.editingNoteId = null;
        }

        utils.showModal('noteEditModal');
    }

    /**
     * 编辑笔记
     */
    editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            this.showNoteModal(note);
        }
    }

    /**
     * 保存笔记
     */
    async saveNote() {
        const title = document.getElementById('noteEditTitle').value.trim();
        const content = document.getElementById('noteEditContent').value.trim();

        if (!title && !content) {
            utils.showToast('请输入标题或内容', 'warning');
            return;
        }

        try {
            if (this.editingNoteId) {
                await db.updateNote(this.editingNoteId, {
                    title: title || '无标题',
                    content: content
                });
                utils.showToast('笔记已更新', 'success');
            } else {
                await db.addNote({
                    contentId: this.currentContent?.id || null,
                    title: title || '无标题',
                    content: content
                });
                utils.showToast('笔记已添加', 'success');
            }

            await this.refreshData();
            utils.hideModal('noteEditModal');

            // 更新预览
            if (this.currentContent) {
                this.selectContent(this.currentContent.id);
            }
        } catch (error) {
            utils.showToast('保存失败', 'error');
        }
    }

    /**
     * 删除笔记
     */
    async deleteNote(noteId) {
        utils.showConfirm('确定要删除这条笔记吗？', async () => {
            try {
                await db.deleteNote(noteId);
                utils.showToast('笔记已删除', 'success');
                await this.refreshData();

                if (this.currentContent) {
                    this.selectContent(this.currentContent.id);
                }
            } catch (error) {
                utils.showToast('删除失败', 'error');
            }
        });
    }

    /**
     * 显示文件夹模态框
     */
    showFolderModal() {
        this.renderFolderManageList();
        document.getElementById('newFolderName').value = '';
        utils.showModal('folderModal');
    }

    /**
     * 渲染文件夹管理列表
     */
    renderFolderManageList() {
        const container = document.getElementById('folderListManage');
        
        if (this.folders.length === 0) {
            container.innerHTML = '<div class="manage-item" style="color: var(--text-tertiary)">暂无收藏夹</div>';
            return;
        }

        container.innerHTML = this.folders.map(folder => `
            <div class="manage-item" data-folder-id="${folder.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <input type="text" class="manage-item-name" value="${utils.escapeHtml(folder.name)}" data-folder-id="${folder.id}">
                <div class="manage-item-actions">
                    <button class="btn-icon save-folder-btn" title="保存">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <button class="btn-icon delete-folder-btn" title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        // 绑定事件
        container.querySelectorAll('.save-folder-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.manage-item');
                const folderId = item.dataset.folderId;
                const name = item.querySelector('input').value.trim();
                if (name) {
                    this.updateFolderName(folderId, name);
                }
            });
        });

        container.querySelectorAll('.delete-folder-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const folderId = btn.closest('.manage-item').dataset.folderId;
                this.deleteFolder(folderId);
            });
        });
    }

    /**
     * 创建收藏夹
     */
    async createFolder() {
        const name = document.getElementById('newFolderName').value.trim();
        
        if (!name) {
            utils.showToast('请输入收藏夹名称', 'warning');
            return;
        }

        try {
            const folder = await db.createFolder(name);
            this.folders.push(folder);
            renderer.renderFolderList(this.folders, document.getElementById('folderList'));
            this.renderFolderManageList();
            this.updateFolderSelect('contentFolder');
            this.updateFolderSelect('targetFolder');
            document.getElementById('newFolderName').value = '';
            utils.showToast('收藏夹已创建', 'success');
        } catch (error) {
            utils.showToast('创建失败，名称可能已存在', 'error');
        }
    }

    /**
     * 编辑收藏夹
     */
    editFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder) {
            const newName = prompt('请输入新的收藏夹名称:', folder.name);
            if (newName && newName.trim()) {
                this.updateFolderName(folderId, newName.trim());
            }
        }
    }

    /**
     * 更新收藏夹名称
     */
    async updateFolderName(folderId, name) {
        try {
            await db.updateFolder(folderId, name);
            const folder = this.folders.find(f => f.id === folderId);
            if (folder) folder.name = name;
            
            renderer.renderFolderList(this.folders, document.getElementById('folderList'));
            this.renderFolderManageList();
            this.updateFolderSelect('contentFolder');
            this.updateFolderSelect('targetFolder');
            
            utils.showToast('已更新', 'success');
        } catch (error) {
            utils.showToast('更新失败', 'error');
        }
    }

    /**
     * 删除收藏夹
     */
    deleteFolder(folderId) {
        utils.showConfirm('确定要删除这个收藏夹吗？内容会保留但移出收藏夹。', async () => {
            try {
                await db.deleteFolder(folderId);
                this.folders = this.folders.filter(f => f.id !== folderId);
                
                renderer.renderFolderList(this.folders, document.getElementById('folderList'));
                this.renderFolderManageList();
                this.updateFolderSelect('contentFolder');
                this.updateFolderSelect('targetFolder');
                
                if (this.currentFolderId === folderId) {
                    this.setCurrentView('all');
                }
                
                utils.showToast('收藏夹已删除', 'success');
            } catch (error) {
                utils.showToast('删除失败', 'error');
            }
        });
    }

    /**
     * 更新收藏夹下拉框
     */
    updateFolderSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">无</option>' + 
            this.folders.map(f => `<option value="${f.id}">${utils.escapeHtml(f.name)}</option>`).join('');
        select.value = currentValue;
    }

    /**
     * 显示标签模态框
     */
    showTagModal() {
        this.renderTagManageList();
        document.getElementById('newTagName').value = '';
        document.getElementById('newTagColor').value = '#3b82f6';
        utils.showModal('tagModal');
    }

    /**
     * 渲染标签管理列表
     */
    renderTagManageList() {
        const container = document.getElementById('tagListManage');
        
        if (this.tags.length === 0) {
            container.innerHTML = '<div class="manage-item" style="color: var(--text-tertiary)">暂无标签</div>';
            return;
        }

        container.innerHTML = this.tags.map(tag => `
            <div class="manage-item" data-tag-id="${tag.id}">
                <span class="manage-item-color" style="background-color: ${tag.color}"></span>
                <input type="text" class="manage-item-name" value="${utils.escapeHtml(tag.name)}" data-tag-id="${tag.id}">
                <input type="color" class="tag-color-picker" value="${tag.color}" style="width: 32px; height: 32px; padding: 2px;">
                <div class="manage-item-actions">
                    <button class="btn-icon save-tag-btn" title="保存">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <button class="btn-icon delete-tag-btn" title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        // 绑定事件
        container.querySelectorAll('.save-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.manage-item');
                const tagId = item.dataset.tagId;
                const name = item.querySelector('input[type="text"]').value.trim();
                const color = item.querySelector('input[type="color"]').value;
                if (name) {
                    this.updateTagData(tagId, { name, color });
                }
            });
        });

        container.querySelectorAll('.delete-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tagId = btn.closest('.manage-item').dataset.tagId;
                this.deleteTag(tagId);
            });
        });
    }

    /**
     * 创建标签
     */
    async createTag() {
        const name = document.getElementById('newTagName').value.trim();
        const color = document.getElementById('newTagColor').value;
        
        if (!name) {
            utils.showToast('请输入标签名称', 'warning');
            return;
        }

        try {
            const tag = await db.createTag(name, color);
            this.tags.push(tag);
            renderer.renderTagList(this.tags, document.getElementById('tagList'));
            this.renderTagManageList();
            this.renderNoteTags();
            document.getElementById('newTagName').value = '';
            utils.showToast('标签已创建', 'success');
        } catch (error) {
            utils.showToast('创建失败，名称可能已存在', 'error');
        }
    }

    /**
     * 编辑标签
     */
    editTag(tagId) {
        const tag = this.tags.find(t => t.id === tagId);
        if (tag) {
            const newName = prompt('请输入新的标签名称:', tag.name);
            if (newName && newName.trim()) {
                this.updateTagData(tagId, { name: newName.trim() });
            }
        }
    }

    /**
     * 更新标签数据
     */
    async updateTagData(tagId, updates) {
        try {
            await db.updateTag(tagId, updates);
            const tag = this.tags.find(t => t.id === tagId);
            if (tag) Object.assign(tag, updates);
            
            renderer.renderTagList(this.tags, document.getElementById('tagList'));
            this.renderTagManageList();
            this.renderContents(); // 更新卡片中的标签名
            
            utils.showToast('已更新', 'success');
        } catch (error) {
            utils.showToast('更新失败', 'error');
        }
    }

    /**
     * 删除标签
     */
    deleteTag(tagId) {
        utils.showConfirm('确定要删除这个标签吗？内容中的标签也会被移除。', async () => {
            try {
                await db.deleteTag(tagId);
                this.tags = this.tags.filter(t => t.id !== tagId);
                
                renderer.renderTagList(this.tags, document.getElementById('tagList'));
                this.renderTagManageList();
                this.renderNoteTags();
                
                if (this.currentTagId === tagId) {
                    this.setCurrentView('all');
                }
                
                // 更新内容中的标签
                await this.refreshData();
                this.renderContents();
                
                utils.showToast('标签已删除', 'success');
            } catch (error) {
                utils.showToast('删除失败', 'error');
            }
        });
    }

    /**
     * 显示移动模态框
     */
    showMoveModal(content) {
        this.updateFolderSelect('targetFolder');
        document.getElementById('removeFromFolder').checked = false;
        document.getElementById('targetFolder').value = content.folderId || '';
        
        this.movingContentId = content.id;
        utils.showModal('moveModal');
    }

    /**
     * 确认移动
     */
    async confirmMove() {
        if (!this.movingContentId) return;

        const removeFromFolder = document.getElementById('removeFromFolder').checked;
        const targetFolderId = document.getElementById('targetFolder').value || null;

        try {
            const updates = {};
            
            if (removeFromFolder) {
                updates.folderId = null;
            } else if (targetFolderId) {
                updates.folderId = targetFolderId;
            }

            if (Object.keys(updates).length > 0) {
                await db.updateContent(this.movingContentId, updates);
            }

            utils.showToast('已移动到收藏夹', 'success');
            await this.refreshData();
            
            if (this.currentContent) {
                this.selectContent(this.currentContent.id);
            }
            
            utils.hideModal('moveModal');
        } catch (error) {
            utils.showToast('移动失败', 'error');
        }
    }

    /**
     * 显示内容标签管理模态框
     */
    showContentTagModal(content) {
        this.contentTagContentId = content.id;
        this.contentTagsSelected = [...(content.tags || [])];
        
        this.renderContentTagsEdit();
        utils.showModal('contentTagModal');
    }

    /**
     * 渲染内容标签编辑
     */
    renderContentTagsEdit() {
        const selectedContainer = document.getElementById('contentTagsEdit');
        const availableContainer = document.getElementById('availableContentTags');

        // 已选标签
        const selectedTags = this.tags.filter(t => this.contentTagsSelected.includes(t.id));
        selectedContainer.innerHTML = selectedTags.length > 0
            ? selectedTags.map(tag => `
                <span class="content-tag" data-tag-id="${tag.id}">
                    <span class="tag-dot" style="background-color: ${tag.color}"></span>
                    ${utils.escapeHtml(tag.name)}
                </span>
            `).join('')
            : '<span style="color: var(--text-tertiary)">暂无标签</span>';

        // 可选标签
        const availableTags = this.tags.filter(t => !this.contentTagsSelected.includes(t.id));
        availableContainer.innerHTML = availableTags.length > 0
            ? availableTags.map(tag => `
                <span class="available-content-tag" data-tag-id="${tag.id}" style="border-left: 3px solid ${tag.color}">
                    ${utils.escapeHtml(tag.name)}
                </span>
            `).join('')
            : '<span style="color: var(--text-tertiary)">没有更多标签</span>';

        // 绑定事件
        selectedContainer.querySelectorAll('.content-tag').forEach(tagEl => {
            tagEl.addEventListener('click', () => {
                const tagId = tagEl.dataset.tagId;
                this.contentTagsSelected = this.contentTagsSelected.filter(id => id !== tagId);
                this.renderContentTagsEdit();
            });
        });

        availableContainer.querySelectorAll('.available-content-tag').forEach(tagEl => {
            tagEl.addEventListener('click', () => {
                const tagId = tagEl.dataset.tagId;
                if (!this.contentTagsSelected.includes(tagId)) {
                    this.contentTagsSelected.push(tagId);
                    this.renderContentTagsEdit();
                }
            });
        });
    }

    /**
     * 保存内容标签
     */
    async saveContentTags() {
        if (!this.contentTagContentId) return;

        try {
            await db.updateContent(this.contentTagContentId, {
                tags: this.contentTagsSelected
            });

            utils.showToast('标签已更新', 'success');
            await this.refreshData();
            
            if (this.currentContent) {
                this.selectContent(this.currentContent.id);
            }
            
            utils.hideModal('contentTagModal');
        } catch (error) {
            utils.showToast('保存失败', 'error');
        }
    }

    /**
     * 确认删除内容
     */
    confirmDeleteContent(content) {
        this.deleteTargetId = content.id;
        this.deleteType = 'content';
        document.getElementById('confirmMessage').textContent = `确定要删除"${content.title}"吗？此操作无法撤销。`;
        utils.showModal('confirmModal');
    }

    /**
     * 执行删除
     */
    async executeDelete() {
        if (!this.deleteTargetId) return;

        try {
            if (this.deleteType === 'content') {
                await db.deleteContent(this.deleteTargetId);
                utils.showToast('内容已删除', 'success');
                
                if (this.currentContent && this.currentContent.id === this.deleteTargetId) {
                    this.currentContent = null;
                    renderer.renderEmptyPreview();
                }
            }

            await this.refreshData();
            utils.hideModal('confirmModal');
        } catch (error) {
            utils.showToast('删除失败', 'error');
        }
    }

    /**
     * 显示搜索筛选
     */
    showSearchFilter() {
        const modal = document.getElementById('searchFilterModal');
        const filterTags = document.getElementById('filterTags');

        // 渲染标签筛选
        filterTags.innerHTML = this.tags.map(tag => `
            <span class="filter-tag ${this.searchFilters.tags.includes(tag.id) ? 'selected' : ''}" 
                  data-tag-id="${tag.id}" 
                  style="border-left: 3px solid ${tag.color}">
                ${utils.escapeHtml(tag.name)}
            </span>
        `).join('');

        // 绑定点击事件
        filterTags.querySelectorAll('.filter-tag').forEach(tagEl => {
            tagEl.addEventListener('click', () => {
                const tagId = tagEl.dataset.tagId;
                const index = this.searchFilters.tags.indexOf(tagId);
                
                if (index === -1) {
                    this.searchFilters.tags.push(tagId);
                    tagEl.classList.add('selected');
                } else {
                    this.searchFilters.tags.splice(index, 1);
                    tagEl.classList.remove('selected');
                }
            });
        });

        // 设置日期范围
        document.getElementById('filterDateFrom').value = this.searchFilters.dateFrom || '';
        document.getElementById('filterDateTo').value = this.searchFilters.dateTo || '';

        // 设置内容类型
        const typeCheckboxes = document.querySelectorAll('.filter-checkboxes input');
        typeCheckboxes.forEach(checkbox => {
            checkbox.checked = this.searchFilters.types.includes(checkbox.value);
        });

        utils.showModal('searchFilterModal');
    }

    /**
     * 清除筛选
     */
    clearFilters() {
        this.searchFilters = {
            tags: [],
            dateFrom: null,
            dateTo: null,
            types: ['document', 'bookmark', 'note']
        };

        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        document.querySelectorAll('.filter-checkboxes input').forEach(cb => cb.checked = true);
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('selected'));

        this.renderContents();
        utils.hideModal('searchFilterModal');
    }

    /**
     * 应用筛选
     */
    applyFilters() {
        this.searchFilters.dateFrom = document.getElementById('filterDateFrom').value || null;
        this.searchFilters.dateTo = document.getElementById('filterDateTo').value || null;
        
        const typeCheckboxes = document.querySelectorAll('.filter-checkboxes input:checked');
        this.searchFilters.types = Array.from(typeCheckboxes).map(cb => cb.value);

        this.renderContents();
        utils.hideModal('searchFilterModal');
        
        // 更新筛选按钮状态
        const hasFilters = this.searchFilters.tags.length > 0 || 
            this.searchFilters.dateFrom || this.searchFilters.dateTo ||
            this.searchFilters.types.length < 3;
        document.getElementById('searchFilterBtn').classList.toggle('active', hasFilters);
    }

    /**
     * 导出数据
     */
    async exportData() {
        try {
            const data = await db.exportAllData();
            const filename = `知识库备份_${utils.formatDate(new Date().toISOString())}.json`;
            utils.downloadJson(data, filename);
            utils.showToast('数据已导出', 'success');
        } catch (error) {
            utils.showToast('导出失败', 'error');
        }
    }

    /**
     * 导入数据
     */
    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await utils.readFileAsText(file);
                const data = JSON.parse(text);
                
                utils.showConfirm('导入将覆盖现有数据，是否继续？', async () => {
                    try {
                        await db.importAllData(data);
                        await this.refreshData();
                        this.renderInitialUI();
                        utils.showToast('数据导入成功', 'success');
                    } catch (err) {
                        utils.showToast('导入失败：' + err.message, 'error');
                    }
                });
            } catch (err) {
                utils.showToast('读取文件失败', 'error');
            }
        });

        input.click();
    }

    /**
     * 刷新数据
     */
    async refreshData() {
        await this.loadAllData();
        this.updateStats();
        renderer.renderFolderList(this.folders, document.getElementById('folderList'));
        renderer.renderTagList(this.tags, document.getElementById('tagList'));
        this.renderContents();
        this.updateStorageInfo();
    }
}

// 创建并启动应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new KnowledgeBaseApp();
    window.app = app;
});
